import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AreaType } from './create-project.dto';

export class ProjectResponseDto {
  @ApiProperty()
  idProject: string;

  @ApiProperty()
  idOwner: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ enum: AreaType })
  areaType?: AreaType;

  @ApiPropertyOptional()
  geofence?: any;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Owner details' })
  owner?: any;
}

export class ProjectDetailedResponseDto extends ProjectResponseDto {
  @ApiPropertyOptional({ description: 'List of nodes in this project', isArray: true })
  nodes?: any[];

  @ApiPropertyOptional({ description: 'List of locations in this project', isArray: true })
  locations?: any[];

  @ApiPropertyOptional({ description: 'Project statistics' })
  stats?: {
    totalNodes: number;
    activeNodes: number;
    totalSensors: number;
    totalLocations: number;
  };
}
