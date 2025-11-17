import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NodeModelResponseDto, UnpairedDeviceResponseDto, UnpairedDeviceStatsDto } from 'src/sdk/core/models';
import { NodeModelsService, UnpairedDevicesService } from 'src/sdk/core/services';

type StatusFilter = 'All' | 'Active (< 1h)' | 'Recent (< 24h)' | 'Stale (> 7d)';

type SortColumn = 'lastSeenAt' | 'firstSeenAt' | 'seenCount' | 'hardwareId';

type SortOrder = 'asc' | 'desc';

@Component({
    selector: 'unpaired-devices-list',
    templateUrl: './unpaired-devices-list.html',
    styleUrls: ['./unpaired-devices-list.scss'],
    standalone: false,
})
export class UnpairedDevicesListPage implements OnInit {
    searchTerm = '';
    filters: { nodeModel: string; status: StatusFilter } = {
        nodeModel: 'All Models',
        status: 'All',
    };

    pageSizeOptions = [10, 20, 50];
    pageSize = 10;
    currentPage = 1;

    devices: UnpairedDeviceResponseDto[] = [];
    stats: UnpairedDeviceStatsDto | null = null;
    loading = false;
    error: string | null = null;
    loadingNodeModels = false;

    nodeModelOptions: string[] = ['All Models'];
    private nodeModelLookup: Record<string, string | undefined> = {};
    private nodeModels: NodeModelResponseDto[] = [];

    statusOptions: StatusFilter[] = ['All', 'Active (< 1h)', 'Recent (< 24h)', 'Stale (> 7d)'];

    sortBy: SortColumn = 'lastSeenAt';
    sortOrder: SortOrder = 'desc';

    constructor(
        private modalService: NgbModal,
        private unpairedDevicesService: UnpairedDevicesService,
        private nodeModelsService: NodeModelsService,
    ) { }

    ngOnInit(): void {
        this.loadNodeModels();
        this.loadDevices();
    }

    loadDevices(): void {
        this.loading = true;
        this.error = null;

        const params: any = {
            limit: 1000,
            offset: 0,
        };

        // Add status filter if not 'All'
        if (this.filters.status !== 'All') {
            const statusMap: Record<string, string> = {
                'Active (< 1h)': 'pending',
                'Recent (< 24h)': 'pending',
                'Stale (> 7d)': 'pending',
            };
            params.status = statusMap[this.filters.status] || 'pending';
        }

        // Add node model filter
        const nodeModelId = this.getNodeModelIdForFilter();
        if (nodeModelId) {
            params.nodeModelId = nodeModelId;
        }

        this.unpairedDevicesService.unpairedDevicesControllerFindAll(params).subscribe({
            next: (devices) => {
                this.devices = devices;
                this.currentPage = 1;
                this.ensureDeviceModelsInLookup();
                this.loadStats();
                this.loading = false;
            },
            error: (err) => {
                this.error = err?.error?.message || 'Failed to load unpaired devices';
                this.devices = [];
                this.loading = false;
            },
        });
    }

    loadStats(): void {
        this.unpairedDevicesService.unpairedDevicesControllerGetStats().subscribe({
            next: (stats) => {
                this.stats = stats;
            },
            error: (err) => {
                console.error('Failed to load stats:', err);
            },
        });
    }

    onSearchChange(value: string): void {
        this.searchTerm = value;
    }

    reloadFromSearch(): void {
        this.currentPage = 1;
        this.loadDevices();
    }

    setFilter(type: 'nodeModel' | 'status', value: string): void {
        if (type === 'status') {
            this.filters.status = value as StatusFilter;
        } else {
            this.filters.nodeModel = value;
            this.loadDevices();
        }
        this.currentPage = 1;
    }

    changePageSize(size: number | string): void {
        const parsed = Number(size);
        if (!isNaN(parsed) && parsed > 0) {
            this.pageSize = parsed;
            this.currentPage = 1;
        }
    }

    goToPage(page: number): void {
        const totalPages = this.totalPages;
        if (page < 1 || page > totalPages || page === this.currentPage) {
            return;
        }
        this.currentPage = page;
    }

    statusCount(status: StatusFilter): number {
        if (status === 'All') {
            return this.filteredByModelAndSearch.length;
        }
        return this.filteredByModelAndSearch.filter(
            (device) => this.getStatusBucket(device) === status,
        ).length;
    }

    sortData(column: SortColumn): void {
        if (this.sortBy === column) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = column;
            this.sortOrder = 'desc';
        }
        this.loadDevices();
    }

    sortIcon(column: SortColumn): string {
        if (this.sortBy !== column) {
            return 'fa fa-sort text-muted';
        }
        return this.sortOrder === 'asc' ? 'fa fa-sort-up' : 'fa fa-sort-down';
    }

    openPairingDialog(device: UnpairedDeviceResponseDto): void {
        import('../pairing-dialog/pairing-dialog').then((m) => {
            const modalRef = this.modalService.open(m.PairingDialogComponent, {
                size: 'lg',
                backdrop: 'static',
            });
            modalRef.componentInstance.device = device;
            modalRef.result.then(
                (result) => {
                    if (result && result.success) {
                        this.loadDevices();
                    }
                },
                () => undefined,
            );
        });
    }

    viewPayload(device: UnpairedDeviceResponseDto): void {
        const jsonStr = JSON.stringify(device.lastPayload, null, 2);
        alert(`Last Payload:\n\n${jsonStr}`);
    }

    ignoreDevice(device: UnpairedDeviceResponseDto): void {
        if (confirm(`Mark device ${device.hardwareId} as ignored?`)) {
            this.unpairedDevicesService
                .unpairedDevicesControllerIgnoreDevice({ id: device.idNodeUnpairedDevice })
                .subscribe({
                    next: () => {
                        this.loadDevices();
                    },
                    error: (err) => {
                        console.error(err);
                        alert('Failed to mark device as ignored');
                    },
                });
        }
    }

    deleteUnpairedDevice(device: UnpairedDeviceResponseDto): void {
        if (confirm(`Delete unpaired device ${device.hardwareId}? This action cannot be undone.`)) {
            this.unpairedDevicesService
                .unpairedDevicesControllerRemove({ id: device.idNodeUnpairedDevice })
                .subscribe({
                    next: () => this.loadDevices(),
                    error: (err) => {
                        console.error(err);
                        alert('Failed to delete unpaired device');
                    },
                });
        }
    }

    get paginatedDevices(): UnpairedDeviceResponseDto[] {
        const devices = this.filteredDevices;
        const totalPages = this.computeTotalPages(devices.length);
        const currentPage = this.normalizeCurrentPage(totalPages);
        const start = (currentPage - 1) * this.pageSize;
        return devices.slice(start, start + this.pageSize);
    }

    get totalPages(): number {
        return this.computeTotalPages(this.filteredDevices.length);
    }

    get paginationStart(): number {
        if (!this.filteredDevices.length) {
            return 0;
        }
        const currentPage = this.normalizeCurrentPage(this.totalPages);
        return (currentPage - 1) * this.pageSize + 1;
    }

    get paginationEnd(): number {
        if (!this.filteredDevices.length) {
            return 0;
        }
        return Math.min(this.paginationStart + this.pageSize - 1, this.filteredDevices.length);
    }

    get totalEntries(): number {
        return this.filteredDevices.length;
    }

    get pageNumbers(): number[] {
        return Array.from({ length: this.totalPages }, (_, idx) => idx + 1);
    }

    getTimeSince(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    private ensureDeviceModelsInLookup(): void {
        const lookup = { ...this.nodeModelLookup };
        let updated = false;
        this.devices.forEach((device) => {
            const modelName = this.asString(device.nodeModelName);
            if (modelName && !lookup[modelName]) {
                lookup[modelName] = this.asString(device.idNodeModel) || undefined;
                updated = true;
            }
        });
        if (updated) {
            this.nodeModelLookup = lookup;
            this.nodeModelOptions = ['All Models', ...Object.keys(lookup)];
        }
    }

    get totalUnpaired(): number {
        return this.stats?.total || this.devices.length;
    }

    get activeToday(): number {
        return this.stats?.seenLast24h || 0;
    }

    get withSuggestion(): number {
        return this.stats?.withSuggestions || 0;
    }

    get avgSeenCount(): number {
        const total = this.devices.length;
        return total
            ? Math.round(this.devices.reduce((sum, device) => sum + device.seenCount, 0) / total)
            : 0;
    }

    private get filteredDevices(): UnpairedDeviceResponseDto[] {
        const base = this.filteredByModelAndSearch;
        if (this.filters.status === 'All') {
            return base;
        }
        return base.filter((device) => this.getStatusBucket(device) === this.filters.status);
    }

    private get filteredByModelAndSearch(): UnpairedDeviceResponseDto[] {
        const search = this.searchTerm.trim().toLowerCase();
        return this.devices.filter((device) => {
            const nodeModelName = this.asString(device.nodeModelName);
            const lastTopic = this.asString(device.lastTopic).toLowerCase();
            const suggestedOwner = this.asString(device.suggestedOwner).toLowerCase();
            const suggestedProject = this.asString(device.suggestedProject).toLowerCase();

            const matchModel =
                this.filters.nodeModel === 'All Models' ||
                nodeModelName === this.filters.nodeModel;
            const matchSearch =
                !search ||
                device.hardwareId.toLowerCase().includes(search) ||
                (lastTopic && lastTopic.includes(search)) ||
                (suggestedOwner && suggestedOwner.includes(search)) ||
                (suggestedProject && suggestedProject.includes(search));
            return matchModel && matchSearch;
        });
    }

    private getStatusBucket(device: UnpairedDeviceResponseDto): StatusFilter {
        const hours = this.hoursSince(device.lastSeenAt);
        if (hours <= 1) {
            return 'Active (< 1h)';
        }
        if (hours <= 24) {
            return 'Recent (< 24h)';
        }
        if (hours >= 24 * 7) {
            return 'Stale (> 7d)';
        }
        return 'Recent (< 24h)';
    }

    private hoursSince(dateString: string): number {
        const diffMs = Date.now() - new Date(dateString).getTime();
        return diffMs / (1000 * 60 * 60);
    }

    private computeTotalPages(count: number): number {
        return count === 0 ? 1 : Math.ceil(count / this.pageSize);
    }

    private normalizeCurrentPage(totalPages: number): number {
        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }
        if (this.currentPage < 1) {
            this.currentPage = 1;
        }
        return this.currentPage;
    }

    private getNodeModelIdForFilter(): string | undefined {
        if (this.filters.nodeModel === 'All Models') {
            return undefined;
        }
        return this.nodeModelLookup[this.filters.nodeModel];
    }

    private asString(value: unknown): string {
        return typeof value === 'string' ? value : '';
    }

    private loadNodeModels(): void {
        this.loadingNodeModels = true;
        this.nodeModelsService
            .nodeModelsControllerFindAll$Response({ limit: 500 })
            .subscribe({
                next: (response: any) => {
                    const body = JSON.parse(response.body);
                    console.log('Node models response body:', body);
                    const models = (body?.data || body || []) as NodeModelResponseDto[];
                    this.nodeModels = models;
                    const lookup: Record<string, string | undefined> = {};
                    models.forEach((model) => {
                        const label = this.formatModelLabel(model);
                        lookup[label] = model.idNodeModel;
                    });
                    this.nodeModelLookup = lookup;
                    this.nodeModelOptions = ['All Models', ...Object.keys(lookup)];
                    if (this.filters.nodeModel !== 'All Models' && !lookup[this.filters.nodeModel]) {
                        this.filters.nodeModel = 'All Models';
                    }
                    this.ensureDeviceModelsInLookup();
                    this.loadingNodeModels = false;
                },
                error: (err) => {
                    console.error('Failed to load node models', err);
                    this.loadingNodeModels = false;
                },
            });
    }

    private formatModelLabel(model: NodeModelResponseDto): string {
        return [model.vendor, model.modelName].filter(Boolean).join(' - ');
    }
}
