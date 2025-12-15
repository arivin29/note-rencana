import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { NodeModel } from './node-model.entity';
import { Project } from './project.entity';
import { Node } from './node.entity';

@Entity('node_unpaired_devices')
export class NodeUnpairedDevice {
  @PrimaryColumn('uuid', { name: 'id_node_unpaired_device', default: () => 'gen_random_uuid()' })
  idNodeUnpairedDevice: string;

  @Column('text', { name: 'hardware_id' })
  hardwareId: string;

  @Column('uuid', { name: 'id_node_model', nullable: true })
  idNodeModel: string;

  @Column('timestamp with time zone', { name: 'first_seen_at', default: () => 'now()' })
  firstSeenAt: Date;

  @Column('timestamp with time zone', { name: 'last_seen_at', default: () => 'now()' })
  lastSeenAt: Date;

  @Column({
    type: 'jsonb',
    name: 'last_payload',
    nullable: true,
    transformer: {
      to: (value: any) => value, // To database: keep as is
      from: (value: any) => {
        // From database: ensure it's array
        if (Array.isArray(value)) {
          return value;
        }
        // If it's object (old format), return empty array
        if (value && typeof value === 'object') {
          return [];
        }
        // If null/undefined, return empty array
        return [];
      },
    },
  })
  lastPayload: any[]; // Array of payload history (keeping last 10)

  @Column('text', { name: 'last_topic', nullable: true })
  lastTopic: string;

  @Column('integer', { name: 'seen_count', default: 1 })
  seenCount: number;

  @Column('uuid', { name: 'suggested_project', nullable: true })
  suggestedProject: string;

  @Column('uuid', { name: 'suggested_owner', nullable: true })
  suggestedOwner: string;

  @Column('uuid', { name: 'paired_node_id', nullable: true })
  pairedNodeId: string;

  @Column('text', { name: 'status', default: 'pending' })
  status: string; // 'pending' | 'paired' | 'ignored'

  // Relations
  @ManyToOne(() => NodeModel)
  @JoinColumn({ name: 'id_node_model' })
  nodeModel: NodeModel;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'suggested_project' })
  project: Project;

  @ManyToOne(() => Node)
  @JoinColumn({ name: 'paired_node_id' })
  pairedNode: Node;
}
