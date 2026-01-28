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
import { Owner } from './owner.entity';

@Entity('widget_query_templates')
@Index(['idOwner'])
export class WidgetQueryTemplate {
  @PrimaryGeneratedColumn('uuid', { name: 'id_template' })
  idTemplate: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: true })
  idOwner: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', name: 'sql_template', nullable: false })
  sqlTemplate: string;

  @Column({ type: 'varchar', length: 50, name: 'widget_type', nullable: true })
  widgetType: string;

  @Column({ type: 'jsonb', name: 'default_config', default: {} })
  defaultConfig: Record<string, any>;

  @Column({ type: 'boolean', name: 'is_system', default: false })
  isSystem: boolean;

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
}
