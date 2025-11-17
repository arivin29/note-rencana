import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sensor } from './sensor.entity';
import { SensorType } from './sensor-type.entity';

@Entity('sensor_channels')
export class SensorChannel {
  @PrimaryGeneratedColumn('uuid', { name: 'id_sensor_channel' })
  idSensorChannel: string;

  @Column({ type: 'uuid', name: 'id_sensor', nullable: false })
  idSensor: string;

  @Column({ type: 'uuid', name: 'id_sensor_type', nullable: false })
  idSensorType: string;

  @Column({ type: 'text', nullable: false, name: 'metric_code' })
  metricCode: string;

  @Column({ type: 'text', nullable: true })
  unit: string;

  @Column({ type: 'numeric', nullable: true, name: 'min_threshold' })
  minThreshold: number;

  @Column({ type: 'numeric', nullable: true, name: 'max_threshold' })
  maxThreshold: number;

  @Column({ type: 'numeric', precision: 12, scale: 6, nullable: true })
  multiplier: number;

  @Column({ type: 'numeric', precision: 12, scale: 6, nullable: true, name: 'offset_value' })
  offsetValue: number;

  @Column({ type: 'integer', nullable: true, name: 'register_address' })
  registerAddress: number;

  @Column({ type: 'numeric', precision: 6, scale: 3, nullable: true })
  precision: number;

  @Column({ type: 'text', nullable: true })
  aggregation: string;

  @Column({ type: 'integer', nullable: true, name: 'alert_suppression_window' })
  alertSuppressionWindow: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Sensor, (sensor) => sensor.sensorChannels, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sensor' })
  sensor: Sensor;

  @ManyToOne(() => SensorType)
  @JoinColumn({ name: 'id_sensor_type' })
  sensorType: SensorType;

  // Removed: sensorLogs (will query separately for performance)
  // @OneToMany(() => SensorLog, (log) => log.sensorChannel)
  // sensorLogs: SensorLog[];
}

