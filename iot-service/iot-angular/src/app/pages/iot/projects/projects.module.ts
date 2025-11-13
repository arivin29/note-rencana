import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { ProjectsRoutingModule } from './projects-routing.module';
import { ProjectsListPage } from './projects-list/projects-list';
import { ProjectsAddPage } from './projects-add/projects-add';
import { ProjectsDetailPage } from './projects-detail/projects-detail';
import { ProjectMapWidgetComponent } from './projects-detail/project-map-widget/project-map-widget.component';

@NgModule({
  declarations: [ProjectsListPage, ProjectsAddPage, ProjectsDetailPage, ProjectMapWidgetComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, SharedComponentsModule, ProjectsRoutingModule]
})
export class ProjectsModule {}
