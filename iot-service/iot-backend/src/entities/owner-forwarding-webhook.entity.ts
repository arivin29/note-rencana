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
  @PrimaryGeneratedColumn('uuid', { name: 'id_owner_forwarding_webhook' })
  idOwnerForwardingWebhook: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: false })
  idOwner: string;

  @Column({ type: 'text', nullable: false })
  label: string;

  @Column({ type: 'text', name: 'endpoint_url', nullable: false })
  endpointUrl: string;

  @Column({ type: 'text', name: 'http_method', default: 'POST' })
  httpMethod: string;

  @Column({ type: 'jsonb', name: 'headers_json', nullable: true })
  headersJson: Record<string, any>;

  @Column({ type: 'text', name: 'secret_token', nullable: true })
  secretToken: string;

  @Column({ type: 'jsonb', name: 'payload_template', nullable: true })
  payloadTemplate: Record<string, any>;

  @Column({ type: 'int', name: 'max_retry', default: 3 })
  maxRetry: number;

  @Column({ type: 'int', name: 'retry_backoff_ms', default: 2000 })
  retryBackoffMs: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'text', name: 'last_status', nullable: true })
  lastStatus: string;

  @Column({ type: 'timestamptz', name: 'last_delivery_at', nullable: true })
  lastDeliveryAt: Date;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Owner, (owner) => owner.forwardingWebhooks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;
}
