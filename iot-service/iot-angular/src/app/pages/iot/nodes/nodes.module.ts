import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { NodesRoutingModule } from './nodes-routing.module';
import { NodesListPage } from './nodes-list/nodes-list';
import { NodesAddPage } from './nodes-add/nodes-add';
import { NodesEditPage } from './nodes-edit/nodes-edit';
import { NodesDetailPage } from './nodes-detail/nodes-detail';

@NgModule({
  declarations: [NodesListPage, NodesAddPage, NodesEditPage, NodesDetailPage],
  imports: [CommonModule, FormsModule, RouterModule, NgApexchartsModule, SharedComponentsModule, NodesRoutingModule]
})
export class NodesModule {}
