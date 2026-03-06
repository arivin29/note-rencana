import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantApiKey } from '../entities/tenant-api-key.entity';

/**
 * Decorator to get the tenant API key from request
 * Usage: @TenantKey() apiKey: TenantApiKey
 */
export const TenantKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantApiKey => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantApiKey;
  },
);

/**
 * Decorator to get the tenant owner ID from request
 * Usage: @TenantOwnerId() ownerId: string
 */
export const TenantOwnerId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantOwnerId;
  },
);
