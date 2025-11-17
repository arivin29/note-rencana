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
import { SensorChannel } from './sensor-channel.entity';
import { AlertEvent } from './alert-event.entity';

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn('uuid', { name: 'id_alert_rule' })
  idAlertRule: string;

  @Column({ type: 'uuid', name: 'id_sensor_channel', nullable: false })
  idSensorChannel: string;

  @Column({ type: 'text', nullable: false, name: 'rule_type' })
  ruleType: string;

  @Column({ type: 'text', nullable: true })
  severity: string;

  @Column({ type: 'jsonb', nullable: true, name: 'params_json' })
  paramsJson: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => SensorChannel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sensor_channel' })
  sensorChannel: SensorChannel;

  @OneToMany(() => AlertEvent, (event) => event.alertRule)
  alertEvents: AlertEvent[];
}
