import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { NotificationsRoutingModule } from './notifications-routing.module';
import { NotificationCenterComponent } from './notification-center/notification-center';

@NgModule({
  declarations: [NotificationCenterComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SharedComponentsModule,
    NotificationsRoutingModule,
  ],
})
export class NotificationsModule {}
