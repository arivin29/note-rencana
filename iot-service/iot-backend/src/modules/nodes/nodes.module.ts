import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodesController } from './nodes.controller';
import { NodesService } from './nodes.service';
import { Node } from '../../entities/node.entity';
import { SensorLog } from '../../entities/sensor-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Node, SensorLog])],
  controllers: [NodesController],
  providers: [NodesService],
  exports: [NodesService],
})
export class NodesModule {}
