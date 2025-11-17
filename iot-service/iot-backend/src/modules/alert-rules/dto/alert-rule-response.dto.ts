import { ApiProperty } from '@nestjs/swagger';

export class AlertRuleResponseDto {
  @ApiProperty()
  idAlertRule: string;

  @ApiProperty()
  idSensorChannel: string;

  @ApiProperty()
  ruleType: string;

  @ApiProperty({ required: false })
  severity?: string;

  @ApiProperty({ required: false })
  paramsJson?: Record<string, any>;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  sensorChannel?: {
    idSensorChannel: string;
    metricCode: string;
    unit: string;
    sensor?: {
      idSensor: string;
      label: string;
    };
  };
}

export class AlertRuleDetailedResponseDto extends AlertRuleResponseDto {
  @ApiProperty({ description: 'Recent alert events', type: 'array' })
  recentEvents: Array<{
    idAlertEvent: string;
    triggeredAt: Date;
    value: number;
    status: string;
  }>;

  @ApiProperty({ description: 'Statistics' })
  stats: {
    totalEvents: number;
    openEvents: number;
    acknowledgedEvents: number;
    clearedEvents: number;
    lastTriggered?: Date;
  };
}
