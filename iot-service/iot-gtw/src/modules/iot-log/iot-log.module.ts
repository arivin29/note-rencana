import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IotLog } from '../../entities';
import { IotLogService } from './iot-log.service';
import { IotLogController } from './iot-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IotLog])],
  controllers: [IotLogController],
  providers: [IotLogService],
  exports: [IotLogService],
})
export class IotLogModule {}
