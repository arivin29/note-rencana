import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('node_models')
export class NodeModel {
  @PrimaryColumn('uuid', { name: 'id_node_model' })
  idNodeModel: string;

  @Column('text', { name: 'model_code', unique: true, nullable: true })
  modelCode: string;

  @Column('text')
  vendor: string;

  @Column('text', { name: 'model_name' })
  modelName: string;

  @Column('text')
  protocol: string;

  @Column('text', { name: 'communication_band', nullable: true })
  communicationBand: string;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column('timestamp with time zone', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
