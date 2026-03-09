import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsObject, IsUUID, MaxLength } from 'class-validator';
import type { TemplateField, CategoryDefaultStyle } from '../../../entities/map-layer-category.entity';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category code (unique per owner)' })
  @IsString()
  @MaxLength(50)
  categoryCode: string;

  @ApiProperty({ description: 'Category name' })
  @IsString()
  @MaxLength(255)
  categoryName: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Industry code (water_utility, energy, manufacturing, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  industryCode?: string;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  @IsOptional()
  @IsUUID()
  parentCategoryId?: string;

  @ApiPropertyOptional({ description: 'Allowed geometry types', example: ['Point', 'LineString', 'Polygon'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedGeometryTypes?: string[];

  @ApiPropertyOptional({ description: 'Template fields for auto-mapping' })
  @IsOptional()
  @IsArray()
  templateFields?: TemplateField[];

  @ApiPropertyOptional({ description: 'Default style configuration' })
  @IsOptional()
  @IsObject()
  defaultStyle?: CategoryDefaultStyle;

  @ApiPropertyOptional({ description: 'Default icon name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  iconDefault?: string;

  @ApiPropertyOptional({ description: 'Default color (hex)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorDefault?: string;

  @ApiPropertyOptional({ description: 'Is this an operational layer category' })
  @IsOptional()
  @IsBoolean()
  isOperational?: boolean;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Owner ID (null for system categories)' })
  @IsOptional()
  @IsUUID()
  idOwner?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  categoryName?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Allowed geometry types' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedGeometryTypes?: string[];

  @ApiPropertyOptional({ description: 'Template fields' })
  @IsOptional()
  @IsArray()
  templateFields?: TemplateField[];

  @ApiPropertyOptional({ description: 'Default style' })
  @IsOptional()
  @IsObject()
  defaultStyle?: CategoryDefaultStyle;

  @ApiPropertyOptional({ description: 'Default icon' })
  @IsOptional()
  @IsString()
  iconDefault?: string;

  @ApiPropertyOptional({ description: 'Default color' })
  @IsOptional()
  @IsString()
  colorDefault?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}
