import { Component, OnInit } from '@angular/core';
import { AlertService, OfflineNodesSummary } from '../../../service/alert.service';
import { AuthService } from '../../../services/auth.service';
import { OwnersService } from 'src/sdk/core/services';
import { ProjectsService } from 'src/sdk/core/services';
import { OwnerResponseDto, ProjectResponseDto } from 'src/sdk/core/models';
import { interval } from 'rxjs';

@Component({
    selector: 'iot-dashboard',
    templateUrl: './iot-dashboard.html',
    styleUrls: ['./iot-dashboard.scss'],
    standalone: false
})
export class IotDashboardPage implements OnInit {
    // Owner context for multi-tenant filtering
    currentOwnerId: string | null = null;
    isSuperAdmin = false;

    ownerFilterOptions = [
        { label: 'All Owners', value: 'all' },
        { label: 'PT Adhi Tirta Utama', value: 'adhi' },
        { label: 'PT Garuda Energi', value: 'garuda' },
        { label: 'Pemda Kota Mataram', value: 'mataram' }
    ];

    projectFilterOptions = [
        { label: 'All Projects', value: 'all' },
        { label: 'Area A Distribution', value: 'area-a' },
        { label: 'Reservoir Cluster', value: 'reservoir' },
        { label: 'DMA West', value: 'dma-west' }
    ];

    timeRangeOptions = [
        { label: 'Last 24 Hours', value: '24h' },
        { label: 'Last 7 Days', value: '7d' },
        { label: 'Last 30 Days', value: '30d' }
    ];

    selectedOwner = 'all';
    selectedProject = 'all';
    selectedRange = '24h';

    // Offline nodes summary
    offlineSummary: OfflineNodesSummary = {
        warning: 0,
        critical: 0,
        total: 0
    };

    constructor(
        private alertService: AlertService,
        private authService: AuthService,
        private ownersService: OwnersService,
        private projectsService: ProjectsService
    ) { }

    ngOnInit() {
        // Get current owner ID and role from auth token
        this.currentOwnerId = this.authService.getCurrentOwnerId();
        this.isSuperAdmin = this.authService.isSuperAdmin();

        console.log('Dashboard initialized:', {
            ownerId: this.currentOwnerId,
            isSuperAdmin: this.isSuperAdmin
        });

        // Load dynamic data
        if (this.isSuperAdmin) {
            this.loadOwners(); // Super admin dapat melihat semua owner
        }
        this.loadProjects(); // Load projects berdasarkan owner context

        this.loadOfflineSummary();
        // Refresh every 5 minutes
        interval(300000).subscribe(() => this.loadOfflineSummary());
    }

    loadOwners() {
        // Only for super admin
        this.ownersService.ownersControllerFindAll({ page: 1, limit: 100 }).subscribe({
            next: (response: any) => {
                const owners = response.data || [];
                this.ownerFilterOptions = [
                    { label: 'All Owners', value: 'all' },
                    ...owners.map((owner: OwnerResponseDto) => ({
                        label: owner.name, // Field name adalah 'name'
                        value: owner.idOwner
                    }))
                ];
                console.log('Loaded owners:', this.ownerFilterOptions.length - 1);
            },
            error: (err) => {
                console.error('Error loading owners:', err);
                // Keep hardcoded fallback
            }
        });
    }

    loadProjects() {
        // Filter projects by owner if not super admin
        const params: any = { page: 1, limit: 100 };
        if (this.currentOwnerId) {
            params.idOwner = this.currentOwnerId;
        }

        this.projectsService.projectsControllerFindAll(params).subscribe({
            next: (response: any) => {
                const projects = response.data || [];
                this.projectFilterOptions = [
                    { label: 'All Projects', value: 'all' },
                    ...projects.map((project: ProjectResponseDto) => ({
                        label: project.name, // Field name adalah 'name'
                        value: project.idProject
                    }))
                ];
                console.log('Loaded projects:', this.projectFilterOptions.length - 1, 
                           'for owner:', this.currentOwnerId || 'all');
            },
            error: (err) => {
                console.error('Error loading projects:', err);
                // Keep hardcoded fallback
            }
        });
    }

    loadProjectsByOwner(ownerId: string) {
        // Reload projects when owner dropdown changes (Super Admin only)
        const params: any = { page: 1, limit: 100 };
        
        // If specific owner selected, filter by that owner
        if (ownerId !== 'all') {
            params.idOwner = ownerId;
        }

        console.log('Reloading projects for owner:', ownerId);

        this.projectsService.projectsControllerFindAll(params).subscribe({
            next: (response: any) => {
                const projects = JSON.parse(response).data || [];
               
                this.projectFilterOptions = [
                    { label: 'All Projects', value: 'all' },
                    ...projects.map((project: ProjectResponseDto) => ({
                        label: project.name,
                        value: project.idProject
                    }))
                ];
                console.log('Reloaded projects:', this.projectFilterOptions.length - 1, 
                           'for owner:', ownerId);
            },
            error: (err) => {
                console.error('Error reloading projects:', err);
            }
        });
    }

    loadOfflineSummary() {
        this.alertService.getOfflineNodesSummary(this.currentOwnerId).subscribe({
            next: (data) => {
                this.offlineSummary = data;
            },
            error: (err) => {
                console.error('Error loading offline summary:', err);
            }
        });
    }

    // Computed filter object for widget components
    get dashboardFilters() {
        // For super admin: Use selected owner from dropdown (atau 'all')
        // For owner user: Use their own ownerId from JWT token
        let effectiveOwnerId: string | undefined;
        
        if (this.isSuperAdmin) {
            // Super admin: Use dropdown selection
            effectiveOwnerId = this.selectedOwner !== 'all' ? this.selectedOwner : undefined;
        } else {
            // Owner user: Always use their own ownerId
            effectiveOwnerId = this.currentOwnerId || undefined;
        }

        return {
            ownerId: effectiveOwnerId,
            projectId: this.selectedProject !== 'all' ? this.selectedProject : undefined,
            timeRange: this.selectedRange as '24h' | '7d' | '30d'
        };
    }

    setFilter(type: 'owner' | 'project' | 'range', value: string) {
        if (type === 'owner') {
            this.selectedOwner = value;
            // When owner changes, reload projects for that owner
            this.selectedProject = 'all'; // Reset project selection
            this.loadProjectsByOwner(value); // Reload projects
            
            // ✅ TRIGGER WIDGET RELOAD by updating reference
            // Angular change detection will pick up the new object reference
            console.log('Owner filter changed to:', value, '- Widgets will reload');
        } else if (type === 'project') {
            this.selectedProject = value;
            console.log('Project filter changed to:', value, '- Widgets will reload');
        } else {
            this.selectedRange = value;
            console.log('Time range changed to:', value, '- Widgets will reload');
        }
    }

    getOwnerLabel() {
        if (this.selectedOwner === 'all') {
            return 'all owners';
        }
        return this.ownerFilterOptions.find((option) => option.value === this.selectedOwner)?.label ?? this.selectedOwner;
    }

    getProjectLabel() {
        if (this.selectedProject === 'all') {
            return 'all projects';
        }
        return this.projectFilterOptions.find((option) => option.value === this.selectedProject)?.label ?? this.selectedProject;
    }

    getRangeLabel() {
        return this.timeRangeOptions.find((option) => option.value === this.selectedRange)?.label ?? this.selectedRange;
    }

    resetFilters() {
        this.selectedOwner = 'all';
        this.selectedProject = 'all';
        this.selectedRange = '24h';
    }
}
