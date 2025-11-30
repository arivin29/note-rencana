import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { SensorTypesService } from '../../../../../../sdk/core/services/sensor-types.service';
import { SensorChannelsService } from '../../../../../../sdk/core/services/sensor-channels.service';

export interface SensorTypeOption {
  id: string;
  label: string;
  unit: string;
  precision: number;
}

export interface AddChannelFormValue {
  sensorId: string;
  channelId: string;
  metricCode: string;
  unit: string;
  precision: number | null;
  minThreshold: number | null;
  maxThreshold: number | null;
  sensorTypeId: string;
}

export type ChannelDrawerMode = 'add' | 'edit';

@Component({
  selector: 'app-node-detail-add-channel-drawer',
  templateUrl: './node-detail-add-channel-drawer.component.html',
  styleUrls: ['./node-detail-add-channel-drawer.component.scss'],
  standalone: false
})
export class NodeDetailAddChannelDrawerComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() sensorLabel = '';
  @Input() sensorId = '';
  @Input() channelId: string | null = null; // For edit mode - will fetch from backend
  @Input() mode: ChannelDrawerMode = 'add';
  @Output() save = new EventEmitter<AddChannelFormValue>();
  @Output() close = new EventEmitter<void>();

  sensorTypeOptions: SensorTypeOption[] = [];
  formModel: AddChannelFormValue = this.createEmptyForm();
  loading = false;
  saving = false;
  loadingChannel = false; // Loading channel data from backend

  constructor(
    private sensorTypesService: SensorTypesService,
    private sensorChannelsService: SensorChannelsService
  ) {}

  ngOnInit(): void {
    // Don't load sensor types here - load when drawer opens
  }

  /**
   * Parse SDK response (handles both string and object)
   */
  private parseResponse(response: any): any {
    if (!response) return response;
    
    // If already an object, return as-is
    if (typeof response === 'object') return response;
    
    // If string, try to parse
    try {
      return JSON.parse(response);
    } catch (e) {
      console.warn('Failed to parse response:', e);
      return response;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle drawer open/close
    if (changes['isOpen'] && this.isOpen) {
      console.log('Channel drawer opened - mode:', this.mode, 'channelId:', this.channelId);
      
      // Drawer just opened - load sensor types first
      this.loadSensorTypes();
      
      // After types loaded, check if we need to load channel data
      if (this.mode === 'edit' && this.channelId) {
        // Edit mode: fetch from backend after a short delay to ensure types are loaded
        // Better: handle this in the loadSensorTypes success callback
      } else {
        // Add mode: create empty form
        this.formModel = this.createEmptyForm();
      }
    }

    // Handle mode or channelId change while drawer is already open
    if (changes['channelId'] && this.channelId && this.isOpen && this.mode === 'edit') {
      console.log('Channel ID changed while drawer open:', this.channelId);
      this.loadChannelData();
    }

    // Handle sensor change
    if (changes['sensorId'] && !changes['isOpen']) {
      this.formModel.sensorId = this.sensorId;
    }
  }

  handleBackdropClick() {
    this.close.emit();
  }

  handleCloseClick(event: MouseEvent) {
    event.preventDefault();
    this.close.emit();
  }

  handleSubmit(formValid: boolean) {
    if (!formValid || this.saving) {
      return;
    }

    this.saving = true;

    if (this.mode === 'edit' && this.channelId) {
      // Update existing channel
      this.sensorChannelsService.sensorChannelsControllerUpdate({
        id: this.channelId,
        body: {
          metricCode: this.formModel.metricCode,
          unit: this.formModel.unit,
          precision: this.formModel.precision ?? undefined,
          minThreshold: this.formModel.minThreshold ?? undefined,
          maxThreshold: this.formModel.maxThreshold ?? undefined,
          idSensorType: this.formModel.sensorTypeId
        }
      }).subscribe({
        next: (response: any) => {
          this.saving = false;
          this.save.emit({ ...this.formModel });
        },
        error: (err) => {
          console.error('Error updating channel:', err);
          this.saving = false;
          alert('Failed to update channel');
        }
      });
    } else {
      // Create new channel
      this.sensorChannelsService.sensorChannelsControllerCreate({
        body: {
          idSensor: this.formModel.sensorId,
          metricCode: this.formModel.metricCode,
          unit: this.formModel.unit,
          precision: this.formModel.precision ?? undefined,
          minThreshold: this.formModel.minThreshold ?? undefined,
          maxThreshold: this.formModel.maxThreshold ?? undefined,
          idSensorType: this.formModel.sensorTypeId
        }
      }).subscribe({
        next: (response: any) => {
          this.saving = false;
          this.save.emit({ ...this.formModel });
        },
        error: (err) => {
          console.error('Error creating channel:', err);
          this.saving = false;
          alert('Failed to create channel');
        }
      });
    }
  }

  /**
   * Load channel data from backend (edit mode)
   */
  loadChannelData() {
    if (!this.channelId) {
      console.warn('loadChannelData called but channelId is null');
      return;
    }

    console.log('Loading channel data for ID:', this.channelId);
    this.loadingChannel = true;
    this.sensorChannelsService.sensorChannelsControllerFindOne({ id: this.channelId }).subscribe({
      next: (response: any) => {
        const data = this.parseResponse(response);
        console.log('Loaded channel data:', data);
        
        // Populate form with backend data
        this.formModel = {
          sensorId: data.idSensor || this.sensorId,
          channelId: data.metricCode || '',
          metricCode: data.metricCode || '',
          unit: data.unit || '',
          precision: data.precision ?? null,
          minThreshold: data.minThreshold ?? null,
          maxThreshold: data.maxThreshold ?? null,
          sensorTypeId: data.idSensorType || ''
        };

        this.loadingChannel = false;
      },
      error: (err) => {
        console.error('Error loading channel data:', err);
        alert('Failed to load channel data');
        this.loadingChannel = false;
        this.close.emit();
      }
    });
  }

  /**
   * Load sensor types from backend
   */
  loadSensorTypes() {
    this.loading = true;
    console.log('Loading sensor types...');
    
    this.sensorTypesService.sensorTypesControllerFindAll({ limit: 100 }).subscribe({
      next: (data: any) => {
        // SDK returns array directly, not wrapped in {data: [...]}
        console.log('Received sensor types response:', data);
        
        const types = Array.isArray(data) ? data : [];
        console.log('Parsed sensor types count:', types.length);
        
        this.sensorTypeOptions = types.map((type: any) => ({
          id: type.idSensorType,
          label: type.category,
          unit: type.defaultUnit || '',
          precision: type.precision || 0.01
        }));
        
        console.log('Mapped sensor type options:', this.sensorTypeOptions.length);
        
        this.loading = false;
        
        // After sensor types loaded, handle mode-specific logic
        if (this.mode === 'edit' && this.channelId) {
          // Edit mode: load channel data from backend
          this.loadChannelData();
        } else {
          // Add mode: set default sensor type
          if (this.sensorTypeOptions.length > 0) {
            this.formModel.sensorTypeId = this.sensorTypeOptions[0].id;
            this.onSensorTypeChange();
          }
        }
      },
      error: (err) => {
        console.error('Error loading sensor types:', err);
        this.loading = false;
      }
    });
  }

  /**
   * Handle sensor type selection change
   * Auto-fill unit and precision based on selected type
   */
  onSensorTypeChange() {
    const selectedType = this.sensorTypeOptions.find(t => t.id === this.formModel.sensorTypeId);
    if (selectedType) {
      this.formModel.unit = selectedType.unit;
      this.formModel.precision = selectedType.precision;
    }
  }

  private createEmptyForm(overrides?: Partial<AddChannelFormValue>): AddChannelFormValue {
    return {
      sensorId: overrides?.sensorId ?? this.sensorId,
      channelId: overrides?.channelId ?? '',
      metricCode: overrides?.metricCode ?? '',
      unit: overrides?.unit ?? '',
      precision: overrides?.precision ?? null,
      minThreshold: overrides?.minThreshold ?? null,
      maxThreshold: overrides?.maxThreshold ?? null,
      sensorTypeId: overrides?.sensorTypeId ?? this.sensorTypeOptions[0]?.id ?? ''
    };
  }
}
