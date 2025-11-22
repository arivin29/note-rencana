import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';

export enum RelayAction {
  ON = 'on',
  OFF = 'off',
  PULSE = 'pulse',
}

export enum RelayTarget {
  OUT1 = 'out1',
  OUT2 = 'out2',
}

export class SendRelayCommandDto {
  @ApiProperty({
    description: 'Device ID (MAC address)',
    example: 'A1B2C3D4E5F6',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: 'Action to perform',
    enum: RelayAction,
    example: RelayAction.ON,
  })
  @IsEnum(RelayAction)
  action: RelayAction;

  @ApiProperty({
    description: 'Target relay output',
    enum: RelayTarget,
    example: RelayTarget.OUT1,
  })
  @IsEnum(RelayTarget)
  target: RelayTarget;

  @ApiPropertyOptional({
    description: 'Duration in milliseconds (only for PULSE action)',
    example: 5000,
    minimum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  duration?: number;
}
