import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional, IsNumber } from 'class-validator';

export class CreateSensorChannelDto {
  @ApiProperty({ description: 'Sensor ID' })
  @IsUUID()
  @IsNotEmpty()
  idSensor: string;

  @ApiProperty({ description: 'Sensor Type ID (category of measurement)' })
  @IsUUID()
  @IsNotEmpty()
  idSensorType: string;

  @ApiProperty({ description: 'Metric code (temperature, pressure, flow, etc)' })
  @IsString()
  @IsNotEmpty()
  metricCode: string;

  @ApiPropertyOptional({ description: 'Unit of measurement' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ description: 'Minimum threshold for alerts' })
  @IsNumber()
  @IsOptional()
  minThreshold?: number;

  @ApiPropertyOptional({ description: 'Maximum threshold for alerts' })
  @IsNumber()
  @IsOptional()
  maxThreshold?: number;

  @ApiPropertyOptional({ description: 'Multiplier for raw value conversion' })
  @IsNumber()
  @IsOptional()
  multiplier?: number;

  @ApiPropertyOptional({ description: 'Value offset for raw value conversion (renamed from offset to avoid SQL keyword conflict)' })
  @IsNumber()
  @IsOptional()
  offsetValue?: number;

  @ApiPropertyOptional({ description: 'Modbus/protocol register address' })
  @IsNumber()
  @IsOptional()
  registerAddress?: number;

  @ApiPropertyOptional({ description: 'Decimal precision' })
  @IsNumber()
  @IsOptional()
  precision?: number;

  @ApiPropertyOptional({ description: 'Aggregation method (avg, sum, min, max)' })
  @IsString()
  @IsOptional()
  aggregation?: string;

  @ApiPropertyOptional({ description: 'Alert suppression window in seconds' })
  @IsNumber()
  @IsOptional()
  alertSuppressionWindow?: number;
}
