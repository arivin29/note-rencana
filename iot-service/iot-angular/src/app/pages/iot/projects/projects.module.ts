import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { ProjectsRoutingModule } from './projects-routing.module';
import { ProjectsListPage } from './projects-list/projects-list';
import { ProjectsAddPage } from './projects-add/projects-add';
import { ProjectsDetailPage } from './projects-detail/projects-detail';

@NgModule({
  declarations: [ProjectsListPage, ProjectsAddPage, ProjectsDetailPage],
  imports: [CommonModule, FormsModule, RouterModule, SharedComponentsModule, ProjectsRoutingModule]
})
export class ProjectsModule {}
