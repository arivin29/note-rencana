import { IsUUID, IsNumber, IsString, IsOptional, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAlertEventDto {
  @ApiProperty({ description: 'Alert rule ID' })
  @IsUUID()
  @IsNotEmpty()
  idAlertRule: string;

  @ApiProperty({ description: 'Triggered timestamp' })
  @IsDateString()
  @IsNotEmpty()
  triggeredAt: Date;

  @ApiProperty({ description: 'Sensor value that triggered the alert', required: false })
  @IsNumber()
  @IsOptional()
  value?: number;

  @ApiProperty({ description: 'Status', example: 'open', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Note', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}
