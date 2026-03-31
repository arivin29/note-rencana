import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ScadaBindingOptionsQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  sensorTypeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  search?: string;
}

export class ScadaBindingOptionItemDto {
  @ApiProperty()
  idSensorChannel: string;

  @ApiProperty()
  metricCode: string;

  @ApiPropertyOptional()
  unit?: string | null;

  @ApiPropertyOptional()
  precision?: number | null;

  @ApiPropertyOptional()
  minThreshold?: number | null;

  @ApiPropertyOptional()
  maxThreshold?: number | null;

  @ApiProperty()
  sensor: {
    idSensor: string;
    label: string;
    sensorCode?: string | null;
    status?: string | null;
  };

  @ApiProperty()
  node: {
    idNode: string;
    code: string;
    name?: string | null;
    address?: string | null;
  };

  @ApiProperty()
  project: {
    idProject: string;
    name: string;
  };

  @ApiProperty()
  sensorType: {
    idSensorType: string;
    category?: string | null;
    defaultUnit?: string | null;
    precision?: number | null;
  };
}
