import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsArray, IsObject, MaxLength } from 'class-validator';
import { UploadStatus } from '../../../entities/spatial-upload-file.entity';
import type { ParsedResult, FieldMapping } from '../../../entities/spatial-upload-file.entity';

export class InitiateUploadDto {
  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsUUID()
  idProject?: string;
}

export class FieldMappingDto {
  @ApiProperty({ description: 'Source field name from uploaded file' })
  @IsString()
  sourceField: string;

  @ApiProperty({ description: 'Target field name' })
  @IsString()
  targetField: string;

  @ApiPropertyOptional({ description: 'Transform function (trim, uppercase, etc.)' })
  @IsOptional()
  @IsString()
  transform?: string;
}

export class SubmitMappingDto {
  @ApiProperty({ description: 'Layer name for the new layer' })
  @IsString()
  @MaxLength(255)
  layerName: string;

  @ApiPropertyOptional({ description: 'Layer code' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  layerCode?: string;

  @ApiPropertyOptional({ description: 'Category code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoryCode?: string;

  @ApiProperty({ description: 'Field mappings', type: [FieldMappingDto] })
  @IsArray()
  fieldMappings: FieldMapping[];

  @ApiPropertyOptional({ description: 'Label field name' })
  @IsOptional()
  @IsString()
  labelField?: string;

  @ApiPropertyOptional({ description: 'Style configuration' })
  @IsOptional()
  @IsObject()
  styleJson?: Record<string, any>;
}

export class UploadStatusResponseDto {
  @ApiProperty()
  idUpload: string;

  @ApiProperty()
  status: UploadStatus;

  @ApiProperty()
  originalFilename: string;

  @ApiProperty()
  fileType: string;

  @ApiPropertyOptional()
  parsedResult?: ParsedResult;

  @ApiPropertyOptional()
  fieldMapping?: FieldMapping[];

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiPropertyOptional()
  idLayer?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  processedAt?: Date;
}

export class ParsedResultResponseDto {
  @ApiProperty()
  idUpload: string;

  @ApiProperty()
  status: UploadStatus;

  @ApiProperty({ description: 'Geometry type detected' })
  geometryType: string;

  @ApiProperty({ description: 'Number of features' })
  featureCount: number;

  @ApiProperty({ description: 'Detected CRS' })
  detectedCrs: string;

  @ApiProperty({ description: 'Detected fields and types' })
  fields: { name: string; type: string; sample: any; nullCount: number }[];

  @ApiProperty({ description: 'Bounding box [minX, minY, maxX, maxY]' })
  bbox: [number, number, number, number];

  @ApiPropertyOptional({ description: 'Parsing warnings' })
  warnings?: string[];

  @ApiPropertyOptional({ description: 'Suggested field mappings based on category' })
  suggestedMappings?: { sourceField: string; targetField: string; confidence: number }[];
}
