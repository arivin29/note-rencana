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
    this.loadSensorTypes();
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
    if (changes['isOpen']) {
      if (this.isOpen) {
        // Drawer just opened - reset form and load fresh data
        if (this.mode === 'edit' && this.channelId) {
          // Edit mode: fetch from backend
          this.loadChannelData();
        } else {
          // Add mode: create empty form
          this.formModel = this.createEmptyForm();
        }
      }
    }

    // Handle channelId change in edit mode
    if (changes['channelId'] && this.channelId && this.isOpen) {
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
    if (!this.channelId) return;

    this.loadingChannel = true;
    this.sensorChannelsService.sensorChannelsControllerFindOne({ id: this.channelId }).subscribe({
      next: (response: any) => {
        const data = this.parseResponse(response);
        
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
    this.sensorTypesService.sensorTypesControllerFindAll({ limit: 100 }).subscribe({
      next: (response: any) => {
        const data = this.parseResponse(response);
        
        this.sensorTypeOptions = (data.data || []).map((type: any) => ({
          id: type.idSensorType,
          label: type.category,
          unit: type.defaultUnit || '',
          precision: type.precision || 0.01
        }));
        
        // Only set default if in add mode and no sensorTypeId yet
        if (this.mode === 'add' && !this.formModel.sensorTypeId && this.sensorTypeOptions.length > 0) {
          this.formModel.sensorTypeId = this.sensorTypeOptions[0].id;
          this.onSensorTypeChange();
        }
        
        // In edit mode, sensorTypeId already set from initialValue - no need to change
        
        this.loading = false;
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
