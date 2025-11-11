import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Node } from './node.entity';
import { Sensor } from './sensor.entity';
import { AlertEvent } from './alert-event.entity';

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn('uuid', { name: 'id_alert_rule' })
  idAlertRule: string;

  @Column({ type: 'uuid', name: 'id_node', nullable: true })
  idNode: string;

  @Column({ type: 'uuid', name: 'id_sensor', nullable: true })
  idSensor: string;

  @Column({ type: 'text', nullable: false })
  ruleName: string;

  @Column({
    type: 'enum',
    enum: ['threshold', 'range', 'delta', 'pattern', 'offline'],
    nullable: false,
  })
  ruleType: string;

  @Column({ type: 'jsonb', nullable: false })
  conditions: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'warning',
  })
  severity: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  notificationSettings: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Node, (node) => node.alertRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_node' })
  node: Node;

  @ManyToOne(() => Sensor, (sensor) => sensor.alertRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sensor' })
  sensor: Sensor;

  @OneToMany(() => AlertEvent, (event) => event.alertRule)
  alertEvents: AlertEvent[];
}
