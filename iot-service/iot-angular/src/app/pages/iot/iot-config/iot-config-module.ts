import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IotConfigRoutingModule } from './iot-config-routing-module';
import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { IotConfigHomePage } from './iot-config-home/iot-config-home';
import { NodeModelDrawerComponent } from './iot-config-home/node-models/node-model-drawer/node-model-drawer.component';
import { NodeModelDetailPage } from './iot-config-home/node-models/node-model-detail/node-model-detail';
import { NodeModelsPage } from './iot-config-home/node-models/node-models';
import { SensorTypesPage } from './iot-config-home/sensor-types/sensor-types';
import { SensorTypeDrawerComponent } from './iot-config-home/sensor-types/sensor-type-drawer/sensor-type-drawer.component';
import { SensorCatalogsPage } from './iot-config-home/sensor-catalogs/sensor-catalogs'; 


@NgModule({
    declarations: [
        IotConfigHomePage,
        NodeModelDrawerComponent,
        NodeModelsPage,
        SensorTypesPage,
        SensorTypeDrawerComponent,
        SensorCatalogsPage, 
        NodeModelDetailPage 
    ],
    imports: [
        CommonModule,
        FormsModule,
        SharedComponentsModule,
        IotConfigRoutingModule
    ]
})
export class IotConfigModule { }
