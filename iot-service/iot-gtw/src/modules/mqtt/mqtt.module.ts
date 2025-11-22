import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './mqtt.service';
import { IotLogModule } from '../iot-log/iot-log.module';
import { Node, NodeUnpairedDevice } from '../../entities/existing';
import { Owner } from '../../entities/existing/owner.entity';

@Module({
  imports: [
    IotLogModule,
    TypeOrmModule.forFeature([Node, NodeUnpairedDevice, Owner]),
  ],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
