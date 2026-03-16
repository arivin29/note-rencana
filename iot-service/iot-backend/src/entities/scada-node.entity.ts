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
import { ScadaDiagram } from './scada-diagram.entity';
import { Node } from './node.entity';
import { Sensor } from './sensor.entity';
import { ScadaNodeBinding } from './scada-node-binding.entity';

@Entity('scada_nodes')
export class ScadaNode {
  @PrimaryGeneratedColumn('uuid', { name: 'id_scada_node' })
  idScadaNode: string;

  @Column({ type: 'uuid', name: 'id_scada_diagram' })
  idScadaDiagram: string;

  @Column({ type: 'varchar', length: 50, name: 'node_type' })
  nodeType: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'double precision', name: 'position_x' })
  positionX: number;

  @Column({ type: 'double precision', name: 'position_y' })
  positionY: number;

  @Column({ type: 'double precision' })
  width: number;

  @Column({ type: 'double precision' })
  height: number;

  @Column({ type: 'double precision', name: 'rotation_deg', nullable: true })
  rotationDeg: number | null;

  @Column({ type: 'integer', name: 'z_index', default: 0 })
  zIndex: number;

  @Column({ type: 'uuid', name: 'id_related_node', nullable: true })
  idRelatedNode: string | null;

  @Column({ type: 'uuid', name: 'id_related_sensor', nullable: true })
  idRelatedSensor: string | null;

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

  @ManyToOne(() => ScadaDiagram, (diagram) => diagram.nodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_scada_diagram' })
  diagram: ScadaDiagram;

  @ManyToOne(() => Node, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_related_node' })
  relatedNode: Node | null;

  @ManyToOne(() => Sensor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_related_sensor' })
  relatedSensor: Sensor | null;

  @OneToMany(() => ScadaNodeBinding, (binding) => binding.node)
  bindings: ScadaNodeBinding[];
}
