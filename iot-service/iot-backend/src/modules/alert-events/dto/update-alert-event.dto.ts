import { PartialType } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAlertEventDto {
  @ApiProperty({ description: 'Status', example: 'acknowledged', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Note', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}

export class AcknowledgeAlertEventDto {
  @ApiProperty({ description: 'User ID who acknowledged' })
  @IsUUID()
  acknowledgedBy: string;

  @ApiProperty({ description: 'Acknowledge note', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}

export class ClearAlertEventDto {
  @ApiProperty({ description: 'User ID who cleared' })
  @IsUUID()
  clearedBy: string;

  @ApiProperty({ description: 'Clear note', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}
