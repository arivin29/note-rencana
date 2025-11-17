import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { SensorChannel } from './sensor-channel.entity';

@Entity('sensor_logs')
@Index(['idSensorChannel', 'ts'])
@Index(['idNode', 'ts'])
export class SensorLog {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_sensor_log' })
  idSensorLog: string;

  @Column({ type: 'uuid', name: 'id_sensor_channel', nullable: false })
  idSensorChannel: string;

  @Column({ type: 'uuid', name: 'id_sensor', nullable: false })
  idSensor: string;

  @Column({ type: 'uuid', name: 'id_node', nullable: false })
  idNode: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: false })
  idProject: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: true })
  idOwner: string;

  @Column({ type: 'timestamptz', nullable: false })
  ts: Date;

  @Column({ type: 'numeric', precision: 15, scale: 6, name: 'value_raw', nullable: true })
  valueRaw: number;

  @Column({ type: 'numeric', precision: 15, scale: 6, name: 'value_engineered', nullable: true })
  valueEngineered: number;

  @Column({ type: 'varchar', length: 50, name: 'quality_flag', nullable: true, default: 'good' })
  qualityFlag: string;

  @Column({ type: 'varchar', length: 50, name: 'ingestion_source', nullable: true, default: 'api' })
  ingestionSource: string;

  @Column({ type: 'int', name: 'status_code', nullable: true })
  statusCode: number;

  @Column({ type: 'int', name: 'ingestion_latency_ms', nullable: true })
  ingestionLatencyMs: number;

  @Column({ type: 'bigint', name: 'payload_seq', nullable: true })
  payloadSeq: number;

  @Column({ type: 'numeric', precision: 15, scale: 6, name: 'min_threshold', nullable: true })
  minThreshold: number;

  @Column({ type: 'numeric', precision: 15, scale: 6, name: 'max_threshold', nullable: true })
  maxThreshold: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => SensorChannel, { eager: false })
  @JoinColumn({ name: 'id_sensor_channel' })
  sensorChannel: SensorChannel;
}
