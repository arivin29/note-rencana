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
import { AlertRule } from './alert-rule.entity';
import { DashboardWidget } from './dashboard-widget.entity';

@Entity('sensors')
export class Sensor {
  @PrimaryGeneratedColumn('uuid', { name: 'id_sensor' })
  idSensor: string;

  @Column({ type: 'uuid', name: 'id_node', nullable: false })
  idNode: string;

  @Column({ type: 'uuid', name: 'id_sensor_catalog', nullable: true })
  idSensorCatalog: string;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', unique: true, nullable: false })
  identifier: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'maintenance', 'error'],
    default: 'active',
  })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  calibration: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

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

  @OneToMany(() => AlertRule, (alertRule) => alertRule.sensor)
  alertRules: AlertRule[];

  @OneToMany(() => DashboardWidget, (widget) => widget.sensor)
  dashboardWidgets: DashboardWidget[];
}
