import { Component, OnInit } from '@angular/core';
import { SensorTypeFormValue } from './sensor-type-drawer/sensor-type-drawer.component';
import { SensorTypesService } from 'src/sdk/core/services';
import { SensorTypeResponseDto, CreateSensorTypeDto } from 'src/sdk/core/models';

@Component({
  selector: 'app-sensor-types',
  templateUrl: './sensor-types.html',
  styleUrls: ['./sensor-types.scss'],
  standalone: false
})
export class SensorTypesPage implements OnInit {
  search = '';
  isDrawerOpen = false;
  isLoading = false;
  error: string | null = null;
  editingType: SensorTypeResponseDto | null = null; // For edit mode

  sensorTypes: SensorTypeResponseDto[] = [];

  constructor(private sensorTypesService: SensorTypesService) {}

  ngOnInit(): void {
    this.loadSensorTypes();
  }

  loadSensorTypes() {
    this.isLoading = true;
    this.error = null;
    
    this.sensorTypesService.sensorTypesControllerFindAll().subscribe({
      next: (data) => {
        this.sensorTypes = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load sensor types:', err);
        this.error = 'Failed to load sensor types. Please try again.';
        this.isLoading = false;
        // Fallback to empty array
        this.sensorTypes = [];
      }
    });
  }

  
  openCreateDrawer() {
    this.editingType = null; // Clear edit mode
    this.isDrawerOpen = true;
  }

  openEditDrawer(type: SensorTypeResponseDto) {
    this.editingType = type;
    this.isDrawerOpen = true;
  }

  handleDrawerClose() {
    this.isDrawerOpen = false;
    this.editingType = null;
  }

  handleDrawerSave(formValue: SensorTypeFormValue) {
    if (formValue.id && this.editingType) {
      // Edit mode - update existing
      this.updateSensorType(formValue);
    } else {
      // Create mode - create new
      this.createSensorType(formValue);
    }
  }

  private createSensorType(formValue: SensorTypeFormValue) {
    const payload: CreateSensorTypeDto = {
      category: formValue.category,
      defaultUnit: formValue.unit,
      precision: parseInt(formValue.precision, 10),
      conversionFormula: formValue.conversionFormula?.trim() || undefined
    };

    this.isLoading = true;
    
    this.sensorTypesService.sensorTypesControllerCreate({ body: payload }).subscribe({
      next: (created) => {
        this.sensorTypes = [created, ...this.sensorTypes];
        this.isDrawerOpen = false;
        this.editingType = null;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to create sensor type:', err);
        alert('Failed to create sensor type: ' + (err.error?.message || 'Unknown error'));
        this.isLoading = false;
      }
    });
  }

  private updateSensorType(formValue: SensorTypeFormValue) {
    if (!formValue.id) return;

    const payload = {
      category: formValue.category,
      defaultUnit: formValue.unit,
      precision: parseInt(formValue.precision, 10),
      conversionFormula: formValue.conversionFormula?.trim() || undefined
    };

    this.isLoading = true;
    
    this.sensorTypesService.sensorTypesControllerUpdate({ 
      id: formValue.id, 
      body: payload 
    }).subscribe({
      next: (updated) => {
        // Update the list
        const index = this.sensorTypes.findIndex(t => t.idSensorType === formValue.id);
        if (index !== -1) {
          this.sensorTypes[index] = updated;
          this.sensorTypes = [...this.sensorTypes]; // Trigger change detection
        }
        this.isDrawerOpen = false;
        this.editingType = null;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to update sensor type:', err);
        alert('Failed to update sensor type: ' + (err.error?.message || 'Unknown error'));
        this.isLoading = false;
      }
    });
  }

  deleteSensorType(id: string) {
    if (!confirm('Are you sure you want to delete this sensor type?')) {
      return;
    }

    this.sensorTypesService.sensorTypesControllerRemove({ id }).subscribe({
      next: () => {
        this.sensorTypes = this.sensorTypes.filter(t => t.idSensorType !== id);
      },
      error: (err) => {
        console.error('Failed to delete sensor type:', err);
        alert('Failed to delete sensor type: ' + (err.error?.message || 'Unknown error'));
      }
    });
  }

  get filteredSensorTypes() {
    const term = this.search.trim().toLowerCase();
    if (!term) {
      return this.sensorTypes;
    }
    return this.sensorTypes.filter((type) =>
      type.category.toLowerCase().includes(term) ||
      type.defaultUnit?.toLowerCase().includes(term) ||
      type.conversionFormula?.toLowerCase().includes(term)
    );
  }
}
