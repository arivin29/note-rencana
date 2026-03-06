import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantApiKey } from './tenant-api-key.entity';

@Entity('tenant_api_logs')
@Index(['idApiKey'])
@Index(['createdAt'])
export class TenantApiLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'uuid', name: 'id_api_key', nullable: true })
  idApiKey: string | null;

  @Column({ type: 'varchar', length: 255 })
  endpoint: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'integer', name: 'status_code', nullable: true })
  statusCode: number | null;

  @Column({ type: 'integer', name: 'response_time_ms', nullable: true })
  responseTimeMs: number | null;

  @Column({ type: 'inet', name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', name: 'request_params', nullable: true })
  requestParams: Record<string, any> | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => TenantApiKey, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'id_api_key' })
  apiKey: TenantApiKey | null;
}
