import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { OwnersRoutingModule } from './owners-routing.module';
import { OwnersListPage } from './owners-list/owners-list';
import { OwnersAddPage } from './owners-add/owners-add';
import { OwnersEditPage } from './owners-edit/owners-edit';
import { OwnersDetailPage } from './owners-detail/owners-detail';

@NgModule({
  declarations: [OwnersListPage, OwnersAddPage, OwnersEditPage, OwnersDetailPage],
  imports: [CommonModule, FormsModule, RouterModule, SharedComponentsModule, OwnersRoutingModule]
})
export class OwnersModule {}
