import { IsOptional, IsString, IsUUID, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryForecastsDto {
  @ApiPropertyOptional({ description: 'Filter by sensor channel ID' })
  @IsOptional()
  @IsUUID()
  idSensorChannel?: string;

  @ApiPropertyOptional({ description: 'Filter by device ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Filter by sensor key' })
  @IsOptional()
  @IsString()
  sensorKey?: string;

  @ApiPropertyOptional({ description: 'Filter by owner ID' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Forecast start time (defaults to now)' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Forecast end time (defaults to 7 days from now)' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 168, minimum: 1, maximum: 500, description: 'Number of forecast points' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number = 168; // 7 days * 24 hours
}

export class ForecastPointDto {
  @ApiProperty()
  forecastTime: Date;

  @ApiProperty()
  predictedValue: number;

  @ApiProperty()
  confidenceLower: number;

  @ApiProperty()
  confidenceUpper: number;
}

export class ForecastResponseDto {
  @ApiProperty()
  idForecastResult: string;

  @ApiProperty()
  idSensorChannel: string;

  @ApiProperty()
  forecastGeneratedAt: Date;

  @ApiProperty()
  forecastHorizonHours: number;

  @ApiProperty()
  modelVersion: string;

  @ApiProperty({ type: [ForecastPointDto] })
  forecastData: ForecastPointDto[];

  @ApiPropertyOptional()
  trainingDataFrom?: Date;

  @ApiPropertyOptional()
  trainingDataTo?: Date;

  @ApiPropertyOptional()
  trainingDataPoints?: number;

  @ApiProperty()
  createdAt: Date;

  // Joined data
  @ApiPropertyOptional()
  sensorChannel?: {
    idSensorChannel: string;
    channelName: string;
    unitMeasure: string;
  };

  @ApiPropertyOptional()
  sensor?: {
    idSensor: string;
    sensorKey: string;
    sensorName: string;
  };

  @ApiPropertyOptional()
  node?: {
    idNode: string;
    nodeName: string;
    deviceId: string;
  };
}

export class ForecastComparisonDto {
  @ApiProperty({ description: 'Time point' })
  timestamp: Date;

  @ApiProperty({ description: 'Actual measured value' })
  actualValue: number;

  @ApiProperty({ description: 'Forecasted value' })
  forecastedValue: number;

  @ApiProperty({ description: 'Confidence lower bound' })
  confidenceLower: number;

  @ApiProperty({ description: 'Confidence upper bound' })
  confidenceUpper: number;

  @ApiProperty({ description: 'Whether actual value is within confidence interval' })
  withinConfidence: boolean;

  @ApiProperty({ description: 'Deviation percentage from forecast' })
  deviationPercent: number;
}
