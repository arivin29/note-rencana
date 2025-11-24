import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Node } from './node.entity';

export enum LogLabel {
  TELEMETRY = 'telemetry',
  EVENT = 'event',
  PAIRING = 'pairing',
  ERROR = 'error',
  WARNING = 'warning',
  COMMAND = 'command',
  RESPONSE = 'response',
  DEBUG = 'debug',
  INFO = 'info',
  LOG = 'log',
}

@Entity('iot_log')
export class IotLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LogLabel,
    default: LogLabel.LOG,
    name: 'label',
  })
  label: LogLabel;

  @Column({ type: 'varchar', nullable: true })
  topic: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'varchar', name: 'device_id', nullable: true })
  deviceId: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relation to Node (device_id = node.code)
  @ManyToOne(() => Node, { nullable: true })
  @JoinColumn({ name: 'device_id', referencedColumnName: 'code' })
  node: Node;
}
