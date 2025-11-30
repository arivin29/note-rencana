import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Users Components
import { UsersListComponent } from './users-list/users-list.component';
import { UserDetailComponent } from './user-detail/user-detail.component';
import { UserFormComponent } from './user-form/user-form.component';

// Users Routing
import { UsersRoutingModule } from './users-routing.module';
import { SharedComponentsModule } from 'src/app/shared/shared-components.module';

@NgModule({
  declarations: [
    UsersListComponent,
    UserDetailComponent,
    UserFormComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    UsersRoutingModule,
      SharedComponentsModule
  ],
  exports: [
    UsersListComponent,
    UserDetailComponent,
    UserFormComponent
  ]
})
export class UsersModule { }
