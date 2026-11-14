import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Widget } from '../../../models/widget.models';
import { MapPoint, MapWidgetOptions, normalizeMapRows, readMapOptions } from '../../../utils/map-rows';

export type { MapLegendItem } from '../../../../webgis/components/project-map/webgis-project-map.component';

/**
 * Peta widget — thin wrapper: reads `config.display.mapOptions` + normalizes SQL rows, and hands
 * them to the shared `<webgis-project-map>` (`webgis/components/project-map`), which owns the OL
 * map, WebGIS layers/styles, value cards, fit and refresh. Same engine as the mobile Peta tab.
 */
@Component({
  selector: 'app-map-widget',
  standalone: false,
  templateUrl: './map-widget.component.html',
  styleUrls: ['./map-widget.component.css'],
})
export class MapWidgetComponent implements OnChanges {
  @Input() widget!: Widget;
  @Input() data: any[] = [];
  @Input() columns: string[] = [];
  @Input() containerWidth = 0;
  @Input() containerHeight = 0;
  /** Text scale (TV screen-fit × dashboard "Ukuran huruf"). */
  @Input() fontScale = 1;
  /** Dashboard project → its WebGIS layers (null = none). */
  @Input() projectId: string | null = null;
  /** Dashboard refresh tick → reload sensor values & alerts (geometry stays cached). */
  @Input() refreshNonce = 0;

  points: MapPoint[] = [];
  options: MapWidgetOptions = readMapOptions(undefined);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['widget']) {
      this.options = readMapOptions((this.widget?.config as any)?.display?.mapOptions);
    }
    if (changes['data']) {
      this.points = normalizeMapRows(this.data);
    }
  }
}
