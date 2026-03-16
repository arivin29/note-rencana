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
import { Owner } from './owner.entity';
import { Project } from './project.entity';
import { ScadaNode } from './scada-node.entity';
import { ScadaEdge } from './scada-edge.entity';

@Entity('scada_diagrams')
export class ScadaDiagram {
  @PrimaryGeneratedColumn('uuid', { name: 'id_scada_diagram' })
  idScadaDiagram: string;

  @Column({ type: 'uuid', name: 'id_owner' })
  idOwner: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: true })
  idProject: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, name: 'diagram_code', nullable: true })
  diagramCode: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'jsonb', name: 'canvas_config', default: () => "'{}'::jsonb" })
  canvasConfig: Record<string, any>;

  @Column({ type: 'jsonb', name: 'runtime_config', default: () => "'{}'::jsonb" })
  runtimeConfig: Record<string, any>;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_project' })
  project: Project | null;

  @OneToMany(() => ScadaNode, (node) => node.diagram)
  nodes: ScadaNode[];

  @OneToMany(() => ScadaEdge, (edge) => edge.diagram)
  edges: ScadaEdge[];
}
