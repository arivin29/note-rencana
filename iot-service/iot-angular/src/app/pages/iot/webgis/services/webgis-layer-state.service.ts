import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

// Layer state matching webgis-map LayerState interface
export interface SharedLayerState {
  id: string;
  name: string;
  type: 'core' | 'operational' | 'custom' | 'sensor-type';
  code?: string;
  visible: boolean;
  loading: boolean;
  featureCount?: number;
  style: any;
  sensorType?: {
    id: string;
    name: string;
    code: string;
    icon: string;
    unit: string;
    channelCount: number;
  };
}

export interface LayerGroup {
  id: string;
  name: string;
  icon: string;
  expanded: boolean;
  layers: SharedLayerState[];
}

@Injectable({
  providedIn: 'root'
})
export class WebGisLayerStateService {
  // Layer groups for sidebar display
  private layerGroups$ = new BehaviorSubject<LayerGroup[]>([]);
  
  // Commands from sidebar to map
  private toggleLayerCommand$ = new Subject<{ layerId: string; visible: boolean }>();
  private toggleGroupCommand$ = new Subject<{ groupId: string; visible: boolean }>();
  private refreshCommand$ = new Subject<void>();
  private addLayerCommand$ = new Subject<'operational' | 'custom'>();
  private editLayerCommand$ = new Subject<string>(); // layerId
  private zoomToLayerCommand$ = new Subject<string>(); // layerId
  
  // Loading state
  private loading$ = new BehaviorSubject<boolean>(false);
  
  // Group expansion state (persisted in sidebar)
  private groupExpansion: Record<string, boolean> = {
    core: true,
    sensors: true,
    operational: true,
    custom: true
  };

  constructor() {}

  // --- Getters for observables ---
  getLayerGroups(): Observable<LayerGroup[]> {
    return this.layerGroups$.asObservable();
  }

  getLoading(): Observable<boolean> {
    return this.loading$.asObservable();
  }

  onToggleLayer(): Observable<{ layerId: string; visible: boolean }> {
    return this.toggleLayerCommand$.asObservable();
  }

  onToggleGroup(): Observable<{ groupId: string; visible: boolean }> {
    return this.toggleGroupCommand$.asObservable();
  }

  onRefresh(): Observable<void> {
    return this.refreshCommand$.asObservable();
  }

  onAddLayer(): Observable<'operational' | 'custom'> {
    return this.addLayerCommand$.asObservable();
  }

  onEditLayer(): Observable<string> {
    return this.editLayerCommand$.asObservable();
  }

  onZoomToLayer(): Observable<string> {
    return this.zoomToLayerCommand$.asObservable();
  }

  // --- Commands from sidebar ---
  toggleLayer(layerId: string, visible: boolean): void {
    this.toggleLayerCommand$.next({ layerId, visible });
  }

  toggleGroup(groupId: string, visible: boolean): void {
    this.toggleGroupCommand$.next({ groupId, visible });
  }

  requestRefresh(): void {
    this.refreshCommand$.next();
  }

  requestAddLayer(type: 'operational' | 'custom' = 'custom'): void {
    this.addLayerCommand$.next(type);
  }

  requestEditLayer(layerId: string): void {
    this.editLayerCommand$.next(layerId);
  }

  requestZoomToLayer(layerId: string): void {
    this.zoomToLayerCommand$.next(layerId);
  }

  toggleGroupExpansion(groupId: string): void {
    this.groupExpansion[groupId] = !this.groupExpansion[groupId];
    // Update current groups with new expansion state
    const groups = this.layerGroups$.value.map(g => ({
      ...g,
      expanded: this.groupExpansion[g.id] ?? true
    }));
    this.layerGroups$.next(groups);
  }

  // --- Updates from webgis-map ---
  setLoading(loading: boolean): void {
    this.loading$.next(loading);
  }

  updateLayers(layers: SharedLayerState[]): void {
    // Group layers by type
    const coreFiltered = layers.filter(l => l.type === 'core');
    const sensorFiltered = layers.filter(l => l.type === 'sensor-type');
    const operationalFiltered = layers.filter(l => l.type === 'operational');
    const customFiltered = layers.filter(l => l.type === 'custom');

    const groups: LayerGroup[] = [];

    if (coreFiltered.length > 0) {
      groups.push({
        id: 'core',
        name: 'CORE',
        icon: 'bi-database',
        expanded: this.groupExpansion['core'] ?? true,
        layers: coreFiltered
      });
    }

    if (sensorFiltered.length > 0) {
      groups.push({
        id: 'sensors',
        name: 'SENSOR CHANNELS',
        icon: 'bi-activity',
        expanded: this.groupExpansion['sensors'] ?? true,
        layers: sensorFiltered
      });
    }

    // Always show OPERATIONAL group (user can add layers)
    groups.push({
      id: 'operational',
      name: 'OPERATIONAL',
      icon: 'bi-gear',
      expanded: this.groupExpansion['operational'] ?? true,
      layers: operationalFiltered
    });

    // Always show CUSTOM group (user can add layers)
    groups.push({
      id: 'custom',
      name: 'CUSTOM',
      icon: 'bi-layers',
      expanded: this.groupExpansion['custom'] ?? true,
      layers: customFiltered
    });

    this.layerGroups$.next(groups);
  }

  // Update single layer visibility (called when map updates layer)
  updateLayerVisibility(layerId: string, visible: boolean): void {
    const groups = this.layerGroups$.value.map(group => ({
      ...group,
      layers: group.layers.map(layer => 
        layer.id === layerId ? { ...layer, visible } : layer
      )
    }));
    this.layerGroups$.next(groups);
  }

  // Clear state when leaving map page
  clear(): void {
    this.layerGroups$.next([]);
    this.loading$.next(false);
  }
}
