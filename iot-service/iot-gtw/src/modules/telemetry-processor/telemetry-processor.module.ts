import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IotLog } from '../../entities';
import {
  Node,
  NodeProfile,
  NodeUnpairedDevice,
  Owner,
  Project,
  Sensor,
  SensorChannel,
  SensorLog,
  SensorType,
} from '../../entities/existing';
import { TelemetryParserService } from './telemetry-parser.service';
import { TelemetryProcessorService } from './telemetry-processor.service';
import { TelemetryProcessorController } from './telemetry-processor.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IotLog,
      Node,
      NodeProfile,
      NodeUnpairedDevice,
      Owner,
      Project,
      Sensor,
      SensorChannel,
      SensorLog,
      SensorType,
    ]),
  ],
  controllers: [TelemetryProcessorController],
  providers: [TelemetryParserService, TelemetryProcessorService],
  exports: [TelemetryProcessorService],
})
export class TelemetryProcessorModule {}
