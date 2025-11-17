import { IsUUID, IsString, IsOptional, IsNumber, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDashboardWidgetDto {
  @ApiProperty({ description: 'Dashboard ID' })
  @IsUUID()
  @IsNotEmpty()
  idDashboard: string;

  @ApiProperty({ description: 'Widget type', example: 'radial-gauge' })
  @IsString()
  @IsNotEmpty()
  widgetType: string;

  @ApiProperty({ description: 'Sensor ID', required: false })
  @IsUUID()
  @IsOptional()
  idSensor?: string;

  @ApiProperty({ description: 'Sensor channel ID', required: false })
  @IsUUID()
  @IsOptional()
  idSensorChannel?: string;

  @ApiProperty({ description: 'Position X', default: 0, required: false })
  @IsNumber()
  @IsOptional()
  positionX?: number;

  @ApiProperty({ description: 'Position Y', default: 0, required: false })
  @IsNumber()
  @IsOptional()
  positionY?: number;

  @ApiProperty({ description: 'Size width', default: 1, required: false })
  @IsNumber()
  @IsOptional()
  sizeWidth?: number;

  @ApiProperty({ description: 'Size height', default: 1, required: false })
  @IsNumber()
  @IsOptional()
  sizeHeight?: number;

  @ApiProperty({ description: 'Widget configuration JSON', required: false })
  @IsObject()
  @IsOptional()
  configJson?: Record<string, any>;

  @ApiProperty({ description: 'Refresh rate in seconds', default: 5, required: false })
  @IsNumber()
  @IsOptional()
  refreshRate?: number;

  @ApiProperty({ description: 'Display order', required: false })
  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}
