import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { IotLogModule } from '../iot-log/iot-log.module';

@Module({
  imports: [IotLogModule],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
