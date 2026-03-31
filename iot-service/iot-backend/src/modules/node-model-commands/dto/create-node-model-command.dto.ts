import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsObject, IsInt, Min } from 'class-validator';

export enum CommandChannel {
  SMS = 'sms',
  MQTT = 'mqtt',
  HTTP = 'http',
  CALL = 'call',
  TELEGRAM = 'telegram',
}

export class CreateNodeModelCommandDto {
  @ApiProperty({ description: 'Node model ID this command belongs to' })
  @IsString()
  @IsNotEmpty()
  idNodeModel: string;

  @ApiProperty({ description: 'Command code (e.g., RELAY_ON, STATUS, RESET)' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Human-readable label (e.g., Turn Relay ON)' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Communication channel', enum: CommandChannel })
  @IsEnum(CommandChannel)
  @IsNotEmpty()
  channel: CommandChannel;

  @ApiProperty({ description: 'Command template with placeholders (e.g., CMD {device_id} {cmd})' })
  @IsString()
  @IsNotEmpty()
  template: string;

  @ApiPropertyOptional({ description: 'Channel-specific configuration (e.g., mqtt topic, http method)' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Icon class (Font Awesome)', default: 'fa-terminal' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Color theme (primary, success, danger, etc)', default: 'primary' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether command is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
