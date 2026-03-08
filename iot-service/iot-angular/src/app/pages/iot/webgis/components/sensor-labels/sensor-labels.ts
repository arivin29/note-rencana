import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import OlMap from 'ol/Map';
import Overlay from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';

export interface SensorChannelValue {
  channelId: string;
  metricCode: string;
  unit: string;
  sensorLabel: string;
  sensorTypeName: string;
  sensorTypeIcon: string;
  value: number | null;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical' | 'unknown';
}

export interface NodeSensorData {
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  latitude: number;
  longitude: number;
  hasCoordinates: boolean;
  channels: SensorChannelValue[];
}

@Component({
  selector: 'sensor-labels',
  templateUrl: './sensor-labels.html',
  styleUrls: ['./sensor-labels.scss'],
  standalone: false
})
export class SensorLabelsComponent implements OnChanges, OnDestroy {
  @Input() map: OlMap | null = null;
  @Input() visible = false;
  @Input() sensorData: NodeSensorData[] = [];

  private overlays: globalThis.Map<string, Overlay> = new globalThis.Map();
  labelContainers: { nodeId: string; element: HTMLElement; data: NodeSensorData }[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] || changes['sensorData']) {
      this.updateOverlays();
    }
    if (changes['map'] && this.map) {
      this.updateOverlays();
    }
  }

  ngOnDestroy(): void {
    this.clearOverlays();
  }

  private updateOverlays(): void {
    if (!this.map) return;

    if (!this.visible) {
      this.clearOverlays();
      return;
    }

    // Create or update overlays for each node with sensor data
    const nodeIds = new Set(this.sensorData.map(n => n.nodeId));

    // Remove overlays for nodes that no longer exist
    for (const [nodeId, overlay] of this.overlays) {
      if (!nodeIds.has(nodeId)) {
        this.map.removeOverlay(overlay);
        this.overlays.delete(nodeId);
      }
    }

    // Create/update overlays
    for (const nodeData of this.sensorData) {
      if (nodeData.channels.length === 0) continue;

      let overlay = this.overlays.get(nodeData.nodeId);

      if (!overlay) {
        // Create new overlay element
        const element = this.createLabelElement(nodeData);
        
        overlay = new Overlay({
          element,
          positioning: 'bottom-center',
          offset: [0, -35], // Position above the node marker
          stopEvent: false,
          className: 'sensor-label-overlay'
        });

        this.map.addOverlay(overlay);
        this.overlays.set(nodeData.nodeId, overlay);
      } else {
        // Update existing overlay content
        this.updateLabelElement(overlay.getElement() as HTMLElement, nodeData);
      }

      // Set position
      const coords = fromLonLat([nodeData.longitude, nodeData.latitude]);
      overlay.setPosition(coords);
    }
  }

  private createLabelElement(nodeData: NodeSensorData): HTMLElement {
    const container = document.createElement('div');
    container.className = 'sensor-label-container';
    this.updateLabelElement(container, nodeData);
    return container;
  }

  private updateLabelElement(element: HTMLElement, nodeData: NodeSensorData): void {
    // Group channels by sensor label
    const channelsByLabel = new Map<string, SensorChannelValue[]>();
    for (const channel of nodeData.channels) {
      const label = channel.sensorLabel || channel.metricCode;
      if (!channelsByLabel.has(label)) {
        channelsByLabel.set(label, []);
      }
      channelsByLabel.get(label)!.push(channel);
    }

    // Take only first 3 sensors to avoid clutter
    const sensorLabels = Array.from(channelsByLabel.keys()).slice(0, 3);
    const hasMore = channelsByLabel.size > 3;

    let html = '<div class="sensor-label-card">';
    
    for (const sensorLabel of sensorLabels) {
      const channels = channelsByLabel.get(sensorLabel)!;
      
      html += `<div class="sensor-group">`;
      html += `<div class="sensor-name">${this.escapeHtml(this.formatMetricCode(sensorLabel))}</div>`;
      
      for (const channel of channels.slice(0, 2)) { // Max 2 channels per sensor
        const statusClass = this.getStatusClass(channel.status);
        const valueDisplay = channel.value !== null 
          ? `${this.formatValue(channel.value)} ${channel.unit}`
          : 'N/A';
        
        html += `
          <div class="channel-row ${statusClass}">
            <span class="channel-name">${this.formatMetricCode(channel.metricCode)}</span>
            <span class="channel-value">${valueDisplay}</span>
          </div>
        `;
      }
      
      if (channels.length > 2) {
        html += `<div class="more-channels">+${channels.length - 2}</div>`;
      }
      
      html += `</div>`;
    }

    if (hasMore) {
      html += `<div class="more-indicator">+${channelsByLabel.size - 3} sensors</div>`;
    }

    html += '</div>';
    element.innerHTML = html;
  }

  private getStatusClass(status: string): string {
    switch (status) {
      case 'critical': return 'status-critical';
      case 'warning': return 'status-warning';
      case 'normal': return 'status-normal';
      default: return 'status-unknown';
    }
  }

  private formatMetricCode(code: string): string {
    // Convert snake_case to Title Case
    return code
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private formatValue(value: number): string {
    if (Math.abs(value) >= 1000) {
      return value.toFixed(0);
    } else if (Math.abs(value) >= 100) {
      return value.toFixed(1);
    } else if (Math.abs(value) >= 1) {
      return value.toFixed(2);
    } else {
      return value.toFixed(3);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private clearOverlays(): void {
    if (this.map) {
      for (const [, overlay] of this.overlays) {
        this.map.removeOverlay(overlay);
      }
    }
    this.overlays.clear();
  }
}
