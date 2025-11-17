import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserDashboard } from './user-dashboard.entity';
import { Sensor } from './sensor.entity';
import { SensorChannel } from './sensor-channel.entity';

@Entity('dashboard_widgets')
@Index(['idDashboard', 'idSensor'])
export class DashboardWidget {
  @PrimaryGeneratedColumn('uuid', { name: 'id_widget_instance' })
  idWidgetInstance: string;

  @Column({ type: 'uuid', name: 'id_dashboard', nullable: false })
  idDashboard: string;

  @Column({ type: 'text', name: 'widget_type', nullable: false })
  widgetType: string;

  @Column({ type: 'uuid', name: 'id_sensor', nullable: true })
  idSensor: string;

  @Column({ type: 'uuid', name: 'id_sensor_channel', nullable: true })
  idSensorChannel: string;

  @Column({ type: 'integer', name: 'position_x', default: 0 })
  positionX: number;

  @Column({ type: 'integer', name: 'position_y', default: 0 })
  positionY: number;

  @Column({ type: 'integer', name: 'size_width', default: 1 })
  sizeWidth: number;

  @Column({ type: 'integer', name: 'size_height', default: 1 })
  sizeHeight: number;

  @Column({ type: 'jsonb', name: 'config_json', nullable: true })
  configJson: Record<string, any>;

  @Column({ type: 'integer', name: 'refresh_rate', default: 5 })
  refreshRate: number;

  @Column({ type: 'integer', name: 'display_order', nullable: true })
  displayOrder: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserDashboard, (dashboard) => dashboard.widgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_dashboard' })
  dashboard: UserDashboard;

  @ManyToOne(() => Sensor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sensor' })
  sensor: Sensor;

  @ManyToOne(() => SensorChannel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sensor_channel' })
  sensorChannel: SensorChannel;
}
