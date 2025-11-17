import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnpairedDevicesController } from './unpaired-devices.controller';
import { UnpairedDevicesService } from './unpaired-devices.service';
import { NodeUnpairedDevice } from '../../entities/node-unpaired-device.entity';
import { Node } from '../../entities/node.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NodeUnpairedDevice, Node]),
  ],
  controllers: [UnpairedDevicesController],
  providers: [UnpairedDevicesService],
  exports: [UnpairedDevicesService],
})
export class UnpairedDevicesModule {}
