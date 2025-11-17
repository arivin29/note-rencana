import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NodeModel } from './node-model.entity';
import { Project } from './project.entity';
import { Owner } from './owner.entity';
import { Node } from './node.entity';

@Entity('node_unpaired_devices')
export class NodeUnpairedDevice {
  @PrimaryGeneratedColumn('uuid', { name: 'id_node_unpaired_device' })
  idNodeUnpairedDevice: string;

  @Column({ type: 'text', name: 'hardware_id', nullable: false, unique: true })
  hardwareId: string;

  @Column({ type: 'uuid', name: 'id_node_model', nullable: true })
  idNodeModel: string;

  @Column({ type: 'timestamptz', name: 'first_seen_at', nullable: false, default: () => 'now()' })
  firstSeenAt: Date;

  @Column({ type: 'timestamptz', name: 'last_seen_at', nullable: false, default: () => 'now()' })
  lastSeenAt: Date;

  @Column({ type: 'jsonb', name: 'last_payload', nullable: true })
  lastPayload: any;

  @Column({ type: 'text', name: 'last_topic', nullable: true })
  lastTopic: string;

  @Column({ type: 'integer', name: 'seen_count', default: 1 })
  seenCount: number;

  @Column({ type: 'uuid', name: 'suggested_project', nullable: true })
  suggestedProject: string;

  @Column({ type: 'uuid', name: 'suggested_owner', nullable: true })
  suggestedOwner: string;

  @Column({ type: 'uuid', name: 'paired_node_id', nullable: true })
  pairedNodeId: string;

  @Column({ type: 'text', default: 'pending' })
  status: 'pending' | 'paired' | 'ignored';

  // Relations
  @ManyToOne(() => NodeModel, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_node_model' })
  nodeModel: NodeModel;

  @ManyToOne(() => Project, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'suggested_project' })
  project: Project;

  @ManyToOne(() => Owner, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'suggested_owner' })
  owner: Owner;

  @ManyToOne(() => Node, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paired_node_id' })
  pairedNode: Node;
}
