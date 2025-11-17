import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { UnpairedDevicesRoutingModule } from './unpaired-devices-routing.module';
import { UnpairedDevicesListPage } from './unpaired-devices-list/unpaired-devices-list';
import { PairingDialogComponent } from './pairing-dialog/pairing-dialog';

@NgModule({
  declarations: [
    UnpairedDevicesListPage,
    PairingDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule,
    SharedComponentsModule,
    UnpairedDevicesRoutingModule
  ]
})
export class UnpairedDevicesModule {}
