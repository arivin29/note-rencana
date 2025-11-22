import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Sensor } from './sensor.entity';

@Entity('sensor_channels')
export class SensorChannel {
  @PrimaryColumn('uuid', { name: 'id_sensor_channel' })
  idSensorChannel: string;

  @Column('uuid', { name: 'id_sensor' })
  idSensor: string;

  @Column('uuid', { name: 'id_sensor_type' })
  idSensorType: string;

  @Column('text', { name: 'metric_code' })
  metricCode: string;

  @Column('text', { nullable: true })
  unit: string;

  @Column('numeric', { name: 'min_threshold', nullable: true })
  minThreshold: number;

  @Column('numeric', { name: 'max_threshold', nullable: true })
  maxThreshold: number;

  @Column('numeric', { nullable: true, precision: 12, scale: 6 })
  multiplier: number;

  @Column('numeric', { name: 'offset_value', nullable: true, precision: 12, scale: 6 })
  offsetValue: number;

  @Column('integer', { name: 'register_address', nullable: true })
  registerAddress: number;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column('timestamp with time zone', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Sensor, sensor => sensor.channels)
  @JoinColumn({ name: 'id_sensor' })
  sensor: Sensor;
}
