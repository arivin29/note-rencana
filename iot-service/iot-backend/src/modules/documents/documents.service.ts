import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Document, DocumentStatus } from '../../entities/document.entity';
import { UploadDocumentDto, QueryDocumentsDto } from './documents.dto';

@Injectable()
export class DocumentsService {
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads/documents';

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {
    // Ensure upload directory exists
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload a new document
   */
  async upload(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    ownerId: string,
    userId?: string,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Generate stored filename with UUID
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const storedFilename = `${uuidv4()}${fileExtension}`;
    
    // Create subdirectory for module
    const moduleDir = path.join(this.uploadDir, dto.fromModule);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    }

    const filePath = path.join(moduleDir, storedFilename);

    // Save file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Detect document type
    const documentType = dto.documentType || this.detectDocumentType(fileExtension, file.mimetype);

    // Parse metadata if provided as JSON string
    let metadata: Record<string, any> | undefined;
    if (dto.metadata) {
      try {
        metadata = JSON.parse(dto.metadata);
      } catch {
        metadata = { raw: dto.metadata };
      }
    }

    // Create document record
    const document = this.documentRepository.create({
      idOwner: ownerId,
      fromModule: dto.fromModule,
      fromModuleId: dto.fromModuleId,
      originalFilename: file.originalname,
      storedFilename,
      filePath,
      mimeType: file.mimetype,
      fileSize: file.size,
      fileExtension,
      documentType,
      status: DocumentStatus.READY,
      metadata,
      createdBy: userId,
    });

    return this.documentRepository.save(document);
  }

  /**
   * Detect document type from extension and mime type
   */
  private detectDocumentType(extension: string, mimeType: string): string {
    const ext = extension.toLowerCase().replace('.', '');
    
    // Spatial files
    if (['geojson', 'json'].includes(ext)) return 'geojson';
    if (['shp', 'dbf', 'shx', 'prj'].includes(ext)) return 'shp';
    if (['kml', 'kmz'].includes(ext)) return 'kml';
    if (['gpx'].includes(ext)) return 'gpx';
    
    // Data files
    if (['csv'].includes(ext)) return 'csv';
    if (['xlsx', 'xls'].includes(ext)) return 'excel';
    
    // Documents
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    
    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    
    // Archive
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';

    // Fallback to mime type check
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('json')) return 'geojson';
    if (mimeType.includes('pdf')) return 'pdf';
    
    return 'other';
  }

  /**
   * Find document by ID
   */
  async findById(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { idDocument: id },
    });

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return document;
  }

  /**
   * Find documents by query
   */
  async findByQuery(query: QueryDocumentsDto, ownerId: string): Promise<Document[]> {
    const qb = this.documentRepository.createQueryBuilder('doc');
    
    qb.where('doc.id_owner = :ownerId', { ownerId });

    if (query.fromModule) {
      qb.andWhere('doc.from_module = :fromModule', { fromModule: query.fromModule });
    }

    if (query.fromModuleId) {
      qb.andWhere('doc.from_module_id = :fromModuleId', { fromModuleId: query.fromModuleId });
    }

    if (query.documentType) {
      qb.andWhere('doc.document_type = :documentType', { documentType: query.documentType });
    }

    qb.orderBy('doc.created_at', 'DESC');

    return qb.getMany();
  }

  /**
   * Get documents by module and module ID
   */
  async findByModule(fromModule: string, fromModuleId: string, ownerId: string): Promise<Document[]> {
    return this.documentRepository.find({
      where: {
        idOwner: ownerId,
        fromModule,
        fromModuleId,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Delete document
   */
  async delete(id: string, ownerId: string): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { idDocument: id, idOwner: ownerId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    // Delete file from disk
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await this.documentRepository.remove(document);
  }

  /**
   * Read file content
   */
  async getFileContent(id: string, ownerId: string): Promise<{ buffer: Buffer; document: Document }> {
    const document = await this.documentRepository.findOne({
      where: { idDocument: id, idOwner: ownerId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    if (!fs.existsSync(document.filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    const buffer = fs.readFileSync(document.filePath);
    return { buffer, document };
  }

  /**
   * Update document metadata
   */
  async updateMetadata(id: string, metadata: Record<string, any>, ownerId: string): Promise<Document> {
    const document = await this.findById(id);
    
    if (document.idOwner !== ownerId) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    document.metadata = { ...document.metadata, ...metadata };
    return this.documentRepository.save(document);
  }
}
