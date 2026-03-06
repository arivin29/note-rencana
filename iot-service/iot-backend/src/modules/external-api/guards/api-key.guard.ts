import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantApiKeysService } from '../services/tenant-api-keys.service';
import { TenantApiKey } from '../entities/tenant-api-key.entity';

export const API_KEY_HEADER = 'x-api-key';

// Decorator to mark routes that need API key auth
export const EXTERNAL_API_KEY = 'EXTERNAL_API_KEY';

/**
 * Request type with tenant info attached
 */
export interface ExternalApiRequest extends Request {
  tenantApiKey: TenantApiKey;
  tenantOwnerId: string;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeysService: TenantApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Get API key from header
    const apiKey = request.headers[API_KEY_HEADER];

    if (!apiKey) {
      this.logger.warn('Missing API key in request');
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing API key. Provide X-API-Key header.',
        },
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // Validate API key
    const tenantKey = await this.apiKeysService.validateApiKey(apiKey);

    if (!tenantKey) {
      this.logger.warn(`Invalid API key attempt: ${apiKey.substring(0, 12)}...`);
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired API key',
        },
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // Check if key is active
    if (!tenantKey.isActive) {
      this.logger.warn(`Inactive API key used: ${tenantKey.apiKeyPrefix}`);
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'API key is deactivated',
        },
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // Check rate limit
    const rateLimit = await this.apiKeysService.checkRateLimit(tenantKey);
    if (!rateLimit.allowed) {
      this.logger.warn(`Rate limit exceeded for: ${tenantKey.apiKeyPrefix}`);
      throw new ForbiddenException({
        error: {
          code: 'RATE_LIMITED',
          message: 'Daily rate limit exceeded. Please try again tomorrow.',
          remaining: 0,
        },
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // Check IP whitelist if configured
    if (tenantKey.ipWhitelist && tenantKey.ipWhitelist.length > 0) {
      const clientIp = this.getClientIp(request);
      if (!this.isIpAllowed(clientIp, tenantKey.ipWhitelist)) {
        this.logger.warn(
          `IP not whitelisted: ${clientIp} for key ${tenantKey.apiKeyPrefix}`,
        );
        throw new ForbiddenException({
          error: {
            code: 'FORBIDDEN',
            message: 'IP address not allowed',
          },
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }

    // Attach tenant info to request
    request.tenantApiKey = tenantKey;
    request.tenantOwnerId = tenantKey.idOwner;

    // Log request (async, don't wait)
    this.apiKeysService.logRequest({
      idApiKey: tenantKey.idApiKey,
      endpoint: request.url,
      method: request.method,
      statusCode: 200, // Will be updated by interceptor
      responseTimeMs: Date.now() - startTime,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
      requestParams: request.query,
    }).catch((err) => this.logger.error(`Failed to log request: ${err.message}`));

    this.logger.debug(
      `API key validated: ${tenantKey.apiKeyPrefix}, owner: ${tenantKey.idOwner}`,
    );

    return true;
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: any): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  /**
   * Check if IP is in whitelist (supports CIDR notation)
   */
  private isIpAllowed(clientIp: string, whitelist: string[]): boolean {
    for (const allowed of whitelist) {
      if (allowed === clientIp) {
        return true;
      }
      // Simple CIDR check (for /24 networks)
      if (allowed.includes('/')) {
        const [network, bits] = allowed.split('/');
        const networkParts = network.split('.').map(Number);
        const clientParts = clientIp.split('.').map(Number);
        const mask = parseInt(bits, 10);

        if (mask === 24) {
          if (
            networkParts[0] === clientParts[0] &&
            networkParts[1] === clientParts[1] &&
            networkParts[2] === clientParts[2]
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
