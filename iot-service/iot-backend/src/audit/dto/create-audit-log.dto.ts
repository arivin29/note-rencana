import { AuditAction, AuditStatus } from '../entities/audit-log.entity';

export class CreateAuditLogDto {
  idUser?: string | null;
  action: AuditAction;
  entityType?: string | null;
  entityId?: string | null;
  status?: AuditStatus;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestMethod?: string | null;
  requestUrl?: string | null;
  oldValues?: any;
  newValues?: any;
}
