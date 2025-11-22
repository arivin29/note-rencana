import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { NodeModel } from './node-model.entity';

export interface NodeProfileMapping {
  sensors: Array<{
    label: string;
    catalogId: string;
    channels: Array<{
      channelCode: string;
      payloadPath: string;
      unit: string;
    }>;
  }>;
  metadata: {
    deviceId?: { path: string; type: string };
    timestamp?: { path: string; type: string };
    signalQuality?: { path: string; type: string };
  };
}

@Entity('node_profiles')
export class NodeProfile {
  @PrimaryColumn('uuid', { name: 'id_node_profile' })
  idNodeProfile: string;

  @Column('uuid', { name: 'id_node_model' })
  idNodeModel: string;

  @Column('uuid', { name: 'id_project', nullable: true })
  idProject: string;

  @Column('text')
  code: string;

  @Column('text')
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { name: 'parser_type' })
  parserType: string;

  @Column('jsonb', { name: 'mapping_json' })
  mappingJson: NodeProfileMapping;

  @Column('text', { name: 'transform_script', nullable: true })
  transformScript: string;

  @Column('boolean', { default: true })
  enabled: boolean;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column('timestamp with time zone', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => NodeModel)
  @JoinColumn({ name: 'id_node_model' })
  nodeModel: NodeModel;
}
