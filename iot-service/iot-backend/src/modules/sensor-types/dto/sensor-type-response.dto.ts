import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SensorTypeResponseDto {
  @ApiProperty()
  idSensorType: string;

  @ApiProperty()
  category: string;

  @ApiPropertyOptional()
  defaultUnit?: string;

  @ApiPropertyOptional()
  precision?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
