import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;

  const createMockExecutionContext = (statusCode: number): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
      }),
    }) as unknown as ExecutionContext;

  const createMockCallHandler = (data: unknown): CallHandler => ({
    handle: () => of(data),
  });

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('일반 데이터를 { statusCode, message: "success", data }로 감싸야 한다', (done) => {
    const context = createMockExecutionContext(200);
    const handler = createMockCallHandler({ id: 1, name: '커피' });

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        statusCode: 200,
        message: 'success',
        data: { id: 1, name: '커피' },
      });
      done();
    });
  });

  it('message와 data가 이미 있으면 그대로 사용해야 한다', (done) => {
    const context = createMockExecutionContext(201);
    const handler = createMockCallHandler({
      message: '회원가입이 완료되었습니다',
      data: { access_token: 'token' },
    });

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        statusCode: 201,
        message: '회원가입이 완료되었습니다',
        data: { access_token: 'token' },
      });
      done();
    });
  });

  it('null 데이터도 감쌀 수 있어야 한다', (done) => {
    const context = createMockExecutionContext(200);
    const handler = createMockCallHandler(null);

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        statusCode: 200,
        message: 'success',
        data: null,
      });
      done();
    });
  });

  it('배열 데이터도 감쌀 수 있어야 한다', (done) => {
    const context = createMockExecutionContext(200);
    const handler = createMockCallHandler([{ id: 1 }, { id: 2 }]);

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        statusCode: 200,
        message: 'success',
        data: [{ id: 1 }, { id: 2 }],
      });
      done();
    });
  });

  it('문자열 데이터도 감쌀 수 있어야 한다', (done) => {
    const context = createMockExecutionContext(200);
    const handler = createMockCallHandler('simple string');

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        statusCode: 200,
        message: 'success',
        data: 'simple string',
      });
      done();
    });
  });

  it('HTTP 상태 코드를 올바르게 반영해야 한다', (done) => {
    const context = createMockExecutionContext(201);
    const handler = createMockCallHandler({ id: 1 });

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual(expect.objectContaining({ statusCode: 201 }));
      done();
    });
  });

  it('data 키만 있고 message 키가 없으면 일반 데이터로 처리해야 한다', (done) => {
    const context = createMockExecutionContext(200);
    const handler = createMockCallHandler({ data: 'some data' });

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        statusCode: 200,
        message: 'success',
        data: { data: 'some data' },
      });
      done();
    });
  });
});
