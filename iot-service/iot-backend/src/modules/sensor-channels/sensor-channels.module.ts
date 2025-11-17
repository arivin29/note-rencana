import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorChannelsController } from './sensor-channels.controller';
import { SensorChannelsService } from './sensor-channels.service';
import { SensorChannel } from '../../entities/sensor-channel.entity';
import { SensorLog } from '../../entities/sensor-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SensorChannel, SensorLog])],
  controllers: [SensorChannelsController],
  providers: [SensorChannelsService],
  exports: [SensorChannelsService],
})
export class SensorChannelsModule {}
