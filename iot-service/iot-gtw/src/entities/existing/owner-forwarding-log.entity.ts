import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Owner } from './owner.entity';

@Entity('owner_forwarding_logs')
@Index('idx_owner_forwarding_logs_config', ['configId', 'createdAt'])
@Index('idx_owner_forwarding_logs_owner', ['idOwner', 'createdAt'])
export class OwnerForwardingLog {
  @PrimaryGeneratedColumn('uuid', { name: 'id_owner_forwarding_log' })
  idOwnerForwardingLog: string;

  @Column('uuid', { name: 'id_owner' })
  idOwner: string;

  @Column('text', { name: 'config_type' })
  configType: string; // sensor_logs, sensor_telemetry, sensor_channel_latest

  @Column('uuid', { name: 'config_id' })
  configId: string;

  @Column('text')
  status: string; // running, success, failed

  @Column('integer', { default: 1 })
  attempts: number;

  @Column('integer', { name: 'records_read', nullable: true })
  recordsRead: number;

  @Column('integer', { name: 'records_inserted', nullable: true })
  recordsInserted: number;

  @Column('integer', { name: 'records_skipped', nullable: true })
  recordsSkipped: number;

  @Column('text', { name: 'error_message', nullable: true })
  errorMessage: string;

  @Column('integer', { name: 'duration_ms', nullable: true })
  durationMs: number;

  @Column('bigint', { name: 'from_id', nullable: true })
  fromId: string;

  @Column('bigint', { name: 'to_id', nullable: true })
  toId: string;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Owner)
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;
}
