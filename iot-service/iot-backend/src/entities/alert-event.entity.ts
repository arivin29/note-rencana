import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlertRule } from './alert-rule.entity';

@Entity('alert_events')
export class AlertEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'id_alert_event' })
  idAlertEvent: string;

  @Column({ type: 'uuid', name: 'id_alert_rule', nullable: false })
  idAlertRule: string;

  @Column({ type: 'timestamptz', name: 'triggered_at', nullable: false })
  triggeredAt: Date;

  @Column({ type: 'double precision', nullable: true })
  value: number;

  @Column({ type: 'text', default: 'open' })
  status: string;

  @Column({ type: 'uuid', name: 'acknowledged_by', nullable: true })
  acknowledgedBy: string;

  @Column({ type: 'timestamptz', name: 'acknowledged_at', nullable: true })
  acknowledgedAt: Date;

  @Column({ type: 'uuid', name: 'cleared_by', nullable: true })
  clearedBy: string;

  @Column({ type: 'timestamptz', name: 'cleared_at', nullable: true })
  clearedAt: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => AlertRule, (rule) => rule.alertEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_alert_rule' })
  alertRule: AlertRule;
}
