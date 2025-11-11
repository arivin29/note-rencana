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

@Entity('dashboard_widgets')
@Index(['idUserDashboard', 'idSensor'])
export class DashboardWidget {
  @PrimaryGeneratedColumn('uuid', { name: 'id_dashboard_widget' })
  idDashboardWidget: string;

  @Column({ type: 'uuid', name: 'id_user_dashboard', nullable: false })
  idUserDashboard: string;

  @Column({ type: 'uuid', name: 'id_sensor', nullable: true })
  idSensor: string;

  @Column({
    type: 'enum',
    enum: ['chart', 'gauge', 'value', 'table', 'map', 'status'],
    nullable: false,
  })
  widgetType: string;

  @Column({ type: 'text', nullable: false })
  title: string;

  @Column({ type: 'jsonb', nullable: true })
  configuration: Record<string, any>;

  @Column({ type: 'int', nullable: false })
  position: number;

  @Column({ type: 'jsonb', nullable: true })
  size: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserDashboard, (dashboard) => dashboard.dashboardWidgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_user_dashboard' })
  userDashboard: UserDashboard;

  @ManyToOne(() => Sensor, (sensor) => sensor.dashboardWidgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sensor' })
  sensor: Sensor;
}
