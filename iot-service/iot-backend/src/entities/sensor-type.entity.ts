import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SensorChannel } from './sensor-channel.entity';

@Entity('sensor_types')
export class SensorType {
  @PrimaryGeneratedColumn('uuid', { name: 'id_sensor_type' })
  idSensorType: string;

  @Column({ type: 'text', nullable: false })
  category: string;

  @Column({ type: 'text', nullable: true, name: 'default_unit' })
  defaultUnit: string;

  @Column({ type: 'numeric', precision: 6, scale: 3, nullable: true })
  precision: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations - Will be used when SensorChannel has proper relation
  // @OneToMany(() => SensorChannel, (channel) => channel.sensorType)
  // sensorChannels: SensorChannel[];
}

