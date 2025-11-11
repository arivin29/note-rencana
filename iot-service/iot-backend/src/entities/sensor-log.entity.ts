import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SensorChannel } from './sensor-channel.entity';

@Entity('sensor_logs')
@Index(['idSensorChannel', 'timestamp'])
export class SensorLog {
  @PrimaryGeneratedColumn('uuid', { name: 'id_sensor_log' })
  idSensorLog: string;

  @Column({ type: 'uuid', name: 'id_sensor_channel', nullable: false })
  idSensorChannel: string;

  @Column({ type: 'timestamptz', nullable: false })
  timestamp: Date;

  @Column({ type: 'numeric', nullable: false })
  value: number;

  @Column({ type: 'text', nullable: true })
  quality: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => SensorChannel, (channel) => channel.sensorLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sensor_channel' })
  sensorChannel: SensorChannel;
}
