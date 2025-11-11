import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Owner } from './owner.entity';
import { Project } from './project.entity';
import { Node } from './node.entity';

@Entity('node_assignments')
export class NodeAssignment {
  @PrimaryGeneratedColumn('uuid', { name: 'id_node_assignment' })
  idNodeAssignment: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: false })
  idOwner: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: false })
  idProject: string;

  @Column({ type: 'uuid', name: 'id_node', nullable: false })
  idNode: string;

  @Column({ type: 'timestamptz', name: 'assigned_at', nullable: false })
  assignedAt: Date;

  @Column({ type: 'timestamptz', name: 'unassigned_at', nullable: true })
  unassignedAt: Date;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Owner, (owner) => owner.nodeAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  @ManyToOne(() => Project, (project) => project.nodeAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @ManyToOne(() => Node, (node) => node.nodeAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_node' })
  node: Node;
}
