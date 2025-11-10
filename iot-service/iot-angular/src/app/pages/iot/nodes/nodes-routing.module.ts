import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NodesListPage } from './nodes-list/nodes-list';
import { NodesAddPage } from './nodes-add/nodes-add';
import { NodesEditPage } from './nodes-edit/nodes-edit';
import { NodesDetailPage } from './nodes-detail/nodes-detail';
import { SensorChanelDetail } from './nodes-detail/sensor-chanel-detail/sensor-chanel-detail';

const routes: Routes = [
  { path: '', component: NodesListPage, data: { title: 'IoT Nodes' } },
  { path: 'new', component: NodesAddPage, data: { title: 'Deploy Node' } },
  { path: ':nodeId/edit', component: NodesEditPage, data: { title: 'Edit Node' } },
  { path: ':nodeId/sensor/:sensorId', component: SensorChanelDetail, data: { title: 'Sensor Detail' } },
  { path: ':nodeId', component: NodesDetailPage, data: { title: 'IoT Node Detail' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NodesRoutingModule {}
