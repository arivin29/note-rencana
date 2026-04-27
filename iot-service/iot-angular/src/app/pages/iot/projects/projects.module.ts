import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxEchartsModule } from 'ngx-echarts';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { ProjectsRoutingModule } from './projects-routing.module';
import { ProjectsListPage } from './projects-list/projects-list';
import { ProjectsAddPage } from './projects-add/projects-add';
import { ProjectsDetailPage } from './projects-detail/projects-detail';
import { ProjectMapWidgetComponent } from './projects-detail/project-map-widget/project-map-widget.component';

// Import NodesModule to use nodes-list and nodes-detail components
import { NodesModule } from '../nodes/nodes.module';

// Import WidgetBuilderModule for dashboard widgets in monitor page
import { WidgetBuilderModule } from '../widget-builder/widget-builder.module';

// Import WebgisModule for map page integration
import { WebgisModule } from '../webgis/webgis.module';

// New workspace components
import { ProjectWorkspaceComponent } from './project-workspace/project-workspace.component';
import { OverviewPageComponent } from './project-workspace/pages/overview-page/overview-page.component';
import { NodesPageComponent } from './project-workspace/pages/nodes-page/nodes-page.component';
import { NodeDetailPageComponent } from './project-workspace/pages/node-detail-page/node-detail-page.component';
import { SensorPageComponent } from './project-workspace/pages/sensor-page/sensor-page.component';
import { SensorsPageComponent } from './project-workspace/pages/sensors-page/sensors-page.component';
import { MonitorPageComponent } from './project-workspace/pages/monitor-page/monitor-page.component';
import { MapPageComponent } from './project-workspace/pages/map-page/map-page.component';
import { AnalyticsPageComponent } from './project-workspace/pages/analytics-page/analytics-page.component';
import { ConfigPageComponent } from './project-workspace/pages/config-page/config-page.component';

@NgModule({
  declarations: [
    ProjectsListPage, 
    ProjectsAddPage, 
    ProjectsDetailPage, 
    ProjectMapWidgetComponent,
    // Workspace components
    ProjectWorkspaceComponent,
    OverviewPageComponent,
    NodesPageComponent,
    NodeDetailPageComponent,
    SensorPageComponent,
    SensorsPageComponent,
    MonitorPageComponent,
    MapPageComponent,
    AnalyticsPageComponent,
    ConfigPageComponent
  ],
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    RouterModule, 
    SharedComponentsModule, 
    ProjectsRoutingModule,
    NodesModule,  // Import NodesModule to use nodes-list and nodes-detail components
    WidgetBuilderModule,  // Import WidgetBuilderModule for dashboard widgets
    WebgisModule,  // Import WebgisModule for map page integration
    NgxEchartsModule  // Import NgxEchartsModule for sparkline charts in overview
  ]
})
export class ProjectsModule {}
