import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum, IsObject } from 'class-validator';

export class UpdateUnpairedDeviceDto {
  @ApiPropertyOptional({
    description: 'Node model ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsOptional()
  idNodeModel?: string;

  @ApiPropertyOptional({
    description: 'Last received raw payload from device',
    example: { temperature: 25.5, humidity: 60, battery: 85 },
  })
  @IsObject()
  @IsOptional()
  lastPayload?: any;

  @ApiPropertyOptional({
    description: 'Last MQTT topic where data was received',
    example: 'devices/lora/867584050123456/up',
  })
  @IsString()
  @IsOptional()
  lastTopic?: string;

  @ApiPropertyOptional({
    description: 'Suggested project ID for pairing',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  @IsOptional()
  suggestedProject?: string;

  @ApiPropertyOptional({
    description: 'Suggested owner ID for pairing',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsUUID()
  @IsOptional()
  suggestedOwner?: string;

  @ApiPropertyOptional({
    description: 'Paired node ID (after pairing)',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  @IsUUID()
  @IsOptional()
  pairedNodeId?: string;

  @ApiPropertyOptional({
    description: 'Device status',
    enum: ['pending', 'paired', 'ignored'],
    example: 'pending',
  })
  @IsEnum(['pending', 'paired', 'ignored'])
  @IsOptional()
  status?: 'pending' | 'paired' | 'ignored';
}
