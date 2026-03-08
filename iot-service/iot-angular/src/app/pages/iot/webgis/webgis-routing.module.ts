import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { WebgisMapPage } from './webgis-map/webgis-map';
import { LayerUploadPage } from './layer-upload/layer-upload';

const routes: Routes = [
  { path: '', component: WebgisMapPage },
  { path: 'upload', component: LayerUploadPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WebgisRoutingModule {}
