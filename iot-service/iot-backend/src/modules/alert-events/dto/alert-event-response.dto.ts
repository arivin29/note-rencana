import { ApiProperty } from '@nestjs/swagger';

export class AlertEventResponseDto {
  @ApiProperty()
  idAlertEvent: string;

  @ApiProperty()
  idAlertRule: string;

  @ApiProperty()
  triggeredAt: Date;

  @ApiProperty({ required: false })
  value?: number;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  acknowledgedBy?: string;

  @ApiProperty({ required: false })
  acknowledgedAt?: Date;

  @ApiProperty({ required: false })
  clearedBy?: string;

  @ApiProperty({ required: false })
  clearedAt?: Date;

  @ApiProperty({ required: false })
  note?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  alertRule?: {
    idAlertRule: string;
    ruleType: string;
    severity: string;
    sensorChannel?: {
      idSensorChannel: string;
      metricCode: string;
      unit: string;
    };
  };
}
