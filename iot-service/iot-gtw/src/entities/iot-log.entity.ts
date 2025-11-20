import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { LogLabel } from '../common/enums';

@Entity('iot_log')
@Index(['label'])
@Index(['deviceId'])
@Index(['processed'])
@Index(['createdAt'])
export class IotLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LogLabel,
    default: LogLabel.LOG,
  })
  label: LogLabel;

  @Column({ type: 'varchar', length: 500, nullable: true })
  topic: string;

  @Column({ type: 'jsonb', nullable: false })
  payload: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'device_id' })
  deviceId: string;

  @Column({ type: 'timestamp', nullable: false })
  timestamp: Date;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
