import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodeLocationsController } from './node-locations.controller';
import { NodeLocationsService } from './node-locations.service';
import { NodeLocation } from '../../entities/node-location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NodeLocation])],
  controllers: [NodeLocationsController],
  providers: [NodeLocationsService],
  exports: [NodeLocationsService],
})
export class NodeLocationsModule {}
