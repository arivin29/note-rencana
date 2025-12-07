import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SensorCatalogsService } from 'src/sdk/core/services';
import { SensorCatalogResponseDto } from 'src/sdk/core/models';

@Component({
  selector: 'app-sensor-catalog-detail',
  templateUrl: './sensor-catalog-detail.html',
  styleUrls: ['./sensor-catalog-detail.scss'],
  standalone: false
})
export class SensorCatalogDetailPage implements OnInit {
  catalog?: SensorCatalogResponseDto;
  loading = false;
  errorMessage = '';
  isDrawerOpen = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sensorCatalogsService: SensorCatalogsService
  ) {}

  ngOnInit(): void {
    const idSensorCatalog = this.route.snapshot.paramMap.get('id');
    if (idSensorCatalog) {
      this.loadCatalogDetail(idSensorCatalog);
    } else {
      this.router.navigate(['/iot/config/sensor-catalogs']);
    }
  }

  loadCatalogDetail(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.sensorCatalogsService.sensorCatalogsControllerFindOne({ id }).subscribe({
      next: (response: any) => {
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        this.catalog = parsed.data || parsed;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading sensor catalog:', err);
        this.errorMessage = err.message || 'Failed to load sensor catalog';
        this.loading = false;
      }
    });
  }

  openEditDrawer(): void {
    this.isDrawerOpen = true;
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
  }

  handleDrawerSave(dto: any): void {
    if (!this.catalog?.idSensorCatalog) return;

    this.loading = true;
    this.errorMessage = '';

    this.sensorCatalogsService.sensorCatalogsControllerUpdate({
      id: this.catalog.idSensorCatalog,
      body: dto
    }).subscribe({
      next: () => {
        this.loadCatalogDetail(this.catalog!.idSensorCatalog);
        this.closeDrawer();
      },
      error: (err) => {
        console.error('Error updating sensor catalog:', err);
        this.errorMessage = err.message || 'Failed to update sensor catalog';
        this.loading = false;
      }
    });
  }

  deleteCatalog(): void {
    if (!this.catalog?.idSensorCatalog) return;

    if (!confirm(`Are you sure you want to delete "${this.catalog.modelName}"?`)) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.sensorCatalogsService.sensorCatalogsControllerRemove({ id: this.catalog.idSensorCatalog }).subscribe({
      next: () => {
        this.router.navigate(['/iot/config/sensor-catalogs']);
      },
      error: (err) => {
        console.error('Error deleting sensor catalog:', err);
        this.errorMessage = err.message || 'Failed to delete sensor catalog';
        this.loading = false;
      }
    });
  }
}
