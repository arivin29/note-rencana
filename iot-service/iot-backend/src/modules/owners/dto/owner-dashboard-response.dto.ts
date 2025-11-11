import { ApiProperty } from '@nestjs/swagger';
import { ProjectSummaryDto, OwnerStatisticsDto } from './owner-detail-response.dto';

export class OwnerDashboardResponseDto {
  @ApiProperty({ description: 'Owner basic info' })
  owner: {
    id: string;
    name: string;
    industry: string;
    slaLevel: string;
  };

  @ApiProperty({ description: 'Summary statistics', type: OwnerStatisticsDto })
  summary: OwnerStatisticsDto;

  @ApiProperty({ type: [ProjectSummaryDto], description: 'Recent projects' })
  recentProjects: ProjectSummaryDto[];

  @ApiProperty({ description: 'Recent alerts' })
  recentAlerts: any[];

  @ApiProperty({ description: 'Performance metrics' })
  performanceMetrics: {
    dataPointsToday: number;
    uptimePercentage: number;
    averageResponseTime: number;
  };
}
