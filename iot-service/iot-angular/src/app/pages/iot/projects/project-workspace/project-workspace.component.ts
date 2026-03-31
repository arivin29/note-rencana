import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppSettings } from '../../../../service/app-settings.service';
import { ProjectsService } from '../../../../../sdk/core/services/projects.service';
import { NodesService } from '../../../../../sdk/core/services/nodes.service';
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
    private widgetBuilderService: WidgetBuilderService,
    public layerStateService: WebGisLayerStateService
  ) {}
  
  ngOnInit() {
    // Store previous state and enable minified sidebar mode for project workspace
    this.previousMinifiedState = this.appSettings.appSidebarMinified;
    this.appSettings.appSidebarMinified = true;
    
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
  
  buildAssetTree(project: any) {
    // Load nodes for this project (limit 30 to get all nodes)
    this.nodesService.nodesControllerFindAll$Response({ idProject: this.projectId, limit: 30 })
      .subscribe({
        next: (res) => {
          // Handle different response formats
          const body: any = res.body;
          let nodes: any[] = [];
          
          try {
            if (Array.isArray(body)) {
              nodes = body;
            } else if (body && typeof body === 'object') {
              nodes = body.data || [];
            } else if (typeof body === 'string') {
              const parsed = JSON.parse(body);
              nodes = Array.isArray(parsed) ? parsed : (parsed?.data || []);
            }
          } catch (e) {
            console.error('Error parsing nodes response:', e);
            nodes = [];
          }
          
          console.log('Loaded nodes:', nodes.length, nodes);
          
          if (nodes.length === 0) {
            this.assetTree = [];
            return;
          }
          
          // Load sensors for each node
          const sensorRequests = nodes.map(node => {
            const nodeId = node.idNode || node.id;
            return this.nodesService.nodesControllerGetSensors$Response({ id: nodeId }).pipe(
              map((sRes: any) => {
                // Handle different response formats for sensors
                const sBody = sRes.body;
                let sensors: any[] = [];
                try {
                  if (Array.isArray(sBody)) {
                    sensors = sBody;
                  } else if (sBody && typeof sBody === 'object') {
                    sensors = (sBody as any).data || [];
                  } else if (typeof sBody === 'string') {
                    const parsed = JSON.parse(sBody);
                    sensors = Array.isArray(parsed) ? parsed : (parsed?.data || []);
                  }
                } catch (e) {
                  sensors = [];
                }
                return { nodeId, sensors };
              }),
              catchError(err => {
                console.warn(`Failed to load sensors for node ${nodeId}:`, err);
                return of({ nodeId, sensors: [] });
              })
            );
          });
          
          forkJoin(sensorRequests).subscribe({
            next: (sensorResults) => {
              // Build sensor map
              const sensorMap = new Map<string, any[]>();
              sensorResults.forEach(r => sensorMap.set(r.nodeId, r.sensors));
              
              // Build asset tree - just nodes without project wrapper
              this.assetTree = nodes.map(node => {
                const nodeId = node.idNode || node.id;
                const nodeSensors = sensorMap.get(nodeId) || [];
                
                // Prefer address, then name, then code/serialNumber
                const nodeName = node.address || node.name || node.code || node.serialNumber || 'Node';
                
                return {
                  id: nodeId,
                  name: nodeName,
                  type: 'node' as const,
                  status: this.getNodeStatus(node),
                  expanded: false,
                  data: node,
                  children: nodeSensors.map((sensor: any) => ({
                    id: sensor.idSensor || sensor.id,
                    name: sensor.label || sensor.code || sensor.name || 'Sensor',
                    type: 'sensor' as const,
                    status: this.getNodeStatus(node),
                    data: sensor
                  }))
                };
              });
              
              console.log('Asset tree built:', this.assetTree);
            },
            error: (err) => {
              console.error('Failed to load sensors:', err);
              // Build tree without sensors
              this.assetTree = nodes.map(node => ({
                id: node.idNode || node.id,
                name: node.name || node.nodeCode || 'Node',
                type: 'node' as const,
                status: this.getNodeStatus(node),
                expanded: false,
                data: node,
                children: []
              }));
            }
          });
        },
        error: (err) => {
          console.error('Failed to load nodes:', err);
          this.assetTree = [];
        }
      });
  }
  
  getNodeStatus(node: any): 'online' | 'warning' | 'offline' | 'unknown' {
    if (!node.lastSeenAt) return 'unknown';
    
    const lastSeen = new Date(node.lastSeenAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'warning';
    return 'offline';
  }
  
  updateSelectedAsset() {
    // Parse current route to determine selected asset
    const urlParts = this.router.url.split('/');
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
          this.router.navigate(['node', parentNode.id, 'sensor', node.id], { relativeTo: this.route });
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
