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
import { NodeModel } from './node-model.entity';
import { Project } from './project.entity';
import { Node } from './node.entity';

export interface ChannelMapping {
  metric_code: string;
  source_path: string;
  multiplier?: number;
  offset?: number;
  unit?: string;
}

export interface MappingJson {
  version: number;
  payload_format: string;
  timestamp_path?: string;
  channels: ChannelMapping[];
}

@Entity('node_profiles')
export class NodeProfile {
  @PrimaryGeneratedColumn('uuid', { name: 'id_node_profile' })
  idNodeProfile: string;

  @Column({ type: 'uuid', name: 'id_node_model', nullable: false })
  idNodeModel: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: true })
  idProject: string;

  @Column({ type: 'text', nullable: false })
  code: string;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', name: 'parser_type', nullable: false })
  parserType: string;

  @Column({ type: 'jsonb', name: 'mapping_json', nullable: false })
  mappingJson: MappingJson;

  @Column({ type: 'text', name: 'transform_script', nullable: true })
  transformScript: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => NodeModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_node_model' })
  nodeModel: NodeModel;

  @ManyToOne(() => Project, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @OneToMany(() => Node, (node) => node.nodeProfile)
  nodes: Node[];
}
