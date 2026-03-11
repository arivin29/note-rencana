import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Node } from '../../entities/node.entity';
import { NodeUnpairedDevice } from '../../entities/node-unpaired-device.entity';
import { AlertEvent } from '../../entities/alert-event.entity';
import { Project } from '../../entities/project.entity';
import { Owner } from '../../entities/owner.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Node,
      NodeUnpairedDevice,
      AlertEvent,
      Project,
      Owner,
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
