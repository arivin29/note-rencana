import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query string', example: 'pump' })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: 'Categories to search in (comma-separated)',
    example: 'nodes,devices,alerts,projects,owners',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  categories?: string[];

  @ApiPropertyOptional({ description: 'Maximum results per category', default: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}

// Node search result
export class NodeSearchResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  serialNumber: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  matchedField: string;
}

// Device (unpaired) search result
export class DeviceSearchResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  hardwareId: string;

  @ApiProperty()
  modelName: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  lastSeenAt: Date;

  @ApiProperty()
  matchedField: string;
}

// Alert search result
export class AlertSearchResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ruleType: string;

  @ApiProperty()
  severity: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  nodeName: string;

  @ApiProperty()
  nodeId: string;

  @ApiProperty()
  triggeredAt: Date;

  @ApiProperty()
  matchedField: string;
}

// Project search result
export class ProjectSearchResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  ownerName: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  nodeCount: number;

  @ApiProperty()
  matchedField: string;
}

// Owner search result
export class OwnerSearchResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ownerCode: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  industry: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  matchedField: string;
}

// Category results wrapper
export class CategoryResultsDto<T> {
  @ApiProperty()
  total: number;

  @ApiProperty()
  data: T[];
}

// Full search response
export class SearchResponseDto {
  @ApiProperty()
  query: string;

  @ApiProperty()
  total: number;

  @ApiProperty()
  results: {
    nodes?: CategoryResultsDto<NodeSearchResultDto>;
    devices?: CategoryResultsDto<DeviceSearchResultDto>;
    alerts?: CategoryResultsDto<AlertSearchResultDto>;
    projects?: CategoryResultsDto<ProjectSearchResultDto>;
    owners?: CategoryResultsDto<OwnerSearchResultDto>;
  };
}
