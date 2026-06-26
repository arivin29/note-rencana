import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '@services/auth.guard';
import { GuestGuard } from '@services/guest.guard';

import { MobileLayoutComponent } from './layout/mobile-layout/mobile-layout.component';
import { MobileLoginComponent } from './login/mobile-login/mobile-login.component';
import { MobileDashboardComponent } from './dashboard/mobile-dashboard/mobile-dashboard.component';
import { MobileNodesListComponent } from './nodes/mobile-nodes-list/mobile-nodes-list.component';
import { MobileNodeDetailComponent } from './nodes/mobile-node-detail/mobile-node-detail.component';
import { MobileChannelDetailComponent } from './nodes/mobile-channel-detail/mobile-channel-detail.component';
import { MobileNodeInfoComponent } from './nodes/node-info/mobile-node-info.component';
import { MobileNodeCommandComponent } from './nodes/node-command/mobile-node-command.component';
import { MobileNodeLogsComponent } from './nodes/node-logs/mobile-node-logs.component';
import { MobileProjectDetailComponent } from './projects/mobile-project-detail/mobile-project-detail.component';
import { MobileProjectInfoComponent } from './projects/tabs/project-info/project-info.component';
import { MobileProjectMapComponent } from './projects/tabs/project-map/project-map.component';
import { MobileProjectChannelsComponent } from './projects/tabs/project-channels/project-channels.component';
import { MobileProjectScadaComponent } from './projects/tabs/project-scada/project-scada.component';
import { MobileAlertsComponent } from './alerts/mobile-alerts/mobile-alerts.component';
import { MobileProfileComponent } from './profile/mobile-profile/mobile-profile.component';

const routes: Routes = [
  // Login di luar shell (guest only)
  { path: 'login', component: MobileLoginComponent, canActivate: [GuestGuard], data: { title: 'Masuk' } },

  // Semua layar di bawah shell mobile (protected)
  {
    path: '',
    component: MobileLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: MobileDashboardComponent, data: { title: 'Dashboard' } },
      { path: 'nodes', component: MobileNodesListComponent, data: { title: 'Perangkat' } },
      { path: 'nodes/:id/channels/:channelId', component: MobileChannelDetailComponent, data: { title: 'Channel', back: true } },
      {
        path: 'nodes/:id', component: MobileNodeDetailComponent, data: { title: 'Detail Perangkat', back: true },
        children: [
          { path: '', redirectTo: 'info', pathMatch: 'full' },
          { path: 'info', component: MobileNodeInfoComponent },
          { path: 'command', component: MobileNodeCommandComponent },
          { path: 'logs', component: MobileNodeLogsComponent }
        ]
      },
      {
        path: 'projects/:id', component: MobileProjectDetailComponent, data: { title: 'Detail Project', back: true },
        children: [
          { path: '', redirectTo: 'detail', pathMatch: 'full' },
          { path: 'detail', component: MobileProjectInfoComponent },
          { path: 'map', component: MobileProjectMapComponent },
          { path: 'nodes', component: MobileNodesListComponent },
          { path: 'channels', component: MobileProjectChannelsComponent },
          { path: 'scada', component: MobileProjectScadaComponent }
        ]
      },
      { path: 'alerts', component: MobileAlertsComponent, data: { title: 'Peringatan' } },
      { path: 'profile', component: MobileProfileComponent, data: { title: 'Profil' } }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MobileRoutingModule {}
