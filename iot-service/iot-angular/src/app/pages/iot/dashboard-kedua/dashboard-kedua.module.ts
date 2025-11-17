import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { WidgetsModule } from '../../../components/widgets/widgets-module'; 

import { DashboardKeduaRoutingModule } from './dashboard-kedua-routing.module';
import { IotDashboardKeduaPage } from './iot-dashboard-kedua';

// Widgets
import { DkOwnerProjectFiltersComponent } from './widgets/dk-owner-project-filters/dk-owner-project-filters.component';
import { DkSystemOverviewComponent } from './widgets/dk-system-overview/dk-system-overview.component';
import { DkNodesStatusTrendsComponent } from './widgets/dk-nodes-status-trends/dk-nodes-status-trends.component';
import { DkTopAnomaliesComponent } from './widgets/dk-top-anomalies/dk-top-anomalies.component';
import { DkIngestionForwardingComponent } from './widgets/dk-ingestion-forwarding/dk-ingestion-forwarding.component';
import { DkRecentActivitiesComponent } from './widgets/dk-recent-activities/dk-recent-activities.component';
import { DkPlatformStatisticsComponent } from './widgets/dk-platform-statistics/dk-platform-statistics.component';

@NgModule({
  declarations: [
    IotDashboardKeduaPage,
    DkOwnerProjectFiltersComponent,
    DkSystemOverviewComponent,
    DkNodesStatusTrendsComponent,
    DkTopAnomaliesComponent,
    DkIngestionForwardingComponent,
    DkRecentActivitiesComponent,
    DkPlatformStatisticsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgApexchartsModule,
    SharedComponentsModule,
    WidgetsModule, 
    DashboardKeduaRoutingModule,
  ],
})
export class DashboardKeduaModule {}
