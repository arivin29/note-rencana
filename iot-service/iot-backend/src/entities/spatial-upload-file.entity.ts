import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Owner } from './owner.entity';
import { Project } from './project.entity';
import { MapLayer } from './map-layer.entity';

export enum UploadStatus {
  UPLOADED = 'uploaded',
  PARSING = 'parsing',
  PARSED = 'parsed',
  MAPPING = 'mapping',
  TRANSFORMING = 'transforming',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ParsedField {
  name: string;
  type: string;
  sample: any;
  nullCount: number;
}

export interface ParsedResult {
  geometryType: string;
  featureCount: number;
  detectedCrs: string;
  fields: ParsedField[];
  bbox: [number, number, number, number];
  warnings?: string[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
}

@Entity('spatial_upload_file')
@Index(['idOwner'])
@Index(['status'])
@Index(['createdAt'])
export class SpatialUploadFile {
  @PrimaryGeneratedColumn('uuid', { name: 'id_upload' })
  idUpload: string;

  @Column({ type: 'uuid', name: 'id_owner' })
  idOwner: string;

  @Column({ type: 'uuid', name: 'id_project', nullable: true })
  idProject: string;

  @Column({ type: 'varchar', length: 500, name: 'original_filename' })
  originalFilename: string;

  @Column({ type: 'varchar', length: 500, name: 'stored_filename' })
  storedFilename: string;

  @Column({ type: 'text', name: 'file_path' })
  filePath: string;

  @Column({ type: 'varchar', length: 50, name: 'file_type' })
  fileType: string;

  @Column({ type: 'bigint', name: 'file_size', nullable: true })
  fileSize: number;

  @Column({ type: 'varchar', length: 100, name: 'mime_type', nullable: true })
  mimeType: string;

  @Column({ type: 'enum', enum: UploadStatus, default: UploadStatus.UPLOADED })
  status: UploadStatus;

  @Column({ type: 'jsonb', name: 'parsed_result', nullable: true })
  parsedResult: ParsedResult;

  @Column({ type: 'jsonb', name: 'field_mapping', nullable: true })
  fieldMapping: FieldMapping[];

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', name: 'error_detail', nullable: true })
  errorDetail: Record<string, any>;

  @Column({ type: 'uuid', name: 'id_layer', nullable: true })
  idLayer: string;

  @Column({ type: 'uuid', name: 'uploaded_by', nullable: true })
  uploadedBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'processed_at', nullable: true })
  processedAt: Date;

  // Relations
  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  @ManyToOne(() => Project, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_project' })
  project: Project;

  @ManyToOne(() => MapLayer, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_layer' })
  layer: MapLayer;
}
