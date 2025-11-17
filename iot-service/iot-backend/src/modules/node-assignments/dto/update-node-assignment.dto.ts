import { PartialType } from '@nestjs/swagger';
import { CreateNodeAssignmentDto } from './create-node-assignment.dto';

export class UpdateNodeAssignmentDto extends PartialType(CreateNodeAssignmentDto) {}
