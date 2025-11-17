import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HardwareClass } from './create-node-model.dto';

export class NodeModelResponseDto {
  @ApiProperty()
  idNodeModel: string;

  @ApiPropertyOptional()
  modelCode?: string;

  @ApiProperty()
  vendor: string;

  @ApiProperty()
  modelName: string;

  @ApiProperty()
  protocol: string;

  @ApiPropertyOptional()
  communicationBand?: string;

  @ApiPropertyOptional()
  powerType?: string;

  @ApiPropertyOptional({ enum: HardwareClass })
  hardwareClass?: HardwareClass;

  @ApiPropertyOptional()
  hardwareRevision?: string;

  @ApiPropertyOptional()
  toolchain?: string;

  @ApiPropertyOptional()
  buildAgent?: string;

  @ApiPropertyOptional()
  firmwareRepo?: string;

  @ApiPropertyOptional()
  flashProtocol?: string;

  @ApiProperty()
  supportsCodegen: boolean;

  @ApiPropertyOptional()
  defaultFirmware?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class NodeModelDetailedResponseDto extends NodeModelResponseDto {
  @ApiPropertyOptional({ description: 'Nodes using this model', isArray: true })
  nodes?: any[];

  @ApiPropertyOptional({ description: 'Usage statistics' })
  stats?: {
    totalNodes: number;
    activeNodes: number;
    offlineNodes: number;
  };
}
