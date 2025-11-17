import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Owner } from './owner.entity';

@Entity('owner_forwarding_logs')
export class OwnerForwardingLog {
  @PrimaryGeneratedColumn('uuid', { name: 'id_owner_forwarding_log' })
  idOwnerForwardingLog: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: false })
  idOwner: string;

  @Column({ type: 'text', name: 'config_type', nullable: false })
  configType: string;

  @Column({ type: 'uuid', name: 'config_id', nullable: false })
  configId: string;

  @Column({ type: 'text', nullable: false })
  status: string;

  @Column({ type: 'int', default: 1 })
  attempts: number;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', name: 'duration_ms', nullable: true })
  durationMs: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Owner, (owner) => owner.forwardingLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;
}
