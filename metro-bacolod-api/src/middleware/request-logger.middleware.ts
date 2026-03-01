import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Request Logger Middleware (OWASP A09: Security Logging and Monitoring)
 *
 * Logs incoming requests with method, path, status code, response time,
 * and user agent. Sensitive headers and body content are NOT logged.
 * Highlights failed requests (4xx/5xx) for security monitoring.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('User-Agent') || '-';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip} - ${userAgent}`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
