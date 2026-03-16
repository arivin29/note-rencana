import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SensorChannel } from './sensor-channel.entity';

/**
 * AnomalyResult entity - stores ML anomaly detection results
 * Synced from OpenSearch RCF detection or Z-score analysis
 */
@Entity('anomaly_results')
@Index(['idSensorChannel', 'detectedAt'])
@Index(['detectorId', 'detectedAt'])
export class AnomalyResult {
  @PrimaryGeneratedColumn('uuid', { name: 'id_anomaly_result' })
  idAnomalyResult: string;

  @Column({ type: 'uuid', name: 'id_sensor_channel', nullable: false })
  idSensorChannel: string;

  @Column({ type: 'timestamptz', name: 'detected_at', nullable: false })
  detectedAt: Date;

  @Column({ type: 'double precision', name: 'actual_value', nullable: false })
  actualValue: number;

  @Column({ type: 'double precision', name: 'expected_value', nullable: true })
  expectedValue: number;

  @Column({ type: 'double precision', name: 'anomaly_score', nullable: false })
  anomalyScore: number;

  @Column({ 
    type: 'text', 
    name: 'anomaly_grade',
    nullable: false,
    comment: 'mild | moderate | severe | critical'
  })
  anomalyGrade: string;

  @Column({ type: 'text', name: 'anomaly_type', nullable: false })
  anomalyType: string;

  @Column({ type: 'text', name: 'detector_id', nullable: true })
  detectorId: string;

  @Column({ type: 'text', name: 'detector_name', nullable: true })
  detectorName: string;

  @Column({ type: 'jsonb', name: 'opensearch_result', nullable: true })
  opensearchResult: Record<string, any>;

  @Column({ type: 'uuid', name: 'id_alert_event', nullable: true })
  idAlertEvent: string;

  @Column({ 
    type: 'boolean', 
    name: 'is_acknowledged', 
    default: false 
  })
  isAcknowledged: boolean;

  @Column({ type: 'uuid', name: 'acknowledged_by', nullable: true })
  acknowledgedBy: string;

  @Column({ type: 'timestamptz', name: 'acknowledged_at', nullable: true })
  acknowledgedAt: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => SensorChannel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sensor_channel' })
  sensorChannel: SensorChannel;
}
