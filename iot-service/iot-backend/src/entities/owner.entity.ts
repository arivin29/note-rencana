import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Project } from './project.entity';
import { NodeAssignment } from './node-assignment.entity';
import { OwnerForwardingWebhook } from './owner-forwarding-webhook.entity';
import { OwnerForwardingDatabase } from './owner-forwarding-database.entity';
import { OwnerForwardingLog } from './owner-forwarding-log.entity';

@Entity('owners')
export class Owner {
  @PrimaryGeneratedColumn('uuid', { name: 'id_owner' })
  idOwner: string;

  @Column({ type: 'varchar', length: 5, unique: true, nullable: false, name: 'owner_code' })
  ownerCode: string;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  industry: string;

  @Column({ type: 'text', nullable: true, name: 'contact_person' })
  contactPerson: string;

  @Column({ type: 'text', nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true, name: 'sla_level' })
  slaLevel: string;

  @Column({ type: 'jsonb', nullable: true, name: 'forwarding_settings' })
  forwardingSettings: any;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Project, (project) => project.owner)
  projects: Project[];

  @OneToMany(() => NodeAssignment, (assignment) => assignment.owner)
  nodeAssignments: NodeAssignment[];

  @OneToMany(() => OwnerForwardingWebhook, (webhook) => webhook.owner)
  forwardingWebhooks: OwnerForwardingWebhook[];

  @OneToMany(() => OwnerForwardingDatabase, (database) => database.owner)
  forwardingDatabases: OwnerForwardingDatabase[];

  @OneToMany(() => OwnerForwardingLog, (log) => log.owner)
  forwardingLogs: OwnerForwardingLog[];
}
