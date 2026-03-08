import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style, Icon, Text } from 'ol/style';
import Select from 'ol/interaction/Select';
import Translate from 'ol/interaction/Translate';
import Collection from 'ol/Collection';
import { click } from 'ol/events/condition';
import Feature from 'ol/Feature';
import { Geometry, Point } from 'ol/geom';

import { WebGisLayersService, WebGisCoreGeoJsonService, NodesService } from '../../../../../sdk/core/services';
import { LayerResponseDto, CoreGeoJsonResponseDto } from '../../../../../sdk/core/models';
import { NodeFeature, DEFAULT_NODE_ICON, ICON_SIZE_RULES } from '../components/node-drawer/node-drawer';
import { NodeSensorData } from '../components/sensor-labels/sensor-labels';
import { AddLayerResult } from '../components/add-layer-drawer/add-layer-drawer';
import { StyleUpdateEvent, LayerStyle } from '../components/edit-layer-drawer/edit-layer-drawer';
import { AuthService } from '../../../../services/auth.service';

// Core layer definition (static, not from database)
interface CoreLayerDef {
  id: string;
  name: string;
  code: 'nodes' | 'sensors' | 'alerts';
  visible: boolean;
  style: any;
}

// Layer state for rendering
interface LayerState {
  id: string;
  name: string;
  type: 'core' | 'operational' | 'custom';
  code?: string; // For core layers
  visible: boolean;
  olLayer?: VectorLayer<any>;
  loading: boolean;
  style: any;
  // For custom layers from map_layer table
  layerData?: LayerResponseDto;
}

@Component({
  selector: 'webgis-map',
  templateUrl: './webgis-map.html',
  styleUrls: ['./webgis-map.scss'],
  standalone: false
})
export class WebgisMapPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  private map?: Map;
  private baseLayer?: TileLayer<OSM>;
  private selectInteraction?: Select;
  private highlightLayer?: VectorLayer<any>; // For selected node effect
  private translateInteraction?: Translate; // For drag-drop node position
  private dragFeature?: Feature<Geometry>; // Currently dragged feature

  // Drag mode state
  isDragMode = false;
  savingDragPosition = false;

  // Project ID (from route or default)
  projectId: string = '1414bdba-000b-4e17-b877-557136f8ef2a';

  // Core layer definitions (static)
  private coreLayerDefs: CoreLayerDef[] = [
    {
      id: 'core-nodes',
      name: 'Nodes',
      code: 'nodes',
      visible: true,
      style: { fill: '#28a745', stroke: '#ffffff', radius: 10 }
    },
    {
      id: 'core-sensors',
      name: 'Sensors',
      code: 'sensors',
      visible: false,
      style: { fill: '#0d6efd', stroke: '#ffffff', radius: 7 }
    },
    {
      id: 'core-alerts',
      name: 'Alerts',
      code: 'alerts',
      visible: true,
      style: { fill: '#dc3545', stroke: '#ffffff', radius: 12 }
    }
  ];

  // Layer management
  layers: LayerState[] = [];
  loadingLayers = false;
  error: string | null = null;

  // Group expansion state
  expandedGroups: Record<string, boolean> = {
    core: true,
    operational: true,
    custom: true
  };

  // Selected node for drawer (instead of popup)
  selectedNode: NodeFeature | null = null;
  isDrawerOpen = false;

  // Add layer drawer state
  isAddLayerDrawerOpen = false;
  addLayerType: 'operational' | 'custom' = 'operational';
  ownerId: string = '';

  // Edit layer drawer state
  isEditLayerDrawerOpen = false;
  editingLayer: LayerResponseDto | null = null;
  editingLayerProperties: string[] = [];

  // Selected feature for popup (non-node features)
  selectedFeature: any = null;
  popupPosition: { x: number; y: number } | null = null;

  // Sensor channel values for floating labels
  sensorChannelData: NodeSensorData[] = [];
  sensorLabelsVisible = false;
  loadingSensorData = false;

  // Map config
  defaultCenter: [number, number] = [106.8456, -6.2088]; // Jakarta
  defaultZoom = 10;

  // Store node features for lookup
  private nodeFeatures: globalThis.Map<string, Feature<Geometry>> = new globalThis.Map();

  constructor(
    private layersService: WebGisLayersService,
    private coreGeoJsonService: WebGisCoreGeoJsonService,
    private nodesService: NodesService,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get projectId from route param or query param
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['projectId']) {
        this.projectId = params['projectId'];
      }
    });
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['projectId']) {
        this.projectId = params['projectId'];
      }
    });
    
    // Get current owner ID
    this.ownerId = this.authService.getCurrentOwnerId() || '';
    
    this.loadLayers();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.map?.setTarget(undefined);
  }

  // Expose map instance for child components
  getMapInstance(): Map | null {
    return this.map || null;
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    // Carto Dark Matter - dark themed base map
    this.baseLayer = new TileLayer({
      source: new XYZ({
        url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attributions: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      })
    });

    // Highlight layer for selected node (pulsing effect)
    this.highlightLayer = new VectorLayer({
      source: new VectorSource(),
      style: this.createHighlightStyle(),
      zIndex: 999
    });

    this.map = new Map({
      target: this.mapContainer.nativeElement,
      layers: [this.baseLayer, this.highlightLayer],
      view: new View({
        center: fromLonLat(this.defaultCenter),
        zoom: this.defaultZoom
      })
    });

    // Setup select interaction for feature click
    this.selectInteraction = new Select({
      condition: click,
      style: null // We handle styling ourselves
    });
    this.map.addInteraction(this.selectInteraction);

    this.selectInteraction.on('select', (e) => {
      this.handleFeatureSelect(e);
    });
  }

  private handleFeatureSelect(e: any): void {
    // Clear previous selection
    this.highlightLayer?.getSource()?.clear();
    
    if (e.selected.length > 0) {
      const feature = e.selected[0];
      const props = feature.getProperties();
      
      // Check if this is a node feature (has 'code' and belongs to nodes layer)
      const layerCode = this.getFeatureLayerCode(feature);
      
      if (layerCode === 'nodes') {
        // Handle node selection - open drawer
        this.selectedNode = {
          id: feature.getId() as string,
          code: props.code,
          name: props.name,
          address: props.address,
          city: props.city,
          province: props.province,
          description: props.description,
          connectivityStatus: props.connectivityStatus,
          status: props.status,
          lastSeenAt: props.lastSeenAt,
          iconUrl: props.iconUrl,
          serialNumber: props.serialNumber,
          firmwareVersion: props.firmwareVersion,
          modelName: props.modelName,
          manufacturer: props.manufacturer,
          picName: props.picName,
          picPhone: props.picPhone,
          hasCoordinates: props.hasCoordinates
        };
        this.isDrawerOpen = true;
        
        // Add highlight effect
        this.addHighlightToFeature(feature);
        
        // Close popup if open
        this.selectedFeature = null;
        this.popupPosition = null;
      } else if (layerCode === 'sensors') {
        // Sensor clicked - open drawer with parent node info
        const nodeFeature = this.findNodeFeatureByCode(props.nodeCode);
        if (nodeFeature) {
          const nodeProps = nodeFeature.getProperties();
          this.selectedNode = {
            id: nodeFeature.getId() as string,
            code: nodeProps['code'],
            name: nodeProps['name'],
            address: nodeProps['address'],
            city: nodeProps['city'],
            province: nodeProps['province'],
            description: nodeProps['description'],
            connectivityStatus: nodeProps['connectivityStatus'],
            status: nodeProps['status'],
            lastSeenAt: nodeProps['lastSeenAt'],
            iconUrl: nodeProps['iconUrl'],
            serialNumber: nodeProps['serialNumber'],
            firmwareVersion: nodeProps['firmwareVersion'],
            modelName: nodeProps['modelName'],
            manufacturer: nodeProps['manufacturer'],
            picName: nodeProps['picName'],
            picPhone: nodeProps['picPhone'],
            hasCoordinates: nodeProps['hasCoordinates']
          };
          this.isDrawerOpen = true;
          
          // Add highlight effect to the node
          this.addHighlightToFeature(nodeFeature);
          
          // Close popup if open
          this.selectedFeature = null;
          this.popupPosition = null;
        }
        // Clear sensor selection
        this.selectInteraction?.getFeatures().clear();
      } else {
        // Non-node/sensor feature - show popup
        const displayProps = { ...props };
        delete displayProps['geometry'];
        this.selectedFeature = displayProps;

        // Get pixel position for popup
        const geometry = feature.getGeometry();
        if (geometry) {
          const extent = geometry.getExtent();
          const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
          const pixel = this.map!.getPixelFromCoordinate(center);
          this.popupPosition = { x: pixel[0], y: pixel[1] };
        }
        
        // Close drawer if open
        this.closeDrawer();
      }
    } else {
      this.selectedFeature = null;
      this.popupPosition = null;
    }
  }

  private findNodeIdByCode(nodeCode: string): string | null {
    // Find node ID from nodes layer by nodeCode
    const nodesLayerState = this.layers.find(l => l.code === 'nodes');
    if (!nodesLayerState?.olLayer) return null;
    
    const source = nodesLayerState.olLayer.getSource();
    if (!source) return null;
    
    const features = source.getFeatures();
    for (const feature of features) {
      if (feature.get('code') === nodeCode) {
        return feature.getId() as string;
      }
    }
    return null;
  }

  private findNodeFeatureByCode(nodeCode: string): Feature<Geometry> | null {
    // Find node feature from nodes layer by nodeCode
    const nodesLayerState = this.layers.find(l => l.code === 'nodes');
    if (!nodesLayerState?.olLayer) return null;
    
    const source = nodesLayerState.olLayer.getSource();
    if (!source) return null;
    
    const features = source.getFeatures();
    for (const feature of features) {
      if (feature.get('code') === nodeCode) {
        return feature;
      }
    }
    return null;
  }

  private getFeatureLayerCode(feature: Feature<Geometry>): string | null {
    // Find which layer this feature belongs to
    for (const layerState of this.layers) {
      if (layerState.olLayer && layerState.code) {
        const source = layerState.olLayer.getSource();
        if (source && source.hasFeature(feature)) {
          return layerState.code;
        }
      }
    }
    return null;
  }

  private addHighlightToFeature(feature: Feature<Geometry>): void {
    const geometry = feature.getGeometry();
    if (!geometry || !this.highlightLayer) return;

    // Create a highlight feature at the same location
    const highlightFeature = new Feature({
      geometry: geometry.clone()
    });
    this.highlightLayer.getSource()?.addFeature(highlightFeature);
  }

  private createHighlightStyle(): Style[] {
    // Pulsing ring effect for selected node - optimized for dark map
    return [
      // Outer glow
      new Style({
        image: new CircleStyle({
          radius: 28,
          fill: new Fill({
            color: 'rgba(59, 130, 246, 0.2)'
          })
        })
      }),
      // Inner ring
      new Style({
        image: new CircleStyle({
          radius: 20,
          stroke: new Stroke({
            color: 'rgba(59, 130, 246, 0.9)',
            width: 3
          }),
          fill: new Fill({
            color: 'rgba(59, 130, 246, 0.15)'
          })
        })
      })
    ];
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
    this.selectedNode = null;
    this.highlightLayer?.getSource()?.clear();
    this.selectInteraction?.getFeatures().clear();
    this.cancelDragMode(); // Also cancel drag mode when closing drawer
  }

  // ========== Drag Mode for Moving Nodes ==========
  
  startDragMode(): void {
    if (!this.map || !this.selectedNode) return;
    
    // Find the feature for the selected node
    const nodesLayer = this.layers.find(l => l.code === 'nodes');
    if (!nodesLayer?.olLayer) return;
    
    const source = nodesLayer.olLayer.getSource();
    const feature = source?.getFeatures().find((f: Feature<Geometry>) => f.getId() === this.selectedNode?.id);
    
    if (!feature) return;
    
    this.isDragMode = true;
    this.dragFeature = feature;
    
    // Create translate interaction with only the selected feature
    const featuresCollection = new Collection([feature]);
    this.translateInteraction = new Translate({
      features: featuresCollection
    });
    
    // Listen for drag end
    this.translateInteraction.on('translateend', (e) => {
      this.onDragEnd(e);
    });
    
    this.map.addInteraction(this.translateInteraction);
    
    // Disable select interaction during drag
    if (this.selectInteraction) {
      this.selectInteraction.setActive(false);
    }
  }
  
  cancelDragMode(): void {
    if (!this.isDragMode) return;
    
    this.isDragMode = false;
    this.dragFeature = undefined;
    
    // Remove translate interaction
    if (this.translateInteraction && this.map) {
      this.map.removeInteraction(this.translateInteraction);
      this.translateInteraction = undefined;
    }
    
    // Re-enable select interaction
    if (this.selectInteraction) {
      this.selectInteraction.setActive(true);
    }
  }
  
  private onDragEnd(event: any): void {
    if (!this.dragFeature || !this.selectedNode) return;
    
    // Get new coordinates
    const geometry = this.dragFeature.getGeometry();
    if (!geometry || !(geometry instanceof Point)) return;
    
    const coords = geometry.getCoordinates();
    const [lon, lat] = toLonLat(coords);
    
    // Save new position
    this.savingDragPosition = true;
    
    this.nodesService.nodesControllerUpdate({
      id: this.selectedNode.id,
      body: {
        latitude: lat,
        longitude: lon
      }
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingDragPosition = false;
        // Update local node data
        if (this.selectedNode) {
          this.selectedNode.hasCoordinates = true;
        }
        // Exit drag mode
        this.cancelDragMode();
        // Show success feedback (the node is already at new position visually)
      },
      error: (err) => {
        console.error('Failed to save position:', err);
        this.savingDragPosition = false;
        // Revert position by reloading layer
        this.onNodeUpdated();
        this.cancelDragMode();
      }
    });
  }

  onNodeCoordinatesUpdated(event: { nodeId: string; lat: number; lon: number }): void {
    // Refresh the nodes layer
    const nodesLayer = this.layers.find(l => l.code === 'nodes');
    if (nodesLayer && nodesLayer.olLayer) {
      // Remove old layer
      this.map?.removeLayer(nodesLayer.olLayer);
      nodesLayer.olLayer = undefined;
      // Reload
      this.loadCoreLayerGeoJSON(nodesLayer);
    }
  }

  onNodeIconUpdated(event: { nodeId: string; iconUrl: string }): void {
    // Refresh the nodes layer to show new icon
    this.onNodeCoordinatesUpdated({ nodeId: event.nodeId, lat: 0, lon: 0 });
  }

  onNodeUpdated(): void {
    // General refresh after any node update
    const nodesLayer = this.layers.find(l => l.code === 'nodes');
    if (nodesLayer && nodesLayer.olLayer) {
      this.map?.removeLayer(nodesLayer.olLayer);
      nodesLayer.olLayer = undefined;
      this.loadCoreLayerGeoJSON(nodesLayer);
    }
  }

  loadLayers(): void {
    this.loadingLayers = true;
    this.error = null;

    // Initialize core layers from static definitions
    const coreLayers: LayerState[] = this.coreLayerDefs.map(def => ({
      id: def.id,
      name: def.name,
      type: 'core' as const,
      code: def.code,
      visible: def.visible,
      loading: false,
      style: def.style
    }));

    // Load custom/operational layers from map_layer table (excluding core type)
    const params: any = { projectId: this.projectId };

    this.layersService.layersControllerFindAll(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Filter out core layers from DB (we use static definitions)
          const customLayers: LayerState[] = response.data
            .filter(layer => layer.layerType !== 'core')
            .map(layer => ({
              id: layer.idLayer,
              name: layer.layerName,
              type: layer.layerType as 'operational' | 'custom',
              visible: layer.isVisibleDefault,
              loading: false,
              style: layer.styleJson || {},
              layerData: layer
            }));

          // Combine: core first, then operational, then custom
          this.layers = [...coreLayers, ...customLayers];
          this.loadingLayers = false;

          // Load visible core layers' GeoJSON
          this.layers
            .filter(l => l.type === 'core' && l.visible)
            .forEach(l => this.loadCoreLayerGeoJSON(l));

          // Load visible custom layers' GeoJSON
          this.layers
            .filter(l => l.type !== 'core' && l.visible && l.layerData)
            .forEach(l => this.loadCustomLayerGeoJSON(l));
        },
        error: (err: any) => {
          // Even if custom layers fail, still show core layers
          this.layers = coreLayers;
          this.loadingLayers = false;
          
          // Load visible core layers
          this.layers
            .filter(l => l.type === 'core' && l.visible)
            .forEach(l => this.loadCoreLayerGeoJSON(l));
        }
      });
  }

  // Get layers filtered by type, sorted by displayOrder
  getLayersByType(type: 'core' | 'operational' | 'custom'): LayerState[] {
    return this.layers
      .filter(l => l.type === type)
      .sort((a, b) => {
        const orderA = a.layerData?.displayOrder ?? 999;
        const orderB = b.layerData?.displayOrder ?? 999;
        return orderA - orderB;
      });
  }

  // Toggle group expand/collapse
  toggleGroup(group: string): void {
    this.expandedGroups[group] = !this.expandedGroups[group];
  }

  // Open add layer drawer
  addLayer(type: 'operational' | 'custom'): void {
    this.addLayerType = type;
    this.isAddLayerDrawerOpen = true;
    // Close node drawer if open
    this.isDrawerOpen = false;
  }

  // Handle layer added event from drawer
  onLayerAdded(result: AddLayerResult): void {
    console.log('Layer added:', result);
    // Refresh layer list
    this.loadLayers();
  }

  // Close add layer drawer
  closeAddLayerDrawer(): void {
    this.isAddLayerDrawerOpen = false;
  }

  // --- Edit Layer Drawer Methods ---
  
  // Open edit layer drawer
  editLayer(layerState: LayerState, event: Event): void {
    event.stopPropagation();
    if (!layerState.layerData) return;
    
    this.editingLayer = layerState.layerData;
    
    // Extract properties from loaded features
    this.editingLayerProperties = [];
    if (layerState.olLayer) {
      const source = layerState.olLayer.getSource();
      if (source) {
        const features = source.getFeatures();
        if (features.length > 0) {
          const allProps = new Set<string>();
          features.forEach((f: Feature<Geometry>) => {
            const props = f.getProperties();
            Object.keys(props).forEach(k => {
              // Skip geometry and internal properties
              if (k !== 'geometry' && !k.startsWith('_')) {
                allProps.add(k);
              }
            });
          });
          this.editingLayerProperties = Array.from(allProps);
        }
      }
    }
    
    // Fallback to configJson.properties if no features loaded
    if (this.editingLayerProperties.length === 0) {
      const config = layerState.layerData.configJson as any;
      if (config?.properties) {
        this.editingLayerProperties = config.properties;
      }
    }
    
    this.isEditLayerDrawerOpen = true;
    
    // Close other drawers
    this.isAddLayerDrawerOpen = false;
    this.isDrawerOpen = false;
  }

  // Close edit layer drawer
  closeEditLayerDrawer(): void {
    this.isEditLayerDrawerOpen = false;
    this.editingLayer = null;
  }

  // Handle style update from edit drawer (real-time preview)
  onLayerStyleUpdated(event: StyleUpdateEvent): void {
    // Find the layer state for this layer
    const layerState = this.layers.find(
      (ls: LayerState) => ls.layerData?.idLayer === event.layerId
    );
    
    if (!layerState?.olLayer) return;
    
    // Apply new style to the OpenLayers layer
    const style = this.createStyleFromLayerStyle(event.style);
    (layerState.olLayer as VectorLayer<any>).setStyle(style);
  }

  // Handle style saved from edit drawer - update layer list
  onLayerStyleSaved(updatedLayer: LayerResponseDto): void {
    // Find and update the layer state
    const layerState = this.layers.find(
      (ls: LayerState) => ls.layerData?.idLayer === updatedLayer.idLayer
    );
    
    if (layerState) {
      // Update the layer data with new values from server
      layerState.layerData = updatedLayer;
      layerState.style = updatedLayer.styleJson || {};
      
      console.log('Layer style saved and updated:', updatedLayer.layerName, updatedLayer.styleJson);
    }
    
    // Also update editingLayer so next open shows correct data
    if (this.editingLayer?.idLayer === updatedLayer.idLayer) {
      this.editingLayer = updatedLayer;
    }
  }

  // Handle layer deleted from edit drawer
  onLayerDeleted(idLayer: string): void {
    // Find and remove the layer state
    const index = this.layers.findIndex(
      (ls: LayerState) => ls.layerData?.idLayer === idLayer
    );
    
    if (index >= 0) {
      const layerState = this.layers[index];
      if (layerState.olLayer) {
        this.map?.removeLayer(layerState.olLayer);
      }
      this.layers.splice(index, 1);
    }
    
    this.closeEditLayerDrawer();
  }

  // Zoom to layer extent
  zoomToLayer(layerState: LayerState, event: Event): void {
    event.stopPropagation();
    if (!layerState.olLayer) return;
    
    const source = (layerState.olLayer as VectorLayer<any>).getSource();
    if (!source) return;
    
    const extent = source.getExtent();
    if (extent && extent[0] !== Infinity) {
      this.map?.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 500
      });
    }
  }

  // Create OpenLayers style from LayerStyle interface
  // Returns a style function for data-driven styling
  private createStyleFromLayerStyle(layerStyle: LayerStyle): any {
    // If data-driven styling is enabled, return a function
    if (layerStyle.strokeWidthByField?.enabled || layerStyle.colorByField?.enabled) {
      return (feature: Feature<Geometry>) => {
        const props = feature.getProperties();
        
        // Calculate stroke width
        let strokeWidth = layerStyle.strokeWidth;
        if (layerStyle.strokeWidthByField?.enabled && layerStyle.strokeWidthByField.field) {
          const fieldValue = parseFloat(props[layerStyle.strokeWidthByField.field]) || 0;
          const base = layerStyle.strokeWidthByField.baseWidth;
          const factor = layerStyle.strokeWidthByField.factor || 1;
          
          if (layerStyle.strokeWidthByField.operation === 'multiply') {
            strokeWidth = base + (fieldValue * factor);
          } else {
            strokeWidth = base + (factor > 0 ? fieldValue / factor : 0);
          }
          // Clamp to reasonable range
          strokeWidth = Math.max(0.5, Math.min(20, strokeWidth));
        }
        
        // Calculate fill/stroke color
        let fillColor = layerStyle.fillColor;
        let strokeColor = layerStyle.strokeColor;
        if (layerStyle.colorByField?.enabled && layerStyle.colorByField.field) {
          const fieldValue = String(props[layerStyle.colorByField.field] || '');
          const mapping = layerStyle.colorByField.mappings?.find(m => m.value === fieldValue);
          if (mapping) {
            fillColor = mapping.color;
            strokeColor = mapping.color;
          } else {
            fillColor = layerStyle.colorByField.defaultColor || layerStyle.fillColor;
            strokeColor = layerStyle.colorByField.defaultColor || layerStyle.strokeColor;
          }
        }
        
        const fill = new Fill({
          color: this.hexToRgba(fillColor, layerStyle.fillOpacity)
        });
        
        const stroke = new Stroke({
          color: this.hexToRgba(strokeColor, layerStyle.strokeOpacity),
          width: strokeWidth
        });
        
        // Build label text from multiple fields
        let labelText = '';
        if (layerStyle.labelFields && layerStyle.labelFields.length > 0) {
          labelText = layerStyle.labelFields
            .map(f => props[f] !== undefined ? String(props[f]) : '')
            .filter(v => v !== '')
            .join(' | ');
        }
        
        return new Style({
          fill,
          stroke,
          image: new CircleStyle({
            radius: layerStyle.pointRadius,
            fill,
            stroke
          }),
          text: labelText ? new Text({
            text: labelText,
            font: `${layerStyle.labelSize}px sans-serif`,
            fill: new Fill({ color: layerStyle.labelColor }),
            stroke: new Stroke({ color: '#000000', width: 2 }),
            offsetY: -(layerStyle.pointRadius + 10)
          }) : undefined
        });
      };
    }
    
    // Static style (no data-driven features)
    const fill = new Fill({
      color: this.hexToRgba(layerStyle.fillColor, layerStyle.fillOpacity)
    });
    
    const stroke = new Stroke({
      color: this.hexToRgba(layerStyle.strokeColor, layerStyle.strokeOpacity),
      width: layerStyle.strokeWidth
    });
    
    // Build label text getter for multiple fields
    const labelFields = layerStyle.labelFields || [];
    
    if (labelFields.length > 0) {
      return (feature: Feature<Geometry>) => {
        const props = feature.getProperties();
        const labelText = labelFields
          .map(f => props[f] !== undefined ? String(props[f]) : '')
          .filter(v => v !== '')
          .join(' | ');
        
        return new Style({
          fill,
          stroke,
          image: new CircleStyle({
            radius: layerStyle.pointRadius,
            fill,
            stroke
          }),
          text: labelText ? new Text({
            text: labelText,
            font: `${layerStyle.labelSize}px sans-serif`,
            fill: new Fill({ color: layerStyle.labelColor }),
            stroke: new Stroke({ color: '#000000', width: 2 }),
            offsetY: -(layerStyle.pointRadius + 10)
          }) : undefined
        });
      };
    }
    
    return new Style({
      fill,
      stroke,
      image: new CircleStyle({
        radius: layerStyle.pointRadius,
        fill,
        stroke
      })
    });
  }

  // Helper to convert hex color to rgba
  private hexToRgba(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  toggleLayer(layerState: LayerState): void {
    layerState.visible = !layerState.visible;

    if (layerState.visible) {
      if (!layerState.olLayer) {
        if (layerState.type === 'core') {
          this.loadCoreLayerGeoJSON(layerState);
        } else if (layerState.layerData) {
          this.loadCustomLayerGeoJSON(layerState);
        }
      } else {
        layerState.olLayer.setVisible(true);
      }

      // Load sensor channel values when sensors layer is shown
      if (layerState.code === 'sensors') {
        this.loadSensorChannelValues();
      }
    } else {
      layerState.olLayer?.setVisible(false);
      
      // Hide sensor labels when sensors layer is hidden
      if (layerState.code === 'sensors') {
        this.sensorLabelsVisible = false;
      }
    }
  }

  private loadSensorChannelValues(): void {
    this.loadingSensorData = true;
    
    this.coreGeoJsonService.coreGeoJsonControllerGetSensorChannelValues({
      projectId: this.projectId
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any[]) => {
        this.sensorChannelData = data;
        this.sensorLabelsVisible = true;
        this.loadingSensorData = false;
      },
      error: (err: any) => {
        console.error('Failed to load sensor channel values:', err);
        this.loadingSensorData = false;
      }
    });
  }

  private loadCoreLayerGeoJSON(layerState: LayerState): void {
    if (!layerState.code) return;
    
    layerState.loading = true;
    console.log('Loading core GeoJSON for:', layerState.name);

    let geoJsonObs;
    switch (layerState.code) {
      case 'nodes':
        geoJsonObs = this.coreGeoJsonService.coreGeoJsonControllerGetNodesGeoJson({ projectId: this.projectId });
        break;
      case 'sensors':
        geoJsonObs = this.coreGeoJsonService.coreGeoJsonControllerGetSensorsGeoJson({ projectId: this.projectId });
        break;
      case 'alerts':
        geoJsonObs = this.coreGeoJsonService.coreGeoJsonControllerGetAlertsGeoJson({ projectId: this.projectId });
        break;
      default:
        layerState.loading = false;
        return;
    }

    geoJsonObs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (geoJson: CoreGeoJsonResponseDto) => {
        console.log('Core GeoJSON received for', layerState.name, ':', geoJson);
        this.addLayerToMap(layerState, geoJson as any);
        layerState.loading = false;
      },
      error: (err) => {
        console.error('Error loading core GeoJSON for', layerState.name, ':', err);
        layerState.loading = false;
      }
    });
  }

  private loadCustomLayerGeoJSON(layerState: LayerState): void {
    if (!layerState.layerData) return;
    
    layerState.loading = true;
    console.log('Loading custom GeoJSON for:', layerState.name);

    this.layersService.layersControllerGetGeoJson({ id: layerState.layerData.idLayer })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (geoJson: any) => {
          console.log('Custom GeoJSON received for', layerState.name, ':', geoJson);
          this.addLayerToMap(layerState, geoJson);
          layerState.loading = false;
        },
        error: (err) => {
          console.error('Error loading custom GeoJSON for', layerState.name, ':', err);
          layerState.loading = false;
        }
      });
  }

  private addLayerToMap(layerState: LayerState, geoJson: any): void {
    if (!this.map) {
      console.warn('Map not initialized');
      return;
    }

    console.log('Adding layer to map:', layerState.name, 'Features count:', geoJson.features?.length);

    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(geoJson, {
        featureProjection: 'EPSG:3857'
      })
    });

    console.log('Vector source features count:', vectorSource.getFeatures().length);

    // Use dynamic style function for nodes layer to support per-feature icons
    let styleFunc: any;
    if (layerState.code === 'nodes') {
      styleFunc = this.createNodeStyleFunction();
    } else {
      // Handle nested styleJson format and use createStyleFromLayerStyle for data-driven styling
      let styleConfig = layerState.style || {};
      // Fix nested styleJson (legacy bug)
      if (styleConfig.styleJson && !styleConfig.fillColor) {
        styleConfig = styleConfig.styleJson;
      }
      
      // Use createStyleFromLayerStyle for operational/custom layers with new style format
      if (styleConfig.fillColor || styleConfig.strokeColor) {
        const layerStyle = {
          fillColor: styleConfig.fillColor || '#6366f1',
          fillOpacity: styleConfig.fillOpacity ?? 0.3,
          strokeColor: styleConfig.strokeColor || '#6366f1',
          strokeWidth: styleConfig.strokeWidth ?? 2,
          strokeOpacity: styleConfig.strokeOpacity ?? 1,
          pointRadius: styleConfig.pointRadius ?? 6,
          pointShape: styleConfig.pointShape || 'circle',
          labelFields: styleConfig.labelFields || [],
          labelColor: styleConfig.labelColor || '#ffffff',
          labelSize: styleConfig.labelSize ?? 12,
          strokeWidthByField: styleConfig.strokeWidthByField,
          colorByField: styleConfig.colorByField
        };
        styleFunc = this.createStyleFromLayerStyle(layerStyle);
      } else {
        styleFunc = this.createStyleFromConfig(styleConfig);
      }
    }

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: styleFunc,
      visible: layerState.visible
    });

    this.map.addLayer(vectorLayer);
    layerState.olLayer = vectorLayer;

    // Fit to layer extent if first layer
    if (this.layers.filter(l => l.olLayer).length === 1) {
      const extent = vectorSource.getExtent();
      console.log('Fitting to extent:', extent);
      if (extent && extent[0] !== Infinity) {
        this.map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 15 });
      }
    }
  }

  // Create a style function for nodes that supports per-feature icons
  private createNodeStyleFunction(): (feature: Feature<Geometry>) => Style[] {
    const defaultIconUrl = DEFAULT_NODE_ICON;
    const iconCache: globalThis.Map<string, Style[]> = new globalThis.Map();
    
    return (feature: Feature<Geometry>): Style[] => {
      const props = feature.getProperties();
      const iconUrl = props['iconUrl'] || defaultIconUrl;
      const status = props['connectivityStatus'] || 'offline';
      
      // Cache key includes icon URL and status
      const cacheKey = `${iconUrl}-${status}`;
      
      if (iconCache.has(cacheKey)) {
        return iconCache.get(cacheKey)!;
      }
      
      // Status-based colors with glow
      let statusColor = '#6c757d'; // default gray
      let glowColor = 'rgba(108, 117, 125, 0.4)';
      if (status === 'online') {
        statusColor = '#10b981';
        glowColor = 'rgba(16, 185, 129, 0.5)';
      } else if (status === 'degraded') {
        statusColor = '#f59e0b';
        glowColor = 'rgba(245, 158, 11, 0.5)';
      } else if (status === 'offline') {
        statusColor = '#ef4444';
        glowColor = 'rgba(239, 68, 68, 0.5)';
      }
      
      let styles: Style[];
      
      if (iconUrl && iconUrl !== defaultIconUrl) {
        // Custom icon with glow
        styles = [
          // Glow layer
          new Style({
            image: new CircleStyle({
              radius: 18,
              fill: new Fill({ color: glowColor })
            })
          }),
          // Main icon
          new Style({
            image: new Icon({
              src: iconUrl,
              scale: 1,
              anchor: [0.5, 1]
            })
          })
        ];
      } else {
        // Default circle marker with status color and glow effect
        styles = [
          // Outer glow layer
          new Style({
            image: new CircleStyle({
              radius: 16,
              fill: new Fill({ color: glowColor })
            })
          }),
          // Main circle
          new Style({
            image: new CircleStyle({
              radius: 10,
              stroke: new Stroke({
                color: '#ffffff',
                width: 2.5
              }),
              fill: new Fill({
                color: statusColor
              })
            }),
            // Label with dark-map-friendly styling
            text: new Text({
              text: props['code'] || '',
              font: 'bold 11px Inter, sans-serif',
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.7)', width: 3 }),
              offsetY: -22,
              padding: [2, 4, 2, 4]
            })
          })
        ];
      }
      
      iconCache.set(cacheKey, styles);
      return styles;
    };
  }

  private createStyleFromConfig(styleJson: any): Style {
    const config = styleJson || {};

    // Point style
    if (config.iconUrl) {
      return new Style({
        image: new Icon({
          src: config.iconUrl,
          scale: config.iconScale || 1
        })
      });
    }

    // Circle marker
    return new Style({
      image: new CircleStyle({
        radius: config.radius || 8,
        stroke: new Stroke({
          color: config.stroke || '#ffffff',
          width: config.strokeWidth || 2
        }),
        fill: new Fill({
          color: config.fill || '#0d6efd'
        })
      }),
      stroke: new Stroke({
        color: config.stroke || '#3388ff',
        width: config.strokeWidth || 3
      }),
      fill: new Fill({
        color: config.fill || 'rgba(51, 136, 255, 0.2)'
      }),
      text: config.labelField ? new Text({
        text: '',  // Will be set per feature
        font: config.labelFont || '12px sans-serif',
        fill: new Fill({ color: config.labelColor || '#000' }),
        offsetY: -15
      }) : undefined
    });
  }

  closePopup(): void {
    this.selectedFeature = null;
    this.popupPosition = null;
    this.selectInteraction?.getFeatures().clear();
  }

  zoomIn(): void {
    const view = this.map?.getView();
    if (view) {
      view.animate({ zoom: (view.getZoom() || 10) + 1, duration: 250 });
    }
  }

  zoomOut(): void {
    const view = this.map?.getView();
    if (view) {
      view.animate({ zoom: (view.getZoom() || 10) - 1, duration: 250 });
    }
  }

  fitToAllLayers(): void {
    if (!this.map) return;

    const allExtents: number[][] = [];
    this.layers.forEach(l => {
      if (l.olLayer && l.visible) {
        const extent = l.olLayer.getSource()?.getExtent();
        if (extent && extent[0] !== Infinity) {
          allExtents.push(extent);
        }
      }
    });

    if (allExtents.length > 0) {
      const combined = allExtents.reduce((acc, ext) => [
        Math.min(acc[0], ext[0]),
        Math.min(acc[1], ext[1]),
        Math.max(acc[2], ext[2]),
        Math.max(acc[3], ext[3])
      ]);
      this.map.getView().fit(combined, { padding: [50, 50, 50, 50], maxZoom: 15 });
    }
  }
}
