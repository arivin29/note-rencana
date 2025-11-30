import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { UsersListComponent } from './users-list/users-list.component';
import { UserDetailComponent } from './user-detail/user-detail.component';

// Guards
import { AuthGuard } from '../../../services/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: UsersListComponent,
    canActivate: [AuthGuard],
    data: { title: 'User Management', roles: ['admin'] }
  },
  {
    path: ':id',
    component: UserDetailComponent,
    canActivate: [AuthGuard],
    data: { title: 'User Details', roles: ['admin'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UsersRoutingModule { }
