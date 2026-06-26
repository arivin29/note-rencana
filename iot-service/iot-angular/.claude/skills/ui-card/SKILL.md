---
name: ui-card
description: Standard card / dashboard widget / stat card for the IoT Angular app — shared <card> wrapper, widget-container base, @Input config object, gradient icon box, trend badge, progress bar, number pipes and status badges. Use when building cards, KPI/stat cards, or dashboard widgets.
---

# Standard Card / Widget

Two layers: the generic **`<card>`** layout wrapper, and reusable **dashboard widgets** under `components/widgets/`. Reference: `components/widgets/numeric/info-card-widget.component.*`. Read `ui-coding-style` first.

## Plain card (info section / container)
```html
<card class="shadow-sm">
  <card-header class="border-bottom"><h5 class="mb-0"><i class="fa fa-info-circle fa-fw me-2"></i>Title</h5></card-header>
  <card-body class="p-4">…content…</card-body>
</card>
```
Use `<card>` + `<card-header>` + `<card-body>` — not raw Bootstrap `.card`. Add `shadow-sm`, `border-0`, etc. as utilities on the host.

## Dashboard widget (config-driven)
```typescript
@Component({ selector: 'info-card-widget', templateUrl: './info-card-widget.component.html',
            styleUrls: ['./info-card-widget.component.scss'], standalone: false })
export class InfoCardWidgetComponent {
  @Input() config!: InfoCardWidgetConfig;   // { icon, iconColor, value, unit, label, trend?, stats?, status?, updateTime? }
  getGradientBackground() { const c = this.config.iconColor || '#0271ff';
    return `linear-gradient(135deg, ${c} 0%, ${this.adjustBrightness(c, -20)} 100%)`; }
  getProgressPercentage() { const { min, max } = this.config.stats!; const r = max - min;
    return r === 0 ? 50 : Math.max(0, Math.min(100, ((this.config.value - min) / r) * 100)); }
}
```
```html
<widget-container [showHeader]="false">
  <div class="info-card-content">
    <div class="d-flex align-items-center mb-3">
      <div class="info-card-icon-box" [style.background]="getGradientBackground()"><i [class]="'fa ' + config.icon + ' fa-lg'"></i></div>
      <div class="ms-3 flex-1">
        <div class="info-card-value">{{ config.value | number:'1.0-2' }}<span class="info-card-unit">{{ config.unit }}</span></div>
        <div class="info-card-label text-inverse text-opacity-50">{{ config.label }}</div>
      </div>
      <div *ngIf="config.trend" class="ms-auto">
        <div class="trend-badge" [ngClass]="{ 'trend-up': config.trend.direction==='up', 'trend-down': config.trend.direction==='down', 'trend-stable': config.trend.direction==='stable' }">
          <i class="fa fa-xs" [class.fa-arrow-up]="config.trend.direction==='up'" [class.fa-arrow-down]="config.trend.direction==='down'" [class.fa-minus]="config.trend.direction==='stable'"></i>
          {{ config.trend.value | number:'1.0-1' }}%
        </div>
      </div>
    </div>
    <div class="info-card-stats" *ngIf="config.stats">
      <div class="progress mb-2" style="height:4px;"><div class="progress-bar bg-theme" [style.width]="getProgressPercentage() + '%'"></div></div>
      <div class="d-flex justify-content-between text-inverse text-opacity-50 fs-11px">
        <span><i class="fa fa-circle fa-xs text-success me-1"></i>Min: {{ config.stats.min | number:'1.0-2' }}</span>
        <span><i class="fa fa-circle fa-xs text-danger me-1"></i>Max: {{ config.stats.max | number:'1.0-2' }}</span>
      </div>
    </div>
  </div>
</widget-container>
```
```scss
.info-card-icon-box { width:50px; height:50px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.5rem; }
.info-card-value { font-size:1.75rem; font-weight:700; line-height:1; }
.info-card-unit  { font-size:.75rem; margin-left:.5rem; opacity:.7; }
.trend-badge { padding:.375rem .75rem; border-radius:4px; font-weight:600; display:inline-flex; gap:.25rem;
  &.trend-up{ background:rgba(34,197,94,.1); color:#22c55e; } &.trend-down{ background:rgba(239,68,68,.1); color:#ef4444; }
  &.trend-stable{ background:rgba(107,114,128,.1); color:#6b7280; } }
```

## Rules
- Stat/KPI/widget components take a single typed **`@Input() config`** object; keep all display logic config-driven.
- Wrap widgets in `widget-container`; wrap page sections in `<card>`.
- Numbers via `| number:'1.0-2'`; status/trend shown as colored badges using theme + status colors (success `#22c55e`, warning `#fbbf24`, danger `#ef4444`).
- Progress bars `.progress` height 4px with `bg-theme` and a computed width %.
- Prefer Bootstrap utilities; only add component SCSS for gradients/badges that utilities can't express.
