import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

const VALID_DIAGRAM_STATUSES = ['draft', 'active', 'archived'] as const;

export class ScadaDiagramMetaUpdateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  diagramCode?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsIn(VALID_DIAGRAM_STATUSES)
  @IsOptional()
  @MaxLength(20)
  status?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  canvasConfig?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  runtimeConfig?: Record<string, any>;
}
