import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IotLog } from '../../entities/iot-log.entity';
import { IotLogsController } from './iot-logs.controller';
import { IotLogsService } from './iot-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([IotLog])],
  controllers: [IotLogsController],
  providers: [IotLogsService],
  exports: [IotLogsService],
})
export class IotLogsModule {}
