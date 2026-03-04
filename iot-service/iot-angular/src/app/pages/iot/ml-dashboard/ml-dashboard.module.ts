import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';

// Main Dashboard
import { MlDashboardPage } from './ml-dashboard';
import { MlService } from './ml.service';

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
    RouterModule.forChild(routes)
  ],
  providers: [
    MlService
  ],
  exports: [
    RouterModule
  ]
})
export class MlDashboardModule { }
