import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ProjectsListPage } from './projects-list/projects-list';
import { ProjectsAddPage } from './projects-add/projects-add';
import { ProjectsDetailPage } from './projects-detail/projects-detail';

const routes: Routes = [
  { path: '', component: ProjectsListPage },
  { path: 'new', component: ProjectsAddPage },
  { path: ':projectId/edit', component: ProjectsAddPage },  // Edit mode - same component
  { path: ':projectId', component: ProjectsDetailPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProjectsRoutingModule {}
