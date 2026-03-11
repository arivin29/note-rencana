import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import { fromLonLat } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { DocumentsService, WebGisLayersService } from '../../../../../../sdk/core/services';
import { DocumentResponseDto } from '../../../../../../sdk/core/models/document-response-dto';
import { LayerResponseDto } from '../../../../../../sdk/core/models/layer-response-dto';

export interface AddLayerResult {
  layer: LayerResponseDto;
  document?: DocumentResponseDto;
}

export interface ParsedLayerInfo {
  featureCount: number;
  geometryType: string;
  bounds: [number, number, number, number] | null;
  projection: string;
  properties: string[];
  errors: string[];
  warnings: string[];
}

type WizardStep = 'upload' | 'preview' | 'save';

@Component({
  selector: 'add-layer-drawer',
  templateUrl: './add-layer-drawer.html',
  styleUrls: ['./add-layer-drawer.scss'],
  standalone: false
})
export class AddLayerDrawerComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('previewMapContainer') previewMapContainer?: ElementRef<HTMLDivElement>;
  
  @Input() isOpen = false;
  @Input() projectId: string = '';
  @Input() ownerId: string = '';
  @Input() layerType: 'operational' | 'custom' = 'operational';
  @Output() close = new EventEmitter<void>();
  @Output() layerAdded = new EventEmitter<AddLayerResult>();
  @Output() requestEditLayer = new EventEmitter<LayerResponseDto>();

  private destroy$ = new Subject<void>();

  // Wizard state
  currentStep: WizardStep = 'upload';
  steps: WizardStep[] = ['upload', 'preview', 'save'];

  layerForm!: FormGroup;
  
  // File handling
  selectedFile: File | null = null;
  fileError: string = '';
  
  // Parsing state
  isParsing = false;
  parsedGeoJson: any = null;
  parsedInfo: ParsedLayerInfo | null = null;
  parseError: string = '';
  
  // Preview map
  private previewMap?: Map;
  private previewLayer?: VectorLayer<any>;
  previewMapReady = false;
  
  // Save state
  isSaving = false;
  saveProgress: number = 0;
  saveError: string = '';
  savedLayer: LayerResponseDto | null = null;
  savedDocument: DocumentResponseDto | null = null;
  
  // Supported file types (exclude shp for now)
  sourceTypeOptions = [
    { value: 'geojson', label: 'GeoJSON', extensions: ['.geojson', '.json'] },
    { value: 'kml', label: 'KML', extensions: ['.kml'] }
  ];

  constructor(
    private fb: FormBuilder,
    private documentsService: DocumentsService,
    private layersService: WebGisLayersService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngAfterViewInit(): void {
    // Preview map initialized when step changes to 'preview'
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyPreviewMap();
  }

  private initForm(): void {
    this.layerForm = this.fb.group({
      layerName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      layerCode: ['', [Validators.maxLength(50)]],
      layerDescription: [''],
      sourceType: ['geojson', Validators.required],
      isVisibleDefault: [true]
    });

    this.layerForm.get('layerName')?.valueChanges.subscribe(name => {
      if (name && !this.layerForm.get('layerCode')?.dirty) {
        const code = this.generateCode(name);
        this.layerForm.patchValue({ layerCode: code }, { emitEvent: false });
      }
    });
  }

  // ===== WIZARD NAVIGATION =====
  
  canProceedToPreview(): boolean {
    return this.layerForm.get('layerName')?.valid === true && 
           this.selectedFile !== null && 
           !this.fileError;
  }

  canProceedToSave(): boolean {
    return this.parsedGeoJson !== null && 
           this.parsedInfo !== null && 
           this.parsedInfo.errors.length === 0;
  }

  async goToStep(step: WizardStep): Promise<void> {
    if (step === 'preview' && !this.canProceedToPreview()) {
      this.layerForm.markAllAsTouched();
      return;
    }
    
    if (step === 'save' && !this.canProceedToSave()) {
      return;
    }

    this.currentStep = step;

    if (step === 'preview') {
      await this.parseAndPreview();
    }
  }

  goBack(): void {
    const currentIndex = this.steps.indexOf(this.currentStep);
    if (currentIndex > 0) {
      this.currentStep = this.steps[currentIndex - 1];
      if (this.currentStep !== 'preview') {
        this.destroyPreviewMap();
      }
    }
  }

  goNext(): void {
    const currentIndex = this.steps.indexOf(this.currentStep);
    if (currentIndex < this.steps.length - 1) {
      this.goToStep(this.steps[currentIndex + 1]);
    }
  }

  // ===== FILE HANDLING =====

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        this.fileError = 'File terlalu besar. Maksimal 50MB.';
        this.selectedFile = null;
        return;
      }
      
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const sourceType = this.layerForm.get('sourceType')?.value;
      const option = this.sourceTypeOptions.find(o => o.value === sourceType);
      
      if (option && !option.extensions.includes(ext)) {
        this.fileError = `File harus berekstensi ${option.extensions.join(' atau ')}`;
        this.selectedFile = null;
        return;
      }
      
      this.selectedFile = file;
      this.fileError = '';
      this.parsedGeoJson = null;
      this.parsedInfo = null;
      this.parseError = '';
    }
  }

  onSourceTypeChange(): void {
    this.selectedFile = null;
    this.fileError = '';
    this.parsedGeoJson = null;
    this.parsedInfo = null;
  }

  getAcceptedExtensions(): string {
    const sourceType = this.layerForm.get('sourceType')?.value;
    const option = this.sourceTypeOptions.find(o => o.value === sourceType);
    return option?.extensions.join(',') || '.geojson,.json,.kml';
  }

  // ===== PARSING & PREVIEW =====

  private async parseAndPreview(): Promise<void> {
    if (!this.selectedFile) return;
    
    this.isParsing = true;
    this.parseError = '';
    this.parsedInfo = null;

    try {
      const fileContent = await this.readFileAsText(this.selectedFile);
      const sourceType = this.layerForm.get('sourceType')?.value;
      
      if (sourceType === 'geojson') {
        this.parseGeoJSON(fileContent);
      } else if (sourceType === 'kml') {
        this.parseKML(fileContent);
      }

      setTimeout(() => {
        this.initPreviewMap();
      }, 100);
      
    } catch (error: any) {
      this.parseError = error.message || 'Gagal membaca file';
    } finally {
      this.isParsing = false;
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsText(file);
    });
  }

  private parseGeoJSON(content: string): void {
    try {
      const geoJson = JSON.parse(content);
      
      const info: ParsedLayerInfo = {
        featureCount: 0,
        geometryType: 'Unknown',
        bounds: null,
        projection: 'EPSG:4326',
        properties: [],
        errors: [],
        warnings: []
      };

      if (!geoJson.type) {
        info.errors.push('Bukan format GeoJSON yang valid: missing "type" property');
        this.parsedInfo = info;
        return;
      }

      let features: any[] = [];
      if (geoJson.type === 'FeatureCollection') {
        features = geoJson.features || [];
      } else if (geoJson.type === 'Feature') {
        features = [geoJson];
      } else if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(geoJson.type)) {
        features = [{ type: 'Feature', geometry: geoJson, properties: {} }];
        this.parsedGeoJson = { type: 'FeatureCollection', features };
      }

      info.featureCount = features.length;

      if (features.length === 0) {
        info.warnings.push('File tidak memiliki feature');
      }

      const geometryTypes = new Set<string>();
      const allProperties = new Set<string>();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (const feature of features) {
        if (feature.geometry?.type) {
          geometryTypes.add(feature.geometry.type);
        }
        
        if (feature.properties) {
          Object.keys(feature.properties).forEach(k => allProperties.add(k));
        }

        this.extractBounds(feature.geometry, (x, y) => {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        });
      }

      info.geometryType = Array.from(geometryTypes).join(', ') || 'Unknown';
      info.properties = Array.from(allProperties);

      if (minX !== Infinity) {
        info.bounds = [minX, minY, maxX, maxY];
        
        if (minX < -180 || maxX > 180 || minY < -90 || maxY > 90) {
          info.warnings.push('Koordinat di luar range WGS84. Mungkin menggunakan CRS lain.');
          info.projection = 'Unknown (not WGS84)';
        }
      }

      if (geoJson.crs) {
        const crsName = geoJson.crs.properties?.name || '';
        if (crsName && !crsName.includes('CRS84') && !crsName.includes('4326')) {
          info.warnings.push(`CRS: ${crsName}. Disarankan menggunakan EPSG:4326/WGS84.`);
        }
      }

      this.parsedGeoJson = geoJson.type === 'FeatureCollection' ? geoJson : { type: 'FeatureCollection', features };
      this.parsedInfo = info;

    } catch (e: any) {
      this.parseError = 'Gagal parse GeoJSON: ' + (e.message || 'Format tidak valid');
    }
  }

  private parseKML(content: string): void {
    try {
      const parser = new DOMParser();
      const kmlDoc = parser.parseFromString(content, 'text/xml');
      
      const parseError = kmlDoc.querySelector('parsererror');
      if (parseError) {
        this.parseError = 'Gagal parse KML: XML tidak valid';
        return;
      }

      const kmlFormat = new KML({ extractStyles: false });
      const features = kmlFormat.readFeatures(content, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:4326'
      });

      const geoJsonFormat = new GeoJSON();
      const geoJson = JSON.parse(geoJsonFormat.writeFeatures(features));

      const info: ParsedLayerInfo = {
        featureCount: features.length,
        geometryType: 'Unknown',
        bounds: null,
        projection: 'EPSG:4326',
        properties: [],
        errors: [],
        warnings: []
      };

      const geometryTypes = new Set<string>();
      const allProperties = new Set<string>();

      for (const feature of geoJson.features) {
        if (feature.geometry?.type) {
          geometryTypes.add(feature.geometry.type);
        }
        if (feature.properties) {
          Object.keys(feature.properties).forEach(k => allProperties.add(k));
        }
      }

      info.geometryType = Array.from(geometryTypes).join(', ');
      info.properties = Array.from(allProperties);

      if (features.length > 0) {
        const source = new VectorSource({ features });
        const extent = source.getExtent();
        if (extent && extent[0] !== Infinity) {
          info.bounds = extent as [number, number, number, number];
        }
      }

      this.parsedGeoJson = geoJson;
      this.parsedInfo = info;

    } catch (e: any) {
      this.parseError = 'Gagal parse KML: ' + (e.message || 'Format tidak valid');
    }
  }

  private extractBounds(geometry: any, callback: (x: number, y: number) => void): void {
    if (!geometry) return;
    
    const processCoords = (coords: any): void => {
      if (typeof coords[0] === 'number') {
        callback(coords[0], coords[1]);
      } else {
        coords.forEach((c: any) => processCoords(c));
      }
    };

    if (geometry.coordinates) {
      processCoords(geometry.coordinates);
    } else if (geometry.geometries) {
      geometry.geometries.forEach((g: any) => this.extractBounds(g, callback));
    }
  }

  // ===== PREVIEW MAP =====

  private initPreviewMap(): void {
    if (!this.previewMapContainer?.nativeElement || !this.parsedGeoJson) return;

    this.destroyPreviewMap();

    const geoJsonFormat = new GeoJSON();
    const features = geoJsonFormat.readFeatures(this.parsedGeoJson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });

    const vectorSource = new VectorSource({ features });

    this.previewLayer = new VectorLayer({
      source: vectorSource,
      style: this.getDefaultStyle()
    });

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      })
    });

    this.previewMap = new Map({
      target: this.previewMapContainer.nativeElement,
      layers: [baseLayer, this.previewLayer],
      view: new View({
        center: fromLonLat([106.8456, -6.2088]),
        zoom: 10
      })
    });

    const extent = vectorSource.getExtent();
    if (extent && extent[0] !== Infinity) {
      this.previewMap.getView().fit(extent, { 
        padding: [50, 50, 50, 50],
        maxZoom: 16
      });
    }

    this.previewMapReady = true;
  }

  private getDefaultStyle(): Style {
    return new Style({
      fill: new Fill({ color: 'rgba(99, 102, 241, 0.3)' }),
      stroke: new Stroke({ color: '#6366f1', width: 2 }),
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: '#6366f1' }),
        stroke: new Stroke({ color: '#fff', width: 2 })
      })
    });
  }

  private destroyPreviewMap(): void {
    if (this.previewMap) {
      this.previewMap.setTarget(undefined);
      this.previewMap = undefined;
    }
    this.previewLayer = undefined;
    this.previewMapReady = false;
  }

  // ===== SAVE =====

  async saveLayer(): Promise<void> {
    if (!this.canProceedToSave() || !this.selectedFile) return;

    this.isSaving = true;
    this.saveError = '';
    this.saveProgress = 0;

    const formValue = this.layerForm.value;

    try {
      this.saveProgress = 10;
      
      const docResponse = await this.documentsService.documentsControllerUpload({
        body: {
          file: this.selectedFile,
          fromModule: 'project',
          fromModuleId: this.projectId,
          documentType: `layer_${formValue.sourceType}`,
          metadata: JSON.stringify({
            layerName: formValue.layerName,
            layerType: this.layerType,
            featureCount: this.parsedInfo?.featureCount,
            geometryType: this.parsedInfo?.geometryType
          })
        }
      }).toPromise();

      this.savedDocument = docResponse!;
      this.saveProgress = 50;

      const layerCode = formValue.layerCode || this.generateCode(formValue.layerName);
      
      const layerResponse = await this.layersService.layersControllerCreate({
        body: {
          idOwner: this.ownerId,
          idProject: this.projectId,
          layerName: formValue.layerName,
          layerCode: layerCode,
          layerDescription: formValue.layerDescription,
          layerType: this.layerType,
          sourceType: formValue.sourceType,
          sourceRef: docResponse!.idDocument,
          geometryType: this.parsedInfo?.geometryType?.split(',')[0]?.trim() || 'Point',
          isVisibleDefault: formValue.isVisibleDefault,
          configJson: {
            idDocument: docResponse!.idDocument,
            originalFilename: docResponse!.originalFilename,
            filePath: docResponse!.filePath,
            featureCount: this.parsedInfo?.featureCount,
            bounds: this.parsedInfo?.bounds,
            properties: this.parsedInfo?.properties
          }
        }
      }).toPromise();

      this.savedLayer = layerResponse!;
      this.saveProgress = 100;
      this.currentStep = 'save';

    } catch (error: any) {
      console.error('Error saving layer:', error);
      this.saveError = error.error?.message || 'Gagal menyimpan layer. Silakan coba lagi.';
    } finally {
      this.isSaving = false;
    }
  }

  // ===== COMPLETE =====

  completeAndClose(): void {
    if (this.savedLayer) {
      this.layerAdded.emit({ 
        layer: this.savedLayer, 
        document: this.savedDocument || undefined 
      });
    }
    this.resetAndClose();
  }

  openEditDrawer(): void {
    if (this.savedLayer) {
      this.requestEditLayer.emit(this.savedLayer);
    }
    this.resetAndClose();
  }

  // ===== UTILITIES =====

  private generateCode(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
  }

  private resetAndClose(): void {
    this.currentStep = 'upload';
    this.layerForm.reset({
      sourceType: 'geojson',
      isVisibleDefault: true
    });
    this.selectedFile = null;
    this.fileError = '';
    this.parsedGeoJson = null;
    this.parsedInfo = null;
    this.parseError = '';
    this.savedLayer = null;
    this.savedDocument = null;
    this.saveError = '';
    this.saveProgress = 0;
    this.destroyPreviewMap();
    this.close.emit();
  }

  onClose(): void {
    this.resetAndClose();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStepNumber(step: WizardStep): number {
    return this.steps.indexOf(step) + 1;
  }

  isStepCompleted(step: WizardStep): boolean {
    const currentIndex = this.steps.indexOf(this.currentStep);
    const stepIndex = this.steps.indexOf(step);
    return stepIndex < currentIndex;
  }

  isStepActive(step: WizardStep): boolean {
    return this.currentStep === step;
  }
}
