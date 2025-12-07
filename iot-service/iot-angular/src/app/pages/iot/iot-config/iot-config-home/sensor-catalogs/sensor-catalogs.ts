import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SensorCatalogsService } from 'src/sdk/core/services';
import { SensorCatalogResponseDto, CreateSensorCatalogDto, UpdateSensorCatalogDto, PaginationMetaDto } from 'src/sdk/core/models';

@Component({
  selector: 'app-sensor-catalogs',
  templateUrl: './sensor-catalogs.html',
  styleUrls: ['./sensor-catalogs.scss'],
  standalone: false
})
export class SensorCatalogsPage implements OnInit {
  search = '';
  isDrawerOpen = false;
  drawerMode: 'create' | 'edit' = 'create';
  selectedCatalog?: SensorCatalogResponseDto;
  loading = false;
  errorMessage = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50];

  sensorCatalogs: SensorCatalogResponseDto[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private sensorCatalogsService: SensorCatalogsService
  ) {}

  ngOnInit(): void {
    this.loadSensorCatalogs();
  }

  loadSensorCatalogs(): void {
    this.loading = true;
    this.errorMessage = '';

    this.sensorCatalogsService.sensorCatalogsControllerFindAll({
      page: 1,
      limit: 1000, // Load all data for client-side pagination
      search: this.search || undefined
    }).subscribe({
      next: (response: any) => {
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        this.sensorCatalogs = parsed.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading sensor catalogs:', err);
        this.errorMessage = err.message || 'Failed to load sensor catalogs';
        this.loading = false;
      }
    });
  }

  changePageSize(size: number | string) {
    const parsed = Number(size);
    if (!isNaN(parsed) && parsed > 0) {
      this.pageSize = parsed;
      this.currentPage = 1;
    }
  }

  goToPage(page: number) {
    const totalPages = this.totalPages;
    if (page < 1 || page > totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
  }

  onSearchChange(): void {
    this.currentPage = 1; // Reset to first page on search
    this.loadSensorCatalogs();
  }

  get filteredCatalogs() {
    const search = this.search.trim().toLowerCase();
    if (!search) {
      return this.sensorCatalogs;
    }
    return this.sensorCatalogs.filter((catalog) => 
      catalog.modelName.toLowerCase().includes(search) ||
      catalog.vendor.toLowerCase().includes(search)
    );
  }

  get paginatedCatalogs() {
    const catalogs = this.filteredCatalogs;
    const totalPages = this.computeTotalPages(catalogs.length);
    const currentPage = this.normalizeCurrentPage(totalPages);
    const start = (currentPage - 1) * this.pageSize;
    return catalogs.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return this.computeTotalPages(this.filteredCatalogs.length);
  }

  get pageNumbers() {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get paginationStart() {
    if (!this.filteredCatalogs.length) {
      return 0;
    }
    const currentPage = this.normalizeCurrentPage(this.totalPages);
    return (currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd() {
    if (!this.filteredCatalogs.length) {
      return 0;
    }
    return Math.min(this.paginationStart + this.pageSize - 1, this.filteredCatalogs.length);
  }

  get totalEntries() {
    return this.filteredCatalogs.length;
  }

  private computeTotalPages(count: number) {
    return count === 0 ? 1 : Math.ceil(count / this.pageSize);
  }

  private normalizeCurrentPage(totalPages: number) {
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    return this.currentPage;
  }

  openDrawer() {
    this.drawerMode = 'create';
    this.selectedCatalog = undefined;
    this.isDrawerOpen = true;
  }

  openDrawerForEdit(catalog: SensorCatalogResponseDto) {
    this.drawerMode = 'edit';
    this.selectedCatalog = catalog;
    this.isDrawerOpen = true;
  }

  closeDrawer() {
    this.isDrawerOpen = false;
    this.selectedCatalog = undefined;
  }

  handleDrawerSave(dto: CreateSensorCatalogDto | UpdateSensorCatalogDto) {
    this.loading = true;
    this.errorMessage = '';

    if (this.drawerMode === 'edit' && this.selectedCatalog?.idSensorCatalog) {
      // Update existing catalog
      this.sensorCatalogsService.sensorCatalogsControllerUpdate({
        id: this.selectedCatalog.idSensorCatalog,
        body: dto as UpdateSensorCatalogDto
      }).subscribe({
        next: () => {
          this.loadSensorCatalogs();
          this.closeDrawer();
        },
        error: (err) => {
          console.error('Error updating sensor catalog:', err);
          this.errorMessage = err.message || 'Failed to update sensor catalog';
          this.loading = false;
        }
      });
    } else {
      // Create new catalog
      this.sensorCatalogsService.sensorCatalogsControllerCreate({
        body: dto as CreateSensorCatalogDto
      }).subscribe({
        next: () => {
          this.loadSensorCatalogs();
          this.closeDrawer();
        },
        error: (err) => {
          console.error('Error creating sensor catalog:', err);
          this.errorMessage = err.message || 'Failed to create sensor catalog';
          this.loading = false;
        }
      });
    }
  }

  navigateToCatalog(catalog: SensorCatalogResponseDto) {
    if (!catalog.idSensorCatalog) {
      return;
    }
    this.router.navigate([catalog.idSensorCatalog], { relativeTo: this.route });
  }
}
