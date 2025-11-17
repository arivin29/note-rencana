import { ApiProperty } from '@nestjs/swagger';

export class TelemetryRateInfo {
  @ApiProperty({ description: 'Telemetry per minute', example: 12400 })
  perMinute: number;

  @ApiProperty({ description: 'Formatted telemetry rate', example: '12.4K/min' })
  formatted: string;
}

export class OwnerLeaderboardItem {
  @ApiProperty({ description: 'Owner UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  idOwner: string;

  @ApiProperty({ description: 'Owner name', example: 'PT Adhi Tirta Utama' })
  name: string;

  @ApiProperty({ description: 'SLA level', enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], example: 'Gold' })
  slaLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

  @ApiProperty({ description: 'Total nodes count', example: 124 })
  nodeCount: number;

  @ApiProperty({ description: 'Active sensors count', example: 496 })
  activeSensorCount: number;

  @ApiProperty({ 
    description: 'Telemetry rate', 
    type: TelemetryRateInfo
  })
  telemetryRate: TelemetryRateInfo;

  @ApiProperty({ description: 'Active alert count', example: 3 })
  alertCount: number;

  @ApiProperty({ description: 'Critical alerts count', example: 1 })
  criticalAlerts: number;

  @ApiProperty({ description: 'Owner health status', enum: ['healthy', 'attention', 'risk'], example: 'healthy' })
  health: 'healthy' | 'attention' | 'risk';
}

export class OwnerLeaderboardResponseDto {
  @ApiProperty({ description: 'Top owners by telemetry', type: [OwnerLeaderboardItem] })
  owners: OwnerLeaderboardItem[];
}
