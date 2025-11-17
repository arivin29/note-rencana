import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Node } from '../../entities/node.entity';
import { Owner } from '../../entities/owner.entity';
import { Project } from '../../entities/project.entity';
import { Sensor } from '../../entities/sensor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Node,
      Owner,
      Project,
      Sensor,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
