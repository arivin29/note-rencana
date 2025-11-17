import { ApiProperty } from '@nestjs/swagger';

class AlertItem {
  @ApiProperty({ description: 'Alert UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  idAlert: string;

  @ApiProperty({ description: 'Sensor code', example: 'SNS-20-FLOW' })
  sensorCode: string;

  @ApiProperty({ description: 'Channel name', example: 'Flow Rate' })
  channelName: string;

  @ApiProperty({ description: 'Node code (computed)', example: 'NODE-001' })
  nodeCode: string;

  @ApiProperty({ description: 'Node name (alias for HTML)', example: 'NODE-001' })
  nodeName: string;

  @ApiProperty({ description: 'Rule name (computed)', example: 'Flow Drop Detection' })
  ruleName: string;

  @ApiProperty({ description: 'Alert severity', enum: ['critical', 'warning', 'info'], example: 'critical' })
  severity: 'critical' | 'warning' | 'info';

  @ApiProperty({ description: 'Alert message', example: 'Flow drop >30% vs baseline' })
  message: string;

  @ApiProperty({ description: 'Current value', example: 45.2 })
  value: number;

  @ApiProperty({ description: 'Threshold value', example: 65.0 })
  threshold: number;

  @ApiProperty({ description: 'Unit of measurement', example: 'L/min' })
  unit: string;

  @ApiProperty({ description: 'Alert triggered timestamp', example: '2025-11-15T09:05:00Z' })
  triggeredAt: Date;

  @ApiProperty({ description: 'Timestamp (alias for HTML)', example: '2025-11-15T09:05:00Z' })
  timestamp: Date;

  @ApiProperty({ description: 'Triggered timestamp formatted', example: '09:05 UTC' })
  triggeredAtFormatted: string;

  @ApiProperty({ description: 'Alert status', enum: ['active', 'acknowledged', 'resolved'], example: 'active' })
  status: 'active' | 'acknowledged' | 'resolved';

  @ApiProperty({ description: 'Project name', example: 'Area A Distribution' })
  projectName: string;

  @ApiProperty({ description: 'Owner name', example: 'PT Adhi Tirta Utama' })
  ownerName: string;
}

class AlertSummary {
  @ApiProperty({ description: 'Total active alerts', example: 7 })
  totalActive: number;

  @ApiProperty({ description: 'Critical alerts count', example: 3 })
  criticalCount: number;

  @ApiProperty({ description: 'Warning alerts count', example: 4 })
  warningCount: number;

  @ApiProperty({ description: 'Info alerts count', example: 0 })
  infoCount: number;
}

export class AlertStreamResponseDto {
  @ApiProperty({ description: 'Active alerts', type: [AlertItem] })
  alerts: AlertItem[];

  @ApiProperty({ description: 'Alert summary statistics', type: AlertSummary })
  summary: AlertSummary;
}
