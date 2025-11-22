import { Module } from '@nestjs/common';
import { DeviceCommandsController } from './device-commands.controller';
import { DeviceCommandsService } from './device-commands.service';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [MqttModule],
  controllers: [DeviceCommandsController],
  providers: [DeviceCommandsService],
  exports: [DeviceCommandsService],
})
export class DeviceCommandsModule {}
