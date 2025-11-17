import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UnpairedDevicesListPage } from './unpaired-devices-list/unpaired-devices-list';

const routes: Routes = [
  { path: '', component: UnpairedDevicesListPage, data: { title: 'Unpaired Devices' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UnpairedDevicesRoutingModule {}
