import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Owner } from './owner.entity';
import { Project } from './project.entity';
import { MapLayerFeature } from './map-layer-feature.entity';

export enum LayerType {
  CORE = 'core',
  OPERATIONAL = 'operational',
  CUSTOM = 'custom',
}

export enum SourceType {
  SYSTEM = 'system',
  GEOJSON = 'geojson',
  SHP = 'shp',
  KML = 'kml',
  CSV = 'csv',
  API = 'api',
}

export interface LayerStyleConfig {
  // Fill styles
  fillColor?: string;
  fillOpacity?: number;
  // Stroke styles
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  // Point styles
  pointRadius?: number;
  pointShape?: string;
  icon?: string;
  iconUrl?: string;
  radius?: number;
  // Legacy stroke fields
  stroke?: string;
  lineDash?: number[];
  // Legacy fill fields
  fill?: string;
  // Label (multi-select)
  labelFields?: string[];
  labelField?: string; // legacy single field
  labelFont?: string;
  labelColor?: string;
  labelSize?: number;
  labelOffset?: [number, number];
  // Data-driven stroke width
  strokeWidthByField?: {
    enabled: boolean;
    field: string;
    operation: 'multiply' | 'divide';
    factor: number;
    baseWidth: number;
  };
  // Data-driven color
  colorByField?: {
    enabled: boolean;
    field: string;
    mappings: { value: string; color: string }[];
    defaultColor: string;
  };
  // Clustering
  clustering?: boolean;
  clusterDistance?: number;
  // Zoom
  zoomMin?: number;
  zoomMax?: number;
  // Thematic
  thematic?: {
    field: string;
    mapping: Record<string, string>;
  };
}

export interface LayerConfigJson {
  refreshInterval?: number;
  popup?: {
    enabled: boolean;
    template?: string;
    fields?: string[];
  };
  featureInfo?: {
    enabled: boolean;
    fields?: { name: string; label: string; format?: string }[];
  };
  // Added by add-layer-drawer when uploading file
  idDocument?: string;
  originalFilename?: string;
  filePath?: string;
  featureCount?: number;
  bounds?: number[];
  properties?: string[];
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

@Entity('map_layer')
@Index(['idProject', 'layerCode'], { unique: true })
@Index(['idOwner'])
@Index(['layerType'])
export class MapLayer {
  @PrimaryGeneratedColumn('uuid', { name: 'id_layer' })
  idLayer: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: true })
  idOwner: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: true })
  idProject: string;

  @Column({ type: 'varchar', length: 255, name: 'layer_name' })
  layerName: string;

  @Column({ type: 'varchar', length: 100, name: 'layer_code', nullable: true })
  layerCode: string;

  @Column({ type: 'text', name: 'layer_description', nullable: true })
  layerDescription: string;

  @Column({ type: 'enum', enum: LayerType, name: 'layer_type' })
  layerType: LayerType;

  @Column({ type: 'enum', enum: SourceType, name: 'source_type' })
  sourceType: SourceType;

  @Column({ type: 'varchar', length: 50, name: 'category_code', nullable: true })
  categoryCode: string;

  @Column({ type: 'varchar', length: 50, name: 'geometry_type', nullable: true })
  geometryType: string;

  @Column({ type: 'integer', default: 4326 })
  srid: number;

  @Column({ type: 'jsonb', nullable: true })
  bbox: BoundingBox | null;

  @Column({ type: 'integer', name: 'feature_count', default: 0 })
  featureCount: number;

  @Column({ type: 'varchar', length: 255, name: 'source_table', nullable: true })
  sourceTable: string;

  @Column({ type: 'text', name: 'source_ref', nullable: true })
  sourceRef: string;

  @Column({ type: 'jsonb', name: 'style_json', default: {} })
  styleJson: LayerStyleConfig;

  @Column({ type: 'jsonb', name: 'config_json', default: {} })
  configJson: LayerConfigJson;

  @Column({ type: 'boolean', name: 'is_visible_default', default: true })
  isVisibleDefault: boolean;

  @Column({ type: 'boolean', name: 'is_core', default: false })
  isCore: boolean;

  @Column({ type: 'boolean', name: 'is_locked', default: false })
  isLocked: boolean;

  @Column({ type: 'integer', name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  @ManyToOne(() => Project, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @OneToMany(() => MapLayerFeature, (feature) => feature.layer)
  features: MapLayerFeature[];
}
