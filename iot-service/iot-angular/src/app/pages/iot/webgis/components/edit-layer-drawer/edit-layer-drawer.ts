import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { WebGisLayersService } from '../../../../../../sdk/core/services';
import { LayerResponseDto } from '../../../../../../sdk/core/models/layer-response-dto';
import { UpdateStyleDto } from '../../../../../../sdk/core/models/update-style-dto';

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
    private layersService: WebGisLayersService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['layer'] || changes['properties']) && this.layer) {
      this.loadLayerStyle();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.styleForm = this.fb.group({
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
      colorByFieldDefault: ['#6366f1']
    });

    // Real-time preview on form changes
    this.styleForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.emitStyleUpdate();
    });
  }

  private loadLayerStyle(): void {
    if (!this.layer) return;

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
        colorByFieldDefault: style.colorByField?.defaultColor || '#6366f1'
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
      } : undefined
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
      
      const styleDto: UpdateStyleDto = {
        fillColor: formValue.fillColor,
        fillOpacity: formValue.fillOpacity,
        strokeColor: formValue.strokeColor,
        strokeWidth: formValue.strokeWidth,
        strokeOpacity: formValue.strokeOpacity,
        pointRadius: formValue.pointRadius,
        pointShape: formValue.pointShape,
        labelFields: this.selectedLabelFields,
        labelColor: formValue.labelColor,
        labelSize: formValue.labelSize
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

      // Use SDK method to update style
      const updatedLayer = await firstValueFrom(
        this.layersService.layersControllerUpdateStyle({
          id: this.layer.idLayer,
          body: styleDto
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
      colorByFieldDefault: '#6366f1'
    });
  }

  onClose(): void {
    this.saveError = '';
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
