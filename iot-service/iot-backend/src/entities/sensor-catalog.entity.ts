import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Sensor } from './sensor.entity';

@Entity('sensor_catalogs')
export class SensorCatalog {
  @PrimaryGeneratedColumn('uuid', { name: 'id_sensor_catalog' })
  idSensorCatalog: string;

  @Column({ type: 'text', nullable: false })
  vendor: string;

  @Column({ type: 'text', nullable: false, name: 'model_name' })
  modelName: string;

  @Column({ type: 'text', nullable: true, name: 'icon_asset' })
  iconAsset: string;

  @Column({ type: 'text', nullable: true, name: 'icon_color' })
  iconColor: string;

  @Column({ type: 'text', nullable: true, name: 'datasheet_url' })
  datasheetUrl: string;

  @Column({ type: 'text', nullable: true })
  firmware: string;

  @Column({ type: 'integer', nullable: true, name: 'calibration_interval_days' })
  calibrationIntervalDays: number;

  @Column({ type: 'jsonb', nullable: true, name: 'default_channels_json' })
  defaultChannelsJson: any;

  @Column({ type: 'jsonb', nullable: true, name: 'default_thresholds_json' })
  defaultThresholdsJson: any;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Sensor, (sensor) => sensor.sensorCatalog)
  sensors: Sensor[];
}

