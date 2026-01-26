import { IsString, IsOptional, IsBoolean, IsObject, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomDashboardDto {
  @ApiProperty({ description: 'Dashboard name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Dashboard description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Layout configuration JSON' })
  @IsObject()
  @IsOptional()
  layoutConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Default time range', example: '6h' })
  @IsString()
  @IsOptional()
  timeRange?: string;

  @ApiPropertyOptional({ description: 'Auto refresh interval in seconds', example: 60 })
  @IsInt()
  @Min(0)
  @Max(3600)
  @IsOptional()
  refreshInterval?: number;

  @ApiPropertyOptional({ description: 'Set as default dashboard' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateCustomDashboardDto {
  @ApiPropertyOptional({ description: 'Dashboard name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Dashboard description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Layout configuration JSON' })
  @IsObject()
  @IsOptional()
  layoutConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Default time range', example: '6h' })
  @IsString()
  @IsOptional()
  timeRange?: string;

  @ApiPropertyOptional({ description: 'Auto refresh interval in seconds' })
  @IsInt()
  @Min(0)
  @Max(3600)
  @IsOptional()
  refreshInterval?: number;

  @ApiPropertyOptional({ description: 'Set as default dashboard' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
