import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodeProfilesController } from './node-profiles.controller';
import { NodeProfilesService } from './node-profiles.service';
import { NodeProfile } from '../../entities/node-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NodeProfile])],
  controllers: [NodeProfilesController],
  providers: [NodeProfilesService],
  exports: [NodeProfilesService],
})
export class NodeProfilesModule {}
