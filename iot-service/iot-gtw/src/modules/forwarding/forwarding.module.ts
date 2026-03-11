import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { OwnerForwardingDatabase, OwnerForwardingLog, SensorLog } from '../../entities/existing';
import { IotLog } from '../../entities';
import { ClickhouseModule } from '../clickhouse/clickhouse.module';
import { ForwardingSchedulerService } from './forwarding-scheduler.service';
import { ForwardingWorkerService } from './forwarding-worker.service';
import { TargetDbConnectorService } from './target-db-connector.service';
import { ForwardingController } from './forwarding.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      OwnerForwardingDatabase,
      OwnerForwardingLog,
      SensorLog,
      IotLog,
    ]),
    ClickhouseModule,
  ],
  controllers: [ForwardingController],
  providers: [
    ForwardingSchedulerService,
    ForwardingWorkerService,
    TargetDbConnectorService,
  ],
  exports: [ForwardingWorkerService],
})
export class ForwardingModule {}
