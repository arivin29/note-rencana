import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { WebgisRoutingModule } from './webgis-routing.module';
import { WebgisMapPage } from './webgis-map/webgis-map';
import { LayerPanelComponent } from './components/layer-panel/layer-panel';
import { LayerUploadPage } from './layer-upload/layer-upload';
import { FeaturePopupComponent } from './components/feature-popup/feature-popup';
import { NodeDrawerComponent } from './components/node-drawer/node-drawer';
import { WebgisSharedModule } from './webgis-shared.module';
import { AddLayerDrawerComponent } from './components/add-layer-drawer/add-layer-drawer';
import { EditLayerDrawerComponent } from './components/edit-layer-drawer/edit-layer-drawer';
import { SensorChannelDrawerComponent } from './components/sensor-channel-drawer/sensor-channel-drawer';

@NgModule({
  declarations: [
    WebgisMapPage,
    LayerPanelComponent,
    LayerUploadPage,
    FeaturePopupComponent,
    NodeDrawerComponent,
    AddLayerDrawerComponent,
    EditLayerDrawerComponent,
    SensorChannelDrawerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedComponentsModule,
    WebgisRoutingModule,
    NgApexchartsModule,
    WebgisSharedModule // SensorLabelsComponent (shared with the Widget Builder map widget)
  ],
  exports: [
    WebgisMapPage // Export for embedding in other modules
  ]
})
export class WebgisModule {}
