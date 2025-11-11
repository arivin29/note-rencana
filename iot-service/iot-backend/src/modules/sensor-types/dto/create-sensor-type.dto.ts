import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateSensorTypeDto {
  @ApiProperty({ description: 'Sensor category (temperature, pressure, flow, etc)' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Default unit of measurement' })
  @IsString()
  @IsOptional()
  defaultUnit?: string;

  @ApiPropertyOptional({ description: 'Default precision (decimal places)' })
  @IsNumber()
  @IsOptional()
  precision?: number;
}
