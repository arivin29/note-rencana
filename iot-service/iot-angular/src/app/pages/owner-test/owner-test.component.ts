import { Component, OnInit } from '@angular/core';
import {
    OwnerResponseDto,
    OwnerDetailResponseDto,
    PaginatedResponseDto,
    OwnerStatisticsResponseDto,
    OwnerWidgetsResponseDto,
    CreateOwnerDto
} from '../../../sdk/core/models';
import { OwnersService } from '../../../sdk/core/services';

@Component({
    selector: 'app-owner-test',
    standalone: false,
    templateUrl: './owner-test.component.html',
    styleUrls: ['./owner-test.component.css']
})
export class OwnerTestComponent implements OnInit {

    // Data properties
    owners: any[] = [];
    selectedOwner: OwnerDetailResponseDto | null = null;
    statistics: OwnerStatisticsResponseDto | null = null;
    widgets: OwnerWidgetsResponseDto | null = null;

    // UI state
    loading = false;
    error: string | null = null;
    currentPage = 1;
    totalPages = 1;

    // Filter parameters
    filterParams = {
        page: 1,
        limit: 10,
        search: '',
        industry: '',
        slaLevel: '',
        hasNodes: '',
        projectStatus: ''
    };

    constructor(private ownersService: OwnersService) { }

    ngOnInit() {
        this.loadOwners();
        this.loadStatistics();
        this.loadWidgets();
    }

    /**
     * Load owners with current filters
     */
    loadOwners() {
        this.loading = true;
        this.error = null;

        // Remove empty filter values
        const params: any = {};
        Object.keys(this.filterParams).forEach(key => {
            const value = (this.filterParams as any)[key];
            if (value !== '' && value !== null && value !== undefined) {
                params[key] = value;
            }
        });

        // Observable pattern - team style
        this.ownersService.ownersControllerFindAll(params).subscribe(
            (response: PaginatedResponseDto) => {
                this.loading = false;
                this.owners = response.data as any[];
                
                if (response.meta) {
                    this.currentPage = response.meta.page || 1;
                    this.totalPages = response.meta.totalPages || 1;
                }
                
                console.log('Owners loaded:', response);
            },
            (err: any) => {
                this.loading = false;
                this.error = err.message || 'Failed to load owners';
                console.error('Error loading owners:', err);
            }
        );
    }

    /**
     * Load owner details
     */
    loadOwnerDetails(id: string) {
        this.loading = true;
        this.error = null;
        
        // Observable pattern - team style
        this.ownersService.ownersControllerFindOneDetailed({ id }).subscribe(
            (response: OwnerDetailResponseDto) => {
                this.loading = false;
                this.selectedOwner = response;
                console.log('Owner details:', this.selectedOwner);
            },
            (err: any) => {
                this.loading = false;
                this.error = err.message || 'Failed to load owner details';
                console.error('Error loading owner details:', err);
            }
        );
    }

    /**
     * Load statistics
     */
    loadStatistics() {
        // Observable pattern - team style
        this.ownersService.ownersControllerGetStatistics({}).subscribe(
            (response: OwnerStatisticsResponseDto) => {
                this.statistics = response;
                console.log('Statistics:', this.statistics);
            },
            (err: any) => {
                console.error('Error loading statistics:', err);
            }
        );
    }

    /**
     * Load widgets data
     */
    loadWidgets() {
        // Observable pattern - team style
        this.ownersService.ownersControllerGetWidgetsData({}).subscribe(
            (response: OwnerWidgetsResponseDto) => {
                this.widgets = response;
                console.log('Widgets:', this.widgets);
            },
            (err: any) => {
                console.error('Error loading widgets:', err);
            }
        );
    }

    /**
     * Create test owner
     */
    createTestOwner() {
        this.loading = true;
        this.error = null;

        const newOwner: CreateOwnerDto = {
            name: 'Test Owner ' + Date.now(),
            industry: 'Water Treatment',
            contactPerson: 'John Doe',
            slaLevel: 'Gold' as any,
            forwardingSettings: {
                enableWebhook: true,
                enableDatabase: false,
                batchSize: 100
            }
        };

        // Observable pattern - team style
        this.ownersService.ownersControllerCreate({ body: newOwner }).subscribe(
            (response: OwnerResponseDto) => {
                this.loading = false;
                console.log('Owner created:', response);
                alert('Owner created successfully!');
                // Reload list
                this.loadOwners();
            },
            (err: any) => {
                this.loading = false;
                this.error = err.message || 'Failed to create owner';
                console.error('Error creating owner:', err);
            }
        );
    }

        /**
     * Delete owner
     */
    deleteOwner(id: string) {
        if (!confirm('Are you sure you want to delete this owner?')) {
            return;
        }

        this.loading = true;
        this.error = null;
        
        // Observable pattern - team style
        this.ownersService.ownersControllerRemove({ id }).subscribe(
            () => {
                this.loading = false;
                console.log('Owner deleted');
                alert('Owner deleted successfully!');
                // Reload list
                this.loadOwners();
            },
            (err: any) => {
                this.loading = false;
                this.error = err.message || 'Failed to delete owner';
                console.error('Error deleting owner:', err);
            }
        );
    }

    /**
     * Apply filters
     */
    applyFilters() {
        this.filterParams.page = 1; // Reset to first page
        this.loadOwners();
    }

    /**
     * Reset filters
     */
    resetFilters() {
        this.filterParams = {
            page: 1,
            limit: 10,
            search: '',
            industry: '',
            slaLevel: '',
            hasNodes: '',
            projectStatus: ''
        };
        this.loadOwners();
    }

    /**
     * Go to page
     */
    goToPage(page: number) {
        if (page < 1 || page > this.totalPages) return;
        this.filterParams.page = page;
        this.loadOwners();
    }

    /**
     * Close details panel
     */
    closeDetails() {
        this.selectedOwner = null;
    }
}
