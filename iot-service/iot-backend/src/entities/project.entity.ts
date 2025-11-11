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
import { Node } from './node.entity';
import { NodeLocation } from './node-location.entity';
import { NodeAssignment } from './node-assignment.entity';
import { UserDashboard } from './user-dashboard.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid', { name: 'id_project' })
  idProject: string;

  @Column({ type: 'uuid', name: 'id_owner' })
  idOwner: string;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true, name: 'area_type' })
  areaType: string;

  @Column({ type: 'jsonb', nullable: true })
  geofence: any;

  @Column({ type: 'text', default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Owner, (owner) => owner.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  @OneToMany(() => NodeLocation, (location) => location.project)
  nodeLocations: NodeLocation[];

  @OneToMany(() => Node, (node) => node.project)
  nodes: Node[];

  @OneToMany(() => NodeAssignment, (assignment) => assignment.project)
  nodeAssignments: NodeAssignment[];

  @OneToMany(() => UserDashboard, (dashboard) => dashboard.project)
  userDashboards: UserDashboard[];
}
