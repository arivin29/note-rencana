import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { UnpairedDevicesRoutingModule } from './unpaired-devices-routing.module';
import { UnpairedDevicesListPage } from './unpaired-devices-list/unpaired-devices-list';
import { PairingDialogComponent } from './pairing-dialog/pairing-dialog';
import { PairingWorkspacePage } from './pairing-workspace/pairing-workspace';
import { StepNodeConfigComponent } from './pairing-workspace/steps/step-node-config/step-node-config.component';
import { StepSensorConfigComponent } from './pairing-workspace/steps/step-sensor-config/step-sensor-config.component';
import { StepPayloadMappingComponent } from './pairing-workspace/steps/step-payload-mapping/step-payload-mapping.component';
import { StepReviewSubmitComponent } from './pairing-workspace/steps/step-review-submit/step-review-submit.component';
import { PwAddSensorDrawerComponent } from './pairing-workspace/drawers/pw-add-sensor-drawer/pw-add-sensor-drawer.component';
import { PwAddChannelDrawerComponent } from './pairing-workspace/drawers/pw-add-channel-drawer/pw-add-channel-drawer.component';

@NgModule({
  declarations: [
    UnpairedDevicesListPage,
    PairingDialogComponent,
    PairingWorkspacePage,
    StepNodeConfigComponent,
    StepSensorConfigComponent,
    StepPayloadMappingComponent,
    StepReviewSubmitComponent,
    PwAddSensorDrawerComponent,
    PwAddChannelDrawerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule,
    DragDropModule,
    SharedComponentsModule,
    UnpairedDevicesRoutingModule
  ]
})
export class UnpairedDevicesModule {}
