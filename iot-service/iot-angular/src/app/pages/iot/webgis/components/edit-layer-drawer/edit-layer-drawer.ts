import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import KML from 'ol/format/KML';
import GeoJSON from 'ol/format/GeoJSON';
import { DocumentsService, WebGisLayersService } from '../../../../../../sdk/core/services';
import { LayerResponseDto } from '../../../../../../sdk/core/models/layer-response-dto';
import { UpdateStyleDto } from '../../../../../../sdk/core/models/update-style-dto';

export interface ReplaceDataInfo {
  featureCount: number;
  geometryType: string;
  properties: string[];
  bounds: [number, number, number, number] | null;
  warnings: string[];
  errors: string[];
}

export interface LayerStyle {
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  pointRadius: number;
  pointShape: 'circle' | 'square' | 'triangle' | 'star';
  // Multi-select label fields
  labelFields: string[];
  labelColor: string;
  labelSize: number;
  // Data-driven stroke width
  strokeWidthByField?: {
    enabled: boolean;
    field: string;
    operation: 'multiply' | 'divide';
    factor: number;
    baseWidth: number;
  };
  // Data-driven color by field value
  colorByField?: {
    enabled: boolean;
    field: string;
    mappings: { value: string; color: string }[];
    defaultColor: string;
  };
  // Zoom level visibility
  minZoom?: number; // min zoom to show layer (hide when zoomed out)
  maxZoom?: number; // max zoom to show layer (hide when zoomed in)
  labelMinZoom?: number; // min zoom to show labels
}

export interface StyleUpdateEvent {
  layerId: string;
  style: LayerStyle;
}

@Component({
  selector: 'edit-layer-drawer',
  templateUrl: './edit-layer-drawer.html',
  styleUrls: ['./edit-layer-drawer.scss'],
  standalone: false
})
export class EditLayerDrawerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Input() layer: LayerResponseDto | null = null;
  @Input() properties: string[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() styleUpdated = new EventEmitter<StyleUpdateEvent>();
  @Output() styleSaved = new EventEmitter<LayerResponseDto>();
  @Output() layerDeleted = new EventEmitter<string>();
  @Output() dataReplaced = new EventEmitter<LayerResponseDto>();

  private destroy$ = new Subject<void>();

  styleForm!: FormGroup;
  
  // Available properties from layer config
  availableProperties: string[] = [];
  numberProperties: string[] = [];
  
  // For color by field
  uniqueFieldValues: string[] = [];
  colorMappings: { value: string; color: string }[] = [];
  
  // Selected label fields (multi-select)
  selectedLabelFields: string[] = [];
  
  // States
  isSaving = false;
  isDeleting = false;
  saveError: string = '';

  // Replace-data (re-upload GeoJSON/KML) state
  replaceFile: File | null = null;
  replaceParsedGeoJson: any = null;
  replaceInfo: ReplaceDataInfo | null = null;
  replaceError: string = '';
  isReplacing = false;
  
  // Operations for data-driven width
  widthOperations = [
    { value: 'multiply', label: 'Kalikan (×)' },
    { value: 'divide', label: 'Bagi (÷)' }
  ];
  
  // Color presets
  colorPresets = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#0ea5e9', '#3b82f6', '#2563eb', '#1d4ed8', '#4f46e5'
  ];

  // Point shapes
  pointShapes = [
    { value: 'circle', label: 'Circle', icon: 'bi-circle-fill' },
    { value: 'square', label: 'Square', icon: 'bi-square-fill' },
    { value: 'triangle', label: 'Triangle', icon: 'bi-triangle-fill' },
    { value: 'star', label: 'Star', icon: 'bi-star-fill' }
  ];

  constructor(
    private fb: FormBuilder,
    private layersService: WebGisLayersService,
    private documentsService: DocumentsService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['layer'] || changes['properties']) && this.layer) {
      this.loadLayerStyle();
    }
    if (changes['layer']) {
      this.resetReplaceState();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.styleForm = this.fb.group({
      // Layer info (editable)
      layerName: [''],
      layerDescription: [''],
      // Style settings
      fillColor: ['#6366f1'],
      fillOpacity: [0.3],
      strokeColor: ['#6366f1'],
      strokeWidth: [2],
      strokeOpacity: [1],
      pointRadius: [6],
      pointShape: ['circle'],
      // Label fields now an array (multi-select)
      labelFields: [[]],
      labelColor: ['#ffffff'],
      labelSize: [12],
      // Data-driven stroke width
      strokeWidthByFieldEnabled: [false],
      strokeWidthField: [''],
      strokeWidthOperation: ['multiply'],
      strokeWidthFactor: [1],
      strokeWidthBase: [2],
      // Data-driven color
      colorByFieldEnabled: [false],
      colorByField: [''],
      colorByFieldDefault: ['#6366f1'],
      // Zoom level visibility
      minZoom: [0],
      maxZoom: [20],
      labelMinZoom: [12]
    });

    // Real-time preview on form changes
    this.styleForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.emitStyleUpdate();
    });
  }

  private loadLayerStyle(): void {
    if (!this.layer) return;

    // Load layer info
    this.styleForm.patchValue({
      layerName: this.layer.layerName || '',
      layerDescription: this.layer.layerDescription || ''
    }, { emitEvent: false });

    // Load available properties from input (from parent's feature extraction), or fallback to config
    if (this.properties && this.properties.length > 0) {
      this.availableProperties = this.properties;
      // Detect number properties (those that might be suitable for formula)
      this.numberProperties = this.properties.filter((p: string) => 
        ['diameter', 'length', 'width', 'size', 'count', 'value', 'kedalaman', 'panjang', 'lebar'].some(kw => p.toLowerCase().includes(kw))
      );
    } else {
      const config = this.layer.configJson as any;
      if (config?.properties) {
        this.availableProperties = config.properties;
        this.numberProperties = config.numberProperties || config.properties.filter((p: string) => 
          ['diameter', 'length', 'width', 'size', 'count', 'value', 'kedalaman', 'panjang', 'lebar'].some(kw => p.toLowerCase().includes(kw))
        );
      }
    }

    // Load existing style from styleJson
    let style = this.layer.styleJson as any;
    // Handle legacy nested format (styleJson.styleJson)
    if (style?.styleJson && !style.fillColor) {
      style = style.styleJson;
    }
    if (style) {
      this.styleForm.patchValue({
        fillColor: style.fillColor || '#6366f1',
        fillOpacity: style.fillOpacity ?? 0.3,
        strokeColor: style.strokeColor || '#6366f1',
        strokeWidth: style.strokeWidth ?? 2,
        strokeOpacity: style.strokeOpacity ?? 1,
        pointRadius: style.pointRadius ?? 6,
        pointShape: style.pointShape || 'circle',
        labelFields: style.labelFields || [],
        labelColor: style.labelColor || '#ffffff',
        labelSize: style.labelSize ?? 12,
        // Data-driven stroke width
        strokeWidthByFieldEnabled: style.strokeWidthByField?.enabled ?? false,
        strokeWidthField: style.strokeWidthByField?.field || '',
        strokeWidthOperation: style.strokeWidthByField?.operation || 'multiply',
        strokeWidthFactor: style.strokeWidthByField?.factor ?? 1,
        strokeWidthBase: style.strokeWidthByField?.baseWidth ?? 2,
        // Data-driven color
        colorByFieldEnabled: style.colorByField?.enabled ?? false,
        colorByField: style.colorByField?.field || '',
        colorByFieldDefault: style.colorByField?.defaultColor || '#6366f1',
        // Zoom visibility
        minZoom: style.minZoom ?? 0,
        maxZoom: style.maxZoom ?? 20,
        labelMinZoom: style.labelMinZoom ?? 12
      }, { emitEvent: false });

      // Load color mappings
      if (style.colorByField?.mappings) {
        this.colorMappings = [...style.colorByField.mappings];
      }

      // Load selected label fields
      this.selectedLabelFields = style.labelFields || [];
    }
  }

  private emitStyleUpdate(): void {
    if (!this.layer) return;
    
    const formValue = this.styleForm.value;
    
    const style: LayerStyle = {
      fillColor: formValue.fillColor,
      fillOpacity: formValue.fillOpacity,
      strokeColor: formValue.strokeColor,
      strokeWidth: formValue.strokeWidth,
      strokeOpacity: formValue.strokeOpacity,
      pointRadius: formValue.pointRadius,
      pointShape: formValue.pointShape,
      labelFields: this.selectedLabelFields,
      labelColor: formValue.labelColor,
      labelSize: formValue.labelSize,
      strokeWidthByField: formValue.strokeWidthByFieldEnabled ? {
        enabled: true,
        field: formValue.strokeWidthField,
        operation: formValue.strokeWidthOperation,
        factor: formValue.strokeWidthFactor,
        baseWidth: formValue.strokeWidthBase
      } : undefined,
      colorByField: formValue.colorByFieldEnabled ? {
        enabled: true,
        field: formValue.colorByField,
        mappings: this.colorMappings,
        defaultColor: formValue.colorByFieldDefault
      } : undefined,
      // Zoom visibility
      minZoom: formValue.minZoom,
      maxZoom: formValue.maxZoom,
      labelMinZoom: formValue.labelMinZoom
    };
    
    this.styleUpdated.emit({
      layerId: this.layer.idLayer,
      style
    });
  }

  // Toggle label field selection
  toggleLabelField(field: string): void {
    const index = this.selectedLabelFields.indexOf(field);
    if (index > -1) {
      this.selectedLabelFields.splice(index, 1);
    } else {
      this.selectedLabelFields.push(field);
    }
    this.emitStyleUpdate();
  }

  isLabelFieldSelected(field: string): boolean {
    return this.selectedLabelFields.includes(field);
  }

  // Color mapping methods
  addColorMapping(): void {
    this.colorMappings.push({ value: '', color: this.getNextColor() });
  }

  removeColorMapping(index: number): void {
    this.colorMappings.splice(index, 1);
    this.emitStyleUpdate();
  }

  updateColorMappingValue(index: number, value: string): void {
    this.colorMappings[index].value = value;
    this.emitStyleUpdate();
  }

  updateColorMappingColor(index: number, color: string): void {
    this.colorMappings[index].color = color;
    this.emitStyleUpdate();
  }

  private getNextColor(): string {
    const usedColors = this.colorMappings.map(m => m.color);
    const available = this.colorPresets.find(c => !usedColors.includes(c));
    return available || this.colorPresets[0];
  }

  // Load unique values for color-by-field dropdown
  loadUniqueValuesForField(field: string): void {
    if (!field || !this.layer) {
      this.uniqueFieldValues = [];
      return;
    }
    
    // Get unique values from the layer's geoJson data
    const geoJson = (this.layer as any).geoJson;
    if (geoJson?.features) {
      const values = new Set<string>();
      geoJson.features.forEach((f: any) => {
        const val = f.properties?.[field];
        if (val !== undefined && val !== null) {
          values.add(String(val));
        }
      });
      this.uniqueFieldValues = Array.from(values).sort();
    }
  }

  selectColor(field: 'fillColor' | 'strokeColor' | 'labelColor', color: string): void {
    this.styleForm.patchValue({ [field]: color });
  }

  async saveStyle(): Promise<void> {
    if (!this.layer) return;

    this.isSaving = true;
    this.saveError = '';

    try {
      const formValue = this.styleForm.value;
      
      // Note: Cast to any because SDK needs regeneration to include zoom fields
      const styleDto: any = {
        fillColor: formValue.fillColor,
        fillOpacity: formValue.fillOpacity,
        strokeColor: formValue.strokeColor,
        strokeWidth: formValue.strokeWidth,
        strokeOpacity: formValue.strokeOpacity,
        pointRadius: formValue.pointRadius,
        pointShape: formValue.pointShape,
        labelFields: this.selectedLabelFields,
        labelColor: formValue.labelColor,
        labelSize: formValue.labelSize,
        // Zoom visibility
        minZoom: formValue.minZoom,
        maxZoom: formValue.maxZoom,
        labelMinZoom: formValue.labelMinZoom
      };

      // Add data-driven stroke width if enabled
      if (formValue.strokeWidthByFieldEnabled && formValue.strokeWidthField) {
        styleDto.strokeWidthByField = {
          enabled: true,
          field: formValue.strokeWidthField,
          operation: formValue.strokeWidthOperation,
          factor: formValue.strokeWidthFactor,
          baseWidth: formValue.strokeWidthBase
        };
      }

      // Add data-driven color if enabled
      if (formValue.colorByFieldEnabled && formValue.colorByField) {
        styleDto.colorByField = {
          enabled: true,
          field: formValue.colorByField,
          mappings: this.colorMappings,
          defaultColor: formValue.colorByFieldDefault
        };
      }

      // Use SDK method to update layer (including name, description, and style)
      const updatedLayer = await firstValueFrom(
        this.layersService.layersControllerUpdate({
          id: this.layer.idLayer,
          body: {
            layerName: formValue.layerName,
            layerDescription: formValue.layerDescription,
            styleJson: styleDto
          }
        })
      );

      // Emit the updated layer so parent can update its list
      this.styleSaved.emit(updatedLayer);
      this.close.emit();
    } catch (error: any) {
      console.error('Error saving style:', error);
      this.saveError = error.error?.message || 'Gagal menyimpan style';
    } finally {
      this.isSaving = false;
    }
  }

  async deleteLayer(): Promise<void> {
    if (!this.layer) return;
    
    const confirmed = confirm(`Hapus layer "${this.layer.layerName}"? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;

    this.isDeleting = true;

    try {
      await this.layersService.layersControllerRemove({
        id: this.layer.idLayer
      }).toPromise();

      this.layerDeleted.emit(this.layer.idLayer);
      this.close.emit();
    } catch (error: any) {
      console.error('Error deleting layer:', error);
      this.saveError = error.error?.message || 'Gagal menghapus layer';
    } finally {
      this.isDeleting = false;
    }
  }

  resetStyle(): void {
    this.selectedLabelFields = [];
    this.colorMappings = [];
    this.styleForm.patchValue({
      fillColor: '#6366f1',
      fillOpacity: 0.3,
      strokeColor: '#6366f1',
      strokeWidth: 2,
      strokeOpacity: 1,
      pointRadius: 6,
      pointShape: 'circle',
      labelFields: [],
      labelColor: '#ffffff',
      labelSize: 12,
      strokeWidthByFieldEnabled: false,
      strokeWidthField: '',
      strokeWidthOperation: 'multiply',
      strokeWidthFactor: 1,
      strokeWidthBase: 2,
      colorByFieldEnabled: false,
      colorByField: '',
      colorByFieldDefault: '#6366f1',
      // Zoom visibility
      minZoom: 0,
      maxZoom: 20,
      labelMinZoom: 12
    });
  }

  // ===== REPLACE DATA (re-upload GeoJSON/KML) =====

  get currentDataFilename(): string {
    const config = this.layer?.configJson as any;
    return config?.originalFilename || '-';
  }

  get currentFeatureCount(): number | null {
    const config = this.layer?.configJson as any;
    return config?.featureCount ?? null;
  }

  get canReplaceData(): boolean {
    // Only file-based layers can have their data replaced
    const st = (this.layer as any)?.sourceType;
    return st === 'geojson' || st === 'kml';
  }

  async onReplaceFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.resetReplaceState();

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      this.replaceError = 'File terlalu besar. Maksimal 50MB.';
      return;
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!['.geojson', '.json', '.kml'].includes(ext)) {
      this.replaceError = 'File harus berekstensi .geojson, .json, atau .kml';
      return;
    }

    this.replaceFile = file;

    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Gagal membaca file'));
        reader.readAsText(file);
      });

      const geoJson = ext === '.kml' ? this.kmlToGeoJson(content) : JSON.parse(content);
      this.parseReplaceGeoJson(geoJson);
    } catch (e: any) {
      this.replaceError = 'Gagal parse file: ' + (e.message || 'Format tidak valid');
      this.replaceFile = null;
    } finally {
      // Allow re-selecting the same file
      input.value = '';
    }
  }

  private kmlToGeoJson(content: string): any {
    const features = new KML({ extractStyles: false }).readFeatures(content, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:4326'
    });
    return JSON.parse(new GeoJSON().writeFeatures(features));
  }

  private parseReplaceGeoJson(geoJson: any): void {
    const info: ReplaceDataInfo = {
      featureCount: 0,
      geometryType: 'Unknown',
      properties: [],
      bounds: null,
      warnings: [],
      errors: []
    };

    let features: any[] = [];
    if (geoJson?.type === 'FeatureCollection') {
      features = geoJson.features || [];
    } else if (geoJson?.type === 'Feature') {
      features = [geoJson];
      geoJson = { type: 'FeatureCollection', features };
    } else if (geoJson?.type && geoJson.coordinates) {
      features = [{ type: 'Feature', geometry: geoJson, properties: {} }];
      geoJson = { type: 'FeatureCollection', features };
    } else {
      info.errors.push('Bukan format GeoJSON yang valid');
      this.replaceInfo = info;
      return;
    }

    info.featureCount = features.length;
    if (features.length === 0) {
      info.errors.push('File tidak memiliki feature');
    }

    const geometryTypes = new Set<string>();
    const allProperties = new Set<string>();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const walkCoords = (coords: any): void => {
      if (typeof coords?.[0] === 'number') {
        if (coords[0] < minX) minX = coords[0];
        if (coords[0] > maxX) maxX = coords[0];
        if (coords[1] < minY) minY = coords[1];
        if (coords[1] > maxY) maxY = coords[1];
      } else if (Array.isArray(coords)) {
        coords.forEach(walkCoords);
      }
    };

    for (const feature of features) {
      if (feature.geometry?.type) geometryTypes.add(feature.geometry.type);
      if (feature.properties) Object.keys(feature.properties).forEach(k => allProperties.add(k));
      if (feature.geometry?.coordinates) walkCoords(feature.geometry.coordinates);
    }

    info.geometryType = Array.from(geometryTypes).join(', ') || 'Unknown';
    info.properties = Array.from(allProperties);
    if (minX !== Infinity) {
      info.bounds = [minX, minY, maxX, maxY];
      if (minX < -180 || maxX > 180 || minY < -90 || maxY > 90) {
        info.warnings.push('Koordinat di luar range WGS84. Mungkin menggunakan CRS lain.');
      }
    }

    // Warn if geometry type changed vs existing layer
    const currentGt = (this.layer as any)?.geometryType;
    const newGt = info.geometryType.split(',')[0]?.trim();
    if (currentGt && newGt && newGt !== 'Unknown' && !newGt.toLowerCase().includes(String(currentGt).toLowerCase()) && !String(currentGt).toLowerCase().includes(newGt.toLowerCase())) {
      info.warnings.push(`Tipe geometri berubah: ${currentGt} → ${newGt}`);
    }

    this.replaceParsedGeoJson = geoJson;
    this.replaceInfo = info;
  }

  async replaceLayerData(): Promise<void> {
    if (!this.layer || !this.replaceFile || !this.replaceInfo || this.replaceInfo.errors.length > 0) return;

    this.isReplacing = true;
    this.replaceError = '';

    try {
      const ext = '.' + this.replaceFile.name.split('.').pop()?.toLowerCase();
      const config = (this.layer.configJson as any) || {};

      // Backend serves file-based layers via JSON parse of the stored file,
      // so KML is uploaded as its converted GeoJSON equivalent.
      const sourceType = 'geojson';
      let uploadFile = this.replaceFile;
      if (ext === '.kml') {
        const geojsonName = this.replaceFile.name.replace(/\.kml$/i, '.geojson');
        uploadFile = new File(
          [JSON.stringify(this.replaceParsedGeoJson)],
          geojsonName,
          { type: 'application/geo+json' }
        );
      }

      // 1. Upload the new file as a document (same flow as add-layer)
      const doc = await firstValueFrom(
        this.documentsService.documentsControllerUpload({
          body: {
            file: uploadFile,
            fromModule: 'project',
            fromModuleId: (this.layer as any).idProject || '',
            documentType: `layer_${sourceType}`,
            metadata: JSON.stringify({
              layerName: this.layer.layerName,
              layerType: (this.layer as any).layerType,
              featureCount: this.replaceInfo.featureCount,
              geometryType: this.replaceInfo.geometryType,
              replacesDocument: config.idDocument || null
            })
          }
        })
      );

      // 2. Point the layer at the new document + refresh config metadata
      const updatedLayer = await firstValueFrom(
        this.layersService.layersControllerUpdate({
          id: this.layer.idLayer,
          body: {
            sourceType,
            sourceRef: doc.idDocument,
            geometryType: this.replaceInfo.geometryType.split(',')[0]?.trim() || (this.layer as any).geometryType,
            configJson: {
              ...config,
              idDocument: doc.idDocument,
              originalFilename: doc.originalFilename,
              filePath: doc.filePath,
              featureCount: this.replaceInfo.featureCount,
              bounds: this.replaceInfo.bounds,
              properties: this.replaceInfo.properties
            }
          } as any
        })
      );

      this.dataReplaced.emit(updatedLayer);
      this.resetReplaceState();
    } catch (error: any) {
      console.error('Error replacing layer data:', error);
      this.replaceError = error.error?.message || 'Gagal mengganti data layer. Silakan coba lagi.';
    } finally {
      this.isReplacing = false;
    }
  }

  cancelReplaceData(): void {
    this.resetReplaceState();
  }

  private resetReplaceState(): void {
    this.replaceFile = null;
    this.replaceParsedGeoJson = null;
    this.replaceInfo = null;
    this.replaceError = '';
    this.isReplacing = false;
  }

  onClose(): void {
    this.saveError = '';
    this.resetReplaceState();
    this.close.emit();
  }

  get geometryType(): string {
    return (this.layer as any)?.geometryType || 'Point';
  }

  get isPointLayer(): boolean {
    const gt = this.geometryType.toLowerCase();
    return gt.includes('point');
  }

  get isLineLayer(): boolean {
    const gt = this.geometryType.toLowerCase();
    return gt.includes('line');
  }

  get isPolygonLayer(): boolean {
    const gt = this.geometryType.toLowerCase();
    return gt.includes('polygon');
  }
}
