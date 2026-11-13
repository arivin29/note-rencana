/**
 * WebGIS OpenLayers style builders — shared by the WebGIS page (`webgis-map.ts`) and the Widget
 * Builder map widget so a project's layers look the same everywhere. Pure functions (no component
 * state): the map's current zoom is passed in as `getZoom`.
 *
 * `scale` (default 1 = WebGIS look, unchanged) multiplies point radius and label size/offset; the map
 * widget passes its fontScale so markers/labels grow on TV screens.
 */
import Feature from 'ol/Feature';
import { Geometry } from 'ol/geom';
import { Circle as CircleStyle, Fill, Stroke, Style, Icon, Text } from 'ol/style';
import type { LayerStyle } from '../components/edit-layer-drawer/edit-layer-drawer';
import { hexToRgba, resolveWebgisLayerStyle } from './webgis-layer-config';

export type ZoomGetter = () => number | undefined;

/**
 * OpenLayers style function from the LayerStyle format — data-driven styling (stroke width / colour
 * by field), zoom visibility (minZoom/maxZoom) and multi-field labels (from labelMinZoom).
 */
export function createStyleFromLayerStyle(layerStyle: LayerStyle, getZoom: ZoomGetter, scale = 1): any {
  // Get zoom visibility settings
  const minZoom = layerStyle.minZoom ?? 0;
  const maxZoom = layerStyle.maxZoom ?? 20;
  const labelMinZoom = layerStyle.labelMinZoom ?? 12;
  const pointRadius = layerStyle.pointRadius * scale;
  const labelFont = `${layerStyle.labelSize * scale}px sans-serif`;
  const labelOffsetY = -(pointRadius + 10 * scale);

  // If data-driven styling is enabled, return a function
  if (layerStyle.strokeWidthByField?.enabled || layerStyle.colorByField?.enabled) {
    return (feature: Feature<Geometry>, resolution: number) => {
      // Get current zoom level (default to 10 if undefined)
      const zoom = getZoom() ?? 10;

      // Hide layer if outside zoom range
      if (zoom < minZoom || zoom > maxZoom) {
        return null;
      }

      const props = feature.getProperties();

      // Calculate stroke width
      let strokeWidth = layerStyle.strokeWidth;
      if (layerStyle.strokeWidthByField?.enabled && layerStyle.strokeWidthByField.field) {
        const fieldValue = parseFloat(props[layerStyle.strokeWidthByField.field]) || 0;
        const base = layerStyle.strokeWidthByField.baseWidth;
        const factor = layerStyle.strokeWidthByField.factor || 1;

        if (layerStyle.strokeWidthByField.operation === 'multiply') {
          strokeWidth = base + (fieldValue * factor);
        } else {
          strokeWidth = base + (factor > 0 ? fieldValue / factor : 0);
        }
        // Clamp to reasonable range
        strokeWidth = Math.max(0.5, Math.min(20, strokeWidth));
      }

      // Calculate fill/stroke color
      let fillColor = layerStyle.fillColor;
      let strokeColor = layerStyle.strokeColor;
      if (layerStyle.colorByField?.enabled && layerStyle.colorByField.field) {
        const fieldValue = String(props[layerStyle.colorByField.field] || '');
        const mapping = layerStyle.colorByField.mappings?.find(m => m.value === fieldValue);
        if (mapping) {
          fillColor = mapping.color;
          strokeColor = mapping.color;
        } else {
          fillColor = layerStyle.colorByField.defaultColor || layerStyle.fillColor;
          strokeColor = layerStyle.colorByField.defaultColor || layerStyle.strokeColor;
        }
      }

      const fill = new Fill({
        color: hexToRgba(fillColor, layerStyle.fillOpacity)
      });

      const stroke = new Stroke({
        color: hexToRgba(strokeColor, layerStyle.strokeOpacity),
        width: strokeWidth
      });

      // Build label text from multiple fields (only if zoom >= labelMinZoom)
      let labelText = '';
      if (zoom >= labelMinZoom && layerStyle.labelFields && layerStyle.labelFields.length > 0) {
        labelText = layerStyle.labelFields
          .map(f => props[f] !== undefined ? String(props[f]) : '')
          .filter(v => v !== '')
          .join(' | ');
      }

      return new Style({
        fill,
        stroke,
        image: new CircleStyle({
          radius: pointRadius,
          fill,
          stroke
        }),
        text: labelText ? new Text({
          text: labelText,
          font: labelFont,
          fill: new Fill({ color: layerStyle.labelColor }),
          stroke: new Stroke({ color: '#000000', width: 2 }),
          offsetY: labelOffsetY
        }) : undefined
      });
    };
  }

  // Static style (no data-driven features) - still needs zoom checking
  const fill = new Fill({
    color: hexToRgba(layerStyle.fillColor, layerStyle.fillOpacity)
  });

  const stroke = new Stroke({
    color: hexToRgba(layerStyle.strokeColor, layerStyle.strokeOpacity),
    width: layerStyle.strokeWidth
  });

  // Build label text getter for multiple fields
  const labelFields = layerStyle.labelFields || [];

  // Return style function for zoom-aware rendering
  return (feature: Feature<Geometry>, resolution: number) => {
    // Get current zoom level (default to 10 if undefined)
    const zoom = getZoom() ?? 10;

    // Hide layer if outside zoom range
    if (zoom < minZoom || zoom > maxZoom) {
      return null;
    }

    const props = feature.getProperties();

    // Build label text (only if zoom >= labelMinZoom)
    let labelText = '';
    if (zoom >= labelMinZoom && labelFields.length > 0) {
      labelText = labelFields
        .map(f => props[f] !== undefined ? String(props[f]) : '')
        .filter(v => v !== '')
        .join(' | ');
    }

    return new Style({
      fill,
      stroke,
      image: new CircleStyle({
        radius: pointRadius,
        fill,
        stroke
      }),
      text: labelText ? new Text({
        text: labelText,
        font: labelFont,
        fill: new Fill({ color: layerStyle.labelColor }),
        stroke: new Stroke({ color: '#000000', width: 2 }),
        offsetY: labelOffsetY
      }) : undefined
    });
  };
}

/** Static style from the legacy simple config (`fill`/`stroke`/`radius`/`iconUrl`) — core & sensor-type layers. */
export function createStyleFromConfig(styleJson: any, scale = 1): Style {
  const config = styleJson || {};

  // Point style
  if (config.iconUrl) {
    return new Style({
      image: new Icon({
        src: config.iconUrl,
        scale: (config.iconScale || 1) * scale
      })
    });
  }

  // Circle marker
  return new Style({
    image: new CircleStyle({
      radius: (config.radius || 8) * scale,
      stroke: new Stroke({
        color: config.stroke || '#ffffff',
        width: config.strokeWidth || 2
      }),
      fill: new Fill({
        color: config.fill || '#0d6efd'
      })
    }),
    stroke: new Stroke({
      color: config.stroke || '#3388ff',
      width: config.strokeWidth || 3
    }),
    fill: new Fill({
      color: config.fill || 'rgba(51, 136, 255, 0.2)'
    }),
    text: config.labelField ? new Text({
      text: '',  // Will be set per feature
      font: config.labelFont || '12px sans-serif',
      fill: new Fill({ color: config.labelColor || '#000' }),
      offsetY: -15 * scale
    }) : undefined
  });
}

/**
 * Style for any non-node WebGIS layer from its saved style (map_layer.style_json, or the static
 * core / sensor-type style): LayerStyle format → createStyleFromLayerStyle, otherwise createStyleFromConfig.
 */
export function createWebgisLayerStyle(rawStyle: any, getZoom: ZoomGetter, scale = 1): any {
  const resolved = resolveWebgisLayerStyle(rawStyle);
  return resolved.kind === 'layer'
    ? createStyleFromLayerStyle(resolved.style, getZoom, scale)
    : createStyleFromConfig(resolved.config, scale);
}
