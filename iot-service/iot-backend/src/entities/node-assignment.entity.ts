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
import { NodeLocation } from './node-location.entity';

@Entity('node_assignments')
export class NodeAssignment {
  @PrimaryGeneratedColumn('uuid', { name: 'id_node_assignment' })
  idNodeAssignment: string;

  @Column({ type: 'uuid', name: 'id_node', nullable: false })
  idNode: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: false })
  idProject: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: false })
  idOwner: string;

  @Column({ type: 'uuid', name: 'id_node_location', nullable: true })
  idNodeLocation: string;

  @Column({ type: 'timestamptz', name: 'start_at', nullable: false })
  startAt: Date;

  @Column({ type: 'timestamptz', name: 'end_at', nullable: true })
  endAt: Date;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'uuid', name: 'assigned_by', nullable: true })
  assignedBy: string;

  @Column({ type: 'text', name: 'ticket_ref', nullable: true })
  ticketRef: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Node, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_node' })
  node: Node;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  @ManyToOne(() => NodeLocation)
  @JoinColumn({ name: 'id_node_location' })
  nodeLocation: NodeLocation;
}
