import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnerForwardingMqtt, OwnerForwardingMqttLog } from '../../entities/existing';
import { ClickhouseModule } from '../clickhouse/clickhouse.module';
import { MqttPublisherService } from './mqtt-publisher.service';
import { BroadcastWorkerService } from './broadcast-worker.service';
import { BroadcastSchedulerService } from './broadcast-scheduler.service';

/**
 * Modul broadcast MQTT (eksekutor). Dipakai oleh proses terpisah `iot-broadcast`
 * (lihat broadcast-main.ts). Tidak expose HTTP — murni worker latar.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([OwnerForwardingMqtt, OwnerForwardingMqttLog]),
    ClickhouseModule,
  ],
  providers: [MqttPublisherService, BroadcastWorkerService, BroadcastSchedulerService],
  exports: [BroadcastWorkerService],
})
export class BroadcastModule {}
