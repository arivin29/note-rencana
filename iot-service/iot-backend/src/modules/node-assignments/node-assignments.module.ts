import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodeAssignmentsController } from './node-assignments.controller';
import { NodeAssignmentsService } from './node-assignments.service';
import { NodeAssignment } from '../../entities/node-assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NodeAssignment])],
  controllers: [NodeAssignmentsController],
  providers: [NodeAssignmentsService],
  exports: [NodeAssignmentsService],
})
export class NodeAssignmentsModule {}
