import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportPage } from './report-page/report-page';

const routes: Routes = [
  {
    path: '',
    component: ReportPage,
    data: { title: 'Report & Export' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportRoutingModule {}
