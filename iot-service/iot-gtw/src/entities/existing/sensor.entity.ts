import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Node } from './node.entity';
import { SensorChannel } from './sensor-channel.entity';

@Entity('sensors')
export class Sensor {
  @PrimaryColumn('uuid', { name: 'id_sensor' })
  idSensor: string;

  @Column('uuid', { name: 'id_node' })
  idNode: string;

  @Column('uuid', { name: 'id_sensor_catalog', nullable: true })
  idSensorCatalog: string;

  @Column('text')
  label: string;

  @Column('text', { name: 'sensor_code', nullable: true })
  sensorCode: string;

  @Column('text', { nullable: true })
  location: string;

  @Column('text', { nullable: true })
  status: string;

  @Column('text', { name: 'protocol_channel', nullable: true })
  protocolChannel: string;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column('timestamp with time zone', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Node, node => node.sensors)
  @JoinColumn({ name: 'id_node' })
  node: Node;

  @OneToMany(() => SensorChannel, channel => channel.sensor)
  channels: SensorChannel[];
}
