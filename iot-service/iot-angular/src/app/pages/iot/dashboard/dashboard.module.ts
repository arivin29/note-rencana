import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';

// SDK Module
import { ApiModule } from '@sdk/core/api.module';

// Shared Components Module (for card, card-header, card-body, etc.)
import { SharedComponentsModule } from '../../../shared/shared-components.module';

// Shared Widgets Module
import { WidgetsModule } from '../../../components/widgets/widgets-module';

// Dashboard Components
import { IotDashboardPage } from './iot-dashboard';

// Dashboard Widget Components
import { DashboardKpiCardsComponent } from './widgets/kpi-cards/kpi-cards.component';
import { DashboardNodeHealthComponent } from './widgets/node-health/node-health.component';
import { DashboardOwnerLeaderboardComponent } from './widgets/owner-leaderboard/owner-leaderboard.component';
import { DashboardActivityLogComponent } from './widgets/activity-log/activity-log.component';
import { DashboardTelemetryStreamsComponent } from './widgets/telemetry-streams/telemetry-streams.component';
import { DashboardDeliveryHealthComponent } from './widgets/delivery-health/delivery-health.component';
import { DashboardAlertStreamComponent } from './widgets/alert-stream/alert-stream.component';
import { DashboardReleaseWindowComponent } from './widgets/release-window/release-window.component';

@NgModule({
  declarations: [
    // Main Dashboard Page
    IotDashboardPage,
    
    // Dashboard Widget Components
    DashboardKpiCardsComponent,
    DashboardNodeHealthComponent,
    DashboardOwnerLeaderboardComponent,
    DashboardActivityLogComponent,
    DashboardTelemetryStreamsComponent,
    DashboardDeliveryHealthComponent,
    DashboardAlertStreamComponent,
    DashboardReleaseWindowComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgApexchartsModule,
    SharedComponentsModule, // For card, card-body, card-header, card-expand-toggler, etc.
    WidgetsModule, // For widget components
    ApiModule, // For DashboardService and other SDK services
  ],
  exports: [
    IotDashboardPage, // Export if needed by routing
  ]
})
export class IotDashboardModule { }
