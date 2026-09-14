import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const messages: Record<number, [string, string]> = {
      400: ['VALIDATION_ERROR', 'Invalid request'],
      401: ['UNAUTHENTICATED', 'Authentication required'],
      404: ['NOT_FOUND', 'Resource not found'],
      409: ['COLLECTION_NAME_CONFLICT', 'Collection name already exists'],
    };
    const [code, message] = messages[status] ?? ['INTERNAL_ERROR', 'Request failed'];
    if (status >= 500) this.logger.error('Request failed; check database availability and migrations');
    const response = host.switchToHttp().getResponse();
    response.setHeader('Cache-Control', 'no-store');
    if (status === 401) response.setHeader('WWW-Authenticate', 'Bearer');
    response.status(status).json({ error: { code, message } });
  }
}
