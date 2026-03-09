import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({ description: 'Module name (e.g., project, node, sensor, map_layer)' })
  @IsString()
  fromModule: string;

  @ApiProperty({ description: 'Module entity ID' })
  @IsUUID()
  fromModuleId: string;

  @ApiPropertyOptional({ description: 'Document type override (auto-detected if not provided)' })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ description: 'Additional metadata as JSON string' })
  @IsOptional()
  @IsString()
  metadata?: string;
}

export class DocumentResponseDto {
  @ApiProperty()
  idDocument: string;

  @ApiProperty()
  idOwner: string;

  @ApiProperty()
  fromModule: string;

  @ApiProperty()
  fromModuleId: string;

  @ApiProperty()
  originalFilename: string;

  @ApiProperty()
  storedFilename: string;

  @ApiProperty()
  filePath: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  fileSize: number;

  @ApiProperty()
  fileExtension: string;

  @ApiProperty()
  documentType: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;
}

export class QueryDocumentsDto {
  @ApiPropertyOptional({ description: 'Filter by module name' })
  @IsOptional()
  @IsString()
  fromModule?: string;

  @ApiPropertyOptional({ description: 'Filter by module entity ID' })
  @IsOptional()
  @IsUUID()
  fromModuleId?: string;

  @ApiPropertyOptional({ description: 'Filter by document type' })
  @IsOptional()
  @IsString()
  documentType?: string;
}
