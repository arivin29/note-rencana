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
import { Node } from './node.entity';
import { SensorCatalog } from './sensor-catalog.entity';
import { SensorChannel } from './sensor-channel.entity';

@Entity('sensors')
export class Sensor {
  @PrimaryGeneratedColumn('uuid', { name: 'id_sensor' })
  idSensor: string;

  @Column({ type: 'uuid', name: 'id_node', nullable: false })
  idNode: string;

  @Column({ type: 'uuid', name: 'id_sensor_catalog', nullable: true })
  idSensorCatalog: string;

  @Column({ type: 'text', nullable: true, name: 'sensor_code' })
  sensorCode: string;

  @Column({ type: 'text', nullable: false })
  label: string;

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({ 
    type: 'text', 
    nullable: true, 
    default: 'active'
  })
  status: 'active' | 'maintenance' | 'inactive';

  @Column({ type: 'text', nullable: true, name: 'protocol_channel' })
  protocolChannel: string;

  @Column({ type: 'numeric', precision: 12, scale: 6, nullable: true, name: 'calibration_factor' })
  calibrationFactor: number;

  @Column({ type: 'integer', nullable: true, name: 'sampling_rate' })
  samplingRate: number;

  @Column({ type: 'date', nullable: true, name: 'install_date' })
  installDate: Date;

  @Column({ type: 'date', nullable: true, name: 'calibration_due_at' })
  calibrationDueAt: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Node, (node) => node.sensors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_node' })
  node: Node;

  @ManyToOne(() => SensorCatalog, (catalog) => catalog.sensors, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_sensor_catalog' })
  sensorCatalog: SensorCatalog;

  @OneToMany(() => SensorChannel, (channel) => channel.sensor)
  sensorChannels: SensorChannel[];

  // Removed: alertRules (moved to sensor-channels)
  // @OneToMany(() => AlertRule, (alertRule) => alertRule.sensor)
  // alertRules: AlertRule[];

  // Removed: dashboardWidgets (not in schema)
  // @OneToMany(() => DashboardWidget, (widget) => widget.sensor)
  // dashboardWidgets: DashboardWidget[];
}

