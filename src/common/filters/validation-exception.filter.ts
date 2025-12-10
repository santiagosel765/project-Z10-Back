import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;
    
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    let message: string | string[];
    let validationErrors: any[] = [];

    if (Array.isArray(exceptionResponse.message)) {
      message = 'Validation failed';
      validationErrors = this.formatValidationErrors(exceptionResponse.message);
    } else {
      message = exceptionResponse.message || exception.message;
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp,
      path,
      method,
      error: 'ValidationError',
      message,
      ...(validationErrors.length > 0 && { validationErrors }),
    };

    this.logger.error(
      `${method} ${path} - ${status} - ValidationError`,
      JSON.stringify({
        message: errorResponse.message,
        validationErrors: errorResponse.validationErrors,
      }),
    );

    response.status(status).json(errorResponse);
  }

  private formatValidationErrors(errors: string[]): any[] {
    return errors.map(error => {
      
      const match = error.match(/^(\w+)\s+(.+)$/);
      if (match) {
        return {
          field: match[1],
          message: match[2],
        };
      }
      return {
        message: error,
      };
    });
  }
}