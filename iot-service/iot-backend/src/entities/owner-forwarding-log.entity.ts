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
  @PrimaryGeneratedColumn('uuid', { name: 'id_forwarding_log' })
  idForwardingLog: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: false })
  idOwner: string;

  @Column({ type: 'uuid', name: 'forwarding_id', nullable: false })
  forwardingId: string;

  @Column({
    type: 'enum',
    enum: ['webhook', 'database'],
    nullable: false,
  })
  forwardingType: string;

  @Column({ type: 'timestamptz', name: 'attempted_at', nullable: false })
  attemptedAt: Date;

  @Column({
    type: 'enum',
    enum: ['success', 'failed', 'retrying'],
    nullable: false,
  })
  status: string;

  @Column({ type: 'int', name: 'attempt_number', default: 1 })
  attemptNumber: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  requestData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  responseData: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Owner, (owner) => owner.forwardingLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;
}
