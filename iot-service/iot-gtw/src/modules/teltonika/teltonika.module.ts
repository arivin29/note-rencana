import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TeltonikaGateway } from './teltonika.gateway';
import { TeltonikaService } from './teltonika.service';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [ConfigModule, MqttModule],
  providers: [TeltonikaGateway, TeltonikaService],
  exports: [TeltonikaGateway, TeltonikaService],
})
export class TeltonikaModule {}
