import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IotConfigHomePage } from './iot-config-home/iot-config-home';
import { NodeModelsPage } from './iot-config-home/node-models/node-models';
import { SensorTypesPage } from './iot-config-home/sensor-types/sensor-types';
import { SensorCatalogsPage } from './iot-config-home/sensor-catalogs/sensor-catalogs'; 
import { NodeModelDetailPage } from './iot-config-home/node-models/node-model-detail/node-model-detail';

const routes: Routes = [
  {
    path: '',
    component: IotConfigHomePage,
    children: [
      { path: '', redirectTo: 'node-models', pathMatch: 'full' },
      { path: 'node-models', component: NodeModelsPage, data: { title: 'Node Models' } },
      { path: 'node-models/:modelCode', component: NodeModelDetailPage, data: { title: 'Node Model Detail' } },
      { path: 'sensor-types', component: SensorTypesPage, data: { title: 'Sensor Types' } },
      { path: 'sensor-catalogs', component: SensorCatalogsPage, data: { title: 'Sensor Catalogs' } }, 
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IotConfigRoutingModule { }
