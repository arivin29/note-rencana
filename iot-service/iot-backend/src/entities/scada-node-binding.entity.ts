import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScadaNode } from './scada-node.entity';
import { SensorChannel } from './sensor-channel.entity';

@Entity('scada_node_bindings')
export class ScadaNodeBinding {
  @PrimaryGeneratedColumn('uuid', { name: 'id_scada_node_binding' })
  idScadaNodeBinding: string;

  @Column({ type: 'uuid', name: 'id_scada_node' })
  idScadaNode: string;

  @Column({ type: 'varchar', length: 100, name: 'binding_key' })
  bindingKey: string;

  @Column({ type: 'uuid', name: 'id_sensor_channel' })
  idSensorChannel: string;

  @Column({ type: 'varchar', length: 255, name: 'display_label', nullable: true })
  displayLabel: string | null;

  @Column({ type: 'varchar', length: 50, name: 'unit_override', nullable: true })
  unitOverride: string | null;

  @Column({ type: 'jsonb', name: 'transform_json', nullable: true })
  transformJson: Record<string, any> | null;

  @Column({ type: 'integer', name: 'priority_order', default: 0 })
  priorityOrder: number;

  @Column({ type: 'boolean', name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ScadaNode, (node) => node.bindings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_scada_node' })
  node: ScadaNode;

  @ManyToOne(() => SensorChannel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_sensor_channel' })
  sensorChannel: SensorChannel;
}
