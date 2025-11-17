import { IsUUID, IsString, IsOptional, IsBoolean, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAlertRuleDto {
  @ApiProperty({ description: 'Sensor channel ID' })
  @IsUUID()
  @IsNotEmpty()
  idSensorChannel: string;

  @ApiProperty({ description: 'Rule type', example: 'threshold' })
  @IsString()
  @IsNotEmpty()
  ruleType: string;

  @ApiProperty({ description: 'Severity level', example: 'critical', required: false })
  @IsString()
  @IsOptional()
  severity?: string;

  @ApiProperty({ description: 'Rule parameters as JSON', example: { min: 0, max: 100 }, required: false })
  @IsObject()
  @IsOptional()
  paramsJson?: Record<string, any>;

  @ApiProperty({ description: 'Whether rule is enabled', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
