import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LayerResponseDto } from '../../../../../../sdk/core/models';

interface LayerState {
  layer: LayerResponseDto;
  visible: boolean;
  loading: boolean;
}

@Component({
  selector: 'layer-panel',
  templateUrl: './layer-panel.html',
  styleUrls: ['./layer-panel.scss'],
  standalone: false
})
export class LayerPanelComponent {
  @Input() layers: LayerState[] = [];
  @Output() toggleLayer = new EventEmitter<LayerState>();

  // Group layers by type
  get coreLayers(): LayerState[] {
    return this.layers.filter(l => l.layer.layerType === 'core');
  }

  get operationalLayers(): LayerState[] {
    return this.layers.filter(l => l.layer.layerType === 'operational');
  }

  get customLayers(): LayerState[] {
    return this.layers.filter(l => l.layer.layerType === 'custom');
  }

  onToggle(layer: LayerState): void {
    this.toggleLayer.emit(layer);
  }

  getLayerIcon(layer: LayerResponseDto): string {
    switch (layer.geometryType?.toLowerCase()) {
      case 'point':
      case 'multipoint':
        return 'bi-geo-alt';
      case 'linestring':
      case 'multilinestring':
        return 'bi-bezier2';
      case 'polygon':
      case 'multipolygon':
        return 'bi-hexagon';
      default:
        return 'bi-layers';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'core': return 'Core Layers';
      case 'operational': return 'Operational';
      case 'custom': return 'Custom Layers';
      default: return type;
    }
  }
}
