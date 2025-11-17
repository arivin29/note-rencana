import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateSensorDto {
  @ApiProperty({ description: 'Node ID' })
  @IsUUID()
  @IsNotEmpty()
  idNode: string;

  @ApiPropertyOptional({ description: 'Sensor Catalog ID' })
  @IsUUID()
  @IsOptional()
  idSensorCatalog?: string;

  @ApiPropertyOptional({ description: 'Unique sensor code identifier (e.g., SENSOR-001)' })
  @IsString()
  @IsOptional()
  sensorCode?: string;

  @ApiProperty({ description: 'Sensor label/name' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ description: 'Physical location description (e.g., Tank A, Pipe Section 3)' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ 
    description: 'Sensor health status', 
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  })
  @IsString()
  @IsOptional()
  status?: 'active' | 'maintenance' | 'inactive';

  @ApiPropertyOptional({ description: 'Protocol channel (RS485 address, analog channel, etc)' })
  @IsString()
  @IsOptional()
  protocolChannel?: string;

  @ApiPropertyOptional({ description: 'Calibration factor' })
  @IsNumber()
  @IsOptional()
  calibrationFactor?: number;

  @ApiPropertyOptional({ description: 'Sampling rate in Hz' })
  @IsNumber()
  @IsOptional()
  samplingRate?: number;

  @ApiPropertyOptional({ description: 'Installation date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  installDate?: string;

  @ApiPropertyOptional({ description: 'Calibration due date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  calibrationDueAt?: string;
}
