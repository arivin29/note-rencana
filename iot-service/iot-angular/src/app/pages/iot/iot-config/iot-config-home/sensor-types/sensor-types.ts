import { Component, OnInit } from '@angular/core';
import { SensorTypeFormValue } from './sensor-type-drawer/sensor-type-drawer.component';
import { SensorTypesService } from 'src/sdk/core/services';
import { SensorContextService } from 'src/sdk/core/services/sensor-context.service';
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

  // installation profile mapping (per sensor_type)
  profiles: Array<{ idProfile: string; code: string; name: string }> = [];
  typeProfile: Record<string, string> = {}; // idSensorType -> idProfile

  constructor(
    private sensorTypesService: SensorTypesService,
    private sensorContextService: SensorContextService
  ) {}

  ngOnInit(): void {
    this.loadSensorTypes();
    this.loadProfiles();
    this.loadTypeProfiles();
  }

  private parseBody(b: any): any {
    if (typeof b === 'string') { try { return JSON.parse(b); } catch { return null; } }
    return b;
  }

  loadProfiles() {
    this.sensorContextService.profilesList$Response().subscribe({
      next: (r) => { this.profiles = this.parseBody(r.body) || []; },
      error: () => {}
    });
  }

  loadTypeProfiles() {
    this.sensorContextService.sensorTypeProfilesList$Response().subscribe({
      next: (r) => {
        const rows = this.parseBody(r.body) || [];
        const map: Record<string, string> = {};
        for (const m of rows) map[m.idSensorType] = m.idProfile;
        this.typeProfile = map;
      },
      error: () => {}
    });
  }

  onProfileChange(type: SensorTypeResponseDto, idProfile: string) {
    this.typeProfile[type.idSensorType] = idProfile;
    this.sensorContextService.setSensorTypeProfile$Response({
      id: type.idSensorType,
      body: { idProfile: idProfile || '' }
    }).subscribe({
      next: () => {},
      error: (err) => alert('Failed to set profile: ' + (err.error?.message || 'Unknown error'))
    });
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
