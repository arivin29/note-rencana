import { ApiProperty } from '@nestjs/swagger';

class ActivityLogItem {
  @ApiProperty({ description: 'Activity ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ 
    description: 'Activity type', 
    enum: ['webhook', 'alert', 'sync', 'node_status', 'owner_update', 'sensor_added'],
    example: 'webhook' 
  })
  type: 'webhook' | 'alert' | 'sync' | 'node_status' | 'owner_update' | 'sensor_added';

  @ApiProperty({ description: 'Activity title', example: 'Forwarding test webhook executed' })
  title: string;

  @ApiProperty({ description: 'Activity description', example: 'Target: Command Center Webhook', required: false })
  description?: string;

  @ApiProperty({ description: 'Activity timestamp', example: '2025-11-15T09:12:00Z' })
  timestamp: Date;

  @ApiProperty({ description: 'Time ago formatted', example: '2 mins ago' })
  timeAgo: string;

  @ApiProperty({ description: 'Badge label', example: 'WEBHOOK' })
  badge: string;

  @ApiProperty({ description: 'Severity level', enum: ['info', 'warning', 'success', 'error'], example: 'info' })
  severity: 'info' | 'warning' | 'success' | 'error';

  @ApiProperty({ description: 'Highlight important events', example: true })
  highlight: boolean;

  @ApiProperty({ 
    description: 'Related entity details',
    example: { type: 'owner', id: 'uuid', name: 'PT Adhi Tirta Utama' },
    required: false
  })
  relatedEntity?: {
    type: 'owner' | 'project' | 'node' | 'sensor';
    id: string;
    name: string;
  };
}

export class ActivityLogResponseDto {
  @ApiProperty({ description: 'Recent activity logs', type: [ActivityLogItem] })
  activities: ActivityLogItem[];
}
