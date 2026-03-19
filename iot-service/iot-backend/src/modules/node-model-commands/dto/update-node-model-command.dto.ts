import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateNodeModelCommandDto } from './create-node-model-command.dto';

export class UpdateNodeModelCommandDto extends PartialType(
  OmitType(CreateNodeModelCommandDto, ['idNodeModel'] as const),
) {}
