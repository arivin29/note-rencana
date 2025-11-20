import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { LogLabel } from '../../../common/enums';

export class CreateIotLogDto {
  @IsEnum(LogLabel)
  @IsOptional()
  label?: LogLabel = LogLabel.LOG;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  timestamp?: Date;

  @IsString()
  @IsOptional()
  notes?: string;
}
