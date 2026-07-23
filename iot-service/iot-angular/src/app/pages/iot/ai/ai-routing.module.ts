import { inject, NgModule } from '@angular/core';
import { Router, RouterModule, Routes } from '@angular/router';
import { ChannelListPage } from './channel-list/channel-list';
import { ChannelHubPage } from './channel-hub/channel-hub';
import { EventInboxListPage } from './event-inbox-list/event-inbox-list';
import { EventInboxDetailPage } from './event-inbox-detail/event-inbox-detail';

const routes: Routes = [
  { path: '', component: ChannelListPage, data: { title: 'AI-NRW · Channels' } },
  { path: 'channel/:targetId', component: ChannelHubPage, data: { title: 'Channel Hub' } },
  { path: 'events', component: EventInboxListPage, data: { title: 'Event Inbox' } },
  { path: 'events/:id', component: EventInboxDetailPage, data: { title: 'Event Detail' } },
  // back-compat: chart standalone lama → tab Chart di Channel Hub (satu sumber, tak dobel)
  {
    path: 'analytics/:targetId',
    redirectTo: (r) => inject(Router).parseUrl(`/iot/ai/channel/${r.params['targetId']}?tab=chart`),
  },
  { path: 'settings', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AiRoutingModule {}
