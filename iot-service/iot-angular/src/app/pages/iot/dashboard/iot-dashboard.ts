import { Component, OnInit } from '@angular/core';
import { AlertService, OfflineNodesSummary } from '../../../service/alert.service';
import { AuthService } from '../../../services/auth.service';
import { OwnersService } from 'src/sdk/core/services';
import { ProjectsService } from 'src/sdk/core/services';
import { NodesService } from 'src/sdk/core/services';
import { SensorLogsService } from 'src/sdk/core/services';
import { OwnerResponseDto, ProjectResponseDto } from 'src/sdk/core/models';
import { interval } from 'rxjs';

interface QuickStat {
    icon: string;
    iconClass: string;
    value: string | number;
    label: string;
    detail?: string;
    link: string;
}

interface AttentionItem {
    icon: string;
    title: string;
    source: string;
    time: string;
    severity: 'warning' | 'danger' | 'info';
    link: string;
}

interface ProjectOverviewItem {
    id: string;
    name: string;
    nodesOnline: number;
    nodesOffline: number;
    sensorsActive: number;
    health: 'good' | 'warning' | 'critical';
}

interface ActivityItem {
    type: 'success' | 'warning' | 'danger' | 'info';
    text: string;
    time: string;
}

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
    loading = true;
    filtersExpanded = false;

    // Welcome header data
    greeting = 'Selamat Datang';
    ownerName = '';

    // Summary stats
    summaryStats = {
        owners: 0,
        projects: 0,
        totalNodes: 0,
        nodesOnline: 0,
        todayDataPoints: 0
    };

    // Quick stats cards
    quickStats: QuickStat[] = [];

    // Attention items
    attentionItems: AttentionItem[] = [];

    // Project overview
    projectOverview: ProjectOverviewItem[] = [];

    // Recent activities
    recentActivities: ActivityItem[] = [];

    // Node health summary
    nodeHealthSummary = {
        online: 0,
        degraded: 0,
        offline: 0,
        onlinePercent: 0,
        degradedPercent: 0,
        offlinePercent: 0
    };

    ownerFilterOptions = [
        { label: 'All Owners', value: 'all' }
    ];

    projectFilterOptions = [
        { label: 'All Projects', value: 'all' }
    ];

    timeRangeOptions = [
        { label: 'Last 24 Hours', value: '24h' },
        { label: 'Last 7 Days', value: '7d' },
        { label: 'Last 30 Days', value: '30d' }
    ];

    selectedOwner = 'all';
    selectedProject = 'all';
    selectedRange = '24h';

    // Offline nodes summary (legacy)
    offlineSummary: OfflineNodesSummary = {
        warning: 0,
        critical: 0,
        total: 0
    };

    constructor(
        private alertService: AlertService,
        private authService: AuthService,
        private ownersService: OwnersService,
        private projectsService: ProjectsService,
        private nodesService: NodesService,
        private sensorLogsService: SensorLogsService
    ) { }

    ngOnInit() {
        // Set greeting based on time
        this.setGreeting();

        // Get current owner ID and role from auth token
        this.currentOwnerId = this.authService.getCurrentOwnerId();
        this.isSuperAdmin = this.authService.isSuperAdmin();
        this.ownerName = this.authService.currentUserValue?.name || 'User';

        console.log('Dashboard initialized:', {
            ownerId: this.currentOwnerId,
            isSuperAdmin: this.isSuperAdmin,
            ownerName: this.ownerName
        });

        // Load all dashboard data
        this.loadDashboardData();

        // Refresh every 5 minutes
        interval(300000).subscribe(() => this.loadDashboardData());
    }

    setGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) {
            this.greeting = 'Selamat Pagi';
        } else if (hour < 15) {
            this.greeting = 'Selamat Siang';
        } else if (hour < 18) {
            this.greeting = 'Selamat Sore';
        } else {
            this.greeting = 'Selamat Malam';
        }
    }

    loadDashboardData() {
        this.loading = true;

        // Load owners (for super admin)
        if (this.isSuperAdmin) {
            this.loadOwners();
        }

        // Load projects
        this.loadProjects();

        // Load nodes summary
        this.loadNodesSummary();

        // Load offline summary
        this.loadOfflineSummary();

        // Load today's data points
        this.loadTodayStats();
    }

    loadOwners() {
        this.ownersService.ownersControllerFindAll({ page: 1, limit: 100 }).subscribe({
            next: (response: any) => {
                const data = typeof response === 'string' ? JSON.parse(response) : response;
                const owners = data.data || [];
                this.summaryStats.owners = owners.length;
                this.ownerFilterOptions = [
                    { label: 'All Owners', value: 'all' },
                    ...owners.map((owner: OwnerResponseDto) => ({
                        label: owner.name,
                        value: owner.idOwner
                    }))
                ];
            },
            error: (err) => console.error('Error loading owners:', err)
        });
    }

    loadProjects() {
        const params: any = { page: 1, limit: 100 };
        if (this.currentOwnerId && !this.isSuperAdmin) {
            params.idOwner = this.currentOwnerId;
        }

        this.projectsService.projectsControllerFindAll(params).subscribe({
            next: (response: any) => {
                const data = typeof response === 'string' ? JSON.parse(response) : response;
                const projects = data.data || [];
                this.summaryStats.projects = projects.length;

                this.projectFilterOptions = [
                    { label: 'All Projects', value: 'all' },
                    ...projects.map((project: ProjectResponseDto) => ({
                        label: project.name,
                        value: project.idProject
                    }))
                ];

                // Build project overview
                this.projectOverview = projects.slice(0, 5).map((project: any) => ({
                    id: project.idProject,
                    name: project.name,
                    nodesOnline: project.stats?.nodesOnline || 0,
                    nodesOffline: project.stats?.nodesOffline || 0,
                    sensorsActive: project.stats?.sensorsActive || 0,
                    health: this.calculateProjectHealth(project)
                }));

                this.updateQuickStats();
            },
            error: (err) => console.error('Error loading projects:', err)
        });
    }

    loadNodesSummary() {
        const params: any = { page: 1, limit: 1000 };
        if (this.currentOwnerId && !this.isSuperAdmin) {
            params.idOwner = this.currentOwnerId;
        }

        this.nodesService.nodesControllerFindAll(params).subscribe({
            next: (response: any) => {
                const data = typeof response === 'string' ? JSON.parse(response) : response;
                const nodes = data.data || [];
                
                this.summaryStats.totalNodes = nodes.length;
                
                let online = 0, degraded = 0, offline = 0;
                nodes.forEach((node: any) => {
                    const status = node.connectivityStatus?.toLowerCase() || 'offline';
                    if (status === 'online') online++;
                    else if (status === 'degraded') degraded++;
                    else offline++;
                });

                this.summaryStats.nodesOnline = online;
                this.nodeHealthSummary = {
                    online,
                    degraded,
                    offline,
                    onlinePercent: nodes.length > 0 ? (online / nodes.length) * 100 : 0,
                    degradedPercent: nodes.length > 0 ? (degraded / nodes.length) * 100 : 0,
                    offlinePercent: nodes.length > 0 ? (offline / nodes.length) * 100 : 0
                };

                this.updateQuickStats();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading nodes:', err);
                this.loading = false;
            }
        });
    }

    loadOfflineSummary() {
        this.alertService.getOfflineNodesSummary(this.currentOwnerId).subscribe({
            next: (data) => {
                this.offlineSummary = data;
                this.buildAttentionItems();
            },
            error: (err) => console.error('Error loading offline summary:', err)
        });
    }

    loadTodayStats() {
        // Get today's sensor logs count
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        
        const params: any = {
            startDate: startOfDay,
            page: 1,
            limit: 1
        };
        if (this.currentOwnerId && !this.isSuperAdmin) {
            params.idOwner = this.currentOwnerId;
        }

        this.sensorLogsService.sensorLogsControllerFindAll(params).subscribe({
            next: (response: any) => {
                const data = typeof response === 'string' ? JSON.parse(response) : response;
                this.summaryStats.todayDataPoints = data.total || 0;
                this.updateQuickStats();
            },
            error: (err) => console.error('Error loading today stats:', err)
        });

        // Build recent activities from recent logs
        this.buildRecentActivities();
    }

    updateQuickStats() {
        this.quickStats = [
            {
                icon: 'bi bi-diagram-3-fill',
                iconClass: 'icon-primary',
                value: this.summaryStats.projects,
                label: 'Project',
                detail: 'aktif',
                link: '/iot/projects'
            },
            {
                icon: 'bi bi-router-fill',
                iconClass: 'icon-success',
                value: this.summaryStats.totalNodes,
                label: 'Node',
                detail: `${this.summaryStats.nodesOnline} online`,
                link: '/iot/nodes'
            },
            {
                icon: 'bi bi-activity',
                iconClass: 'icon-info',
                value: this.summaryStats.todayDataPoints,
                label: 'Data Hari Ini',
                link: '/iot/telemetry'
            },
            {
                icon: 'bi bi-bell-fill',
                iconClass: this.offlineSummary.total > 0 ? 'icon-danger' : 'icon-success',
                value: this.offlineSummary.total,
                label: 'Alert',
                detail: this.offlineSummary.total > 0 ? 'perlu aksi' : 'aman',
                link: '/iot/alerts'
            }
        ];
    }

    buildAttentionItems() {
        this.attentionItems = [];

        // Add offline nodes as attention items
        if (this.offlineSummary.critical > 0) {
            this.attentionItems.push({
                icon: 'bi bi-router',
                title: `${this.offlineSummary.critical} node offline lebih dari 1 jam`,
                source: 'System Monitor',
                time: 'Baru saja',
                severity: 'danger',
                link: '/iot/alerts'
            });
        }

        if (this.offlineSummary.warning > 0) {
            this.attentionItems.push({
                icon: 'bi bi-exclamation-triangle',
                title: `${this.offlineSummary.warning} node tidak merespons > 30 menit`,
                source: 'System Monitor',
                time: 'Baru saja',
                severity: 'warning',
                link: '/iot/alerts'
            });
        }
    }

    buildRecentActivities() {
        // For now, generate sample activities based on current state
        this.recentActivities = [];

        if (this.summaryStats.todayDataPoints > 0) {
            this.recentActivities.push({
                type: 'success',
                text: `${this.summaryStats.todayDataPoints} data baru diterima hari ini`,
                time: 'Hari ini'
            });
        }

        if (this.summaryStats.nodesOnline > 0) {
            this.recentActivities.push({
                type: 'success',
                text: `${this.summaryStats.nodesOnline} node aktif dan mengirim data`,
                time: 'Saat ini'
            });
        }

        if (this.offlineSummary.total > 0) {
            this.recentActivities.push({
                type: 'warning',
                text: `${this.offlineSummary.total} node memerlukan perhatian`,
                time: 'Perlu dicek'
            });
        }
    }

    calculateProjectHealth(project: any): 'good' | 'warning' | 'critical' {
        const offline = project.stats?.nodesOffline || 0;
        const total = (project.stats?.nodesOnline || 0) + offline;
        if (total === 0) return 'good';
        const offlinePercent = (offline / total) * 100;
        if (offlinePercent > 50) return 'critical';
        if (offlinePercent > 0) return 'warning';
        return 'good';
    }

    loadProjectsByOwner(ownerId: string) {
        const params: any = { page: 1, limit: 100 };
        if (ownerId !== 'all') {
            params.idOwner = ownerId;
        }

        this.projectsService.projectsControllerFindAll(params).subscribe({
            next: (response: any) => {
                const data = typeof response === 'string' ? JSON.parse(response) : response;
                const projects = data.data || [];
                this.projectFilterOptions = [
                    { label: 'All Projects', value: 'all' },
                    ...projects.map((project: ProjectResponseDto) => ({
                        label: project.name,
                        value: project.idProject
                    }))
                ];
            },
            error: (err) => console.error('Error reloading projects:', err)
        });
    }

    // Computed filter object for widget components
    get dashboardFilters() {
        let effectiveOwnerId: string | undefined;
        
        if (this.isSuperAdmin) {
            effectiveOwnerId = this.selectedOwner !== 'all' ? this.selectedOwner : undefined;
        } else {
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
            this.selectedProject = 'all';
            this.loadProjectsByOwner(value);
        } else if (type === 'project') {
            this.selectedProject = value;
        } else {
            this.selectedRange = value;
        }
        // Reload dashboard data when filters change
        this.loadDashboardData();
    }

    getOwnerLabel() {
        if (this.selectedOwner === 'all') return 'all owners';
        return this.ownerFilterOptions.find(o => o.value === this.selectedOwner)?.label ?? this.selectedOwner;
    }

    getProjectLabel() {
        if (this.selectedProject === 'all') return 'all projects';
        return this.projectFilterOptions.find(o => o.value === this.selectedProject)?.label ?? this.selectedProject;
    }

    getRangeLabel() {
        return this.timeRangeOptions.find(o => o.value === this.selectedRange)?.label ?? this.selectedRange;
    }

    resetFilters() {
        this.selectedOwner = 'all';
        this.selectedProject = 'all';
        this.selectedRange = '24h';
        this.loadDashboardData();
    }
}
