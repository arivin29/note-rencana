import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TelemetryChannelsListPage } from './telemetry-channels-list/telemetry-channels-list';

const routes: Routes = [
  { path: '', component: TelemetryChannelsListPage, data: { title: 'Kanal Telemetri', guide: 'telemetry-channels' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TelemetryChannelsRoutingModule {}
