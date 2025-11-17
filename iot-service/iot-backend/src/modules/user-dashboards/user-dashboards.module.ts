import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDashboardsController } from './user-dashboards.controller';
import { UserDashboardsService } from './user-dashboards.service';
import { UserDashboard } from '../../entities/user-dashboard.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserDashboard])],
  controllers: [UserDashboardsController],
  providers: [UserDashboardsService],
  exports: [UserDashboardsService],
})
export class UserDashboardsModule {}
