import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotificationCenterComponent } from './notification-center/notification-center';

const routes: Routes = [
  { path: '', component: NotificationCenterComponent, data: { title: 'Pusat Notifikasi' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NotificationsRoutingModule {}
