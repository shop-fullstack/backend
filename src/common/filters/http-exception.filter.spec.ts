import {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockArgumentsHost: { switchToHttp: jest.Mock };

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
      }),
    };
  });

  it('BadRequestException을 올바른 형식으로 반환해야 한다', () => {
    const exception = new BadRequestException('잘못된 요청입니다');

    filter.catch(exception, mockArgumentsHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: '잘못된 요청입니다',
      error: 'Bad Request',
    });
  });

  it('UnauthorizedException을 올바른 형식으로 반환해야 한다', () => {
    const exception = new UnauthorizedException('인증 실패');

    filter.catch(exception, mockArgumentsHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 401,
      message: '인증 실패',
      error: 'Unauthorized',
    });
  });

  it('NotFoundException을 올바른 형식으로 반환해야 한다', () => {
    const exception = new NotFoundException('리소스를 찾을 수 없습니다');

    filter.catch(exception, mockArgumentsHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 404,
      message: '리소스를 찾을 수 없습니다',
      error: 'Not Found',
    });
  });

  it('메시지 배열인 경우 첫 번째 메시지만 반환해야 한다', () => {
    // ValidationPipe가 여러 에러를 배열로 보낼 수 있음
    const exception = new BadRequestException({
      message: ['이메일 형식이 아닙니다', '비밀번호는 8자 이상'],
      error: 'Bad Request',
    });

    filter.catch(exception, mockArgumentsHost as never);

    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: '이메일 형식이 아닙니다',
      error: 'Bad Request',
    });
  });

  it('문자열 메시지를 정상 처리해야 한다', () => {
    const exception = new HttpException('서버 오류', 500);

    filter.catch(exception, mockArgumentsHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: '서버 오류',
      error: 'Error',
    });
  });

  it('error 필드가 없을 때 기본값 "Error"를 사용해야 한다', () => {
    const exception = new HttpException({ message: '커스텀 에러' }, 422);

    filter.catch(exception, mockArgumentsHost as never);

    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 422,
      message: '커스텀 에러',
      error: 'Error',
    });
  });

  it('message가 배열도 문자열도 아닌 경우 exception.message를 사용해야 한다', () => {
    const exception = new HttpException(
      { message: 12345, error: 'Custom Error' },
      400,
    );

    filter.catch(exception, mockArgumentsHost as never);

    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: exception.message,
      error: 'Custom Error',
    });
  });
});
