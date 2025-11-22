import { IsUUID, IsString, IsOptional, IsNotEmpty, IsBoolean, IsObject, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { MappingJson } from '../../../entities/node-profile.entity';

export class CreateNodeProfileDto {
  @ApiProperty({ description: 'Node Model ID' })
  @IsUUID()
  @IsNotEmpty()
  idNodeModel: string;

  @ApiProperty({ description: 'Project ID', required: false })
  @IsUUID()
  @IsOptional()
  idProject?: string;

  @ApiProperty({ description: 'Profile code (unique identifier)' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Profile name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Profile description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Parser type (e.g., json, binary, custom)', example: 'json' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['json', 'binary', 'custom'])
  parserType: string;

  @ApiProperty({
    description: 'Mapping configuration for payload parsing',
    example: {
      version: 1,
      payload_format: 'json',
      timestamp_path: 'timestamp',
      channels: [
        {
          metric_code: 'TEMP',
          source_path: 'data.temperature',
          multiplier: 0.1,
          offset: 0,
          unit: '°C'
        }
      ]
    }
  })
  @IsObject()
  @IsNotEmpty()
  mappingJson: MappingJson;

  @ApiProperty({ description: 'Custom transform script (JavaScript)', required: false })
  @IsString()
  @IsOptional()
  transformScript?: string;

  @ApiProperty({ description: 'Whether profile is enabled', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
