import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OwnersListPage } from './owners-list/owners-list';
import { OwnersAddPage } from './owners-add/owners-add';
import { OwnersDetailPage } from './owners-detail/owners-detail';

const routes: Routes = [
  { path: '', component: OwnersListPage },
  { path: 'new', component: OwnersAddPage },
  { path: ':ownerId/edit', component: OwnersAddPage },  // Unified form: same component for edit
  { path: ':ownerId', component: OwnersDetailPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OwnersRoutingModule {}
