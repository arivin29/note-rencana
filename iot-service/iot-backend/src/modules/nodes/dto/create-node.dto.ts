import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional, IsNumber, IsDateString, IsIP, IsEmail, IsArray, IsLatitude, IsLongitude } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Friendly name for the node' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the node' })
  @IsString()
  @IsOptional()
  description?: string;

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

  @ApiPropertyOptional({ description: 'Node Profile ID for payload parsing' })
  @IsUUID()
  @IsOptional()
  idNodeProfile?: string;

  // ========== Location Fields ==========
  @ApiPropertyOptional({ description: 'Full address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Province/State' })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country', default: 'Indonesia' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'GPS Latitude', example: -6.2088 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'GPS Longitude', example: 106.8456 })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Elevation in meters' })
  @IsNumber()
  @IsOptional()
  elevationM?: number;

  // ========== Status & Maintenance ==========
  @ApiPropertyOptional({ description: 'Status: active, inactive, maintenance, decommissioned', default: 'active' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Commissioning date' })
  @IsDateString()
  @IsOptional()
  commissionedAt?: string;

  @ApiPropertyOptional({ description: 'Last maintenance date' })
  @IsDateString()
  @IsOptional()
  lastMaintenanceAt?: string;

  @ApiPropertyOptional({ description: 'Next scheduled maintenance date' })
  @IsDateString()
  @IsOptional()
  nextMaintenanceAt?: string;

  // ========== Environment ==========
  @ApiPropertyOptional({ description: 'Installation type: outdoor, indoor, underground, submerged' })
  @IsString()
  @IsOptional()
  installationType?: string;

  @ApiPropertyOptional({ description: 'Enclosure rating: IP65, IP67, IP68' })
  @IsString()
  @IsOptional()
  enclosureRating?: string;

  @ApiPropertyOptional({ description: 'Power source: solar, grid, battery, hybrid' })
  @IsString()
  @IsOptional()
  powerSource?: string;

  // ========== PIC (Person In Charge) ==========
  @ApiPropertyOptional({ description: 'PIC name' })
  @IsString()
  @IsOptional()
  picName?: string;

  @ApiPropertyOptional({ description: 'PIC phone number' })
  @IsString()
  @IsOptional()
  picPhone?: string;

  @ApiPropertyOptional({ description: 'PIC email' })
  @IsEmail()
  @IsOptional()
  picEmail?: string;

  // ========== Notes & Tags ==========
  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  // ========== WebGIS Icon ==========
  @ApiPropertyOptional({ description: 'Icon URL for WebGIS map display (max 64x64px, 100KB)' })
  @IsString()
  @IsOptional()
  iconUrl?: string;
}
