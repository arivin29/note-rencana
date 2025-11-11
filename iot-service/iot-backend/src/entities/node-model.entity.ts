import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Node } from './node.entity';

@Entity('node_models')
export class NodeModel {
  @PrimaryGeneratedColumn('uuid', { name: 'id_node_model' })
  idNodeModel: string;

  @Column({ type: 'text', unique: true, nullable: true, name: 'model_code' })
  modelCode: string;

  @Column({ type: 'text', nullable: false })
  vendor: string;

  @Column({ type: 'text', nullable: false, name: 'model_name' })
  modelName: string;

  @Column({ type: 'text', nullable: false })
  protocol: string;

  @Column({ type: 'text', nullable: true, name: 'communication_band' })
  communicationBand: string;

  @Column({ type: 'text', nullable: true, name: 'power_type' })
  powerType: string;

  @Column({ type: 'text', nullable: true, name: 'hardware_class' })
  hardwareClass: string;

  @Column({ type: 'text', nullable: true, name: 'hardware_revision' })
  hardwareRevision: string;

  @Column({ type: 'text', nullable: true })
  toolchain: string;

  @Column({ type: 'text', nullable: true, name: 'build_agent' })
  buildAgent: string;

  @Column({ type: 'text', nullable: true, name: 'firmware_repo' })
  firmwareRepo: string;

  @Column({ type: 'text', nullable: true, name: 'flash_protocol' })
  flashProtocol: string;

  @Column({ type: 'boolean', default: false, name: 'supports_codegen' })
  supportsCodegen: boolean;

  @Column({ type: 'text', nullable: true, name: 'default_firmware' })
  defaultFirmware: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Node, (node) => node.nodeModel)
  nodes: Node[];
}

