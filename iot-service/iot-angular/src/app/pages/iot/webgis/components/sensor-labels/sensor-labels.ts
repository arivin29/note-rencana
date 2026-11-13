import { Component, Input, NgZone, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import OlMap from 'ol/Map';
import Overlay from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';
import { unByKey } from 'ol/Observable';
import type { EventsKey } from 'ol/events';
import { clusterKey, clusterLabelAnchors, LabelAnchor } from '../../shared/label-clusters';
import { formatIdNumber } from '../../../widget-builder/utils/format-id';

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

/** Cluster lead / row order: alarm first. */
const STATUS_PRIORITY: Record<string, number> = { critical: 3, warning: 2, normal: 1, unknown: 0 };
const GROUP_MAX_ROWS = 5;

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
  /** Size multiplier for card text & offset (1 = WebGIS look; the dashboard map widget passes its fontScale). */
  @Input() scale = 1;

  /**
   * One overlay per screen-space cluster (key = sorted member node ids). Cards that would overlap at
   * the current zoom are merged into one group card at the lead (highest-priority) node; markers stay
   * where they are. Re-clustered on every `moveend` (debounced, outside Angular).
   */
  private overlays: globalThis.Map<string, Overlay> = new globalThis.Map();
  /** Last measured single-card size per node (px at the current scale). */
  private cardSizes = new globalThis.Map<string, { w: number; h: number }>();
  private moveKey: EventsKey | null = null;
  private reclusterTimer: ReturnType<typeof setTimeout> | null = null;
  /** One follow-up pass after first render, so measured card sizes replace the estimate. */
  private measurePassPending = false;

  constructor(private zone: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scale'] && !changes['scale'].firstChange) {
      // Offset is fixed per overlay & sizes change → rebuild them at the new size
      this.clearOverlays();
      this.cardSizes.clear();
    }
    if (changes['map']) {
      this.clearOverlays();
      this.cardSizes.clear();
      this.listenMoves();
    }
    if (changes['visible'] || changes['sensorData'] || changes['map'] || changes['scale']) {
      this.updateOverlays();
    }
  }

  ngOnDestroy(): void {
    this.unlistenMoves();
    if (this.reclusterTimer) clearTimeout(this.reclusterTimer);
    this.clearOverlays();
  }

  private listenMoves(): void {
    this.unlistenMoves();
    if (!this.map) return;
    this.moveKey = this.map.on('moveend', () => this.scheduleRecluster(60));
  }

  private unlistenMoves(): void {
    if (this.moveKey) unByKey(this.moveKey);
    this.moveKey = null;
  }

  private scheduleRecluster(delay: number): void {
    this.zone.runOutsideAngular(() => {
      if (this.reclusterTimer) clearTimeout(this.reclusterTimer);
      this.reclusterTimer = setTimeout(() => {
        this.reclusterTimer = null;
        this.updateOverlays();
      }, delay);
    });
  }

  private updateOverlays(): void {
    const map = this.map;
    if (!map || !this.visible) {
      this.clearOverlays();
      return;
    }
    this.measureSingles();

    const nodes = this.sensorData.filter(n => n.channels.length > 0);
    const byId = new globalThis.Map(nodes.map(n => [n.nodeId, n] as const));
    const fallback = { w: 110 * this.scale, h: 36 * this.scale };
    let estimated = false;
    const anchors: LabelAnchor[] = nodes.map(n => {
      const px = map.getPixelFromCoordinate(fromLonLat([n.longitude, n.latitude]));
      const size = this.cardSizes.get(n.nodeId);
      if (!size) estimated = true;
      return {
        id: n.nodeId,
        x: px ? px[0] : NaN,
        y: px ? px[1] : NaN,
        w: (size || fallback).w,
        h: (size || fallback).h,
        priority: this.nodePriority(n),
      };
    });

    const wanted = new Set<string>();
    for (const c of clusterLabelAnchors(anchors, 4 * this.scale)) {
      const key = clusterKey(c.memberIds);
      wanted.add(key);
      const lead = byId.get(c.leadId)!;
      const members = c.memberIds.map(id => byId.get(id)!);
      let overlay = this.overlays.get(key);
      if (!overlay) {
        const element = document.createElement('div');
        element.className = 'sensor-label-container';
        if (this.scale !== 1) element.style.setProperty('--sl-scale', String(this.scale));
        overlay = new Overlay({
          element,
          positioning: 'bottom-center',
          offset: [0, -15 * this.scale], // Position above the node marker
          stopEvent: false,
          className: 'sensor-label-overlay'
        });
        map.addOverlay(overlay);
        this.overlays.set(key, overlay);
      }
      const el = overlay.getElement() as HTMLElement;
      if (members.length === 1) this.updateLabelElement(el, lead);
      else this.updateGroupElement(el, members);
      el.dataset['nodeId'] = members.length === 1 ? lead.nodeId : '';
      overlay.setPosition(fromLonLat([lead.longitude, lead.latitude]));
    }

    for (const [key, overlay] of this.overlays) {
      if (!wanted.has(key)) {
        overlay.getMap()?.removeOverlay(overlay);
        this.overlays.delete(key);
      }
    }

    // Some sizes were guessed → once the cards are on screen, measure and cluster again.
    if (estimated && !this.measurePassPending) {
      this.measurePassPending = true;
      this.scheduleRecluster(120);
    } else {
      this.measurePassPending = false;
    }
  }

  /** Record the rendered size of every single (non-grouped) card; hidden/unrendered ones read 0 and are skipped. */
  private measureSingles(): void {
    for (const overlay of this.overlays.values()) {
      const el = overlay.getElement() as HTMLElement | undefined;
      const nodeId = el?.dataset['nodeId'];
      const card = el?.firstElementChild as HTMLElement | null;
      if (!nodeId || !card) continue;
      if (card.offsetWidth > 0 && card.offsetHeight > 0) {
        this.cardSizes.set(nodeId, { w: card.offsetWidth, h: card.offsetHeight });
      }
    }
  }

  private nodePriority(n: NodeSensorData): number {
    return n.channels.reduce((p, c) => Math.max(p, STATUS_PRIORITY[c.status] ?? 0), 0);
  }

  /** Merged card: one row per channel (name · value unit), alarm rows first, max 5 then "+N lainnya". */
  private updateGroupElement(element: HTMLElement, members: NodeSensorData[]): void {
    const rows: { name: string; channel: SensorChannelValue; rank: number; order: number }[] = [];
    for (const node of members) {
      const perLabel = new globalThis.Map<string, number>();
      for (const ch of node.channels) {
        const key = ch.sensorLabel || node.nodeCode;
        perLabel.set(key, (perLabel.get(key) || 0) + 1);
      }
      for (const ch of node.channels) {
        const base = ch.sensorLabel || node.nodeCode || ch.metricCode;
        const multi = (perLabel.get(ch.sensorLabel || node.nodeCode) || 0) > 1;
        rows.push({
          name: multi ? `${base} · ${this.formatMetricCode(ch.metricCode)}` : base,
          channel: ch,
          rank: STATUS_PRIORITY[ch.status] ?? 0,
          order: rows.length,
        });
      }
    }
    rows.sort((a, b) => (b.rank - a.rank) || (a.order - b.order));
    const shown = rows.slice(0, GROUP_MAX_ROWS);

    let html = '<div class="sensor-label-card sensor-label-group">';
    for (const r of shown) {
      html += `
        <div class="channel-row group-row ${this.getStatusClass(r.channel.status)}">
          <span class="group-name">${this.escapeHtml(r.name)}</span>
          <span class="channel-value">${this.valueText(r.channel)}</span>
        </div>
      `;
    }
    if (rows.length > shown.length) {
      html += `<div class="more-indicator">+${rows.length - shown.length} lainnya</div>`;
    }
    html += '</div>';
    element.innerHTML = html;
  }

  /** "1,23 bar" (id-ID, 2 decimals); no value → "—". HTML-escaped. */
  private valueText(channel: SensorChannelValue): string {
    const num = channel.value === null || channel.value === undefined ? NaN : Number(channel.value);
    return Number.isFinite(num)
      ? `${formatIdNumber(num, 2)}${channel.unit ? ' ' + this.escapeHtml(channel.unit) : ''}`
      : '—';
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
        const valueDisplay = this.valueText(channel);
        
        html += `
          <div class="channel-row ${statusClass}">
            <span class="channel-name">${this.escapeHtml(this.formatMetricCode(channel.metricCode))}</span>
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
      html += `<div class="more-indicator">+${channelsByLabel.size - 3} sensor lainnya</div>`;
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

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private clearOverlays(): void {
    for (const [, overlay] of this.overlays) {
      overlay.getMap()?.removeOverlay(overlay);
    }
    this.overlays.clear();
  }
}
