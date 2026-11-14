import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OwnersListPage } from './owners-list/owners-list';
import { OwnersAddPage } from './owners-add/owners-add';
import { OwnersDetailPage } from './owners-detail/owners-detail';

// Admin-only: AuthGuard + roles are applied on the parent `iot/owners` route (app-routing.module.ts).
const routes: Routes = [
  { path: '', component: OwnersListPage, data: { title: 'PDAM / Owner', guide: 'owners-list' } },
  { path: 'new', component: OwnersAddPage, data: { title: 'Tambah Owner', guide: 'owners-list' } },
  { path: ':ownerId/edit', component: OwnersAddPage, data: { title: 'Ubah Owner', guide: 'owner-detail' } },
  { path: ':ownerId', component: OwnersDetailPage, data: { title: 'Detail Owner', guide: 'owner-detail' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OwnersRoutingModule {}
