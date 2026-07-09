import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChannelListPage } from './channel-list/channel-list';
import { ChannelHubPage } from './channel-hub/channel-hub';
import { EventInboxListPage } from './event-inbox-list/event-inbox-list';
import { EventInboxDetailPage } from './event-inbox-detail/event-inbox-detail';
import { AiAnalyticsPage } from './ai-analytics/ai-analytics';

const routes: Routes = [
  { path: '', component: ChannelListPage, data: { title: 'AI-NRW · Channels' } },
  { path: 'channel/:targetId', component: ChannelHubPage, data: { title: 'Channel Hub' } },
  { path: 'events', component: EventInboxListPage, data: { title: 'Event Inbox' } },
  { path: 'events/:id', component: EventInboxDetailPage, data: { title: 'Event Detail' } },
  // deep-link chart penuh (di luar hub) + back-compat
  { path: 'analytics/:targetId', component: AiAnalyticsPage, data: { title: 'AI Analytics' } },
  { path: 'settings', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AiRoutingModule {}
