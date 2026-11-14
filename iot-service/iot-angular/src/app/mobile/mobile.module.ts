import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MobileRoutingModule } from './mobile-routing.module';

import { MobileLayoutComponent } from './layout/mobile-layout/mobile-layout.component';
import { MobileHeaderComponent } from './layout/mobile-header/mobile-header.component';
import { MobileBottomNavComponent } from './layout/mobile-bottom-nav/mobile-bottom-nav.component';
import { MobileLoginComponent } from './login/mobile-login/mobile-login.component';
import { MobileHomeComponent } from './home/mobile-home.component';
import { MobileNodesListComponent } from './nodes/mobile-nodes-list/mobile-nodes-list.component';
import { MobileNodeDetailComponent } from './nodes/mobile-node-detail/mobile-node-detail.component';
import { MobileChannelDetailComponent } from './nodes/mobile-channel-detail/mobile-channel-detail.component';
import { MobileProjectsListComponent } from './projects/mobile-projects-list/mobile-projects-list.component';
import { MobileProjectShellComponent } from './projects/project-shell/mobile-project-shell.component';
import { MobileProjectSummaryComponent } from './projects/tabs/project-summary/project-summary.component';
import { MobileProjectMapComponent } from './projects/tabs/project-map/project-map.component';
import { MobileProjectChannelsComponent } from './projects/tabs/project-channels/project-channels.component';
import { MobileProjectScadaComponent } from './projects/tabs/project-scada/project-scada.component';
import { MobileChannelListComponent } from './shared/channel-list/mobile-channel-list.component';
import { PullRefreshDirective } from './shared/pull-refresh.directive';
import { MobileNumPipe } from './shared/mobile-num.pipe';
import { MobileNodeInfoComponent } from './nodes/node-info/mobile-node-info.component';
import { MobileSensorContextComponent } from './nodes/node-info/sensor-context-sheet/mobile-sensor-context.component';
import { MobileFlowDiagramComponent } from './nodes/node-info/flow-diagram/mobile-flow-diagram.component';
import { MobileNodeCommandComponent } from './nodes/node-command/mobile-node-command.component';
import { MobileNodeLogsComponent } from './nodes/node-logs/mobile-node-logs.component';
import { MobileAlertsComponent } from './alerts/mobile-alerts/mobile-alerts.component';
import { ScadaEmbedModule } from '../shared/scada-embed/scada-embed.module';
import { WebgisSharedModule } from '../pages/iot/webgis/webgis-shared.module';
import { MobileProfileComponent } from './profile/mobile-profile/mobile-profile.component';
import { MobilePanelComponent } from './shared/panel/mobile-panel.component';

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
    MobileHomeComponent,
    MobileNodesListComponent,
    MobileNodeDetailComponent,
    MobileFlowDiagramComponent,
    MobileChannelDetailComponent,
    MobileProjectsListComponent,
    MobileProjectShellComponent,
    MobileProjectSummaryComponent,
    MobileProjectMapComponent,
    MobileProjectChannelsComponent,
    MobileProjectScadaComponent,
    MobileChannelListComponent,
    PullRefreshDirective,
    MobileNumPipe,
    MobileNodeInfoComponent,
    MobileSensorContextComponent,
    MobileNodeCommandComponent,
    MobileNodeLogsComponent,
    MobileAlertsComponent,
    MobileProfileComponent,
    MobilePanelComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MobileRoutingModule,
    ScadaEmbedModule,
    WebgisSharedModule
  ]
})
export class MobileModule {}
