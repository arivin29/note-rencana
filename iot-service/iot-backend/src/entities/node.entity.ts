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
import { Project } from './project.entity';
import { NodeModel } from './node-model.entity';
import { NodeAssignment } from './node-assignment.entity';
import { Sensor } from './sensor.entity';
import { AlertRule } from './alert-rule.entity';

@Entity('nodes')
export class Node {
  @PrimaryGeneratedColumn('uuid', { name: 'id_node' })
  idNode: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: false })
  idProject: string;

  @Column({ type: 'uuid', name: 'id_node_model', nullable: true })
  idNodeModel: string;

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
  configuration: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.nodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @ManyToOne(() => NodeModel, (nodeModel) => nodeModel.nodes, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_node_model' })
  nodeModel: NodeModel;

  @OneToMany(() => NodeAssignment, (assignment) => assignment.node)
  nodeAssignments: NodeAssignment[];

  @OneToMany(() => Sensor, (sensor) => sensor.node)
  sensors: Sensor[];

  @OneToMany(() => AlertRule, (alertRule) => alertRule.node)
  alertRules: AlertRule[];
}
