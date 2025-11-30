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

  @ApiPropertyOptional({
    description: 'Conversion formula using JavaScript expression with "x" as raw value variable',
    example: '(x - 0.5) * 2.5',
  })
  @IsString()
  @IsOptional()
  conversionFormula?: string;

  @ApiPropertyOptional({ description: 'Default precision (decimal places)' })
  @IsNumber()
  @IsOptional()
  precision?: number;
}
