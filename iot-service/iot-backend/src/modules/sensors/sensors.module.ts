import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { Sensor } from '../../entities/sensor.entity';
import { SensorChannel } from '../../entities/sensor-channel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sensor, SensorChannel])],
  controllers: [SensorsController],
  providers: [SensorsService],
  exports: [SensorsService],
})
export class SensorsModule {}
