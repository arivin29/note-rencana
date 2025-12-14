import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertEventsController } from './alert-events.controller';
import { AlertEventsService } from './alert-events.service';
import { AlertCheckerService } from './alert-checker.service';
import { AlertEvent } from '../../entities/alert-event.entity';
import { AlertRule } from '../../entities/alert-rule.entity';
import { Node } from '../../entities/node.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AlertEvent, AlertRule, Node])],
  controllers: [AlertEventsController],
  providers: [AlertEventsService, AlertCheckerService],
  exports: [AlertEventsService, AlertCheckerService],
})
export class AlertEventsModule {}
