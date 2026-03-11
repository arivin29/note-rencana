import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AggregationMode, RangeType } from './report-request.dto';

export class TemplateConfigDto {
  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Node IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  nodeIds?: string[];

  @ApiProperty({ description: 'Sensor Channel IDs', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  sensorChannelIds: string[];

  @ApiProperty({ description: 'Range type', enum: RangeType })
  @IsEnum(RangeType)
  rangeType: RangeType;

  @ApiProperty({ description: 'Aggregation mode', enum: AggregationMode })
  @IsEnum(AggregationMode)
  aggregation: AggregationMode;
}

export class CreateReportTemplateDto {
  @ApiProperty({ description: 'Template name', example: 'Daily Pump Report' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Template description',
    example: 'Temperature & Pressure monitoring for Pump Station 1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Template configuration' })
  @ValidateNested()
  @Type(() => TemplateConfigDto)
  config: TemplateConfigDto;
}

export class UpdateReportTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Template configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateConfigDto)
  config?: TemplateConfigDto;
}

export class ReportTemplateResponseDto {
  @ApiProperty({ description: 'Template ID' })
  id: string;

  @ApiProperty({ description: 'Owner ID' })
  ownerId: string;

  @ApiProperty({ description: 'User ID who created' })
  userId: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  description?: string;

  @ApiProperty({ description: 'Template configuration' })
  config: TemplateConfigDto;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}

export class GenerateFromTemplateDto {
  @ApiPropertyOptional({
    description: 'Custom start date (overrides template range)',
    example: '2026-03-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  customStartDate?: string;

  @ApiPropertyOptional({
    description: 'Custom end date (overrides template range)',
    example: '2026-03-10T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  customEndDate?: string;
}
