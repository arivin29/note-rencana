import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsEnum, IsOptional, IsNumber } from 'class-validator';

export enum LocationType {
  MANUAL = 'manual',
  GPS = 'gps',
  IMPORT = 'import',
}

export class CreateNodeLocationDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  @IsNotEmpty()
  idProject: string;

  @ApiPropertyOptional({ description: 'Location type', enum: LocationType, default: 'manual' })
  @IsEnum(LocationType)
  @IsOptional()
  type?: LocationType;

  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @ApiPropertyOptional({ description: 'Elevation in meters' })
  @IsNumber()
  @IsOptional()
  elevation?: number;

  @ApiPropertyOptional({ description: 'Physical address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Precision in meters' })
  @IsNumber()
  @IsOptional()
  precisionM?: number;

  @ApiPropertyOptional({ description: 'Data source (GPS device, manual entry, import file)' })
  @IsString()
  @IsOptional()
  source?: string;
}
