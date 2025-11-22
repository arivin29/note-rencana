import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TelemetryProcessorModule } from '../telemetry-processor/telemetry-processor.module';
import { TelemetrySchedulerService } from './telemetry-scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TelemetryProcessorModule,
  ],
  providers: [TelemetrySchedulerService],
})
export class SchedulerAppModule {}
