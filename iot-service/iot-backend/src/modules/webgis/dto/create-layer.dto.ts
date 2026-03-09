import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsObject, IsUUID, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LayerType, SourceType } from '../../../entities/map-layer.entity';
import type { LayerStyleConfig, LayerConfigJson } from '../../../entities/map-layer.entity';

export class CreateLayerDto {
  @ApiProperty({ description: 'Layer name' })
  @IsString()
  @MaxLength(255)
  layerName: string;

  @ApiPropertyOptional({ description: 'Layer code (unique per project)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  layerCode?: string;

  @ApiPropertyOptional({ description: 'Layer description' })
  @IsOptional()
  @IsString()
  layerDescription?: string;

  @ApiProperty({ enum: LayerType, description: 'Layer type' })
  @IsEnum(LayerType)
  layerType: LayerType;

  @ApiProperty({ enum: SourceType, description: 'Source type' })
  @IsEnum(SourceType)
  sourceType: SourceType;

  @ApiPropertyOptional({ description: 'Category code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoryCode?: string;

  @ApiPropertyOptional({ description: 'Geometry type (Point, LineString, Polygon, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  geometryType?: string;

  @ApiPropertyOptional({ description: 'SRID (default: 4326)' })
  @IsOptional()
  @IsNumber()
  srid?: number;

  @ApiPropertyOptional({ description: 'Source table name (for query-based layers)' })
  @IsOptional()
  @IsString()
  sourceTable?: string;

  @ApiPropertyOptional({ description: 'Source reference (URL, file path, etc.)' })
  @IsOptional()
  @IsString()
  sourceRef?: string;

  @ApiPropertyOptional({ description: 'Style configuration' })
  @IsOptional()
  @IsObject()
  styleJson?: LayerStyleConfig;

  @ApiPropertyOptional({ description: 'Layer configuration' })
  @IsOptional()
  @IsObject()
  configJson?: LayerConfigJson;

  @ApiPropertyOptional({ description: 'Visible by default' })
  @IsOptional()
  @IsBoolean()
  isVisibleDefault?: boolean;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsUUID()
  idProject?: string;

  @ApiPropertyOptional({ description: 'Owner ID' })
  @IsOptional()
  @IsUUID()
  idOwner?: string;
}

// ===== Update Style DTO =====

export class StrokeWidthByFieldDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty({ enum: ['multiply', 'divide'] })
  @IsString()
  operation: 'multiply' | 'divide';

  @ApiProperty()
  @IsNumber()
  factor: number;

  @ApiProperty()
  @IsNumber()
  baseWidth: number;
}

export class ColorMappingDto {
  @ApiProperty()
  @IsString()
  value: string;

  @ApiProperty()
  @IsString()
  color: string;
}

export class ColorByFieldDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty({ type: [ColorMappingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColorMappingDto)
  mappings: ColorMappingDto[];

  @ApiProperty()
  @IsString()
  defaultColor: string;
}

export class UpdateStyleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fillColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fillOpacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strokeColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  strokeWidth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  strokeOpacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pointRadius?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pointShape?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  labelFields?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  labelColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  labelSize?: number;

  @ApiPropertyOptional({ type: StrokeWidthByFieldDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StrokeWidthByFieldDto)
  strokeWidthByField?: StrokeWidthByFieldDto;

  @ApiPropertyOptional({ type: ColorByFieldDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ColorByFieldDto)
  colorByField?: ColorByFieldDto;

  // Zoom visibility
  @ApiPropertyOptional({ description: 'Minimum zoom level to show layer (0-20)' })
  @IsOptional()
  @IsNumber()
  minZoom?: number;

  @ApiPropertyOptional({ description: 'Maximum zoom level to show layer (0-20)' })
  @IsOptional()
  @IsNumber()
  maxZoom?: number;

  @ApiPropertyOptional({ description: 'Minimum zoom level to show labels (0-20)' })
  @IsOptional()
  @IsNumber()
  labelMinZoom?: number;
}

// ===== Reorder Layers DTO =====

export class LayerOrderDto {
  @ApiProperty()
  @IsUUID()
  idLayer: string;

  @ApiProperty()
  @IsNumber()
  displayOrder: number;
}

export class ReorderLayersDto {
  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty({ type: [LayerOrderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LayerOrderDto)
  orders: LayerOrderDto[];
}
