import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppSettings } from '../../../../service/app-settings.service';
import { ProjectsService } from '../../../../../sdk/core/services/projects.service';
import { NodesService } from '../../../../../sdk/core/services/nodes.service';
import { SensorsService } from '../../../../../sdk/core/services/sensors.service';
import { fetchAll } from '../../../../shared/utils/fetch-all';
import { Freshness, getFreshness } from '../../../../shared/utils/telemetry-freshness';
import { WidgetBuilderService } from '../../../../../sdk/core/services/widget-builder.service';
import { WebGisLayerStateService, LayerGroup } from '../../webgis/services/webgis-layer-state.service';

export interface AssetTreeNode {
  id: string;
  name: string;
  type: 'project' | 'node' | 'sensor';
  status?: 'online' | 'warning' | 'offline' | 'unknown';
  expanded?: boolean;
  children?: AssetTreeNode[];
  data?: any;
}

export interface NavItem {
  path: string;
  icon: string;
  label: string;
  expanded?: boolean;
  children?: { path: string; id: string; label: string }[];
}

@Component({
  selector: 'app-project-workspace',
  templateUrl: './project-workspace.component.html',
  styleUrls: ['./project-workspace.component.scss'],
  standalone: false
})
export class ProjectWorkspaceComponent implements OnInit, OnDestroy {
  projectId = '';
  projectName = '';
  loading = true;
  
  // Sidebar state
  sidebarCollapsed = false;
  mobileSidebarOpen = false;
  
  // Asset tree data
  assetTree: AssetTreeNode[] = [];
  selectedAssetId: string | null = null;
  
  // Navigation items
  navItems: NavItem[] = [
    { path: 'overview', icon: 'fa-tachometer-alt', label: 'Overview' },
    { path: 'nodes', icon: 'fa-server', label: 'Nodes' },
    { path: 'sensors', icon: 'fa-microchip', label: 'Sensors' },
    { path: 'monitor', icon: 'fa-chart-line', label: 'Monitor', expanded: false, children: [] },
    { path: 'map', icon: 'fa-map-marked-alt', label: 'Map', expanded: false },
    { path: 'analytics', icon: 'fa-project-diagram', label: 'SCADA' },
    { path: 'config', icon: 'fa-cog', label: 'Config' }
  ];
  
  // Layer state (for map page)
  layerGroups: LayerGroup[] = [];
  layersLoading = false;
  
  private routerSub!: Subscription;
  private layerSub!: Subscription;
  private previousMinifiedState = false;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appSettings: AppSettings,
    private projectsService: ProjectsService,
    private nodesService: NodesService,
    private sensorsService: SensorsService,
    private widgetBuilderService: WidgetBuilderService,
    public layerStateService: WebGisLayerStateService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit() {
    // Store previous state and enable minified sidebar mode for project workspace
    this.previousMinifiedState = this.appSettings.appSidebarMinified;
    setTimeout(() => {
      this.appSettings.appSidebarMinified = true;
    });
    
    // Get project ID from route
    this.route.paramMap.subscribe(params => {
      this.projectId = params.get('projectId') || '';
      if (this.projectId) {
        this.loadProjectData();
      }
    });
    
    // Listen to router events for active state
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateSelectedAsset();
      // Auto-expand map nav when on map page
      const mapNav = this.navItems.find(n => n.path === 'map');
      if (mapNav && this.isOnMapPage()) {
        mapNav.expanded = true;
      }
    });
    
    // Load sidebar collapsed state from localStorage
    const savedState = localStorage.getItem('projectSidebarCollapsed');
    this.sidebarCollapsed = savedState === 'true';
    
    // Subscribe to layer state changes
    this.layerSub = this.layerStateService.getLayerGroups().subscribe(groups => {
      this.layerGroups = groups;
    });
    this.layerStateService.getLoading().subscribe(loading => {
      this.layersLoading = loading;
    });
    
    // Auto-expand map nav on initial load if on map page
    setTimeout(() => {
      const mapNav = this.navItems.find(n => n.path === 'map');
      if (mapNav && this.isOnMapPage()) {
        mapNav.expanded = true;
      }
    }, 0);
  }
  
  ngOnDestroy() {
    // Restore previous sidebar minified state
    this.appSettings.appSidebarMinified = this.previousMinifiedState;
    
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
    if (this.layerSub) {
      this.layerSub.unsubscribe();
    }
  }
  
  loadProjectData() {
    this.loading = true;
    
    // Load project details
    this.projectsService.projectsControllerFindOneDetailed$Response({ id: this.projectId })
      .subscribe({
        next: (res) => {
          const project: any = res.body;
          this.projectName = project.name || 'Project';
          this.buildAssetTree(project);
          this.loadDashboards(); // Load dashboards for Monitor submenu
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load project:', err);
          this.loading = false;
        }
      });
  }
  
  loadDashboards() {
    this.widgetBuilderService.widgetBuilderControllerGetDashboardsByProject({ projectId: this.projectId })
      .subscribe({
        next: (dashboards: any) => {
          // Find Monitor nav item and set its children
          const monitorNav = this.navItems.find(n => n.path === 'monitor');
          if (monitorNav) {
            monitorNav.children = (dashboards || []).map((d: any) => ({
              path: `monitor/${d.idDashboard}`,
              id: d.idDashboard,
              label: d.name || 'Dashboard'
            }));
            // Auto-expand if has dashboards
            if (monitorNav.children && monitorNav.children.length > 0) {
              monitorNav.expanded = true;
            }
          }
        },
        error: (err) => {
          console.warn('Failed to load dashboards:', err);
        }
      });
  }
  
  /**
   * Tree = nodes + their sensors. 2 project-scoped requests (paged), not one per node.
   * Node AND sensor status use the shared freshness rule; a sensor's status is its own
   * (lastValueAt), not inherited from the node.
   */
  buildAssetTree(project: any) {
    forkJoin({
      nodes: fetchAll(p => this.nodesService.nodesControllerFindAll$Response({ idProject: this.projectId, ...p })),
      // Sensors failing must not hide the nodes: fall back to "no sensors" for the tree only.
      sensors: fetchAll(p => this.sensorsService.sensorsControllerFindAll$Response({ idProject: this.projectId, ...p }))
        .pipe(catchError(err => {
          console.warn('Failed to load sensors for asset tree:', err);
          return of(null);
        }))
    }).subscribe({
      next: ({ nodes, sensors }) => {
        const sensorsByNode = new Map<string, any[]>();
        (sensors || []).forEach((sensor: any) => {
          const nodeId = sensor.idNode || sensor.node?.idNode;
          if (!nodeId) return;
          if (!sensorsByNode.has(nodeId)) sensorsByNode.set(nodeId, []);
          sensorsByNode.get(nodeId)!.push(sensor);
        });

        this.assetTree = nodes.map((node: any) => {
          const nodeId = node.idNode || node.id;
          return {
            id: nodeId,
            // Node label rule: address first, fallback code
            name: node.address || node.code || node.serialNumber || 'Node',
            type: 'node' as const,
            status: this.getNodeStatus(node),
            expanded: false,
            data: node,
            children: (sensorsByNode.get(nodeId) || []).map((sensor: any) => ({
              id: sensor.idSensor || sensor.id,
              name: sensor.label || sensor.sensorCode || 'Sensor',
              type: 'sensor' as const,
              status: this.toTreeStatus(getFreshness(sensor.lastValueAt, node.telemetryIntervalSec)),
              data: sensor
            }))
          };
        });
      },
      error: (err) => {
        console.error('Failed to load nodes:', err);
        this.assetTree = [];
      }
    });
  }

  /** Shared freshness rule (shared/utils/telemetry-freshness.ts) — same as Overview & Sensors tab. */
  getNodeStatus(node: any): 'online' | 'warning' | 'offline' | 'unknown' {
    return this.toTreeStatus(getFreshness(node.lastSeenAt, node.telemetryIntervalSec));
  }

  private toTreeStatus(f: Freshness): 'online' | 'warning' | 'offline' | 'unknown' {
    switch (f) {
      case 'fresh': return 'online';
      case 'stale': return 'warning';
      case 'offline': return 'offline';
      default: return 'unknown';
    }
  }

  /**
   * Breadcrumb trail for the workspace toolbar, derived from the URL
   * (…/:projectId/<section>[/…]). Node/sensor names come from the asset tree (address first).
   */
  get breadcrumb(): { label: string; link?: any[] }[] {
    const parts = this.router.url.split('?')[0].split('/');
    const i = parts.indexOf(this.projectId);
    const section = i > -1 ? parts[i + 1] : '';
    const base = ['/iot/projects', this.projectId];
    const nav = this.navItems.find(n => n.path === section);
    if (nav) return [{ label: nav.label }];
    if (section === 'node') {
      const nodeId = parts[i + 2];
      const node = this.assetTree.find(n => n.id === nodeId);
      const trail: { label: string; link?: any[] }[] = [
        { label: 'Nodes', link: [...base, 'nodes'] },
        { label: node?.name || 'Node', link: parts[i + 3] === 'sensor' ? [...base, 'node', nodeId] : undefined }
      ];
      if (parts[i + 3] === 'sensor') {
        const sensor = node?.children?.find(c => c.id === parts[i + 4]);
        trail.push({ label: sensor?.name || 'Sensor' });
      }
      return trail;
    }
    return [];
  }

  updateSelectedAsset() {
    // Parse current route to determine selected asset
    // Strip ?query (e.g. ?channel=) so the last segment is a clean id
    const urlParts = this.router.url.split('?')[0].split('/');
    const nodeIndex = urlParts.indexOf('node');
    const sensorIndex = urlParts.indexOf('sensor');
    
    if (sensorIndex > -1 && urlParts[sensorIndex + 1]) {
      this.selectedAssetId = urlParts[sensorIndex + 1];
    } else if (nodeIndex > -1 && urlParts[nodeIndex + 1]) {
      this.selectedAssetId = urlParts[nodeIndex + 1];
    } else {
      this.selectedAssetId = this.projectId;
    }
  }
  
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('projectSidebarCollapsed', String(this.sidebarCollapsed));
  }
  
  toggleMobileSidebar() {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }
  
  closeMobileSidebar() {
    this.mobileSidebarOpen = false;
  }
  
  toggleTreeNode(node: AssetTreeNode) {
    node.expanded = !node.expanded;
    
    // Save expanded state to localStorage
    const expandedNodes = JSON.parse(localStorage.getItem('expandedNodes') || '{}');
    expandedNodes[node.id] = node.expanded;
    localStorage.setItem('expandedNodes', JSON.stringify(expandedNodes));
  }
  
  selectAsset(node: AssetTreeNode, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    
    this.selectedAssetId = node.id;
    
    // Navigate based on node type
    switch (node.type) {
      case 'project':
        this.router.navigate(['overview'], { relativeTo: this.route });
        break;
      case 'node':
        // Navigate to node detail page (singular route)
        this.router.navigate(['node', node.id], { relativeTo: this.route });
        break;
      case 'sensor':
        // Find parent node and navigate to sensor detail
        const parentNode = this.findParentNode(node.id);
        if (parentNode) {
          // Canonical sensor URL: sensor id + ?channel=<first channel> (detail page shows a channel picker)
          const channelId = node.data?.channels?.[0]?.idSensorChannel;
          this.router.navigate(['node', parentNode.id, 'sensor', node.id], {
            relativeTo: this.route,
            queryParams: channelId ? { channel: channelId } : {}
          });
        }
        break;
    }
    
    // Close mobile sidebar after navigation
    this.closeMobileSidebar();
  }
  
  findParentNode(sensorId: string): AssetTreeNode | null {
    // Search directly in assetTree (which contains nodes)
    for (const assetNode of this.assetTree) {
      // Check if this node has the sensor as child
      if (assetNode.children?.some(s => s.id === sensorId)) {
        return assetNode;
      }
    }
    return null;
  }
  
  isNavActive(path: string): boolean {
    return this.router.url.includes(`/${path}`);
  }
  
  navigateTo(path: string) {
    this.router.navigate([path], { relativeTo: this.route });
    this.closeMobileSidebar();
  }
  
  toggleNavItem(item: NavItem, event: MouseEvent) {
    event.stopPropagation();
    item.expanded = !item.expanded;
  }
  
  hasNavChildren(item: NavItem): boolean {
    return !!item.children && item.children.length > 0;
  }
  
  isDashboardActive(dashboardId: string): boolean {
    return this.router.url.includes(`/monitor/${dashboardId}`);
  }
  
  navigateToDashboard(dashboardId: string) {
    this.router.navigate(['monitor', dashboardId], { relativeTo: this.route });
    this.closeMobileSidebar();
  }
  
  // --- Layer tree methods (for map page) ---
  isOnMapPage(): boolean {
    return this.router.url.includes('/map');
  }
  
  toggleLayerGroup(groupId: string): void {
    this.layerStateService.toggleGroupExpansion(groupId);
  }
  
  toggleLayerVisibility(layerId: string, event: MouseEvent): void {
    event.stopPropagation();
    const layer = this.layerGroups
      .flatMap(g => g.layers)
      .find(l => l.id === layerId);
    if (layer) {
      this.layerStateService.toggleLayer(layerId, !layer.visible);
    }
  }
  
  toggleGroupVisibility(group: LayerGroup, event: MouseEvent): void {
    event.stopPropagation();
    const allVisible = this.isGroupAllVisible(group);
    this.layerStateService.toggleGroup(group.id, !allVisible);
  }
  
  isGroupAllVisible(group: LayerGroup): boolean {
    return group.layers.length > 0 && group.layers.every(l => l.visible);
  }
  
  getLayerIcon(layer: any): string {
    if (layer.type === 'core') {
      return layer.code === 'nodes' ? 'bi-geo-alt' : 'bi-exclamation-triangle';
    }
    if (layer.type === 'sensor-type') {
      return 'bi-broadcast';
    }
    return 'bi-vector-pen';
  }
  
  refreshLayers(): void {
    this.layerStateService.requestRefresh();
  }
  
  openAddLayerDrawer(event?: Event, type: 'operational' | 'custom' = 'custom'): void {
    if (event) {
      event.stopPropagation();
    }
    this.layerStateService.requestAddLayer(type);
  }
  
  zoomToLayer(layerId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.layerStateService.requestZoomToLayer(layerId);
  }
  
  editLayer(layerId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.layerStateService.requestEditLayer(layerId);
  }

  // Context menu handler (for right-click)
  onContextMenu(event: MouseEvent, node: AssetTreeNode) {
    event.preventDefault();
    // TODO: Implement context menu service
    console.log('Context menu for:', node);
  }
}
