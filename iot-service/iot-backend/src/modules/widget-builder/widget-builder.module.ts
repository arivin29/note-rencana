import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomDashboard } from '../../entities/custom-dashboard.entity';
import { CustomWidget } from '../../entities/custom-widget.entity';
import { WidgetQueryTemplate } from '../../entities/widget-query-template.entity';
import { Owner } from '../../entities/owner.entity';
import { WidgetBuilderController } from './widget-builder.controller';
import { WidgetBuilderService } from './widget-builder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomDashboard,
      CustomWidget,
      WidgetQueryTemplate,
      Owner,
    ]),
  ],
  controllers: [WidgetBuilderController],
  providers: [WidgetBuilderService],
  exports: [WidgetBuilderService],
})
export class WidgetBuilderModule {}
