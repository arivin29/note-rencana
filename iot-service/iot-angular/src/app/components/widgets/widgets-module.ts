import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';

// Base
import { WidgetContainerComponent } from './base/widget-container.component';

// Numeric
import { BigNumberWidgetComponent } from './numeric/big-number-widget.component';
import { InfoCardWidgetComponent } from './numeric/info-card-widget.component';

// Gauge
import { RadialGaugeWidgetComponent } from './gauge/radial-gauge-widget.component';

// Services
import { WidgetFactoryService } from './services/widget-factory.service';
import { WidgetCatalogService } from './services/widget-catalog.service';

@NgModule({
  declarations: [
    // Base
    WidgetContainerComponent,
    // Numeric
    BigNumberWidgetComponent,
    InfoCardWidgetComponent,
    // Gauge
    RadialGaugeWidgetComponent
  ],
  imports: [
    CommonModule,
    NgApexchartsModule
  ],
  exports: [
    // Export untuk digunakan di module lain
    WidgetContainerComponent,
    BigNumberWidgetComponent,
    InfoCardWidgetComponent,
    RadialGaugeWidgetComponent
  ],
  providers: [
    WidgetFactoryService,
    WidgetCatalogService
  ]
})
export class WidgetsModule { }
