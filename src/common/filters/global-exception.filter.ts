import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
      } else {
        message = exceptionResponse as string;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'InternalServerError';
      
      
      this.logger.error(
        `Internal server error: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      error = 'UnknownError';
      
      this.logger.error('Unknown exception occurred', JSON.stringify(exception));
    }

    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp,
      path,
      method,
      error,
      message,
    };

    this.logger.error(
      `${method} ${path} - ${status} - ${error}`,
      JSON.stringify({
        ...errorResponse,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
      }),
    );

    response.status(status).json(errorResponse);
  }
}