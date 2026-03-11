import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { ReportRoutingModule } from './report-routing.module';
import { ReportPage } from './report-page/report-page';

@NgModule({
  declarations: [ReportPage],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedComponentsModule,
    NgApexchartsModule,
    ReportRoutingModule,
  ],
})
export class ReportModule {}
