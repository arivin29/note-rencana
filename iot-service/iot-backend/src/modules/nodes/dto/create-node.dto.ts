import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional, IsNumber, IsDateString, IsIP } from 'class-validator';

export class CreateNodeDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  @IsNotEmpty()
  idProject: string;

  @ApiProperty({ description: 'Node Model ID' })
  @IsUUID()
  @IsNotEmpty()
  idNodeModel: string;

  @ApiProperty({ description: 'Node code/identifier (unique within project)' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Device EUI for LoRaWAN' })
  @IsString()
  @IsOptional()
  devEui?: string;

  @ApiPropertyOptional({ description: 'IP address' })
  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Installation date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  installDate?: string;

  @ApiPropertyOptional({ description: 'Firmware version' })
  @IsString()
  @IsOptional()
  firmwareVersion?: string;

  @ApiPropertyOptional({ description: 'Battery type' })
  @IsString()
  @IsOptional()
  batteryType?: string;

  @ApiPropertyOptional({ description: 'Telemetry interval in seconds', default: 300 })
  @IsNumber()
  @IsOptional()
  telemetryIntervalSec?: number;

  @ApiPropertyOptional({ description: 'Connectivity status', default: 'offline' })
  @IsString()
  @IsOptional()
  connectivityStatus?: string;

  @ApiPropertyOptional({ description: 'Current location ID' })
  @IsUUID()
  @IsOptional()
  idCurrentLocation?: string;

  @ApiPropertyOptional({ description: 'Node Profile ID for payload parsing' })
  @IsUUID()
  @IsOptional()
  idNodeProfile?: string;
}
