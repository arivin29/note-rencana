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
import { Project } from './project.entity';
import { NodeModel } from './node-model.entity';
import { NodeLocation } from './node-location.entity';
import { NodeProfile } from './node-profile.entity';
import { Sensor } from './sensor.entity';

@Entity('nodes')
export class Node {
  @PrimaryGeneratedColumn('uuid', { name: 'id_node' })
  idNode: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: false })
  idProject: string;

  @Column({ type: 'uuid', name: 'id_node_model', nullable: false })
  idNodeModel: string;

  @Column({ type: 'text', nullable: false })
  code: string;

  @Column({ type: 'text', nullable: true, name: 'serial_number' })
  serialNumber: string;

  @Column({ type: 'text', nullable: true, name: 'dev_eui' })
  devEui: string;

  @Column({ type: 'inet', nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ type: 'date', nullable: true, name: 'install_date' })
  installDate: Date;

  @Column({ type: 'text', nullable: true, name: 'firmware_version' })
  firmwareVersion: string;

  @Column({ type: 'text', nullable: true, name: 'battery_type' })
  batteryType: string;

  @Column({ type: 'integer', nullable: false, default: 300, name: 'telemetry_interval_sec' })
  telemetryIntervalSec: number;

  @Column({ type: 'text', default: 'offline', name: 'connectivity_status' })
  connectivityStatus: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_seen_at' })
  lastSeenAt: Date;

  @Column({ type: 'uuid', nullable: true, name: 'id_current_location' })
  idCurrentLocation: string;

  @Column({ type: 'uuid', nullable: true, name: 'id_node_profile' })
  idNodeProfile: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.nodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @ManyToOne(() => NodeModel, (nodeModel) => nodeModel.nodes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_node_model' })
  nodeModel: NodeModel;

  @ManyToOne(() => NodeLocation, { nullable: true })
  @JoinColumn({ name: 'id_current_location' })
  currentLocation: NodeLocation;

  @ManyToOne(() => NodeProfile, (profile) => profile.nodes, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_node_profile' })
  nodeProfile: NodeProfile;

  @OneToMany(() => Sensor, (sensor) => sensor.node)
  sensors: Sensor[];
}

