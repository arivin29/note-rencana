import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ProjectsListPage } from './projects-list/projects-list';
import { ProjectsAddPage } from './projects-add/projects-add';
import { ProjectsDetailPage } from './projects-detail/projects-detail';
import { ProjectWorkspaceComponent } from './project-workspace/project-workspace.component';
import { OverviewPageComponent } from './project-workspace/pages/overview-page/overview-page.component';
import { NodesPageComponent } from './project-workspace/pages/nodes-page/nodes-page.component';
import { NodeDetailPageComponent } from './project-workspace/pages/node-detail-page/node-detail-page.component';
import { SensorPageComponent } from './project-workspace/pages/sensor-page/sensor-page.component';
import { MonitorPageComponent } from './project-workspace/pages/monitor-page/monitor-page.component';
import { MapPageComponent } from './project-workspace/pages/map-page/map-page.component';
import { AnalyticsPageComponent } from './project-workspace/pages/analytics-page/analytics-page.component';
import { ConfigPageComponent } from './project-workspace/pages/config-page/config-page.component';

const routes: Routes = [
  { path: '', component: ProjectsListPage },
  { path: 'new', component: ProjectsAddPage },
  { path: ':projectId/edit', component: ProjectsAddPage },
  // New workspace layout with child routes
  { 
    path: ':projectId', 
    component: ProjectWorkspaceComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: OverviewPageComponent },
      { path: 'nodes', component: NodesPageComponent },
      { path: 'node/:nodeId', component: NodeDetailPageComponent },
      { path: 'node/:nodeId/sensor/:sensorId', component: SensorPageComponent },
      { path: 'monitor', component: MonitorPageComponent },
      { path: 'monitor/:dashboardId', component: MonitorPageComponent },
      { path: 'map', component: MapPageComponent },
      { path: 'analytics', component: AnalyticsPageComponent },
      { path: 'config', component: ConfigPageComponent },
    ]
  },
  // Legacy route (redirect to new workspace)
  // { path: ':projectId/legacy', component: ProjectsDetailPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProjectsRoutingModule {}
