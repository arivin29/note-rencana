import { ApiProperty } from '@nestjs/swagger';

export class IndustryStatDto {
  @ApiProperty()
  industry: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  percentage: number;
}

export class SlaStatDto {
  @ApiProperty()
  slaLevel: string;

  @ApiProperty()
  count: number;
}

export class TopOwnerDto {
  @ApiProperty()
  idOwner: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  projectCount: number;

  @ApiProperty()
  nodeCount: number;

  @ApiProperty()
  sensorCount: number;
}

export class RecentActivityDto {
  @ApiProperty()
  idOwner: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastActivity: Date;

  @ApiProperty()
  action: string;
}

export class OwnerStatisticsResponseDto {
  @ApiProperty({ description: 'Total number of owners' })
  totalOwners: number;

  @ApiProperty({ type: [IndustryStatDto], description: 'Owners grouped by industry' })
  ownersByIndustry: IndustryStatDto[];

  @ApiProperty({ type: [SlaStatDto], description: 'Owners grouped by SLA level' })
  ownersBySlaLevel: SlaStatDto[];

  @ApiProperty({ type: [TopOwnerDto], description: 'Top owners by projects and nodes' })
  topOwnersByProjects: TopOwnerDto[];

  @ApiProperty({ type: [RecentActivityDto], description: 'Recent owner activities' })
  recentActivity: RecentActivityDto[];
}
