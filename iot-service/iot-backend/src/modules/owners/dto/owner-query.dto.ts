import { IsOptional, IsString, IsArray, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueryDto } from '../../../common/dto/query.dto';

export class OwnerQueryDto extends QueryDto {
  // Direct column filters
  @ApiPropertyOptional({ 
    description: 'Filter by industry',
    example: 'Water Treatment'
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by multiple industries (comma-separated)',
    example: 'Water Treatment,Agriculture'
  })
  @IsOptional()
  @IsString()
  industries?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by SLA level',
    example: 'gold'
  })
  @IsOptional()
  @IsString()
  slaLevel?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by multiple SLA levels (comma-separated)',
    example: 'gold,silver'
  })
  @IsOptional()
  @IsString()
  slaLevels?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by contact person name',
    example: 'John'
  })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  // Date range filters
  @ApiPropertyOptional({ 
    description: 'Filter by created date from (ISO format)',
    example: '2025-01-01'
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by created date to (ISO format)',
    example: '2025-12-31'
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by updated date from (ISO format)',
    example: '2025-01-01'
  })
  @IsOptional()
  @IsDateString()
  updatedFrom?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by updated date to (ISO format)',
    example: '2025-12-31'
  })
  @IsOptional()
  @IsDateString()
  updatedTo?: string;

  // Relation-based filters (WHERE IN from other tables)
  @ApiPropertyOptional({ 
    description: 'Filter by project IDs (comma-separated)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsString()
  projectIds?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by project name (partial match)',
    example: 'Reservoir'
  })
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by project status',
    example: 'active'
  })
  @IsOptional()
  @IsString()
  projectStatus?: string;

  @ApiPropertyOptional({ 
    description: 'Filter owners that have nodes',
    example: 'true'
  })
  @IsOptional()
  @IsString()
  hasNodes?: string;

  @ApiPropertyOptional({ 
    description: 'Filter owners that have active sensors',
    example: 'true'
  })
  @IsOptional()
  @IsString()
  hasActiveSensors?: string;

  @ApiPropertyOptional({ 
    description: 'Minimum number of projects',
    example: '1'
  })
  @IsOptional()
  @IsString()
  minProjects?: string;

  @ApiPropertyOptional({ 
    description: 'Maximum number of projects',
    example: '10'
  })
  @IsOptional()
  @IsString()
  maxProjects?: string;
}
