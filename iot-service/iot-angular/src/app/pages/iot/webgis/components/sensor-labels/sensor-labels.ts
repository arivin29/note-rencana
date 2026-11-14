import { Component, Input, NgZone, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import OlMap from 'ol/Map';
import Overlay from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';
import { unByKey } from 'ol/Observable';
import type { EventsKey } from 'ol/events';
import { clusterKey, fitGroupBlocks, Insets, LabelAnchor, placeLabelCards } from '../../shared/label-clusters';
import { formatIdNumber } from '../../../widget-builder/utils/format-id';
import { metricTitle, sortSheetChannels } from '../../shared/map-node-info';

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
  /** Node address (primary label per naming rule); older backends omit it. */
  nodeAddress?: string;
  latitude: number;
  longitude: number;
  hasCoordinates: boolean;
  channels: SensorChannelValue[];
}

/**
 * Opt-in card text formatting (mobile Helios). Absent → today's WebGIS/TV text.
 * `value` returns the number text only (no unit) or '—'.
 */
export interface SensorLabelFormat {
  metric?(metricCode: string): string;
  value?(channel: SensorChannelValue): string;
  unit?(unit: string): string;
  /** Channels to leave out of the cards (e.g. installation constants). */
  hide?(channel: SensorChannelValue): boolean;
}

export type SensorLabelVariant = 'default' | 'helios';

/** Cluster lead / row order: alarm first. */
const STATUS_PRIORITY: Record<string, number> = { critical: 3, warning: 2, normal: 1, unknown: 0 };
const GROUP_MAX_ROWS = 5;
/** Helios merged card: node blocks shown, metric rows per node. */
const HELIOS_GROUP_MAX_NODES = 4;
const HELIOS_GROUP_ROWS_PER_NODE = 2;

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
  /** sensorTypeName → marker colour; grouped-card rows get a dot in that colour (row ↔ marker link). */
  @Input() typeColors: Record<string, string> = {};
  /** Map area covered by host UI (mobile rail/chips) — cards are kept out of it. Default none. */
  @Input() insets: Partial<Insets> | null = null;
  /** Card look: `helios` = mobile HUD tag (class `sl-helios`), metric-named rows. Default = WebGIS look. */
  @Input() variant: SensorLabelVariant = 'default';
  /** Optional text formatting (precision, metric names, units). Default = WebGIS text. */
  @Input() format: SensorLabelFormat | null = null;
  /** Marker → card distance for cards placed beside/below (px). null = 12 × scale. */
  @Input() clear: number | null = null;

  /**
   * One overlay per screen-space cluster (key = sorted member node ids). Cards that would overlap at
   * the current zoom are merged into one group card at the lead (highest-priority) node; markers stay
   * where they are. Re-clustered on every `moveend` (debounced, outside Angular).
   */
  private overlays: globalThis.Map<string, Overlay> = new globalThis.Map();
  /** Last measured single-card size per node (px at the current scale). */
  private cardSizes = new globalThis.Map<string, { w: number; h: number }>();
  /** Last measured merged-card size per cluster key. */
  private groupSizes = new globalThis.Map<string, { w: number; h: number }>();
  /** Helios merged cards: lines that fit the map height (top/bottom insets), and per-group cuts
   *  learned when a rendered card was still taller than that. */
  private lineBudget = Infinity;
  private budgetCut = new globalThis.Map<string, number>();
  private freeHeight = Infinity;
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
      this.groupSizes.clear();
    }
    if (changes['map']) {
      this.clearOverlays();
      this.cardSizes.clear();
      this.groupSizes.clear();
      this.listenMoves();
    }
    if ((changes['typeColors'] && !changes['typeColors'].firstChange) || (changes['variant'] && !changes['variant'].firstChange)) {
      this.clearOverlays();
      this.cardSizes.clear();
      this.groupSizes.clear();
    }
    if (changes['visible'] || changes['sensorData'] || changes['map'] || changes['scale'] || changes['typeColors']
      || changes['insets'] || changes['variant'] || changes['format'] || changes['clear']) {
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
    if (this.variant === 'helios') {
      const sz = map.getSize() || [0, 0];
      this.freeHeight = sz[1] - (this.insets?.top || 0) - (this.insets?.bottom || 0);
      this.lineBudget = Math.max(2, Math.floor((this.freeHeight - 8 * this.scale) / this.lineH()));
    }
    this.measureSingles();

    const nodes = this.sensorData.filter(n => this.visibleChannels(n).length > 0);
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

    // Merged cards are bigger than singles → sized as measured when that exact group was rendered
    // before, else estimated from its row count.
    const groupSize = (ids: string[]) => {
      const known = this.groupSizes.get(clusterKey(ids));
      if (known) return known;
      estimated = true;
      return this.estimateGroupSize(ids.map(id => byId.get(id)!));
    };

    const size = map.getSize() || [0, 0];
    const clearAbove = 15 * this.scale;
    const placedCards = placeLabelCards(anchors, {
      width: size[0], height: size[1], insets: this.insets || undefined,
      gap: 4 * this.scale, clearAbove, clear: this.clear ?? 12 * this.scale, groupSize,
    });

    const wanted = new Set<string>();
    for (const c of placedCards) {
      const key = clusterKey(c.memberIds);
      wanted.add(key);
      const lead = byId.get(c.leadId)!;
      const members = c.memberIds.map(id => byId.get(id)!);
      let overlay = this.overlays.get(key);
      if (!overlay) {
        const element = document.createElement('div');
        element.className = 'sensor-label-container';
        if (this.variant === 'helios') element.classList.add('sl-helios');
        if (this.scale !== 1) {
          element.style.setProperty('--sl-scale', String(this.scale));
          // Dashboard/TV path only: slightly larger base text (WebGIS at scale 1 unchanged)
          element.style.setProperty('--sl-boost', '2px');
          element.classList.add('sl-scaled');
        }
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
      // Every node of the card (lead first) — a tap on the card selects them (mobile map sheet).
      el.dataset['memberIds'] = c.memberIds.join(',');
      // Classic spot keeps the exact WebGIS anchoring (bottom-centre + pointer); other sides /
      // clamped cards are positioned by their computed box, without the pointer.
      const classic = c.side === 'above' && !c.clamped || !Number.isFinite(c.rect.left);
      el.classList.toggle('sl-nopointer', !classic);
      if (classic) {
        overlay.setPositioning('bottom-center');
        overlay.setOffset([0, -clearAbove]);
      } else {
        overlay.setPositioning('top-left');
        overlay.setOffset([Math.round(c.rect.left - c.x), Math.round(c.rect.top - c.y)]);
      }
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
      const members = el?.dataset['memberIds'];
      const card = el?.firstElementChild as HTMLElement | null;
      if (!card || !(card.offsetWidth > 0 && card.offsetHeight > 0)) continue;
      const size = { w: card.offsetWidth, h: card.offsetHeight };
      if (nodeId) this.cardSizes.set(nodeId, size);
      else if (members) {
        const key = clusterKey(members.split(','));
        // Helios: rendered group still taller than the free map height → fewer lines next time
        if (this.variant === 'helios' && size.h > this.freeHeight + 1) {
          this.budgetCut.set(key, (this.budgetCut.get(key) || 0) + Math.ceil((size.h - this.freeHeight) / this.lineH()));
          this.groupSizes.delete(key);
          continue;
        }
        this.groupSizes.set(key, size);
      }
    }
  }

  /**
   * Merged card size before it was rendered: max width (`.sensor-label-group` max-width) ×
   * padding + one row per channel (max GROUP_MAX_ROWS) + "+N lainnya". Slightly generous on purpose.
   */
  private estimateGroupSize(members: NodeSensorData[]): { w: number; h: number } {
    const s = this.scale;
    const boost = s !== 1 ? 2 : 0;
    const rowH = ((10 + boost) * 1.3 + 2) * s;
    const moreH = (8 * 1.3 + 2) * s;
    if (this.variant === 'helios') {
      const plan = this.heliosPlan(members);
      const lines = plan.shown.reduce((n, r) => n + (r ? 1 + r : 0), 0);
      return { w: (180 + 10 * boost) * s, h: 8 * s + lines * rowH + (plan.hidden ? moreH : 0) };
    }
    const rows = members.reduce((n, m) => n + m.channels.length, 0);
    const shown = Math.min(rows, GROUP_MAX_ROWS);
    const more = rows > shown ? moreH : 0;
    return { w: (180 + 10 * boost) * s, h: 8 * s + shown * rowH + more };
  }

  private nodePriority(n: NodeSensorData): number {
    return n.channels.reduce((p, c) => Math.max(p, STATUS_PRIORITY[c.status] ?? 0), 0);
  }

  /** Node primary label: address, fallback node code (project naming rule). */
  private nodeLabel(node: NodeSensorData): string {
    return (node.nodeAddress || '').trim() || node.nodeCode || node.nodeName || '';
  }

  /**
   * Merged card: one row per channel (● address [· metric]  value unit), alarm rows first, max 5
   * then "+N lainnya". The dot has the colour of the sensor-type layer the row's marker is drawn in.
   */
  /** Channels shown on cards (format.hide filters, e.g. Diameter). */
  private visibleChannels(node: NodeSensorData): SensorChannelValue[] {
    const hide = this.format?.hide;
    return hide ? node.channels.filter(c => !hide(c)) : node.channels;
  }

  /**
   * Helios merged card: one block per node — node label on its own line, then its main metric rows
   * (max 2), so names are never cut into "Alamat · Met…" and every member shows its main value.
   */
  /** Card line height estimate (one row / node header). */
  private lineH(): number {
    const boost = this.scale !== 1 ? 2 : 0;
    return ((10 + boost) * 1.3 + 2) * this.scale;
  }

  /** Which node blocks / rows a Helios merged card shows so it fits the free map height. */
  private heliosPlan(members: NodeSensorData[]): { shown: number[]; hidden: number } {
    const budget = this.lineBudget - (this.budgetCut.get(clusterKey(members.map(m => m.nodeId))) || 0);
    return fitGroupBlocks(members.map(m => this.visibleChannels(m).length), Math.max(1, budget),
      HELIOS_GROUP_ROWS_PER_NODE, HELIOS_GROUP_MAX_NODES);
  }

  private updateHeliosGroupElement(element: HTMLElement, members: NodeSensorData[]): void {
    let html = '<div class="sensor-label-card sensor-label-group">';
    const plan = this.heliosPlan(members);
    const hidden = plan.hidden;
    members.forEach((node, i) => {
      const channels = sortSheetChannels(this.visibleChannels(node));
      if (!plan.shown[i]) return;
      const shown = channels.slice(0, plan.shown[i]);
      const color = this.typeColors[channels[0]?.sensorTypeName] || '';
      const dot = /^#[0-9a-f]{3,8}$/i.test(color)
        ? `<span class="group-dot" style="background:${color}"></span>` : '<span class="group-dot"></span>';
      html += `<div class="sensor-group"><div class="sensor-name group-head">${dot}${this.escapeHtml(this.nodeLabel(node) || '—')}</div>`;
      for (const ch of shown) {
        html += `
          <div class="channel-row ${this.getStatusClass(ch.status)}">
            <span class="channel-name">${this.escapeHtml(this.formatMetricCode(ch.metricCode))}</span>
            ${this.valueHtml(ch)}
          </div>`;
      }
      html += '</div>';
    });
    if (hidden > 0) html += `<div class="more-indicator">+${hidden} lainnya</div>`;
    html += '</div>';
    element.innerHTML = html;
  }

  private updateGroupElement(element: HTMLElement, members: NodeSensorData[]): void {
    if (this.variant === 'helios') { this.updateHeliosGroupElement(element, members); return; }
    const rows: { name: string; color: string; channel: SensorChannelValue; rank: number; order: number }[] = [];
    for (const node of members) {
      const base = this.nodeLabel(node) || '—';
      const multi = node.channels.length > 1;
      for (const ch of node.channels) {
        rows.push({
          name: multi ? `${base} · ${this.formatMetricCode(ch.metricCode)}` : base,
          color: this.typeColors[ch.sensorTypeName] || '',
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
      const dot = /^#[0-9a-f]{3,8}$/i.test(r.color)
        ? `<span class="group-dot" style="background:${r.color}"></span>`
        : '<span class="group-dot"></span>';
      html += `
        <div class="channel-row group-row ${this.getStatusClass(r.channel.status)}">
          ${dot}<span class="group-name">${this.escapeHtml(r.name)}</span>
          ${this.valueHtml(r.channel)}
        </div>
      `;
    }
    if (rows.length > shown.length) {
      html += `<div class="more-indicator">+${rows.length - shown.length} lainnya</div>`;
    }
    html += '</div>';
    element.innerHTML = html;
  }

  /** Value cell; no value → muted "—" (tooltip "tidak ada data"). */
  private valueHtml(channel: SensorChannelValue): string {
    const text = this.valueText(channel);
    return text === '—'
      ? '<span class="channel-value no-data" title="tidak ada data">—</span>'
      : `<span class="channel-value">${text}</span>`;
  }

  /** "1,23 bar" (id-ID, 2 decimals); no value → "—". HTML-escaped. */
  private valueText(channel: SensorChannelValue): string {
    const num = channel.value === null || channel.value === undefined ? NaN : Number(channel.value);
    if (!Number.isFinite(num)) return '—';
    const fmt = this.format;
    const n = fmt?.value ? fmt.value(channel) : formatIdNumber(num, 2);
    if (n === '—') return '—';
    const unit = fmt?.unit ? fmt.unit(channel.unit || '') : channel.unit;
    if (this.variant === 'helios') {
      return `${this.escapeHtml(n)}${unit ? '<span class="sl-unit"> ' + this.escapeHtml(unit) + '</span>' : ''}`;
    }
    return `${this.escapeHtml(n)}${unit ? ' ' + this.escapeHtml(unit) : ''}`;
  }

  /** Single card: title = node address (fallback code), then channel rows (max 4, "+N lainnya"). */
  private updateLabelElement(element: HTMLElement, nodeData: NodeSensorData): void {
    const multiSensor = new Set(nodeData.channels.map(c => c.sensorLabel)).size > 1;
    const helios = this.variant === 'helios';
    // Helios: main metrics first (alarm → pressure/flow), rows named by metric; a sensor label is
    // added only when two rows would read the same.
    const channels = helios ? sortSheetChannels(this.visibleChannels(nodeData)) : nodeData.channels;
    const metricCount = new Map<string, number>();
    for (const c of channels) {
      const m = this.formatMetricCode(c.metricCode);
      metricCount.set(m, (metricCount.get(m) || 0) + 1);
    }
    const shown = channels.slice(0, 4);
    let html = '<div class="sensor-label-card">';
    html += `<div class="sensor-name">${this.escapeHtml(this.nodeLabel(nodeData) || '—')}</div>`;
    for (const channel of shown) {
      const metric = this.formatMetricCode(channel.metricCode);
      const name = helios
        ? ((metricCount.get(metric) || 0) > 1 && channel.sensorLabel ? `${metric} · ${channel.sensorLabel}` : metric)
        : (multiSensor && channel.sensorLabel ? `${channel.sensorLabel} · ${metric}` : metric);
      html += `
        <div class="channel-row ${this.getStatusClass(channel.status)}">
          <span class="channel-name">${this.escapeHtml(name)}</span>
          ${this.valueHtml(channel)}
        </div>
      `;
    }
    if (channels.length > shown.length) {
      html += `<div class="more-indicator">+${channels.length - shown.length} lainnya</div>`;
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
    return this.format?.metric ? this.format.metric(code) : metricTitle(code);
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
