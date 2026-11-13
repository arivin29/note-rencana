import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SensorLabelsComponent } from './components/sensor-labels/sensor-labels';

/**
 * WebGIS pieces reused outside the WebGIS page (Widget Builder map widget).
 * Kept tiny so lazy modules that import it don't pull in the whole WebGIS page.
 */
@NgModule({
  declarations: [SensorLabelsComponent],
  imports: [CommonModule],
  exports: [SensorLabelsComponent],
})
export class WebgisSharedModule {}
