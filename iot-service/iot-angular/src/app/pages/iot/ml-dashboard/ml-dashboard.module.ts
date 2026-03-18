import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SharedComponentsModule } from '../../../shared/shared-components.module';

// Main Dashboard
import { MlDashboardPage } from './ml-dashboard';

// Components
import { AnomaliesListComponent } from './components/anomalies-list';
import { ForecastsViewComponent } from './components/forecasts-view';

const routes: Routes = [
  {
    path: '',
    component: MlDashboardPage,
    data: { title: 'ML Dashboard' }
  },
  {
    path: 'anomalies',
    component: AnomaliesListComponent,
    data: { title: 'Daftar Anomali' }
  },
  {
    path: 'forecasts',
    component: ForecastsViewComponent,
    data: { title: 'Prakiraan Sensor' }
  }
];

@NgModule({
  declarations: [
    MlDashboardPage,
    AnomaliesListComponent,
    ForecastsViewComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgApexchartsModule,
    SharedComponentsModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class MlDashboardModule { }
