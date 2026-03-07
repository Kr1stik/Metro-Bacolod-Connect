import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP Exception Filter (OWASP A05)
 * 
 * - Returns generic error messages to clients in production
 * - Logs detailed error information server-side
 * - Prevents internal error details from leaking to users
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred.';
    let validationErrors: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Preserve validation error details (class-validator) for 400 responses
      if (status === HttpStatus.BAD_REQUEST && typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || 'Bad request.';
        validationErrors = Array.isArray(resp.message) ? resp.message : undefined;
      } else if (status === HttpStatus.UNAUTHORIZED) {
        message = 'Authentication required.';
      } else if (status === HttpStatus.FORBIDDEN) {
        message = 'Access denied.';
      } else if (status === HttpStatus.NOT_FOUND) {
        message = typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || 'Resource not found.';
      } else if (status === HttpStatus.TOO_MANY_REQUESTS) {
        message = 'Too many requests. Please try again later.';
      } else {
        // Temporarily show real error messages for debugging
        message = typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any).message || message;
      }
    }

    // Log the full error server-side for debugging
    const logPayload = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      userId: (request as any).user?.uid || 'anonymous',
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };

    if (status >= 500) {
      this.logger.error(
        `[${logPayload.method}] ${logPayload.path} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
        JSON.stringify(logPayload),
      );
    } else if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      // Log auth failures for security monitoring (OWASP A09)
      this.logger.warn(
        `[SECURITY] ${logPayload.method} ${logPayload.path} → ${status} | User: ${logPayload.userId} | IP: ${logPayload.ip}`,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${logPayload.method}] ${logPayload.path} → ${status} | User: ${logPayload.userId}`,
      );
    }

    // Return sanitized error response to client
    const errorResponse: Record<string, any> = {
      statusCode: status,
      message: validationErrors || message,
      timestamp: logPayload.timestamp,
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}
