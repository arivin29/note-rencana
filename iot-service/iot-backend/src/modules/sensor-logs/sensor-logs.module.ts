import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorLog } from '../../entities/sensor-log.entity';
import { SensorLogsController } from './sensor-logs.controller';
import { SensorLogsService } from './sensor-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([SensorLog])],
  controllers: [SensorLogsController],
  providers: [SensorLogsService],
  exports: [SensorLogsService],
})
export class SensorLogsModule {}
