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

@Entity('owner_forwarding_databases')
export class OwnerForwardingDatabase {
  @PrimaryGeneratedColumn('uuid', { name: 'id_owner_forwarding_db' })
  idOwnerForwardingDb: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: false })
  idOwner: string;

  @Column({ type: 'text', nullable: false })
  label: string;

  @Column({ type: 'text', name: 'db_type', nullable: false })
  dbType: string;

  @Column({ type: 'text', nullable: false })
  host: string;

  @Column({ type: 'int', nullable: false })
  port: number;

  @Column({ type: 'text', name: 'database_name', nullable: false })
  databaseName: string;

  @Column({ type: 'text', nullable: false })
  username: string;

  @Column({ type: 'text', name: 'password_cipher', nullable: false })
  passwordCipher: string;

  @Column({ type: 'text', name: 'target_schema', nullable: true })
  targetSchema: string;

  @Column({ type: 'text', name: 'target_table', nullable: false })
  targetTable: string;

  @Column({ type: 'text', name: 'write_mode', default: 'append' })
  writeMode: string;

  @Column({ type: 'int', name: 'batch_size', default: 100 })
  batchSize: number;

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
  @ManyToOne(() => Owner, (owner) => owner.forwardingDatabases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;
}
