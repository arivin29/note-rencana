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
@Index(['idUser', 'idProject'])
export class UserDashboard {
  @PrimaryGeneratedColumn('uuid', { name: 'id_dashboard' })
  idDashboard: string;

  @Column({ type: 'uuid', name: 'id_user', nullable: false })
  idUser: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: true })
  idProject: string;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', name: 'layout_type', default: 'grid' })
  layoutType: string;

  @Column({ type: 'integer', name: 'grid_cols', default: 4 })
  gridCols: number;

  @Column({ type: 'boolean', name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'boolean', name: 'is_public', default: false })
  isPublic: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @OneToMany(() => DashboardWidget, (widget) => widget.dashboard)
  widgets: DashboardWidget[];
}
