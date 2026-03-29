import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = exception.message;
    let error = 'Error';

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const res = exceptionResponse as Record<string, unknown>;
      error = (res.error as string) || error;

      if (Array.isArray(res.message)) {
        message = (res.message as string[])[0];
      } else if (typeof res.message === 'string') {
        message = res.message;
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
    });
  }
}
