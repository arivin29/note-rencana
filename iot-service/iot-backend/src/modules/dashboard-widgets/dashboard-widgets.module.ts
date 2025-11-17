import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardWidgetsController } from './dashboard-widgets.controller';
import { DashboardWidgetsService } from './dashboard-widgets.service';
import { DashboardWidget } from '../../entities/dashboard-widget.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DashboardWidget])],
  controllers: [DashboardWidgetsController],
  providers: [DashboardWidgetsService],
  exports: [DashboardWidgetsService],
})
export class DashboardWidgetsModule {}
