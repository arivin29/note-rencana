import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodeModelsController } from './node-models.controller';
import { NodeModelsService } from './node-models.service';
import { NodeModel } from '../../entities/node-model.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NodeModel])],
  controllers: [NodeModelsController],
  providers: [NodeModelsService],
  exports: [NodeModelsService],
})
export class NodeModelsModule {}
