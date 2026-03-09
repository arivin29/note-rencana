import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MapLayer } from './map-layer.entity';

@Entity('map_layer_feature')
@Index(['idLayer'])
@Index(['externalId'])
export class MapLayerFeature {
  @PrimaryGeneratedColumn('uuid', { name: 'id_feature' })
  idFeature: string;

  @Column({ type: 'uuid', name: 'id_layer' })
  idLayer: string;

  // GeoJSON geometry stored as JSONB (PostGIS not available on server)
  @Column({ type: 'jsonb', name: 'geometry_json', nullable: true })
  geometryJson: Record<string, any>;

  @Column({ type: 'jsonb', name: 'properties_json', default: {} })
  propertiesJson: Record<string, any>;

  @Column({ type: 'varchar', length: 500, nullable: true })
  label: string;

  @Column({ type: 'varchar', length: 255, name: 'external_id', nullable: true })
  externalId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => MapLayer, (layer) => layer.features, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_layer' })
  layer: MapLayer;
}
