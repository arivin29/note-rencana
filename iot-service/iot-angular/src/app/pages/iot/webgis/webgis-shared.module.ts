import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SensorLabelsComponent } from './components/sensor-labels/sensor-labels';
import { WebgisProjectMapComponent } from './components/project-map/webgis-project-map.component';

/**
 * WebGIS pieces reused outside the WebGIS page (Widget Builder map widget, mobile Peta tab).
 * Kept tiny so lazy modules that import it don't pull in the whole WebGIS page.
 */
@NgModule({
  declarations: [SensorLabelsComponent, WebgisProjectMapComponent],
  imports: [CommonModule],
  exports: [SensorLabelsComponent, WebgisProjectMapComponent],
})
export class WebgisSharedModule {}
