import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AddChannelFormValue, SensorTypeOption } from '../node-detail-add-channel-drawer/node-detail-add-channel-drawer.component';
import { SensorChannelsService } from '../../../../../../sdk/core/services/sensor-channels.service';

interface SensorReading {
    id: number;
    timestamp: Date;
    value: number;
    unit: string;
    status: 'online' | 'offline' | 'warning' | 'error';
    quality: number;
    notes?: string;
}

@Component({
    selector: 'app-sensor-chanel-detail',
    templateUrl: './sensor-chanel-detail.html',
    styleUrls: ['./sensor-chanel-detail.scss'],
    standalone: false
})
export class SensorChanelDetail implements OnInit {
    // Math utility for template
    Math = Math;

    // Route params
    channelId: string = '';
    nodeId: string = '';

    // Sensor Info
    sensorName: string = 'Loading...';
    sensorType: string = '';
    sensorLocation: string = '';
    sensorUnit: string = '';

    // All readings data
    allReadings: SensorReading[] = [];

    // Filtered and paginated data
    filteredReadings: SensorReading[] = [];
    displayedReadings: SensorReading[] = [];

    // Filter properties
    selectedPeriod: string = 'last7days';  // Default to last 7 days to show seed data
    selectedStatus: string = 'all';
    dateFrom: string = '';
    dateTo: string = '';

    // Pagination properties
    currentPage: number = 1;
    pageSize: number = 10;
    totalPages: number = 0;
    totalRecords: number = 0;

    // Pagination options
    pageSizeOptions: number[] = [10, 25, 50, 100];

    // Period options
    periodOptions = [
        { value: 'today', label: 'Hari Ini' },
        { value: 'yesterday', label: 'Kemarin' },
        { value: 'last7days', label: '7 Hari Terakhir' },
        { value: 'last30days', label: '30 Hari Terakhir' },
        { value: 'thisMonth', label: 'Bulan Ini' },
        { value: 'lastMonth', label: 'Bulan Lalu' },
        { value: 'custom', label: 'Custom Range' }
    ];

    // Status options
    statusOptions = [
        { value: 'all', label: 'Semua Status' },
        { value: 'online', label: 'Online' },
        { value: 'warning', label: 'Warning' },
        { value: 'error', label: 'Error' },
        { value: 'offline', label: 'Offline' }
    ];

    channelMeta: (AddChannelFormValue & { sensorTypeLabel: string }) = {
        sensorId: '',
        channelId: '',
        metricCode: '',
        unit: '',
        precision: 0.01,
        minThreshold: 0,
        maxThreshold: 100,
        sensorTypeId: '',
        sensorTypeLabel: ''
    };

    isChannelDrawerOpen = false;
    channelDrawerMode: 'add' | 'edit' = 'edit';
    loading = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private sensorChannelsService: SensorChannelsService
    ) { }

    ngOnInit() {
        // Get channel ID from route params
        this.route.paramMap.subscribe((params) => {
            const channelId = params.get('sensorId'); // route param is 'sensorId' but it's actually channelId
            const nodeId = params.get('nodeId');

            if (channelId && nodeId) {
                this.channelId = channelId;
                this.nodeId = nodeId;
                this.loadChannelData();
            }
        });
    }

    /**
     * Load channel data from backend
     */
    loadChannelData() {
        if (!this.channelId) return;

        this.loading = true;

        // Get time range for filtering (default: last 7 days)
        const endDate = new Date();
        const startDate = this.getFilterStartDate();

        this.sensorChannelsService.sensorChannelsControllerGetReadings({
            id: this.channelId,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString()
        }).subscribe({
            next: (response: any) => {
                // Parse JSON response from SDK (SDK returns stringified JSON)
                const data = JSON.parse(response);

                // Map channel metadata
                const channel = data.channel || {};
                this.sensorName = channel.metricCode || 'Unknown';
                this.sensorType = channel.sensorType || 'Unknown';
                this.sensorLocation = `Node: ${channel.nodeCode || 'Unknown'}`;
                this.sensorUnit = channel.unit || '';

                this.channelMeta = {
                    sensorId: channel.idSensorChannel || '',
                    channelId: channel.metricCode || '',
                    metricCode: channel.metricCode || '',
                    unit: channel.unit || '',
                    precision: channel.precision || 0.01,
                    minThreshold: parseFloat(channel.minThreshold) || 0,
                    maxThreshold: parseFloat(channel.maxThreshold) || 100,
                    sensorTypeId: channel.idSensorType || '', // Use UUID from backend
                    sensorTypeLabel: channel.sensorType || ''  // Category name for display
                };

                // Map data points to sensor readings
                const dataPoints = data.dataPoints || [];

                this.allReadings = dataPoints.map((dp: any, index: number) => {
                    const value = dp.value;
                    const minThresh = this.channelMeta.minThreshold;
                    const maxThresh = this.channelMeta.maxThreshold;

                    // Determine status based on thresholds
                    let status: 'online' | 'warning' | 'error' | 'offline' = 'online';
                    let notes: string | undefined = undefined;

                    if (value !== null && value !== undefined && minThresh !== null && maxThresh !== null) {
                        if (value < minThresh) {
                            status = 'error';
                            notes = `Nilai di bawah batas minimum (${minThresh})`;
                        } else if (value > maxThresh) {
                            status = 'error';
                            notes = `Nilai di atas batas maksimum (${maxThresh})`;
                        } else if (value < minThresh * 1.1 || value > maxThresh * 0.9) {
                            status = 'warning';
                            notes = 'Mendekati batas warning';
                        }
                    }

                    return {
                        id: dataPoints.length - index,
                        timestamp: new Date(dp.timestamp),
                        value: value,
                        unit: this.sensorUnit,
                        status: status,
                        quality: dp.quality === 'good' ? 100 : 70,
                        notes: notes
                    };
                });

                // Apply client-side filtering (status filter only)
                this.applyClientSideFilters();

                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading channel data:', err);
                this.loading = false;
                // Fallback to dummy data on error
                this.generateDummyData();
                this.applyClientSideFilters();
            }
        });
    }

    /**
     * Get start date based on selected period filter
     */
    private getFilterStartDate(): Date {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (this.selectedPeriod) {
            case 'today':
                return today;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return yesterday;
            case 'last7days':
                const last7days = new Date(today);
                last7days.setDate(last7days.getDate() - 7);
                return last7days;
            case 'last30days':
                const last30days = new Date(today);
                last30days.setDate(last30days.getDate() - 30);
                return last30days;
            case 'thisMonth':
                return new Date(now.getFullYear(), now.getMonth(), 1);
            case 'lastMonth':
                return new Date(now.getFullYear(), now.getMonth() - 1, 1);
            case 'custom':
                if (this.dateFrom) {
                    return new Date(this.dateFrom);
                }
                // Default to 7 days
                const defaultStart = new Date(today);
                defaultStart.setDate(defaultStart.getDate() - 7);
                return defaultStart;
            default:
                // Default to 7 days
                const def = new Date(today);
                def.setDate(def.getDate() - 7);
                return def;
        }
    }

    /**
     * Generate dummy sensor readings data
     */
    generateDummyData() {
        const statuses: ('online' | 'offline' | 'warning' | 'error')[] = ['online', 'warning', 'error', 'offline'];
        const now = new Date();

        for (let i = 0; i < 150; i++) {
            const timestamp = new Date(now);
            timestamp.setMinutes(timestamp.getMinutes() - (i * 10)); // Every 10 minutes

            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const baseValue = 5.2;
            const variation = (Math.random() - 0.5) * 2;
            const value = Math.max(0, baseValue + variation);

            this.allReadings.push({
                id: 150 - i,
                timestamp: timestamp,
                value: parseFloat(value.toFixed(2)),
                unit: this.sensorUnit,
                status: status,
                quality: Math.floor(Math.random() * 30) + 70, // 70-100%
                notes: status === 'error' ? 'Nilai di luar batas normal' :
                    status === 'warning' ? 'Mendekati batas warning' : undefined
            });
        }
    }

    /**
     * Apply filters - triggered when user changes filter UI
     * This will reload data from backend with new time range
     */
    applyFilters() {
        if (this.channelId) {
            // Reload data from backend with new time range
            this.loadChannelData();
        } else {
            // Fallback to dummy data
            this.generateDummyData();
            this.applyClientSideFilters();
        }
    }

    /**
     * Apply client-side filters (status only) to already loaded data
     * This does NOT reload from backend
     */
    applyClientSideFilters() {
        let filtered = [...this.allReadings];

        // Filter by status only (period filtering is done by backend)
        if (this.selectedStatus !== 'all') {
            filtered = filtered.filter(r => r.status === this.selectedStatus);
        }

        this.filteredReadings = filtered;
        this.totalRecords = filtered.length;
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
        this.currentPage = 1; // Reset to first page when filters change
        this.updateDisplayedReadings();
    }

    /**
     * Update displayed readings based on current page
     */
    updateDisplayedReadings() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.displayedReadings = this.filteredReadings.slice(startIndex, endIndex);
    }

    /**
     * Change page
     */
    goToPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updateDisplayedReadings();
        }
    }

    /**
     * Change page size
     */
    onPageSizeChange() {
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
        this.currentPage = 1;
        this.updateDisplayedReadings();
    }

    /**
     * Get page numbers for pagination
     */
    getPageNumbers(): number[] {
        const pages: number[] = [];
        const maxPagesToShow = 5;

        if (this.totalPages <= maxPagesToShow) {
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (this.currentPage <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pages.push(i);
                }
                pages.push(-1); // Ellipsis
                pages.push(this.totalPages);
            } else if (this.currentPage >= this.totalPages - 2) {
                pages.push(1);
                pages.push(-1); // Ellipsis
                for (let i = this.totalPages - 3; i <= this.totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push(-1); // Ellipsis
                for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push(-1); // Ellipsis
                pages.push(this.totalPages);
            }
        }

        return pages;
    }

    /**
     * Get status badge class
     */
    getStatusClass(status: string): string {
        switch (status) {
            case 'online': return 'bg-success';
            case 'warning': return 'bg-warning';
            case 'error': return 'bg-danger';
            case 'offline': return 'bg-secondary';
            default: return 'bg-secondary';
        }
    }

    /**
     * Get quality badge class
     */
    getQualityClass(quality: number): string {
        if (quality >= 90) return 'bg-success';
        if (quality >= 75) return 'bg-info';
        if (quality >= 60) return 'bg-warning';
        return 'bg-danger';
    }

    /**
     * Helpers for template display
     */
    getSelectedPeriodLabel(): string {
        const period = this.periodOptions.find(p => p.value === this.selectedPeriod);
        return period ? period.label : 'Custom Range';
    }

    getStatusCount(status: string): number {
        if (status === 'all') {
            return this.allReadings.length;
        }
        return this.allReadings.filter(reading => reading.status === status).length;
    }

    /**
     * Export data to CSV
     */
    exportToCSV() {
        const headers = ['ID', 'Timestamp', 'Value', 'Unit', 'Status', 'Quality', 'Notes'];
        const csvContent = [
            headers.join(','),
            ...this.filteredReadings.map(r => [
                r.id,
                r.timestamp.toISOString(),
                r.value,
                r.unit,
                r.status,
                r.quality,
                r.notes || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sensor-${this.sensorName}-${new Date().toISOString()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    openEditChannelDrawer() {
        this.channelDrawerMode = 'edit';
        this.isChannelDrawerOpen = true;
        // channelId will be used by drawer to fetch fresh data from backend
    }

    handleChannelDrawerClose() {
        this.isChannelDrawerOpen = false;
    }

    handleChannelSave(formValue: AddChannelFormValue) {
        this.isChannelDrawerOpen = false;
        
        // Reload fresh data from backend after save
        this.loadChannelData();
    }

    /**
     * Delete channel and redirect to node detail
     */
    deleteChannel() {
        if (!this.channelId) {
            alert('Channel ID not found');
            return;
        }

        // Confirm deletion
        const confirmDelete = confirm(
            `Are you sure you want to delete channel "${this.sensorName}"?\n\n` +
            `This will permanently remove:\n` +
            `- Channel configuration\n` +
            `- All telemetry data\n` +
            `- Alert rules\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmDelete) {
            return;
        }

        this.loading = true;

        this.sensorChannelsService.sensorChannelsControllerRemove({ id: this.channelId }).subscribe({
            next: () => {
                console.log('Channel deleted successfully');
                this.loading = false;
                
                // ✅ Redirect to node detail page (parent route)
                // Navigate up two levels: /iot/nodes/:nodeId/sensor/:sensorId -> /iot/nodes/:nodeId
                this.router.navigate(['/iot/nodes', this.nodeId]);
            },
            error: (err) => {
                console.error('Error deleting channel:', err);
                this.loading = false;
                alert('Failed to delete channel. Please try again.');
            }
        });
    }
}
