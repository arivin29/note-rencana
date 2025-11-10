import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { NodesRoutingModule } from './nodes-routing.module';
import { NodesListPage } from './nodes-list/nodes-list';
import { NodesAddPage } from './nodes-add/nodes-add';
import { NodesEditPage } from './nodes-edit/nodes-edit';
import { NodesDetailPage } from './nodes-detail/nodes-detail';
import { SensorChanelDetail } from './nodes-detail/sensor-chanel-detail/sensor-chanel-detail';
import { NodeDetailAddSensorDrawerComponent } from './nodes-detail/node-detail-add-sensor-drawer/node-detail-add-sensor-drawer.component';
import { NodeDetailAddChannelDrawerComponent } from './nodes-detail/node-detail-add-channel-drawer/node-detail-add-channel-drawer.component';

@NgModule({
  declarations: [
    NodesListPage, 
    NodesAddPage, 
    NodesEditPage, 
    NodesDetailPage,
    SensorChanelDetail,
    NodeDetailAddSensorDrawerComponent,
    NodeDetailAddChannelDrawerComponent
  ],
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    NgApexchartsModule, 
    SharedComponentsModule, 
    NodesRoutingModule
  ]
})
export class NodesModule {}
