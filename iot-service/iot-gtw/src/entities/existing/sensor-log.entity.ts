import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { SensorChannel } from './sensor-channel.entity';

@Entity('sensor_logs')
@Index('idx_sensor_logs_channel_ts', ['idSensorChannel', 'ts'])
export class SensorLog {
  @PrimaryGeneratedColumn('increment', { name: 'id_sensor_log', type: 'bigint' })
  idSensorLog: string;

  @Column('uuid', { name: 'id_sensor_channel' })
  idSensorChannel: string;

  @Column('uuid', { name: 'id_sensor', nullable: true })
  idSensor: string;

  @Column('uuid', { name: 'id_node', nullable: true })
  idNode: string;

  @Column('uuid', { name: 'id_project', nullable: true })
  idProject: string;

  @Column('uuid', { name: 'id_owner', nullable: true })
  idOwner: string;

  @Column('timestamp with time zone', { name: 'ts' })
  ts: Date;

  @Column('double precision', { name: 'value_raw', nullable: true })
  valueRaw: number;

  @Column('double precision', { name: 'value_engineered', nullable: true })
  valueEngineered: number;

  @Column('text', { name: 'quality_flag', nullable: true })
  qualityFlag: string;

  @Column('text', { name: 'ingestion_source', nullable: true })
  ingestionSource: string;

  @Column('integer', { name: 'status_code', nullable: true })
  statusCode: number;

  @Column('integer', { name: 'ingestion_latency_ms', nullable: true })
  ingestionLatencyMs: number;

  @Column('bigint', { name: 'payload_seq', nullable: true })
  payloadSeq: string;

  @Column('double precision', { name: 'min_threshold', nullable: true })
  minThreshold: number;

  @Column('double precision', { name: 'max_threshold', nullable: true })
  maxThreshold: number;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => SensorChannel)
  @JoinColumn({ name: 'id_sensor_channel' })
  sensorChannel: SensorChannel;
}
