import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NodesService } from '../../../../../../../sdk/core/services/nodes.service';

export interface MapNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'online' | 'warning' | 'offline' | 'unknown';
}

@Component({
  selector: 'app-map-page',
  templateUrl: './map-page.component.html',
  styleUrls: ['./map-page.component.scss'],
  standalone: false
})
export class MapPageComponent implements OnInit {
  projectId = '';
  nodes: MapNode[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private nodesService: NodesService
  ) {}

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe(params => {
      this.projectId = params.get('projectId') || '';
      if (this.projectId) {
        this.loadNodes();
      }
    });
  }

  loadNodes() {
    this.loading = true;
    this.nodesService.nodesControllerFindAll$Response({ idProject: this.projectId })
      .subscribe({
        next: (res) => {
          const data: any[] = (res.body as any)?.data || res.body || [];
          this.nodes = data
            .filter(n => n.latitude && n.longitude)
            .map(n => ({
              id: n.idNode || n.id,
              name: n.name || n.nodeCode,
              lat: parseFloat(n.latitude),
              lng: parseFloat(n.longitude),
              status: this.getStatus(n)
            }));
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  getStatus(node: any): 'online' | 'warning' | 'offline' | 'unknown' {
    if (!node.lastSeenAt) return 'unknown';
    const lastSeen = new Date(node.lastSeenAt);
    const diffMin = (Date.now() - lastSeen.getTime()) / 60000;
    if (diffMin < 5) return 'online';
    if (diffMin < 30) return 'warning';
    return 'offline';
  }

  // Convert to format expected by map widget
  get mapWidgetNodes(): Array<{ id: string; name: string; coords: [number, number] }> {
    return this.nodes.map(n => ({
      id: n.id,
      name: n.name,
      coords: [n.lng, n.lat] as [number, number]
    }));
  }
}
