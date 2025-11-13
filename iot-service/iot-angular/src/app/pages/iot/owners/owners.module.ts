import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { OwnersRoutingModule } from './owners-routing.module';
import { OwnersListPage } from './owners-list/owners-list';
import { OwnersAddPage } from './owners-add/owners-add';
import { OwnersDetailPage } from './owners-detail/owners-detail';

@NgModule({
  declarations: [OwnersListPage, OwnersAddPage, OwnersDetailPage],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, SharedComponentsModule, OwnersRoutingModule]
})
export class OwnersModule {}
