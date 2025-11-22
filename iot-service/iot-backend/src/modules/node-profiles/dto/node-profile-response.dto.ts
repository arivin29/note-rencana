import { ApiProperty } from '@nestjs/swagger';
import type { MappingJson } from '../../../entities/node-profile.entity';

export class NodeProfileResponseDto {
  @ApiProperty()
  idNodeProfile: string;

  @ApiProperty()
  idNodeModel: string;

  @ApiProperty({ required: false })
  idProject?: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  parserType: string;

  @ApiProperty()
  mappingJson: MappingJson;

  @ApiProperty({ required: false })
  transformScript?: string;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  nodeModel?: {
    idNodeModel: string;
    name: string;
    manufacturer: string;
  };

  @ApiProperty({ required: false })
  project?: {
    idProject: string;
    name: string;
  };

  @ApiProperty({ required: false })
  nodeCount?: number;
}
