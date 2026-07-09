import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Owner } from './owner.entity';

/**
 * Config broker MQTT milik PDAM. CRUD ditulis iot-backend-go; DIBACA (eksekusi) oleh iot-gtw.
 * Ref: iot-angular/docs/design/mqtt-broadcast-spec.md §4.
 */
@Entity('owner_forwarding_mqtt')
@Index('idx_owner_forwarding_mqtt_owner', ['idOwner'])
@Index('idx_owner_forwarding_mqtt_active', ['isActive'], { where: 'is_active = true' })
export class OwnerForwardingMqtt {
  @PrimaryGeneratedColumn('uuid', { name: 'id_owner_forwarding_mqtt' })
  idOwnerForwardingMqtt: string;

  @Column('uuid', { name: 'id_owner' })
  idOwner: string;

  @Column('varchar', { name: 'owner_code', length: 5, nullable: true })
  ownerCode: string;

  @Column('text')
  label: string;

  // Koneksi broker (milik PDAM; kita = client publisher)
  @Column('text', { name: 'broker_url' })
  brokerUrl: string;

  @Column('text', { nullable: true })
  username: string;

  @Column('text', { name: 'password_cipher', nullable: true })
  passwordCipher: string;

  @Column('boolean', { name: 'tls_enabled', default: true })
  tlsEnabled: boolean;

  @Column('boolean', { name: 'tls_insecure', default: false })
  tlsInsecure: boolean;

  // Kontrak topik & QoS
  @Column('text', { name: 'topic_template', default: '{ownerCode}/telemetry/{deviceId}/{metricCode}' })
  topicTemplate: string;

  @Column('smallint', { default: 1 })
  qos: number;

  @Column('boolean', { default: true })
  retained: boolean;

  @Column('jsonb', { name: 'enabled_categories', default: () => `'["telemetry"]'::jsonb` })
  enabledCategories: string[];

  @Column('integer', { name: 'poll_interval_seconds', default: 10 })
  pollIntervalSeconds: number;

  // Status/lock (ditulis iot-gtw)
  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @Column('boolean', { name: 'is_running', default: false })
  isRunning: boolean;

  @Column('timestamp with time zone', { name: 'last_run_started_at', nullable: true })
  lastRunStartedAt: Date;

  @Column('text', { name: 'last_status', nullable: true })
  lastStatus: string;

  @Column('timestamp with time zone', { name: 'last_success_at', nullable: true })
  lastSuccessAt: Date;

  @Column('text', { name: 'last_error', nullable: true })
  lastError: string;

  // High-water mark max(last_update) yang sudah dipublish (anti re-publish, §8-i)
  @Column('timestamp with time zone', { name: 'last_watermark', nullable: true })
  lastWatermark: Date;

  @Column('bigint', { name: 'total_published', default: 0 })
  totalPublished: string;

  @Column('integer', { name: 'total_error_count', default: 0 })
  totalErrorCount: number;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column('timestamp with time zone', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;

  @ManyToOne(() => Owner)
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;
}
