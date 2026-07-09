import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { AiRoutingModule } from './ai-routing.module';
import { ChannelListPage } from './channel-list/channel-list';
import { ChannelHubPage } from './channel-hub/channel-hub';
import { ChannelOverviewComponent } from './channel-overview/channel-overview';
import { ChannelSettingsComponent } from './channel-settings/channel-settings';
import { EventInboxListPage } from './event-inbox-list/event-inbox-list';
import { EventInboxDetailPage } from './event-inbox-detail/event-inbox-detail';
import { AiAnalyticsPage } from './ai-analytics/ai-analytics';

@NgModule({
  declarations: [
    ChannelListPage,
    ChannelHubPage,
    ChannelOverviewComponent,
    ChannelSettingsComponent,
    EventInboxListPage,
    EventInboxDetailPage,
    AiAnalyticsPage,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgApexchartsModule,
    SharedComponentsModule,
    AiRoutingModule,
  ],
})
export class AiModule {}
