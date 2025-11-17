import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateUnpairedDeviceDto {
  @ApiProperty({
    description: 'Hardware identifier (IMEI, dev_eui, MAC address, serial number)',
    example: '867584050123456',
  })
  @IsString()
  @IsNotEmpty()
  hardwareId: string;

  @ApiPropertyOptional({
    description: 'Node model ID (auto-detected or manually assigned)',
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
}
