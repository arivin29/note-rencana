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
  @PrimaryGeneratedColumn('uuid', { name: 'id_forwarding_database' })
  idForwardingDatabase: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: false })
  idOwner: string;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({
    type: 'enum',
    enum: ['postgresql', 'mysql', 'mongodb', 'influxdb', 'timescaledb'],
    nullable: false,
  })
  dbType: string;

  @Column({ type: 'text', nullable: false })
  host: string;

  @Column({ type: 'int', nullable: false })
  port: number;

  @Column({ type: 'text', nullable: false })
  database: string;

  @Column({ type: 'text', nullable: false })
  username: string;

  @Column({ type: 'text', nullable: false })
  password: string;

  @Column({ type: 'text', nullable: true })
  tableName: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  connectionOptions: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Owner, (owner) => owner.forwardingDatabases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;
}
