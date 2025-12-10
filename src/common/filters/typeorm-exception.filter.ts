import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { envs } from 'src/config/envs';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

@Catch(QueryFailedError, EntityNotFoundError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TypeOrmExceptionFilter.name);

  catch(exception: QueryFailedError | EntityNotFoundError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      message = 'Resource not found';
      error = 'NotFound';
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'DatabaseError';

      
      const pgError = exception.driverError as any;
      
      switch (pgError?.code) {
        case '23505':
          status = HttpStatus.CONFLICT;
          message = this.extractUniqueViolationMessage(pgError);
          error = 'UniqueConstraintViolation';
          break;
        case '23503': 
          status = HttpStatus.BAD_REQUEST;
          message = 'Referenced record does not exist';
          error = 'ForeignKeyViolation';
          break;
        case '23502': 
          status = HttpStatus.BAD_REQUEST;
          message = 'Required field is missing';
          error = 'NotNullViolation';
          break;
        case '23514': 
          status = HttpStatus.BAD_REQUEST;
          message = 'Data validation failed';
          error = 'CheckConstraintViolation';
          break;
        default:
          message = 'Database operation failed';
          break;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'InternalServerError';
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
        message: errorResponse.message,
        error: errorResponse.error,
        
        ...(envs.nodeEnv === 'development' && {
          details: exception.message,
        }),
      }),
    );

    response.status(status).json(errorResponse);
  }

  private extractUniqueViolationMessage(pgError: any): string {
    const detail = pgError.detail || '';
    
    
    const match = detail.match(/Key \(([^)]+)\)/);
    if (match) {
      const field = match[1];
      return `${field} already exists`;
    }
    
    return 'Duplicate value provided';
  }
}