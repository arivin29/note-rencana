import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { TENANT_SCOPED_KEY } from '../decorators/tenant-scoped.decorator';

/**
 * Interceptor that automatically applies tenant scoping to routes marked with @TenantScoped()
 * 
 * For tenant users (role === 'tenant'), this interceptor will:
 * 1. Check if route is marked with @TenantScoped() decorator
 * 2. Automatically inject idOwner filter into query parameters
 * 3. Ensure tenant users only see data belonging to their owner
 * 
 * Admin users are not affected and can see all data.
 */
@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if route has @TenantScoped() decorator
    const isTenantScoped = this.reflector.getAllAndOverride<boolean>(
      TENANT_SCOPED_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If not tenant scoped, proceed without modification
    if (!isTenantScoped) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If user is tenant and has idOwner, inject it into query params
    if (user && user.role === 'tenant' && user.idOwner) {
      // For GET requests (query params) - use 'ownerId' to match service parameter names
      if (request.query) {
        request.query.ownerId = user.idOwner;
      }

      // For POST/PATCH requests (body) - use 'idOwner' for entity creation
      if (request.body && typeof request.body === 'object') {
        request.body.idOwner = user.idOwner;
      }

      // Log for debugging (remove in production)
      console.log(
        `[TenantScope] Applied ownerId filter: ${user.idOwner} for user: ${user.email}`,
      );
    }

    return next.handle();
  }
}
