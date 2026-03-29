import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body } = req;
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      const logParts = [
        `${method} ${originalUrl}`,
        `${statusCode}`,
        `${duration}ms`,
      ];

      if (
        method !== 'GET' &&
        body &&
        Object.keys(body as Record<string, unknown>).length > 0
      ) {
        logParts.push(`Body: ${JSON.stringify(body)}`);
      }

      const message = logParts.join(' | ');

      if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
