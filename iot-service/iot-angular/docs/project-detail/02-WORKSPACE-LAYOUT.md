# 02 - Tab Structure & Navigation

## Tab Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DMA 1                                                              [Back]  │
│  PDAM KUTKAR · Active · Pipeline                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Overview] [Monitor] [Assets] [Map] [Analytics] [Config] [SCADA*]         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                          TAB CONTENT AREA                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

* SCADA tab is optional/hidden by default
```

---

## Tab Definitions

| # | Tab ID | Label | Icon | Priority | Status |
|---|--------|-------|------|----------|--------|
| 1 | `overview` | Overview | `fa-tachometer-alt` | 80% access | Phase 1 |
| 2 | `monitor` | Monitor | `fa-desktop` | 60% access | Phase 2 |
| 3 | `assets` | Assets | `fa-sitemap` | 40% access | Phase 2 |
| 4 | `map` | Map | `fa-map-marked-alt` | 30% access | Phase 1 |
| 5 | `analytics` | Analytics | `fa-chart-line` | 20% access | Phase 3 |
| 6 | `config` | Config | `fa-cog` | 5% access | Phase 3 |
| 7 | `scada` | SCADA | `fa-industry` | Optional | Future |

---

## URL Routing

### Fragment-based Navigation
```
/iot/projects/:projectId                    → defaults to #overview
/iot/projects/:projectId#overview
/iot/projects/:projectId#monitor
/iot/projects/:projectId#assets
/iot/projects/:projectId#map
/iot/projects/:projectId#analytics
/iot/projects/:projectId#config
```

### Implementation
```typescript
// projects-detail.ts
activeTab: string = 'overview';

ngOnInit() {
  this.route.fragment.subscribe(fragment => {
    this.activeTab = fragment || 'overview';
  });
}

onTabChange(tabId: string) {
  this.router.navigate([], { fragment: tabId });
}
```

---

## Tab Component Structure

```
projects-detail/
├── projects-detail.ts              # Main container + tabs
├── projects-detail.html            # Tab navigation + content
├── projects-detail.scss
├── tabs/
│   ├── overview-tab/
│   │   ├── overview-tab.component.ts
│   │   └── overview-tab.component.html
│   ├── monitor-tab/
│   │   ├── monitor-tab.component.ts
│   │   └── monitor-tab.component.html
│   ├── assets-tab/
│   │   ├── assets-tab.component.ts
│   │   └── assets-tab.component.html
│   ├── map-tab/
│   │   ├── map-tab.component.ts
│   │   └── map-tab.component.html
│   ├── analytics-tab/
│   │   └── (placeholder)
│   └── config-tab/
│       └── (placeholder)
└── widgets/
    └── iot-project-map-widget/     # Existing
```

---

## HTML Structure

```html
<!-- projects-detail.html -->
<div class="project-detail-container">
  <!-- Header (always visible) -->
  <div class="project-header">
    <div class="breadcrumb">...</div>
    <h1>{{ project.name }}</h1>
    <div class="project-badges">
      <span class="badge">{{ project.status }}</span>
      <span class="badge">{{ project.areaType }}</span>
    </div>
  </div>

  <!-- Tab Navigation -->
  <ul ngbNav #nav="ngbNav" [(activeId)]="activeTab" class="nav-tabs">
    <li [ngbNavItem]="'overview'">
      <button ngbNavLink>
        <i class="fa fa-tachometer-alt me-1"></i> Overview
      </button>
      <ng-template ngbNavContent>
        <app-overview-tab [project]="project"></app-overview-tab>
      </ng-template>
    </li>
    
    <li [ngbNavItem]="'monitor'">
      <button ngbNavLink>
        <i class="fa fa-desktop me-1"></i> Monitor
      </button>
      <ng-template ngbNavContent>
        <app-monitor-tab [projectId]="projectId"></app-monitor-tab>
      </ng-template>
    </li>
    
    <!-- ... more tabs -->
  </ul>
  
  <div [ngbNavOutlet]="nav"></div>
</div>
```

---

## Responsive Behavior

### Desktop (>= 992px)
- Horizontal tabs
- Full labels with icons

### Tablet (768px - 991px)
- Horizontal tabs
- Icons only, labels in tooltip

### Mobile (< 768px)
- Scrollable horizontal tabs OR
- Dropdown select

```scss
@media (max-width: 768px) {
  .nav-tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
    
    .nav-link {
      white-space: nowrap;
    }
  }
}
```

---

## Tab State Persistence

```typescript
// Remember last active tab per project
sessionStorage.setItem(`project-tab-${projectId}`, activeTab);

// Restore on revisit
const savedTab = sessionStorage.getItem(`project-tab-${projectId}`);
if (savedTab) this.activeTab = savedTab;
```

---

## Loading States

Each tab should handle its own loading:
```html
<!-- Inside each tab -->
<ng-container *ngIf="loading">
  <div class="text-center py-5">
    <div class="spinner-border text-theme"></div>
  </div>
</ng-container>

<ng-container *ngIf="!loading">
  <!-- Tab content -->
</ng-container>
```

---

**Prev**: [01-OVERVIEW.md](01-OVERVIEW.md)  
**Next**: [03-OVERVIEW-TAB.md](03-OVERVIEW-TAB.md)
