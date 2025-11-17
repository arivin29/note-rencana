import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsEnum, IsOptional, IsObject } from 'class-validator';

export enum AreaType {
  PLANT = 'plant',
  PIPELINE = 'pipeline',
  FARM = 'farm',
  INDUSTRIAL = 'industrial',
  OTHER = 'other',
}

export class CreateProjectDto {
  @ApiProperty({ description: 'Owner ID (tenant)' })
  @IsUUID()
  @IsNotEmpty()
  idOwner: string;

  @ApiProperty({ description: 'Project name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Area type', enum: AreaType })
  @IsEnum(AreaType)
  @IsOptional()
  areaType?: AreaType;

  @ApiPropertyOptional({ description: 'GeoJSON polygon for geofencing' })
  @IsObject()
  @IsOptional()
  geofence?: any;

  @ApiPropertyOptional({ description: 'Project status', default: 'active' })
  @IsString()
  @IsOptional()
  status?: string;
}
