import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { AuditAction, AuditStatus } from '../entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, ip, headers, body } = request;

    // Skip audit logging for GET requests and audit endpoints themselves
    if (method === 'GET' || url.includes('/audit')) {
      return next.handle();
    }

    const startTime = Date.now();
    const action = this.mapMethodToAction(method, url);
    const entityInfo = this.extractEntityInfo(url, body);

    return next.handle().pipe(
      tap({
        next: async (response) => {
          const duration = Date.now() - startTime;

          // Only log if we have a valid action
          if (action) {
            await this.auditService.create({
              idUser: user?.idUser || null,
              action,
              entityType: entityInfo.entityType,
              entityId: entityInfo.entityId,
              status: AuditStatus.SUCCESS,
              description: this.generateDescription(action, entityInfo, true),
              ipAddress: ip || request.connection?.remoteAddress,
              userAgent: headers['user-agent'],
              requestMethod: method,
              requestUrl: url,
              oldValues: body?.oldValues || null,
              newValues: this.sanitizeData(body),
            });
          }
        },
        error: async (error) => {
          // Log failed operations
          if (action) {
            await this.auditService.create({
              idUser: user?.idUser || null,
              action,
              entityType: entityInfo.entityType,
              entityId: entityInfo.entityId,
              status: AuditStatus.FAILURE,
              description: this.generateDescription(action, entityInfo, false, error.message),
              ipAddress: ip || request.connection?.remoteAddress,
              userAgent: headers['user-agent'],
              requestMethod: method,
              requestUrl: url,
              oldValues: null,
              newValues: null,
            });
          }
        },
      }),
    );
  }

  private mapMethodToAction(method: string, url: string): AuditAction | null {
    if (url.includes('/auth/login')) return AuditAction.LOGIN;
    if (url.includes('/auth/logout')) return AuditAction.LOGOUT;
    if (url.includes('/password')) return AuditAction.PASSWORD_CHANGE;
    if (url.includes('/toggle-active')) return AuditAction.STATUS_CHANGE;

    switch (method) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return null;
    }
  }

  private extractEntityInfo(url: string, body: any): { entityType: string | null; entityId: string | null } {
    // Extract entity type from URL patterns
    const patterns = [
      { regex: /\/users(?:\/([a-f0-9-]+))?/, type: 'User' },
      { regex: /\/owners(?:\/([a-f0-9-]+))?/, type: 'Owner' },
      { regex: /\/nodes(?:\/([a-f0-9-]+))?/, type: 'Node' },
      { regex: /\/sensors(?:\/([a-f0-9-]+))?/, type: 'Sensor' },
      { regex: /\/projects(?:\/([a-f0-9-]+))?/, type: 'Project' },
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern.regex);
      if (match) {
        return {
          entityType: pattern.type,
          entityId: match[1] || body?.idUser || body?.idOwner || body?.idNode || null,
        };
      }
    }

    return { entityType: null, entityId: null };
  }

  private generateDescription(
    action: AuditAction,
    entityInfo: { entityType: string | null; entityId: string | null },
    success: boolean,
    errorMessage?: string,
  ): string {
    const actionText = action.replace('_', ' ').toLowerCase();
    const entity = entityInfo.entityType || 'resource';
    const status = success ? 'successfully' : 'failed';

    let description = `${actionText} ${entity} ${status}`;

    if (entityInfo.entityId) {
      description += ` (ID: ${entityInfo.entityId})`;
    }

    if (!success && errorMessage) {
      description += ` - ${errorMessage}`;
    }

    return description.charAt(0).toUpperCase() + description.slice(1);
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'accessToken', 'refreshToken'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
