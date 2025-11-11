import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export enum HardwareClass {
  MCU = 'mcu',
  GATEWAY = 'gateway',
  TRACKER = 'tracker',
  CUSTOM = 'custom',
}

export class CreateNodeModelDto {
  @ApiPropertyOptional({ description: 'Model code for internal reference' })
  @IsString()
  @IsOptional()
  modelCode?: string;

  @ApiProperty({ description: 'Vendor/manufacturer name' })
  @IsString()
  @IsNotEmpty()
  vendor: string;

  @ApiProperty({ description: 'Model name' })
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiProperty({ description: 'Communication protocol (LoRa, MQTT, HTTP, etc)' })
  @IsString()
  @IsNotEmpty()
  protocol: string;

  @ApiPropertyOptional({ description: 'Communication band (868MHz, 915MHz, etc)' })
  @IsString()
  @IsOptional()
  communicationBand?: string;

  @ApiPropertyOptional({ description: 'Power type (battery, solar, AC, etc)' })
  @IsString()
  @IsOptional()
  powerType?: string;

  @ApiPropertyOptional({ description: 'Hardware class', enum: HardwareClass })
  @IsEnum(HardwareClass)
  @IsOptional()
  hardwareClass?: HardwareClass;

  @ApiPropertyOptional({ description: 'Hardware revision' })
  @IsString()
  @IsOptional()
  hardwareRevision?: string;

  @ApiPropertyOptional({ description: 'Toolchain (Arduino IDE, PlatformIO, etc)' })
  @IsString()
  @IsOptional()
  toolchain?: string;

  @ApiPropertyOptional({ description: 'Build agent for CI/CD' })
  @IsString()
  @IsOptional()
  buildAgent?: string;

  @ApiPropertyOptional({ description: 'Firmware repository URL' })
  @IsString()
  @IsOptional()
  firmwareRepo?: string;

  @ApiPropertyOptional({ description: 'Flash protocol (UART, SWD, OTA, etc)' })
  @IsString()
  @IsOptional()
  flashProtocol?: string;

  @ApiPropertyOptional({ description: 'Supports code generation', default: false })
  @IsBoolean()
  @IsOptional()
  supportsCodegen?: boolean;

  @ApiPropertyOptional({ description: 'Default firmware version' })
  @IsString()
  @IsOptional()
  defaultFirmware?: string;
}
