import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class DashboardFiltersDto {
  @ApiPropertyOptional({ 
    description: 'Filter by specific owner ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by specific project ID',
    example: '550e8400-e29b-41d4-a716-446655440001'
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ 
    description: 'Time range for data aggregation',
    enum: ['24h', '7d', '30d'],
    example: '24h'
  })
  @IsOptional()
  @IsEnum(['24h', '7d', '30d'])
  timeRange?: '24h' | '7d' | '30d';

  @ApiPropertyOptional({ 
    description: 'Limit number of results',
    example: 10
  })
  @IsOptional()
  limit?: number;
}
