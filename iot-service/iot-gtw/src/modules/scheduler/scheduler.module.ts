import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryProcessorModule } from '../telemetry-processor/telemetry-processor.module';
import { TelemetrySchedulerService } from './telemetry-scheduler.service';
import { DataCleanupService } from './data-cleanup.service';
import { MaintenanceController } from './maintenance.controller';
import { IotLog } from '../../entities/iot-log.entity';
import { SensorLog } from '../../entities/existing/sensor-log.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TelemetryProcessorModule,
    TypeOrmModule.forFeature([IotLog, SensorLog]),
  ],
  controllers: [MaintenanceController],
  providers: [TelemetrySchedulerService, DataCleanupService],
  exports: [DataCleanupService],
})
export class SchedulerAppModule {}
