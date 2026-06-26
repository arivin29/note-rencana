import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { TelemetryChannelsRoutingModule } from './telemetry-channels-routing.module';
import { TelemetryChannelsListPage } from './telemetry-channels-list/telemetry-channels-list';

@NgModule({
  declarations: [
    TelemetryChannelsListPage
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SharedComponentsModule,
    TelemetryChannelsRoutingModule
  ],
  exports: [
    TelemetryChannelsListPage // export for embedded use (node detail / project workspace)
  ]
})
export class TelemetryChannelsModule {}
