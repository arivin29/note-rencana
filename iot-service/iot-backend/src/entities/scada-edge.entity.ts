import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScadaDiagram } from './scada-diagram.entity';
import { ScadaNode } from './scada-node.entity';

@Entity('scada_edges')
export class ScadaEdge {
  @PrimaryGeneratedColumn('uuid', { name: 'id_scada_edge' })
  idScadaEdge: string;

  @Column({ type: 'uuid', name: 'id_scada_diagram' })
  idScadaDiagram: string;

  @Column({ type: 'uuid', name: 'source_node_id' })
  sourceNodeId: string;

  @Column({ type: 'uuid', name: 'target_node_id' })
  targetNodeId: string;

  @Column({ type: 'varchar', length: 50, name: 'edge_type', default: 'pipe' })
  edgeType: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'varchar', length: 20, name: 'pipe_type', nullable: true })
  pipeType: string | null;

  @Column({ type: 'varchar', length: 20, name: 'flow_direction', nullable: true })
  flowDirection: string | null;

  @Column({ type: 'boolean', default: false })
  animated: boolean;

  @Column({ type: 'jsonb', name: 'style_json', default: () => "'{}'::jsonb" })
  styleJson: Record<string, any>;

  @Column({ type: 'jsonb', name: 'config_json', default: () => "'{}'::jsonb" })
  configJson: Record<string, any>;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ScadaDiagram, (diagram) => diagram.edges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_scada_diagram' })
  diagram: ScadaDiagram;

  @ManyToOne(() => ScadaNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_node_id' })
  sourceNode: ScadaNode;

  @ManyToOne(() => ScadaNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_node_id' })
  targetNode: ScadaNode;
}
