import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Owner } from './owner.entity';

@Entity('owner_forwarding_databases')
@Index('idx_owner_forwarding_databases_owner', ['idOwner'])
@Index('idx_owner_forwarding_databases_enabled', ['enabled'], { where: 'enabled = true' })
export class OwnerForwardingDatabase {
  @PrimaryGeneratedColumn('uuid', { name: 'id_owner_forwarding_db' })
  idOwnerForwardingDb: string;

  @Column('uuid', { name: 'id_owner' })
  idOwner: string;

  @Column('text')
  label: string;

  @Column('text', { name: 'db_type' })
  dbType: string; // postgresql, mysql, clickhouse

  @Column('text')
  host: string;

  @Column('integer')
  port: number;

  @Column('text', { name: 'database_name' })
  databaseName: string;

  @Column('text')
  username: string;

  @Column('text', { name: 'password_cipher' })
  passwordCipher: string;

  @Column('text', { name: 'target_schema', nullable: true })
  targetSchema: string;

  @Column('text', { name: 'target_table' })
  targetTable: string;

  @Column('text', { name: 'write_mode', default: 'append' })
  writeMode: string; // append, upsert

  @Column('integer', { name: 'batch_size', default: 100 })
  batchSize: number;

  @Column('boolean', { default: true })
  enabled: boolean;

  // Source configuration
  @Column('text', { name: 'source_type', nullable: true })
  sourceType: string; // sensor_logs, sensor_telemetry, sensor_channel_latest

  // Tracking columns
  @Column('bigint', { name: 'last_synced_id', default: 0 })
  lastSyncedId: string;

  @Column('timestamp with time zone', { name: 'last_synced_at', nullable: true })
  lastSyncedAt: Date;

  // Sync mode
  @Column('text', { name: 'sync_mode', default: 'incremental' })
  syncMode: string; // incremental, full_replace

  @Column('integer', { name: 'sync_interval_seconds', default: 60 })
  syncIntervalSeconds: number;

  // Timeout & retry
  @Column('integer', { name: 'connection_timeout_ms', default: 10000 })
  connectionTimeoutMs: number;

  @Column('integer', { name: 'query_timeout_ms', default: 30000 })
  queryTimeoutMs: number;

  @Column('integer', { name: 'max_retries', default: 3 })
  maxRetries: number;

  // Conflict handling
  @Column('text', { name: 'conflict_strategy', default: 'ignore' })
  conflictStrategy: string; // ignore, update, fail

  @Column('text', { name: 'conflict_columns', array: true, nullable: true })
  conflictColumns: string[];

  // Schema management
  @Column('boolean', { name: 'auto_create_table', default: false })
  autoCreateTable: boolean;

  // Owner code for filtering (extracted from device_id prefix for iot_log)
  @Column('text', { name: 'owner_code', nullable: true })
  ownerCode: string;

  // Status tracking
  @Column('text', { name: 'last_status', nullable: true })
  lastStatus: string;

  @Column('timestamp with time zone', { name: 'last_delivery_at', nullable: true })
  lastDeliveryAt: Date;

  @Column('text', { name: 'last_error', nullable: true })
  lastError: string;

  // Lock column
  @Column('boolean', { name: 'is_running', default: false })
  isRunning: boolean;

  @Column('timestamp with time zone', { name: 'last_run_started_at', nullable: true })
  lastRunStartedAt: Date;

  // Statistics
  @Column('bigint', { name: 'total_records_synced', default: 0 })
  totalRecordsSynced: string;

  @Column('integer', { name: 'total_sync_count', default: 0 })
  totalSyncCount: number;

  @Column('integer', { name: 'total_error_count', default: 0 })
  totalErrorCount: number;

  // Timestamps
  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column('timestamp with time zone', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Owner)
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;
}
