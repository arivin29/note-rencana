import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject } from 'class-validator';

export class CreateSensorCatalogDto {
  @ApiProperty({ description: 'Vendor/manufacturer name' })
  @IsString()
  @IsNotEmpty()
  vendor: string;

  @ApiProperty({ description: 'Sensor model name' })
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiPropertyOptional({ description: 'Icon asset path or URL' })
  @IsString()
  @IsOptional()
  iconAsset?: string;

  @ApiPropertyOptional({ description: 'Icon color hex code' })
  @IsString()
  @IsOptional()
  iconColor?: string;

  @ApiPropertyOptional({ description: 'Datasheet URL' })
  @IsString()
  @IsOptional()
  datasheetUrl?: string;

  @ApiPropertyOptional({ description: 'Firmware version or identifier' })
  @IsString()
  @IsOptional()
  firmware?: string;

  @ApiPropertyOptional({ description: 'Calibration interval in days' })
  @IsNumber()
  @IsOptional()
  calibrationIntervalDays?: number;

  @ApiPropertyOptional({ description: 'Default channels configuration (JSON)' })
  @IsObject()
  @IsOptional()
  defaultChannelsJson?: any;

  @ApiPropertyOptional({ description: 'Default thresholds configuration (JSON)' })
  @IsObject()
  @IsOptional()
  defaultThresholdsJson?: any;
}
