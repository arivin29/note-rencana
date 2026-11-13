/**
 * WebGIS layer configuration — pure helpers shared by the WebGIS page (`webgis-map.ts`) and the
 * Widget Builder map widget, so both draw a project's layers identically. No Angular / OpenLayers
 * imports (unit-testable under node). OpenLayers style builders live in `webgis-styles.ts`.
 */
import type { LayerStyle } from '../components/edit-layer-drawer/edit-layer-drawer';

/** Static core layer definition (not from the database). */
export interface WebgisCoreLayerDef {
  id: string;
  name: string;
  code: 'nodes' | 'sensors' | 'alerts' | 'sensor-channels';
  visible: boolean;
  style: any;
}

/** Core layers of the WebGIS page. Sensors are dynamic per sensor type (see `webgisSensorTypeLayerStyle`). */
export const WEBGIS_CORE_LAYER_DEFS: readonly WebgisCoreLayerDef[] = [
  {
    id: 'core-nodes',
    name: 'Nodes',
    code: 'nodes',
    visible: false, // Not default visible
    style: { fill: '#28a745', stroke: '#ffffff', radius: 10 },
  },
  {
    id: 'core-alerts',
    name: 'Alerts',
    code: 'alerts',
    visible: true,
    style: { fill: '#dc3545', stroke: '#ffffff', radius: 12 },
  },
];

/** Fresh mutable copy of the core layer defs. */
export function webgisCoreLayerDefs(): WebgisCoreLayerDef[] {
  return WEBGIS_CORE_LAYER_DEFS.map((d) => ({ ...d, style: { ...d.style } }));
}

/** Colour per sensor type, by the type's index in the project's sensor-type list. */
export const WEBGIS_SENSOR_TYPE_COLORS: readonly string[] = [
  '#0d6efd', '#6f42c1', '#d63384', '#fd7e14', '#198754',
  '#20c997', '#0dcaf0', '#6610f2', '#e83e8c', '#ffc107',
];

/** Style config (createStyleFromConfig format) of the sensor-type layer at `index`. */
export function webgisSensorTypeLayerStyle(index: number): { fill: string; stroke: string; radius: number } {
  return {
    fill: WEBGIS_SENSOR_TYPE_COLORS[index % WEBGIS_SENSOR_TYPE_COLORS.length],
    stroke: '#ffffff',
    radius: 7,
  };
}

/** '#rrggbb' + opacity → 'rgba(r, g, b, a)' (same as the WebGIS page; 6-digit hex only). */
export function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * How a layer's saved `style_json` is drawn:
 * - `layer`: new LayerStyle format (fillColor/strokeColor, data-driven, zoom visibility) with defaults applied
 * - `config`: legacy simple format (`fill`/`stroke`/`radius`/`iconUrl`) → createStyleFromConfig
 */
export type ResolvedWebgisStyle =
  | { kind: 'layer'; style: LayerStyle }
  | { kind: 'config'; config: any };

export function resolveWebgisLayerStyle(rawStyle: any): ResolvedWebgisStyle {
  let styleConfig = rawStyle || {};
  // Fix nested styleJson (legacy bug)
  if (styleConfig.styleJson && !styleConfig.fillColor) {
    styleConfig = styleConfig.styleJson;
  }
  if (styleConfig.fillColor || styleConfig.strokeColor) {
    return {
      kind: 'layer',
      style: {
        fillColor: styleConfig.fillColor || '#6366f1',
        fillOpacity: styleConfig.fillOpacity ?? 0.3,
        strokeColor: styleConfig.strokeColor || '#6366f1',
        strokeWidth: styleConfig.strokeWidth ?? 2,
        strokeOpacity: styleConfig.strokeOpacity ?? 1,
        pointRadius: styleConfig.pointRadius ?? 6,
        pointShape: styleConfig.pointShape || 'circle',
        labelFields: styleConfig.labelFields || [],
        labelColor: styleConfig.labelColor || '#ffffff',
        labelSize: styleConfig.labelSize ?? 12,
        strokeWidthByField: styleConfig.strokeWidthByField,
        colorByField: styleConfig.colorByField,
        // Zoom visibility settings
        minZoom: styleConfig.minZoom ?? 0,
        maxZoom: styleConfig.maxZoom ?? 20,
        labelMinZoom: styleConfig.labelMinZoom ?? 12,
      },
    };
  }
  return { kind: 'config', config: styleConfig };
}

export type WebgisLayerKind = 'core' | 'operational' | 'custom' | 'sensor-type';

/** Swatch colour of a layer (layer panel / legend). */
export function webgisLayerColor(style: any, type: WebgisLayerKind | string): string {
  if (style?.fillColor) return style.fillColor;
  if (style?.strokeColor) return style.strokeColor;
  if (style?.fill) return style.fill;
  if (style?.stroke) return style.stroke;
  // Default colors by type
  const defaults: Record<string, string> = {
    'core': '#6366f1',
    'operational': '#22d3ee',
    'custom': '#f59e0b',
    'sensor-type': '#10b981',
  };
  return defaults[type] || '#6366f1';
}

/** Sort by map_layer.display_order (missing = 999), stable. */
export function sortByDisplayOrder<T>(items: T[], orderOf: (item: T) => number | null | undefined): T[] {
  return [...items].sort((a, b) => (orderOf(a) ?? 999) - (orderOf(b) ?? 999));
}

/** Minimal shape of the map_layer rows we need (LayerResponseDto-compatible). */
export interface WebgisLayerRow {
  idLayer: string;
  layerName: string;
  layerType: string;
  displayOrder?: number | null;
  isVisibleDefault?: boolean;
  geometryType?: string | null;
  styleJson?: any;
}

/**
 * Non-core map_layer rows in WebGIS panel order: operational first, then custom, each by display_order.
 * Visibility default is ignored (dashboards show every supporting layer).
 */
export function webgisSupportLayers<T extends WebgisLayerRow>(rows: T[]): T[] {
  const nonCore = (rows || []).filter((l) => l && l.layerType !== 'core');
  const ord = (l: T) => l.displayOrder;
  return [
    ...sortByDisplayOrder(nonCore.filter((l) => l.layerType === 'operational'), ord),
    ...sortByDisplayOrder(nonCore.filter((l) => l.layerType !== 'operational'), ord),
  ];
}

/** Keep only channels whose sensor type is shown; drop nodes left without channels. */
export function filterSensorDataByTypes<N extends { channels: C[] }, C extends { sensorTypeName: string }>(
  data: N[],
  visibleTypes: Set<string>,
): N[] {
  if (visibleTypes.size === 0) return [];
  return data
    .map((node) => ({ ...node, channels: node.channels.filter((ch) => visibleTypes.has(ch.sensorTypeName)) }))
    .filter((node) => node.channels.length > 0);
}

/** Endpoints sometimes return the raw value, sometimes `{ data }` — accept both. */
export function unwrapData<T = any>(body: any): T {
  if (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body
      && body.type !== 'FeatureCollection') {
    return body.data as T;
  }
  return body as T;
}
