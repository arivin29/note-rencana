import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SensorCatalogResponseDto {
  @ApiProperty()
  idSensorCatalog: string;

  @ApiProperty()
  vendor: string;

  @ApiProperty()
  modelName: string;

  @ApiPropertyOptional()
  iconAsset?: string;

  @ApiPropertyOptional()
  iconColor?: string;

  @ApiPropertyOptional()
  datasheetUrl?: string;

  @ApiPropertyOptional()
  firmware?: string;

  @ApiPropertyOptional()
  calibrationIntervalDays?: number;

  @ApiPropertyOptional()
  defaultChannelsJson?: any;

  @ApiPropertyOptional()
  defaultThresholdsJson?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
