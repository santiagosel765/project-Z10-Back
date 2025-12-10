import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";

// src/common/interceptors/transform.interceptor.ts
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        const request = context.switchToHttp().getRequest();
        
        return {
          success: true,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          data: data,
          message: this.getSuccessMessage(request.method, request.url)
        };
      })
    );
  }

  private getSuccessMessage(method: string, path: string): string {
    if (path.includes('/auth/login')) return 'Login successful';
    if (path.includes('/auth/refresh')) return 'Token refreshed successfully';
    if (method === 'POST') return 'Resource created successfully';
    if (method === 'PUT' || method === 'PATCH') return 'Resource updated successfully';
    if (method === 'DELETE') return 'Resource deleted successfully';
    return 'Request successful';
  }
}