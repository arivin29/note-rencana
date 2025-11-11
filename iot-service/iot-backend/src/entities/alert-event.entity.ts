import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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

  @Column({ type: 'timestamptz', name: 'acknowledged_at', nullable: true })
  acknowledgedAt: Date;

  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true })
  resolvedAt: Date;

  @Column({
    type: 'enum',
    enum: ['triggered', 'acknowledged', 'resolved', 'dismissed'],
    default: 'triggered',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => AlertRule, (rule) => rule.alertEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_alert_rule' })
  alertRule: AlertRule;
}
