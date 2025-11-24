import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SensorTypeResponseDto {
  @ApiProperty()
  idSensorType: string;

  @ApiProperty()
  category: string;

  @ApiPropertyOptional()
  defaultUnit?: string;

  @ApiPropertyOptional({ description: 'Conversion formula using "x" as variable', example: '(x - 0.5) * 2.5' })
  conversionFormula?: string;

  @ApiPropertyOptional()
  precision?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
