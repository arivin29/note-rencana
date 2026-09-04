import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MobileRoutingModule } from './mobile-routing.module';

import { MobileLayoutComponent } from './layout/mobile-layout/mobile-layout.component';
import { MobileHeaderComponent } from './layout/mobile-header/mobile-header.component';
import { MobileBottomNavComponent } from './layout/mobile-bottom-nav/mobile-bottom-nav.component';
import { MobileLoginComponent } from './login/mobile-login/mobile-login.component';
import { MobileDashboardComponent } from './dashboard/mobile-dashboard/mobile-dashboard.component';
import { MobileNodesListComponent } from './nodes/mobile-nodes-list/mobile-nodes-list.component';
import { MobileNodeDetailComponent } from './nodes/mobile-node-detail/mobile-node-detail.component';
import { MobileChannelDetailComponent } from './nodes/mobile-channel-detail/mobile-channel-detail.component';
import { MobileProjectsListComponent } from './projects/mobile-projects-list/mobile-projects-list.component';
import { MobileProjectDetailComponent } from './projects/mobile-project-detail/mobile-project-detail.component';
import { MobileProjectInfoComponent } from './projects/tabs/project-info/project-info.component';
import { MobileProjectMapComponent } from './projects/tabs/project-map/project-map.component';
import { MobileProjectChannelsComponent } from './projects/tabs/project-channels/project-channels.component';
import { MobileProjectScadaComponent } from './projects/tabs/project-scada/project-scada.component';
import { MobileChannelListComponent } from './shared/channel-list/mobile-channel-list.component';
import { PullRefreshDirective } from './shared/pull-refresh.directive';
import { MobileNodeInfoComponent } from './nodes/node-info/mobile-node-info.component';
import { MobileSensorContextComponent } from './nodes/node-info/sensor-context-sheet/mobile-sensor-context.component';
import { MobileFlowDiagramComponent } from './nodes/node-info/flow-diagram/mobile-flow-diagram.component';
import { MobileNodeCommandComponent } from './nodes/node-command/mobile-node-command.component';
import { MobileNodeLogsComponent } from './nodes/node-logs/mobile-node-logs.component';
import { MobileAlertsComponent } from './alerts/mobile-alerts/mobile-alerts.component';
import { MobileProfileComponent } from './profile/mobile-profile/mobile-profile.component';

/**
 * Modul Mobile (lite, read-only fase 1). Sengaja TIDAK import SharedComponentsModule
 * agar terisolasi dari komponen/tema desktop (docs/mobile/04-STYLE-SYSTEM.md).
 */
@NgModule({
  declarations: [
    MobileLayoutComponent,
    MobileHeaderComponent,
    MobileBottomNavComponent,
    MobileLoginComponent,
    MobileDashboardComponent,
    MobileNodesListComponent,
    MobileNodeDetailComponent,
    MobileFlowDiagramComponent,
    MobileChannelDetailComponent,
    MobileProjectsListComponent,
    MobileProjectDetailComponent,
    MobileProjectInfoComponent,
    MobileProjectMapComponent,
    MobileProjectChannelsComponent,
    MobileProjectScadaComponent,
    MobileChannelListComponent,
    PullRefreshDirective,
    MobileNodeInfoComponent,
    MobileSensorContextComponent,
    MobileNodeCommandComponent,
    MobileNodeLogsComponent,
    MobileAlertsComponent,
    MobileProfileComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MobileRoutingModule
  ]
})
export class MobileModule {}
