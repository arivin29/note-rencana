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

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

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

  @Column({ type: 'uuid', nullable: true, name: 'id_node_profile' })
  idNodeProfile: string;

  // ========== Location Fields ==========
  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'postal_code' })
  postalCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'Indonesia' })
  country: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'elevation_m' })
  elevationM: number;

  // ========== Status & Maintenance ==========
  @Column({ type: 'varchar', length: 20, nullable: true, default: 'active' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'commissioned_at' })
  commissionedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_maintenance_at' })
  lastMaintenanceAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'next_maintenance_at' })
  nextMaintenanceAt: Date;

  // ========== Environment ==========
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'installation_type' })
  installationType: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'enclosure_rating' })
  enclosureRating: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'power_source' })
  powerSource: string;

  // ========== PIC (Person In Charge) ==========
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'pic_name' })
  picName: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'pic_phone' })
  picPhone: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'pic_email' })
  picEmail: string;

  // ========== Notes & Tags ==========
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[];

  // ========== Icon for WebGIS ==========
  @Column({ type: 'text', nullable: true, name: 'icon_url' })
  iconUrl: string;

  // ========== Timestamps ==========
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // ========== Relations ==========
  @ManyToOne(() => Project, (project) => project.nodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @ManyToOne(() => NodeModel, (nodeModel) => nodeModel.nodes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_node_model' })
  nodeModel: NodeModel;

  @ManyToOne(() => NodeProfile, (profile) => profile.nodes, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_node_profile' })
  nodeProfile: NodeProfile;

  @OneToMany(() => Sensor, (sensor) => sensor.node)
  sensors: Sensor[];
}

