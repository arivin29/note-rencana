import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertEventsController } from './alert-events.controller';
import { AlertEventsService } from './alert-events.service';
import { AlertEvent } from '../../entities/alert-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AlertEvent])],
  controllers: [AlertEventsController],
  providers: [AlertEventsService],
  exports: [AlertEventsService],
})
export class AlertEventsModule {}
