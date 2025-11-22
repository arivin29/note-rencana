import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { NodeModel } from './node-model.entity';
import { NodeProfile } from './node-profile.entity';
import { Sensor } from './sensor.entity';

@Entity('nodes')
export class Node {
  @PrimaryColumn('uuid', { name: 'id_node' })
  idNode: string;

  @Column('uuid', { name: 'id_project' })
  idProject: string;

  @Column('uuid', { name: 'id_node_model' })
  idNodeModel: string;

  @Column('uuid', { name: 'id_node_profile', nullable: true })
  idNodeProfile: string;

  @Column('text')
  code: string;

  @Column('text', { name: 'serial_number', nullable: true })
  serialNumber: string;

  @Column('text', { name: 'dev_eui', nullable: true })
  devEui: string;

  @Column('inet', { name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column('text', { name: 'firmware_version', nullable: true })
  firmwareVersion: string;

  @Column('text', { name: 'connectivity_status', default: 'offline' })
  connectivityStatus: string;

  @Column('timestamp with time zone', { name: 'last_seen_at', nullable: true })
  lastSeenAt: Date;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column('timestamp with time zone', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => NodeModel)
  @JoinColumn({ name: 'id_node_model' })
  nodeModel: NodeModel;

  @ManyToOne(() => NodeProfile)
  @JoinColumn({ name: 'id_node_profile' })
  nodeProfile: NodeProfile;

  @OneToMany(() => Sensor, sensor => sensor.node)
  sensors: Sensor[];
}
