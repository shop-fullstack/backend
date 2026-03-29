import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

interface WrappedResponse {
  message: string;
  data: unknown;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((res: unknown) => {
        const httpResponse = context.switchToHttp().getResponse<Response>();
        const statusCode = httpResponse.statusCode;

        const typed = res as WrappedResponse;
        if (
          typed &&
          typeof typed === 'object' &&
          'message' in typed &&
          'data' in typed
        ) {
          return {
            statusCode,
            message: typed.message,
            data: typed.data,
          };
        }

        return {
          statusCode,
          message: 'success',
          data: res,
        };
      }),
    );
  }
}
