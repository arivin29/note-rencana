import { ApiProperty } from '@nestjs/swagger';

export class DashboardWidgetResponseDto {
  @ApiProperty()
  idWidgetInstance: string;

  @ApiProperty()
  idDashboard: string;

  @ApiProperty()
  widgetType: string;

  @ApiProperty({ required: false })
  idSensor?: string;

  @ApiProperty({ required: false })
  idSensorChannel?: string;

  @ApiProperty()
  positionX: number;

  @ApiProperty()
  positionY: number;

  @ApiProperty()
  sizeWidth: number;

  @ApiProperty()
  sizeHeight: number;

  @ApiProperty({ required: false })
  configJson?: Record<string, any>;

  @ApiProperty()
  refreshRate: number;

  @ApiProperty({ required: false })
  displayOrder?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  dashboard?: {
    idDashboard: string;
    name: string;
  };

  @ApiProperty({ required: false })
  sensor?: {
    idSensor: string;
    label: string;
  };

  @ApiProperty({ required: false })
  sensorChannel?: {
    idSensorChannel: string;
    metricCode: string;
    unit: string;
  };
}
