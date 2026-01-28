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
import { Owner } from './owner.entity';

@Entity('custom_dashboards')
@Index(['idOwner'])
export class CustomDashboard {
  @PrimaryGeneratedColumn('uuid', { name: 'id_dashboard' })
  idDashboard: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: false })
  idOwner: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', name: 'layout_config', default: {} })
  layoutConfig: Record<string, any>;

  @Column({ type: 'varchar', length: 20, name: 'time_range', default: '6h' })
  timeRange: string;

  @Column({ type: 'integer', name: 'refresh_interval', default: 60 })
  refreshInterval: number;

  @Column({ type: 'boolean', name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  @OneToMany('CustomWidget', 'dashboard', { cascade: true })
  widgets: any[];
}
