import { Logger } from '@nestjs/common';
import { LoggerMiddleware } from './logger.middleware';
import { Request, Response } from 'express';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFn: jest.Mock;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new LoggerMiddleware();
    nextFn = jest.fn();

    mockRequest = {
      method: 'GET',
      originalUrl: '/products',
      body: {},
    };

    const finishCallbacks: Array<() => void> = [];
    mockResponse = {
      statusCode: 200,
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallbacks.push(callback);
        }
        return mockResponse as Response;
      }),
    };

    // 'finish' 이벤트를 수동으로 트리거하는 헬퍼
    (mockResponse as { triggerFinish: () => void }).triggerFinish = () => {
      finishCallbacks.forEach((cb) => cb());
    };

    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('next()를 호출해야 한다', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
  });

  it('finish 이벤트를 등록해야 한다', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFn);

    expect(mockResponse.on).toHaveBeenCalledWith(
      'finish',
      expect.any(Function),
    );
  });

  it('성공 응답 시 log 레벨로 기록해야 한다', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFn);
    (mockResponse as { triggerFinish: () => void }).triggerFinish();

    expect(logSpy).toHaveBeenCalled();
    const logMessage = logSpy.mock.calls[0][0] as string;
    expect(logMessage).toContain('GET /products');
    expect(logMessage).toContain('200');
    expect(logMessage).toContain('ms');
  });

  it('에러 응답(4xx) 시 warn 레벨로 기록해야 한다', () => {
    mockResponse.statusCode = 400;

    middleware.use(mockRequest as Request, mockResponse as Response, nextFn);
    (mockResponse as { triggerFinish: () => void }).triggerFinish();

    expect(warnSpy).toHaveBeenCalled();
  });

  it('에러 응답(5xx) 시 warn 레벨로 기록해야 한다', () => {
    mockResponse.statusCode = 500;

    middleware.use(mockRequest as Request, mockResponse as Response, nextFn);
    (mockResponse as { triggerFinish: () => void }).triggerFinish();

    expect(warnSpy).toHaveBeenCalled();
  });

  it('POST 요청 시 Body를 로그에 포함해야 한다', () => {
    mockRequest.method = 'POST';
    mockRequest.body = { email: 'test@test.com' };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFn);
    (mockResponse as { triggerFinish: () => void }).triggerFinish();

    const logMessage = logSpy.mock.calls[0][0] as string;
    expect(logMessage).toContain('Body:');
    expect(logMessage).toContain('test@test.com');
  });

  it('GET 요청 시 Body를 로그에 포함하지 않아야 한다', () => {
    mockRequest.method = 'GET';
    mockRequest.body = { some: 'data' };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFn);
    (mockResponse as { triggerFinish: () => void }).triggerFinish();

    const logMessage = logSpy.mock.calls[0][0] as string;
    expect(logMessage).not.toContain('Body:');
  });

  it('POST 요청이라도 빈 body는 로그에 포함하지 않아야 한다', () => {
    mockRequest.method = 'POST';
    mockRequest.body = {};

    middleware.use(mockRequest as Request, mockResponse as Response, nextFn);
    (mockResponse as { triggerFinish: () => void }).triggerFinish();

    const logMessage = logSpy.mock.calls[0][0] as string;
    expect(logMessage).not.toContain('Body:');
  });
});
