import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommandChannel } from './create-node-model-command.dto';

export class NodeModelCommandResponseDto {
  @ApiProperty()
  idCommand: string;

  @ApiProperty()
  idNodeModel: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ enum: CommandChannel })
  channel: string;

  @ApiProperty()
  template: string;

  @ApiPropertyOptional()
  config?: Record<string, any>;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  color: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class NodeModelCommandWithModelResponseDto extends NodeModelCommandResponseDto {
  @ApiPropertyOptional({ description: 'Node model details' })
  nodeModel?: {
    idNodeModel: string;
    modelCode: string;
    modelName: string;
    vendor: string;
  };
}
