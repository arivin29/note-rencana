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

@Entity('forecast_results')
@Index(['idSensorChannel', 'forecastTime'])
@Index(['forecastBatchId'])
export class ForecastResult {
  @PrimaryGeneratedColumn('uuid', { name: 'id_forecast_result' })
  idForecastResult: string;

  @Column({ type: 'uuid', name: 'id_sensor_channel', nullable: false })
  idSensorChannel: string;

  @Column({ type: 'text', name: 'forecast_batch_id', nullable: false })
  forecastBatchId: string;

  @Column({ type: 'timestamptz', name: 'generated_at', nullable: false })
  generatedAt: Date;

  @Column({ type: 'timestamptz', name: 'forecast_time', nullable: false })
  forecastTime: Date;

  @Column({ type: 'double precision', name: 'predicted_value', nullable: false })
  predictedValue: number;

  @Column({ type: 'double precision', name: 'lower_bound', nullable: true })
  lowerBound: number;

  @Column({ type: 'double precision', name: 'upper_bound', nullable: true })
  upperBound: number;

  @Column({ type: 'double precision', name: 'confidence', nullable: true })
  confidence: number;

  @Column({ type: 'text', name: 'model_type', nullable: true })
  modelType: string;

  @Column({ type: 'jsonb', name: 'model_metadata', nullable: true })
  modelMetadata: Record<string, any>;

  @Column({ 
    type: 'boolean', 
    name: 'is_current', 
    default: true,
    comment: 'True jika ini forecast terbaru untuk time slot tersebut'
  })
  isCurrent: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => SensorChannel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sensor_channel' })
  sensorChannel: SensorChannel;
}
