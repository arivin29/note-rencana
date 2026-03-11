# 06 - Map Tab

## Purpose
Full-screen map view with node markers, clustering, and interactive features.

---

## Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MAP                                              [Fullscreen] [⚙ Layers]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │                          🏭                                            │  │
│  │               📍                      📍                               │  │
│  │      📍              📍                                                │  │
│  │                    📍     📍                                           │  │
│  │                              📍                                        │  │
│  │                                           🔴 (offline)                 │  │
│  │     ┌───────────────────┐                                              │  │
│  │     │ PDAM-NODE-001     │                                              │  │
│  │     │ Status: Online    │                                              │  │
│  │     │ Pressure: 3.2 bar │                                              │  │
│  │     │ [Details] [Nav]   │                                              │  │
│  │     └───────────────────┘                                              │  │
│  │                                                                        │  │
│  │  [+][-]  🗺️                                         Scale: 1:5000      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Legend: 🟢 Online (12)  🔴 Offline (1)  🟡 Warning (0)   Total: 13     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Features

### Core Features (Phase 1)
| Feature | Description |
|---------|-------------|
| Node Markers | Show all nodes with GPS coordinates |
| Status Colors | 🟢 Online, 🔴 Offline, 🟡 Warning |
| Popup | Click marker → show node info |
| Cluster | Group nearby nodes when zoomed out |
| Legend | Status counts summary |

### Enhanced Features (Phase 2)
| Feature | Description |
|---------|-------------|
| Layers | Toggle marker types, satellite view |
| Filter | Filter markers by status, type |
| Search | Find node on map |
| Fullscreen | Expand to full browser |
| Route | Show directions to node |

### Future Features
| Feature | Description |
|---------|-------------|
| Zone Polygons | Draw DMA/area boundaries |
| Pipes/Lines | Network connections |
| Heat Map | Sensor value intensity |
| Live Updates | Real-time marker updates |

---

## Component Structure

```typescript
// map-tab.component.ts
@Component({
  selector: 'app-map-tab',
  templateUrl: './map-tab.component.html'
})
export class MapTabComponent implements OnInit, AfterViewInit {
  @Input() projectId: string;
  @Input() nodes: NodeDto[] = [];
  
  private map: L.Map;
  private markersLayer: L.MarkerClusterGroup;
  
  // Filters
  showOnline: boolean = true;
  showOffline: boolean = true;
  
  ngAfterViewInit() {
    this.initMap();
  }
  
  initMap() {
    this.map = L.map('project-map').setView([-2.5, 118], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
    
    this.markersLayer = L.markerClusterGroup();
    this.map.addLayer(this.markersLayer);
    
    this.addMarkers();
  }
  
  addMarkers() {
    this.nodes.forEach(node => {
      if (node.currentLocation?.latitude && node.currentLocation?.longitude) {
        const marker = L.marker([
          node.currentLocation.latitude,
          node.currentLocation.longitude
        ], {
          icon: this.getMarkerIcon(node.connectivityStatus)
        });
        
        marker.bindPopup(this.createPopup(node));
        this.markersLayer.addLayer(marker);
      }
    });
    
    // Fit bounds to show all markers
    if (this.markersLayer.getLayers().length > 0) {
      this.map.fitBounds(this.markersLayer.getBounds(), { padding: [50, 50] });
    }
  }
  
  getMarkerIcon(status: string): L.Icon {
    const color = status === 'online' ? 'green' : status === 'offline' ? 'red' : 'orange';
    return L.icon({
      iconUrl: `/assets/markers/marker-${color}.png`,
      iconSize: [25, 41]
    });
  }
  
  createPopup(node: NodeDto): string {
    return `
      <div class="node-popup">
        <h6>${node.code}</h6>
        <div>Status: ${node.connectivityStatus}</div>
        <div>Location: ${node.currentLocation?.address || 'Unknown'}</div>
        <a href="/iot/nodes/${node.idNode}">View Details</a>
      </div>
    `;
  }
}
```

---

## Map Popup Template

```html
<div class="node-popup">
  <div class="popup-header">
    <strong>{{ node.code }}</strong>
    <span class="badge" [class]="statusClass">{{ node.connectivityStatus }}</span>
  </div>
  
  <div class="popup-body">
    <div class="popup-row">
      <i class="fa fa-map-marker-alt"></i>
      {{ node.currentLocation?.address || 'Unknown location' }}
    </div>
    <div class="popup-row">
      <i class="fa fa-clock"></i>
      Last seen: {{ node.lastTelemetryAt | timeAgo }}
    </div>
    
    <!-- Latest values preview -->
    <div class="popup-values" *ngIf="node.latestValues?.length">
      <div *ngFor="let v of node.latestValues.slice(0,3)">
        {{ v.metricCode }}: {{ v.value }} {{ v.unit }}
      </div>
    </div>
  </div>
  
  <div class="popup-actions">
    <a [routerLink]="['/iot/nodes', node.idNode]" class="btn btn-sm btn-primary">
      Details
    </a>
    <a [href]="getDirectionsUrl(node)" target="_blank" class="btn btn-sm btn-outline-secondary">
      <i class="fa fa-directions"></i> Navigate
    </a>
  </div>
</div>
```

---

## Layer Controls

```html
<div class="map-layer-controls">
  <div class="layer-toggle">
    <label>
      <input type="checkbox" [(ngModel)]="showOnline" (change)="updateFilter()">
      🟢 Online ({{ onlineCount }})
    </label>
  </div>
  <div class="layer-toggle">
    <label>
      <input type="checkbox" [(ngModel)]="showOffline" (change)="updateFilter()">
      🔴 Offline ({{ offlineCount }})
    </label>
  </div>
  <div class="layer-toggle">
    <label>
      <input type="checkbox" [(ngModel)]="showSatellite" (change)="toggleSatellite()">
      🗺️ Satellite
    </label>
  </div>
</div>
```

---

## Existing Component

Current map widget location:
```
projects-detail/
└── iot-project-map-widget/
    ├── iot-project-map-widget.component.ts
    └── iot-project-map-widget.component.html
```

### Refactor Plan
1. Move to `map-tab/` directory
2. Enhance with additional features
3. Make fullscreen capable

---

## Dependencies

```json
{
  "leaflet": "^1.9.x",
  "leaflet.markercluster": "^1.5.x",
  "@types/leaflet": "^1.9.x"
}
```

Already installed in project.

---

## Mobile Considerations

- Touch-friendly markers (larger hit area)
- Pinch to zoom
- Current location button
- Simplified popup

---

**Prev**: [05-ASSETS-TAB.md](05-ASSETS-TAB.md)  
**Next**: [07-ANALYTICS-TAB.md](07-ANALYTICS-TAB.md)
