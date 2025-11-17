import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IotDashboardKeduaPage } from './iot-dashboard-kedua';

const routes: Routes = [
  { path: '', component: IotDashboardKeduaPage, data: { title: 'IoT Dashboard 2' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardKeduaRoutingModule {}
