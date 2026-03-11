import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsUUID, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeatureDto {
  @ApiProperty({ description: 'GeoJSON geometry object' })
  @IsObject()
  geometry: Record<string, any>;

  @ApiPropertyOptional({ description: 'Feature properties' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Feature label' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  label?: string;

  @ApiPropertyOptional({ description: 'External ID for reference' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalId?: string;
}

export class UpdateFeatureDto {
  @ApiPropertyOptional({ description: 'GeoJSON geometry object' })
  @IsOptional()
  @IsObject()
  geometry?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Feature properties' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Feature label' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'External ID' })
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class BulkCreateFeaturesDto {
  @ApiProperty({ description: 'Layer ID' })
  @IsUUID()
  idLayer: string;

  @ApiProperty({ description: 'Array of features', type: [CreateFeatureDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFeatureDto)
  features: CreateFeatureDto[];
}

export class FeatureResponseDto {
  @ApiProperty()
  idFeature: string;

  @ApiProperty()
  idLayer: string;

  @ApiProperty({ description: 'GeoJSON geometry' })
  geometry: Record<string, any>;

  @ApiProperty({ description: 'Feature properties' })
  properties: Record<string, any>;

  @ApiPropertyOptional()
  label?: string;

  @ApiPropertyOptional()
  externalId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
