import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
}

@Entity('documents')
@Index(['fromModule', 'fromModuleId'])
@Index(['idOwner'])
@Index(['status'])
@Index(['createdAt'])
export class Document {
  @PrimaryGeneratedColumn('uuid', { name: 'id_document' })
  idDocument: string;

  @Column({ type: 'uuid', name: 'id_owner' })
  idOwner: string;

  @Column({ type: 'varchar', length: 100, name: 'from_module' })
  fromModule: string; // e.g., 'project', 'node', 'sensor', 'map_layer'

  @Column({ type: 'uuid', name: 'from_module_id' })
  fromModuleId: string; // The ID of the related entity

  @Column({ type: 'varchar', length: 500, name: 'original_filename' })
  originalFilename: string;

  @Column({ type: 'varchar', length: 500, name: 'stored_filename' })
  storedFilename: string;

  @Column({ type: 'text', name: 'file_path' })
  filePath: string;

  @Column({ type: 'varchar', length: 100, name: 'mime_type', nullable: true })
  mimeType: string;

  @Column({ type: 'bigint', name: 'file_size', default: 0 })
  fileSize: number;

  @Column({ type: 'varchar', length: 50, name: 'file_extension', nullable: true })
  fileExtension: string;

  @Column({ type: 'varchar', length: 50, name: 'document_type', nullable: true })
  documentType: string; // e.g., 'geojson', 'shp', 'kml', 'csv', 'pdf', 'image'

  @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.UPLOADED })
  status: DocumentStatus;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Extra metadata like parsed info, dimensions, etc.

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
