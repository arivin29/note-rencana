import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { DashboardWidget } from './dashboard-widget.entity';

@Entity('user_dashboards')
@Index(['userId', 'idProject'])
export class UserDashboard {
  @PrimaryGeneratedColumn('uuid', { name: 'id_user_dashboard' })
  idUserDashboard: string;

  @Column({ type: 'text', name: 'user_id', nullable: false })
  userId: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: true })
  idProject: string;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', nullable: true })
  layout: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.userDashboards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @OneToMany(() => DashboardWidget, (widget) => widget.userDashboard)
  dashboardWidgets: DashboardWidget[];
}
