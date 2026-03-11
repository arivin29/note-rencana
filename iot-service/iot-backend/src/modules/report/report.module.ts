import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportExportService } from './report-export.service';
import { ReportTemplate } from '../../entities/report-template.entity';
import { SensorChannel } from '../../entities/sensor-channel.entity';
import { ProjectsModule } from '../projects/projects.module';
import { NodesModule } from '../nodes/nodes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportTemplate, SensorChannel]),
    ProjectsModule,
    NodesModule,
  ],
  controllers: [ReportController],
  providers: [ReportService, ReportExportService],
  exports: [ReportService],
})
export class ReportModule {}
