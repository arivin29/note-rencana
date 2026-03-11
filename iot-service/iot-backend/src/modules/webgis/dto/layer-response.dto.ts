import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LayerType, SourceType } from '../../../entities/map-layer.entity';
import type { LayerStyleConfig, LayerConfigJson, BoundingBox } from '../../../entities/map-layer.entity';

interface GeoJSONFeature {
  type: 'Feature';
  geometry: Record<string, any>;
  properties?: Record<string, any>;
  id?: string | number;
}

export class LayerResponseDto {
  @ApiProperty()
  idLayer: string;

  @ApiPropertyOptional()
  idOwner?: string;

  @ApiPropertyOptional()
  idProject?: string;

  @ApiProperty()
  layerName: string;

  @ApiPropertyOptional()
  layerCode?: string;

  @ApiPropertyOptional()
  layerDescription?: string;

  @ApiProperty({ enum: LayerType })
  layerType: LayerType;

  @ApiProperty({ enum: SourceType })
  sourceType: SourceType;

  @ApiPropertyOptional()
  categoryCode?: string;

  @ApiPropertyOptional()
  geometryType?: string;

  @ApiProperty()
  srid: number;

  @ApiPropertyOptional()
  bbox?: BoundingBox | null;

  @ApiProperty()
  featureCount: number;

  @ApiPropertyOptional()
  sourceTable?: string;

  @ApiPropertyOptional()
  sourceRef?: string;

  @ApiProperty()
  styleJson: LayerStyleConfig;

  @ApiProperty()
  configJson: LayerConfigJson;

  @ApiProperty()
  isVisibleDefault: boolean;

  @ApiProperty()
  isCore: boolean;

  @ApiProperty()
  isLocked: boolean;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class LayerListResponseDto {
  @ApiProperty({ type: [LayerResponseDto] })
  data: LayerResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class GeoJSONResponseDto {
  @ApiProperty({ example: 'FeatureCollection' })
  type: 'FeatureCollection';

  @ApiProperty({ description: 'Array of GeoJSON features' })
  features: GeoJSONFeature[];

  @ApiPropertyOptional({ description: 'Metadata' })
  metadata?: {
    layerId: string;
    layerName: string;
    featureCount: number;
    geometryType: string;
    bbox?: [number, number, number, number];
  };
}

export class CoreLayerGeoJSONDto {
  @ApiProperty({ example: 'FeatureCollection' })
  type: 'FeatureCollection';

  @ApiProperty()
  features: GeoJSONFeature[];

  @ApiProperty()
  layerInfo: {
    layerCode: string;
    layerName: string;
    sourceTable: string;
    geometryType: string;
    featureCount: number;
    lastUpdated: Date;
  };
}
