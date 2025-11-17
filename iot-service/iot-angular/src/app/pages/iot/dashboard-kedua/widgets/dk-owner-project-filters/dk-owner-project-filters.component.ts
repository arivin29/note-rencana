import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { OwnersService, ProjectsService } from 'src/sdk/core/services';

interface SelectOption {
    label: string;
    value: string;
}

@Component({
    selector: 'dk-owner-project-filters',
    templateUrl: './dk-owner-project-filters.component.html',
    styleUrls: ['./dk-owner-project-filters.component.scss'],
    standalone: false,
})
export class DkOwnerProjectFiltersComponent implements OnInit {
    @Output() filtersChange = new EventEmitter<{ ownerId?: string; projectId?: string; timeRange?: '24h' | '7d' | '30d' }>();

    ownerId?: string;
    projectId?: string;
    timeRange: '24h' | '7d' | '30d' = '24h';
    ownerOptions: SelectOption[] = [];
    projectOptions: SelectOption[] = [];
    loadingOwners = false;
    loadingProjects = false;

    constructor(
        private ownersService: OwnersService,
        private projectsService: ProjectsService
    ) {}

    ngOnInit(): void {
        this.loadOwners();
        this.loadProjects();
    }

    /**
     * Safely parse response - check if it's already an object or a JSON string
     */
    private safeJsonParse(response: any): any {
        if (typeof response === 'string') {
            try {
                return JSON.parse(response);
            } catch (e) {
                console.error('Failed to parse JSON:', e);
                return response;
            }
        }
        return response;
    }

    private loadOwners(): void {
        this.loadingOwners = true;
        this.ownersService.ownersControllerFindAll({ page: 1, limit: 100 }).subscribe({
            next: (response: any) => {
                const data = this.safeJsonParse(response);
                // Map API response to select options
                if (data && data.data && Array.isArray(data.data)) {
                    this.ownerOptions = data.data.map((owner: any) => ({
                        label: owner.name,
                        value: owner.idOwner,
                    }));
                }
                this.loadingOwners = false;
            },
            error: (err: any) => {
                console.error('Error loading owners:', err);
                this.loadingOwners = false;
                // Fallback to dummy data
                this.ownerOptions = [
                    { label: 'PT Adhi Tirta', value: 'owner-adhi' },
                    { label: 'PT Garuda Energi', value: 'owner-garuda' },
                    { label: 'Pemda Kota Mataram', value: 'owner-mataram' },
                ];
            },
        });
    }

    private loadProjects(idOwner?: string): void {
        this.loadingProjects = true;

        // Build params with optional owner filter
        const params: any = { page: 1, limit: 100 };
        if (idOwner) {
            params.idOwner = idOwner;
        }

        this.projectsService.projectsControllerFindAll(params).subscribe({
            next: (response: any) => {
                const data = this.safeJsonParse(response);
                // Map API response to select options
                console.log('Projects response:', data.data);
                if (data && data.data && Array.isArray(data.data)) {
                    this.projectOptions = data.data.map((project: any) => ({
                        label: project.name,
                        value: project.idProject,
                    }));
                }
                this.loadingProjects = false;
            },
            error: (err: any) => {
                console.error('Error loading projects:', err);
                this.loadingProjects = false;
                // Fallback to dummy data
                this.projectOptions = [
                    { label: 'Plant Alpha', value: 'proj-alpha' },
                    { label: 'Pipeline South', value: 'proj-pipeline' },
                    { label: 'Smart Factory', value: 'proj-factory' },
                ];
            },
        });
    }

    onOwnerChange(): void {
        // Reset project selection when owner changes
        this.projectId = undefined;

        // Reload projects filtered by selected owner
        this.loadProjects(this.ownerId);

        // Emit changes
        this.emit();
    }

    onProjectChange(): void {
        // Emit changes when project selection changes
        this.emit();
    }

    emit() {
        this.filtersChange.emit({ ownerId: this.ownerId, projectId: this.projectId, timeRange: this.timeRange });
    }

    setTimeRange(range: '24h' | '7d' | '30d') {
        if (this.timeRange === range) {
            return;
        }
        this.timeRange = range;
        this.emit();
    }
}
