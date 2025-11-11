import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationType } from './create-node-location.dto';

export class NodeLocationResponseDto {
  @ApiProperty()
  idNodeLocation: string;

  @ApiProperty()
  idProject: string;

  @ApiProperty({ enum: LocationType })
  type: LocationType;

  @ApiProperty({ description: 'Latitude' })
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  longitude: number;

  @ApiPropertyOptional()
  elevation?: number;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  precisionM?: number;

  @ApiPropertyOptional()
  source?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Project details' })
  project?: any;
}
