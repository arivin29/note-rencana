import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { SensorChannel } from './sensor-channel.entity';

@Entity('sensor_types')
export class SensorType {
  @PrimaryColumn('uuid', { name: 'id_sensor_type' })
  idSensorType: string;

  @Column('text')
  category: string;

  @Column('text', { name: 'default_unit', nullable: true })
  defaultUnit: string;

  @Column('text', { name: 'conversion_formula', nullable: true })
  conversionFormula: string;

  @Column('numeric', { precision: 6, scale: 3, nullable: true })
  precision: number;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column('timestamp with time zone', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => SensorChannel, channel => channel.sensorType)
  channels: SensorChannel[];
}
