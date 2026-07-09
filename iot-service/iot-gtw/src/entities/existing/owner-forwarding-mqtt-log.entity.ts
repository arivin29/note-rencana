import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * Audit push MQTT — ditulis iot-gtw, dibaca UI via endpoint Go.
 * RETENSI MAKS 7 HARI (cron pembersih harian). Ref spec §4.
 */
@Entity('owner_forwarding_mqtt_log')
@Index('idx_owner_forwarding_mqtt_log_config', ['configId', 'createdAt'])
@Index('idx_owner_forwarding_mqtt_log_owner', ['idOwner', 'createdAt'])
export class OwnerForwardingMqttLog {
  @PrimaryGeneratedColumn('uuid', { name: 'id_owner_forwarding_mqtt_log' })
  idOwnerForwardingMqttLog: string;

  @Column('uuid', { name: 'id_owner' })
  idOwner: string;

  @Column('uuid', { name: 'config_id' })
  configId: string;

  @Column('text')
  status: string; // success, failed, connect_error

  @Column('integer', { name: 'messages_published', default: 0 })
  messagesPublished: number;

  @Column('text', { name: 'error_message', nullable: true })
  errorMessage: string;

  @Column('integer', { name: 'duration_ms', nullable: true })
  durationMs: number;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;
}
