import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TelemetryListPage } from './telemetry-list/telemetry-list';

const routes: Routes = [{ path: '', component: TelemetryListPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TelemetryRoutingModule {}
