import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Owner } from './owner.entity';

@Entity('owner_forwarding_webhooks')
export class OwnerForwardingWebhook {
  @PrimaryGeneratedColumn('uuid', { name: 'id_forwarding_webhook' })
  idForwardingWebhook: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: false })
  idOwner: string;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: false })
  url: string;

  @Column({
    type: 'enum',
    enum: ['POST', 'PUT', 'PATCH'],
    default: 'POST',
  })
  method: string;

  @Column({ type: 'jsonb', nullable: true })
  headers: Record<string, any>;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'int', name: 'retry_count', default: 3 })
  retryCount: number;

  @Column({ type: 'int', name: 'timeout_seconds', default: 30 })
  timeoutSeconds: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Owner, (owner) => owner.forwardingWebhooks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;
}
