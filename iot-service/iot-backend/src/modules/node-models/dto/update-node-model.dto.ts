import { PartialType } from '@nestjs/swagger';
import { CreateNodeModelDto } from './create-node-model.dto';

export class UpdateNodeModelDto extends PartialType(CreateNodeModelDto) {}
