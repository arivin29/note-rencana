import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NodeModel } from './node-model.entity';

export enum CommandChannel {
  SMS = 'sms',
  MQTT = 'mqtt',
  HTTP = 'http',
  CALL = 'call',
  TELEGRAM = 'telegram',
}

@Entity('node_model_commands')
export class NodeModelCommand {
  @PrimaryGeneratedColumn('uuid', { name: 'id_command' })
  idCommand: string;

  @Column({ type: 'uuid', name: 'id_node_model' })
  idNodeModel: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  code: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  label: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  channel: string;

  @Column({ type: 'text', nullable: false })
  template: string;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: 'fa-terminal' })
  icon: string;

  @Column({ type: 'varchar', length: 20, default: 'primary' })
  color: string;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => NodeModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_node_model' })
  nodeModel: NodeModel;
}
