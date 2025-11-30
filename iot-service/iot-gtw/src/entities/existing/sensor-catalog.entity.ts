import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sensor_catalogs')
export class SensorCatalog {
  @PrimaryColumn('uuid', { name: 'id_sensor_catalog' })
  idSensorCatalog: string;

  @Column('text')
  vendor: string;

  @Column('text', { name: 'model_name' })
  modelName: string;

  @Column('text', { nullable: true, name: 'icon_asset' })
  iconAsset: string;

  @Column('text', { nullable: true, name: 'icon_color' })
  iconColor: string;

  @Column('text', { nullable: true, name: 'datasheet_url' })
  datasheetUrl: string;

  @Column('text', { nullable: true })
  firmware: string;

  @Column('integer', { nullable: true, name: 'calibration_interval_days' })
  calibrationIntervalDays: number;

  @Column('jsonb', { nullable: true, name: 'default_channels_json' })
  defaultChannelsJson: any;

  @Column('jsonb', { nullable: true, name: 'default_thresholds_json' })
  defaultThresholdsJson: any;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
