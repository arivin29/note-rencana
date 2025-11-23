import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UnpairedDevicesListPage } from './unpaired-devices-list/unpaired-devices-list';
import { PairingWorkspacePage } from './pairing-workspace/pairing-workspace';

const routes: Routes = [
  { path: '', component: UnpairedDevicesListPage, data: { title: 'Unpaired Devices' } },
  { path: ':hardwareId', component: PairingWorkspacePage, data: { title: 'Pair Device' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UnpairedDevicesRoutingModule {}
