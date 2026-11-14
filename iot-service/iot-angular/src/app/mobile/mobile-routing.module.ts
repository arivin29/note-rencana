import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '@services/auth.guard';
import { GuestGuard } from '@services/guest.guard';

import { MobileLayoutComponent } from './layout/mobile-layout/mobile-layout.component';
import { MobileLoginComponent } from './login/mobile-login/mobile-login.component';
import { MobileHomeComponent } from './home/mobile-home.component';
import { MobileNodesListComponent } from './nodes/mobile-nodes-list/mobile-nodes-list.component';
import { MobileNodeDetailComponent } from './nodes/mobile-node-detail/mobile-node-detail.component';
import { MobileChannelDetailComponent } from './nodes/mobile-channel-detail/mobile-channel-detail.component';
import { MobileNodeInfoComponent } from './nodes/node-info/mobile-node-info.component';
import { MobileNodeCommandComponent } from './nodes/node-command/mobile-node-command.component';
import { MobileNodeLogsComponent } from './nodes/node-logs/mobile-node-logs.component';
import { MobileProjectsListComponent } from './projects/mobile-projects-list/mobile-projects-list.component';
import { MobileProjectShellComponent } from './projects/project-shell/mobile-project-shell.component';
import { MobileProjectSummaryComponent } from './projects/tabs/project-summary/project-summary.component';
import { MobileProjectMapComponent } from './projects/tabs/project-map/project-map.component';
import { MobileProjectChannelsComponent } from './projects/tabs/project-channels/project-channels.component';
import { MobileProjectScadaComponent } from './projects/tabs/project-scada/project-scada.component';
import { MobileAlertsComponent } from './alerts/mobile-alerts/mobile-alerts.component';
import { MobileProfileComponent } from './profile/mobile-profile/mobile-profile.component';
import {
  alertsEntryGuard, legacyNodeMatcher, legacyNodeRedirectGuard, legacyNodesListGuard, mobileLandingGuard
} from './shared/mobile-guards';

/** Tab project tingkat atas: back (ke daftar project) hanya untuk user >1 project. */
const TOP = { nav: 'project', parent: '/mobile/projects', backIfMulti: true };

/**
 * Peta route mobile (IA 14 Nov 2026, docs/audit/mobile-2026-11-14/00-ringkasan-rencana.md):
 *   /mobile                      landing guard: 0 → layar kosong · 1 → /p/:pid/ringkasan · >1 → /projects
 *   /mobile/projects             daftar project (bermasalah di atas)
 *   /mobile/p/:pid/(ringkasan|perangkat|channel|peta|peringatan)   nav bawah project
 *   /mobile/p/:pid/scada/:did    bagan SCADA layar penuh
 *   /mobile/p/:pid/nodes/:nid/(nilai|perintah|log)
 *   /mobile/p/:pid/nodes/:nid/channels/:cid
 *   /mobile/alerts               peringatan lintas project (1 project → tab Peringatan project)
 *   /mobile/profile
 * Tautan lama (/mobile/dashboard, /mobile/projects/:id/**, /mobile/nodes[/:id/**]) di-redirect.
 */
const routes: Routes = [
  // Login di luar shell (guest only)
  { path: 'login', component: MobileLoginComponent, canActivate: [GuestGuard], data: { title: 'Masuk' } },

  // Semua layar di bawah shell mobile (protected)
  {
    path: '',
    component: MobileLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '', pathMatch: 'full', component: MobileHomeComponent,
        canActivate: [mobileLandingGuard], runGuardsAndResolvers: 'always',
        data: { title: '', nav: 'none' }
      },
      // ---- tautan lama ----
      { path: 'dashboard', redirectTo: '/mobile', pathMatch: 'full' },
      { path: 'projects/:id', redirectTo: '/mobile/p/:id/ringkasan', pathMatch: 'full' },
      { path: 'projects/:id/detail', redirectTo: '/mobile/p/:id/ringkasan', pathMatch: 'full' },
      { path: 'projects/:id/map', redirectTo: '/mobile/p/:id/peta', pathMatch: 'full' },
      { path: 'projects/:id/nodes', redirectTo: '/mobile/p/:id/perangkat', pathMatch: 'full' },
      { path: 'projects/:id/channels', redirectTo: '/mobile/p/:id/channel', pathMatch: 'full' },
      { path: 'projects/:id/scada', redirectTo: '/mobile/p/:id/ringkasan', pathMatch: 'full' },
      { path: 'nodes', pathMatch: 'full', canActivate: [legacyNodesListGuard], children: [] },
      { matcher: legacyNodeMatcher, canActivate: [legacyNodeRedirectGuard], children: [] },

      // ---- di luar project ----
      { path: 'projects', component: MobileProjectsListComponent, data: { title: 'Project', nav: 'global' } },
      {
        path: 'alerts', component: MobileAlertsComponent, canActivate: [alertsEntryGuard],
        data: { title: 'Peringatan', nav: 'global' }
      },
      { path: 'profile', component: MobileProfileComponent, data: { title: 'Profil', nav: 'global', parent: '/mobile' } },

      // ---- di dalam project ----
      {
        path: 'p/:pid', component: MobileProjectShellComponent, data: { nav: 'project' },
        children: [
          { path: '', redirectTo: 'ringkasan', pathMatch: 'full' },
          { path: 'ringkasan', component: MobileProjectSummaryComponent, data: { ...TOP, title: 'Ringkasan' } },
          { path: 'perangkat', component: MobileNodesListComponent, data: { ...TOP, title: 'Perangkat' } },
          { path: 'channel', component: MobileProjectChannelsComponent, data: { ...TOP, title: 'Channel' } },
          // Tab Peta: komponen milik sesi scada; ia membaca param leluhur `pid`.
          { path: 'peta', component: MobileProjectMapComponent, data: { ...TOP, title: 'Peta' } },
          { path: 'peringatan', component: MobileAlertsComponent, data: { ...TOP, title: 'Peringatan' } },
          {
            path: 'scada/:did', component: MobileProjectScadaComponent,
            data: { nav: 'project', title: 'Bagan SCADA', parent: '/mobile/p/:pid/ringkasan' }
          },
          {
            path: 'nodes/:nid/channels/:cid', component: MobileChannelDetailComponent,
            data: { nav: 'project', title: 'Channel', parent: '/mobile/p/:pid/nodes/:nid/nilai' }
          },
          {
            path: 'nodes/:nid', component: MobileNodeDetailComponent,
            data: { nav: 'project', title: 'Perangkat', parent: '/mobile/p/:pid/perangkat' },
            children: [
              { path: '', redirectTo: 'nilai', pathMatch: 'full' },
              { path: 'nilai', component: MobileNodeInfoComponent },
              { path: 'perintah', component: MobileNodeCommandComponent },
              { path: 'log', component: MobileNodeLogsComponent }
            ]
          }
        ]
      },

      { path: '**', redirectTo: '/mobile' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MobileRoutingModule {}
