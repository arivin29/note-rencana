import { PartialType } from '@nestjs/swagger';
import { CreateNodeProfileDto } from './create-node-profile.dto';

export class UpdateNodeProfileDto extends PartialType(CreateNodeProfileDto) {}
