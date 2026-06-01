import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsModule } from 'ngx-echarts';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { TelemetryRoutingModule } from './telemetry-routing.module';
import { TelemetryListPage } from './telemetry-list/telemetry-list';

@NgModule({
  declarations: [TelemetryListPage],
  imports: [CommonModule, FormsModule, SharedComponentsModule, TelemetryRoutingModule, NgxEchartsModule]
})
export class TelemetryModule {}
