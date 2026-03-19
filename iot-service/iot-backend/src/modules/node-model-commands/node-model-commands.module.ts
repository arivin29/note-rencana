import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodeModelCommandsController } from './node-model-commands.controller';
import { NodeModelCommandsService } from './node-model-commands.service';
import { NodeModelCommand } from '../../entities/node-model-command.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NodeModelCommand])],
  controllers: [NodeModelCommandsController],
  providers: [NodeModelCommandsService],
  exports: [NodeModelCommandsService],
})
export class NodeModelCommandsModule {}
