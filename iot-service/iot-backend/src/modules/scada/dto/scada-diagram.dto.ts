import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScadaDiagramMetaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ownerId: string;

  @ApiPropertyOptional()
  projectId?: string | null;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  diagramCode?: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  canvasConfig: Record<string, any>;

  @ApiProperty()
  runtimeConfig: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ScadaBindingPayloadDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bindingKey: string;

  @ApiProperty()
  @IsUUID()
  sensorChannelId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  displayLabel?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  unitOverride?: string | null;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  transform?: Record<string, any> | null;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  priorityOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class ScadaPositionDto {
  @ApiProperty()
  @IsNumber()
  x: number;

  @ApiProperty()
  @IsNumber()
  y: number;
}

export class ScadaSizeDto {
  @ApiProperty()
  @IsNumber()
  width: number;

  @ApiProperty()
  @IsNumber()
  height: number;
}

export class ScadaNodePayloadDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ScadaPositionDto)
  position: ScadaPositionDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ScadaSizeDto)
  size: ScadaSizeDto;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  rotationDeg?: number | null;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  zIndex?: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  relatedNodeId?: string | null;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  relatedSensorId?: string | null;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  style?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ type: () => [ScadaBindingPayloadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScadaBindingPayloadDto)
  @IsOptional()
  bindings?: ScadaBindingPayloadDto[];
}

export class ScadaEdgePayloadDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiProperty()
  @IsUUID()
  source: string;

  @ApiProperty()
  @IsUUID()
  target: string;

  @ApiPropertyOptional({ default: 'pipe' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  edgeType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  label?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(20)
  pipeType?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(20)
  flowDirection?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  animated?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  style?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

export class ScadaDiagramNodeDto extends ScadaNodePayloadDto {
  @ApiProperty()
  declare id: string;
}

export class ScadaDiagramEdgeDto extends ScadaEdgePayloadDto {
  @ApiProperty()
  declare id: string;
}

export class ScadaDiagramDetailResponseDto {
  @ApiProperty({ type: () => ScadaDiagramMetaDto })
  diagram: ScadaDiagramMetaDto;

  @ApiProperty({ type: () => [ScadaDiagramNodeDto] })
  nodes: ScadaDiagramNodeDto[];

  @ApiProperty({ type: () => [ScadaDiagramEdgeDto] })
  edges: ScadaDiagramEdgeDto[];
}

export class ScadaDiagramListItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ownerId: string;

  @ApiPropertyOptional()
  projectId?: string | null;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  nodeCount?: number;

  @ApiPropertyOptional()
  edgeCount?: number;
}

export class ScadaRuntimeBindingResponseDto {
  @ApiProperty()
  bindingId: string;

  @ApiProperty()
  nodeId: string;

  @ApiProperty()
  bindingKey: string;

  @ApiProperty()
  sensorChannelId: string;

  @ApiPropertyOptional()
  sensorTypeId?: string | null;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiPropertyOptional()
  unit?: string | null;

  @ApiPropertyOptional()
  precision?: number | null;

  @ApiPropertyOptional()
  timestamp?: Date | null;

  @ApiPropertyOptional()
  value?: number | null;

  @ApiPropertyOptional()
  rawValue?: number | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  qualityFlag?: string | null;

  @ApiProperty()
  connectivityState: string;

  @ApiProperty()
  freshnessState: string;

  @ApiPropertyOptional()
  displayLabel?: string | null;

  @ApiPropertyOptional()
  unitOverride?: string | null;
}

export class ScadaRuntimeResponseDto {
  @ApiProperty()
  diagramId: string;

  @ApiProperty()
  polledAt: Date;

  @ApiProperty({ type: () => [ScadaRuntimeBindingResponseDto] })
  bindings: ScadaRuntimeBindingResponseDto[];

  @ApiProperty({
    type: 'object',
    properties: {
      totalBindings: { type: 'number' },
      offlineBindings: { type: 'number' },
      staleBindings: { type: 'number' },
    },
  })
  summary: {
    totalBindings: number;
    offlineBindings: number;
    staleBindings: number;
  };
}
