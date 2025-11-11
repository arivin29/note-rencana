import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('node_locations')
export class NodeLocation {
  @PrimaryGeneratedColumn('uuid', { name: 'id_node_location' })
  idNodeLocation: string;

  @Column({ type: 'uuid', name: 'id_project' })
  idProject: string;

  @Column({ type: 'text', default: 'manual' })
  type: 'manual' | 'gps' | 'import';

  @Column({ type: 'point', nullable: false })
  coordinates: string;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  elevation: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, name: 'precision_m' })
  precisionM: number;

  @Column({ type: 'text', nullable: true })
  source: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.nodeLocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_project' })
  project: Project;
}
