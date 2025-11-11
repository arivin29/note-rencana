import { PartialType } from '@nestjs/swagger';
import { CreateNodeLocationDto } from './create-node-location.dto';

export class UpdateNodeLocationDto extends PartialType(CreateNodeLocationDto) {}
