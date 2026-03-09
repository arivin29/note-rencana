import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { WebgisMapPage } from './webgis-map/webgis-map';

const routes: Routes = [
  { path: '', component: WebgisMapPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WebgisRoutingModule {}
