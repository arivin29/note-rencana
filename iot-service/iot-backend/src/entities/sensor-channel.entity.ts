import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Sensor } from './sensor.entity';
import { SensorLog } from './sensor-log.entity';

@Entity('sensor_channels')
export class SensorChannel {
  @PrimaryGeneratedColumn('uuid', { name: 'id_sensor_channel' })
  idSensorChannel: string;

  @Column({ type: 'uuid', name: 'id_sensor', nullable: false })
  idSensor: string;

  @Column({ type: 'text', nullable: false })
  channelName: string;

  @Column({ type: 'text', nullable: false })
  channelCode: string;

  @Column({ type: 'text', nullable: true })
  unit: string;

  @Column({ type: 'int', nullable: true })
  precision: number;

  @Column({ type: 'numeric', nullable: true })
  minValue: number;

  @Column({ type: 'numeric', nullable: true })
  maxValue: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Sensor, (sensor) => sensor.sensorChannels, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sensor' })
  sensor: Sensor;

  @OneToMany(() => SensorLog, (log) => log.sensorChannel)
  sensorLogs: SensorLog[];
}
