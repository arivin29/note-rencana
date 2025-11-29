import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  STATUS_CHANGE = 'status_change',
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid', { name: 'id_audit_log' })
  idAuditLog: string;

  @Column({ name: 'id_user', type: 'uuid', nullable: true })
  idUser: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'id_user' })
  user: User;

  @Column({
    type: 'varchar',
    length: 50,
  })
  action: AuditAction;

  @Column({ name: 'entity_type', type: 'varchar', length: 100, nullable: true })
  entityType: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: AuditStatus.SUCCESS,
  })
  status: AuditStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'request_method', type: 'varchar', length: 10, nullable: true })
  requestMethod: string | null;

  @Column({ name: 'request_url', type: 'text', nullable: true })
  requestUrl: string | null;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: any;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
