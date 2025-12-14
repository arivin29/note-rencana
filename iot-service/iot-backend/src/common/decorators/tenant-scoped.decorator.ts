import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to enable automatic tenant scoping
 * When applied to a route, tenant users will only see data for their owner
 * 
 * @example
 * @Get()
 * @TenantScoped()
 * async findAll(@Query() query: FilterDto) {
 *   // For tenant users, idOwner filter is automatically applied
 *   return this.service.findAll(query);
 * }
 */
export const TENANT_SCOPED_KEY = 'tenantScoped';
export const TenantScoped = () => SetMetadata(TENANT_SCOPED_KEY, true);
