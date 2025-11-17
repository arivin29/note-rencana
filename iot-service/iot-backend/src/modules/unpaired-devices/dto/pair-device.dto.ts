import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class PairDeviceDto {
  @ApiProperty({
    description: 'Project ID to pair this device to',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiPropertyOptional({
    description: 'Node name for the new paired node',
    example: 'GPS-Tracker-Field-A-01',
  })
  @IsString()
  @IsOptional()
  nodeName?: string;

  @ApiPropertyOptional({
    description: 'Node description',
    example: 'GPS tracker for monitoring field A location',
  })
  @IsString()
  @IsOptional()
  nodeDescription?: string;
}
