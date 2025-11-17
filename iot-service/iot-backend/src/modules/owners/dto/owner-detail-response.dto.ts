import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ForwardingWebhookResponseDto } from './forwarding-webhook-response.dto';
import { ForwardingDatabaseResponseDto } from './forwarding-database-response.dto';
import { ForwardingLogResponseDto } from './forwarding-log-response.dto';

export class ProjectSummaryDto {
  @ApiProperty()
  idProject: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  nodeCount: number;
}

export class NodeAssignmentSummaryDto {
  @ApiProperty()
  idNodeAssignment: string;

  @ApiProperty()
  nodeName: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  assignedAt: Date;
}

export class OwnerStatisticsDto {
  @ApiProperty({ description: 'Total number of projects' })
  totalProjects: number;

  @ApiProperty({ description: 'Total number of nodes' })
  totalNodes: number;

  @ApiProperty({ description: 'Number of active sensors' })
  activeSensors: number;

  @ApiProperty({ description: 'Number of active alerts' })
  activeAlerts: number;
}

export class OwnerDetailResponseDto {
  @ApiProperty({ description: 'Owner unique identifier' })
  idOwner: string;

  @ApiProperty({ description: 'Owner name' })
  name: string;

  @ApiProperty({ description: 'Industry type' })
  industry: string;

  @ApiPropertyOptional({ description: 'Contact person' })
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'SLA level' })
  slaLevel?: string;

  @ApiPropertyOptional({ description: 'Forwarding settings' })
  forwardingSettings?: Record<string, any>;

  @ApiProperty({ type: [ProjectSummaryDto], description: 'List of projects' })
  projects: ProjectSummaryDto[];

  @ApiProperty({ type: [NodeAssignmentSummaryDto], description: 'Node assignments' })
  nodeAssignments: NodeAssignmentSummaryDto[];

  @ApiProperty({ type: OwnerStatisticsDto, description: 'Owner statistics' })
  statistics: OwnerStatisticsDto;

  @ApiProperty({ type: [ForwardingWebhookResponseDto], description: 'Webhook configurations' })
  forwardingWebhooks: ForwardingWebhookResponseDto[];

  @ApiProperty({ type: [ForwardingDatabaseResponseDto], description: 'Database configurations' })
  forwardingDatabases: ForwardingDatabaseResponseDto[];

  @ApiProperty({ type: [ForwardingLogResponseDto], description: 'Recent forwarding logs' })
  forwardingLogs: ForwardingLogResponseDto[];

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}
