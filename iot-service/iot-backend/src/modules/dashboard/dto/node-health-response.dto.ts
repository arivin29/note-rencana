import { ApiProperty } from '@nestjs/swagger';

class NodeHealthItem {
  @ApiProperty({ description: 'Node UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  idNode: string;

  @ApiProperty({ description: 'Node code', example: 'NODE-001' })
  code: string;

  @ApiProperty({ description: 'Project name', example: 'Area A Distribution' })
  projectName: string;

  @ApiProperty({ description: 'Project UUID', example: '550e8400-e29b-41d4-a716-446655440001' })
  projectId: string;

  @ApiProperty({ description: 'Node status', enum: ['online', 'offline', 'degraded'], example: 'online' })
  status: 'online' | 'offline' | 'degraded';

  @ApiProperty({ description: 'Last seen timestamp', example: '2025-11-15T09:12:00Z' })
  lastSeen: Date;

  @ApiProperty({ description: 'Last seen formatted', example: '09:12 UTC' })
  lastSeenFormatted: string;

  @ApiProperty({ description: 'Battery percentage', example: 78 })
  battery: number;

  @ApiProperty({ description: 'Signal strength (dBm)', example: -65, required: false })
  signalStrength?: number;

  @ApiProperty({ description: 'Active alert count', example: 0 })
  alertCount: number;
}

class NodeHealthSummary {
  @ApiProperty({ description: 'Total nodes', example: 168 })
  totalNodes: number;

  @ApiProperty({ description: 'Online nodes count', example: 153 })
  onlineCount: number;

  @ApiProperty({ description: 'Degraded nodes count', example: 12 })
  degradedCount: number;

  @ApiProperty({ description: 'Offline nodes count', example: 3 })
  offlineCount: number;
}

export class NodeHealthResponseDto {
  @ApiProperty({ description: 'Top impacted nodes', type: [NodeHealthItem] })
  nodes: NodeHealthItem[];

  @ApiProperty({ description: 'Overall summary', type: NodeHealthSummary })
  summary: NodeHealthSummary;
}
