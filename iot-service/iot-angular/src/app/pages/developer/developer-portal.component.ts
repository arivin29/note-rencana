import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TenantApiKeysService, TenantApiKeyResponse, CreateTenantApiKeyRequest } from '../../services/tenant-api-keys.service';
import { environment } from '../../../environments/environment';

interface ApiParam {
    name: string;
    type: string;
    required: boolean;
    description: string;
    in: 'query' | 'path';
    value?: string;
}

interface ApiEndpoint {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    summary: string;
    description: string;
    params: ApiParam[];
    responseExample: string;
    // runtime state
    expanded?: boolean;
    testing?: boolean;
    testResponse?: string;
    testStatus?: number;
    testTime?: number;
}

interface ApiSection {
    title: string;
    icon: string;
    description: string;
    endpoints: ApiEndpoint[];
    expanded?: boolean;
}

@Component({
    selector: 'developer-portal',
    standalone: false,
    templateUrl: './developer-portal.html',
    styleUrls: ['./developer-portal.scss']
})
export class DeveloperPortalComponent implements OnInit {
    activeTab: 'explorer' | 'keys' | 'guide' = 'explorer';
    apiKeys: TenantApiKeyResponse[] = [];
    loadingKeys = false;
    baseUrl = environment.apiUrl;
    selectedApiKey = '';
    copiedText = '';

    // Create key form
    showCreateKey = false;
    newKeyForm: CreateTenantApiKeyRequest = { label: '', description: '', expiresAt: null, rateLimitPlan: 'standard' };
    createdKeyResult: string | null = null;
    creatingKey = false;

    apiSections: ApiSection[] = [
        {
            title: 'Info',
            icon: 'bi-info-circle',
            description: 'API status and health check',
            expanded: true,
            endpoints: [
                {
                    method: 'GET',
                    path: '/external-api/v1/info',
                    summary: 'Get API status',
                    description: 'Returns API version, health status, and your rate limit info.',
                    params: [],
                    responseExample: `{\n  "version": "1.0.0",\n  "status": "healthy",\n  "rateLimits": { "plan": "standard", "requestsPerMinute": 60 }\n}`
                }
            ]
        },
        {
            title: 'Projects',
            icon: 'bi-diagram-3',
            description: 'IoT project resources',
            endpoints: [
                {
                    method: 'GET',
                    path: '/external-api/v1/projects',
                    summary: 'List projects',
                    description: 'Returns all projects accessible with your API key.',
                    params: [
                        { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)', in: 'query' },
                        { name: 'limit', type: 'number', required: false, description: 'Items per page (max: 100)', in: 'query' }
                    ],
                    responseExample: `{\n  "data": [\n    { "id": "uuid", "name": "Water Management", "status": "active" }\n  ],\n  "total": 5\n}`
                }
            ]
        },
        {
            title: 'Nodes',
            icon: 'bi-hdd-stack',
            description: 'IoT devices / hardware nodes',
            endpoints: [
                {
                    method: 'GET',
                    path: '/external-api/v1/nodes',
                    summary: 'List nodes',
                    description: 'Returns all IoT nodes (devices) for your account.',
                    params: [
                        { name: 'projectId', type: 'string', required: false, description: 'Filter by project UUID', in: 'query' },
                        { name: 'status', type: 'string', required: false, description: 'Filter: active, inactive, maintenance', in: 'query' },
                        { name: 'page', type: 'number', required: false, description: 'Page number', in: 'query' },
                        { name: 'limit', type: 'number', required: false, description: 'Items per page', in: 'query' }
                    ],
                    responseExample: `{\n  "data": [\n    {\n      "id": "uuid",\n      "nodeCode": "NODE-001",\n      "label": "Inlet Monitor",\n      "status": "active",\n      "lastSeenAt": "2026-05-31T12:00:00Z"\n    }\n  ],\n  "total": 42\n}`
                },
                {
                    method: 'GET',
                    path: '/external-api/v1/nodes/{id}',
                    summary: 'Get node detail',
                    description: 'Get detailed information about a specific node including its sensors.',
                    params: [
                        { name: 'id', type: 'string', required: true, description: 'Node UUID', in: 'path' }
                    ],
                    responseExample: `{\n  "id": "uuid",\n  "nodeCode": "NODE-001",\n  "label": "Inlet Monitor",\n  "sensors": [\n    { "id": "uuid", "sensorCode": "S01", "label": "Pressure", "unit": "bar" }\n  ]\n}`
                }
            ]
        },
        {
            title: 'Sensors',
            icon: 'bi-thermometer-half',
            description: 'Sensor metadata',
            endpoints: [
                {
                    method: 'GET',
                    path: '/external-api/v1/sensors',
                    summary: 'List sensors',
                    description: 'Returns all sensors across your nodes.',
                    params: [
                        { name: 'nodeId', type: 'string', required: false, description: 'Filter by node UUID', in: 'query' },
                        { name: 'page', type: 'number', required: false, description: 'Page number', in: 'query' },
                        { name: 'limit', type: 'number', required: false, description: 'Items per page', in: 'query' }
                    ],
                    responseExample: `{\n  "data": [\n    { "id": "uuid", "sensorCode": "S01", "label": "Pressure", "unit": "bar", "nodeId": "uuid" }\n  ],\n  "total": 100\n}`
                }
            ]
        },
        {
            title: 'Sensor Data',
            icon: 'bi-graph-up',
            description: 'Time-series telemetry readings',
            endpoints: [
                {
                    method: 'GET',
                    path: '/external-api/v1/sensor-data',
                    summary: 'Query sensor data',
                    description: 'Get time-series readings for a sensor within a date range.',
                    params: [
                        { name: 'sensorId', type: 'string', required: true, description: 'Sensor UUID', in: 'query' },
                        { name: 'startDate', type: 'string', required: true, description: 'ISO 8601 start (e.g. 2026-05-01T00:00:00Z)', in: 'query' },
                        { name: 'endDate', type: 'string', required: true, description: 'ISO 8601 end', in: 'query' },
                        { name: 'limit', type: 'number', required: false, description: 'Max rows (default: 100, max: 1000)', in: 'query' }
                    ],
                    responseExample: `{\n  "data": [\n    { "timestamp": "2026-05-31T12:00:00Z", "value": 3.42, "unit": "bar" }\n  ],\n  "total": 2880\n}`
                },
                {
                    method: 'GET',
                    path: '/external-api/v1/sensor-data/latest',
                    summary: 'Get latest readings',
                    description: 'Get the most recent reading for one or more sensors.',
                    params: [
                        { name: 'sensorIds', type: 'string', required: true, description: 'Comma-separated sensor UUIDs', in: 'query' }
                    ],
                    responseExample: `{\n  "data": [\n    { "sensorId": "uuid", "value": 3.42, "unit": "bar", "timestamp": "2026-05-31T12:00:30Z" }\n  ]\n}`
                },
                {
                    method: 'GET',
                    path: '/external-api/v1/sensor-data/aggregated',
                    summary: 'Get aggregated data',
                    description: 'Get aggregated sensor data (avg, min, max) over time intervals.',
                    params: [
                        { name: 'sensorId', type: 'string', required: true, description: 'Sensor UUID', in: 'query' },
                        { name: 'startDate', type: 'string', required: true, description: 'ISO 8601 start', in: 'query' },
                        { name: 'endDate', type: 'string', required: true, description: 'ISO 8601 end', in: 'query' },
                        { name: 'interval', type: 'string', required: false, description: '1m, 5m, 15m, 1h, 1d (default: 1h)', in: 'query' },
                        { name: 'aggregation', type: 'string', required: false, description: 'avg, min, max, sum, count (default: avg)', in: 'query' }
                    ],
                    responseExample: `{\n  "data": [\n    { "timestamp": "2026-05-31T12:00:00Z", "avg": 3.42, "min": 3.10, "max": 3.78, "count": 120 }\n  ]\n}`
                }
            ]
        },
        {
            title: 'Alerts',
            icon: 'bi-bell',
            description: 'Alert / alarm history',
            endpoints: [
                {
                    method: 'GET',
                    path: '/external-api/v1/alerts',
                    summary: 'List alerts',
                    description: 'Get alert history for your sensors.',
                    params: [
                        { name: 'nodeId', type: 'string', required: false, description: 'Filter by node UUID', in: 'query' },
                        { name: 'severity', type: 'string', required: false, description: 'critical, warning, info', in: 'query' },
                        { name: 'status', type: 'string', required: false, description: 'active, acknowledged, resolved', in: 'query' },
                        { name: 'page', type: 'number', required: false, description: 'Page number', in: 'query' },
                        { name: 'limit', type: 'number', required: false, description: 'Items per page', in: 'query' }
                    ],
                    responseExample: `{\n  "data": [\n    {\n      "id": "uuid",\n      "severity": "critical",\n      "message": "Value exceeded threshold",\n      "triggeredAt": "2026-05-31T10:05:00Z"\n    }\n  ],\n  "total": 12\n}`
                }
            ]
        }
    ];

    constructor(
        private apiKeysService: TenantApiKeysService,
        private http: HttpClient
    ) {}

    ngOnInit(): void {
        this.loadApiKeys();
    }

    loadApiKeys(): void {
        this.loadingKeys = true;
        this.apiKeysService.findAll().subscribe({
            next: (res) => {
                this.apiKeys = Array.isArray(res) ? res : [];
                this.loadingKeys = false;
            },
            error: () => { this.loadingKeys = false; }
        });
    }

    createApiKey(): void {
        if (!this.newKeyForm.label) return;
        this.creatingKey = true;
        const payload: CreateTenantApiKeyRequest = {
            label: this.newKeyForm.label,
            description: this.newKeyForm.description || undefined,
            rateLimitPlan: this.newKeyForm.rateLimitPlan,
            expiresAt: this.newKeyForm.expiresAt || null
        };
        this.apiKeysService.create(payload).subscribe({
            next: (res) => {
                this.createdKeyResult = res.key;
                this.loadApiKeys();
                this.creatingKey = false;
            },
            error: () => { this.creatingKey = false; }
        });
    }

    revokeKey(id: string): void {
        if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;
        this.apiKeysService.revoke(id).subscribe({
            next: () => this.loadApiKeys()
        });
    }

    resetCreateForm(): void {
        this.showCreateKey = false;
        this.createdKeyResult = null;
        this.newKeyForm = { label: '', description: '', expiresAt: null, rateLimitPlan: 'standard' };
    }

    // === Try It (Swagger-like) ===
    toggleEndpoint(endpoint: ApiEndpoint): void {
        endpoint.expanded = !endpoint.expanded;
    }

    buildRequestUrl(endpoint: ApiEndpoint): string {
        let url = this.baseUrl + endpoint.path;
        const queryParams: string[] = [];

        for (const param of endpoint.params) {
            if (param.in === 'path' && param.value) {
                url = url.replace(`{${param.name}}`, encodeURIComponent(param.value));
            } else if (param.in === 'query' && param.value) {
                queryParams.push(`${param.name}=${encodeURIComponent(param.value)}`);
            }
        }

        if (queryParams.length) {
            url += '?' + queryParams.join('&');
        }
        return url;
    }

    executeRequest(endpoint: ApiEndpoint): void {
        if (!this.selectedApiKey) {
            endpoint.testResponse = JSON.stringify({ error: 'Please select or enter an API key above' }, null, 2);
            endpoint.testStatus = 0;
            return;
        }

        endpoint.testing = true;
        endpoint.testResponse = '';
        const url = this.buildRequestUrl(endpoint);
        const startTime = Date.now();

        this.http.get(url, {
            headers: { 'X-API-Key': this.selectedApiKey },
            observe: 'response'
        }).subscribe({
            next: (res) => {
                endpoint.testTime = Date.now() - startTime;
                endpoint.testStatus = res.status;
                endpoint.testResponse = JSON.stringify(res.body, null, 2);
                endpoint.testing = false;
            },
            error: (err) => {
                endpoint.testTime = Date.now() - startTime;
                endpoint.testStatus = err.status || 0;
                endpoint.testResponse = JSON.stringify(err.error || { message: err.message }, null, 2);
                endpoint.testing = false;
            }
        });
    }

    copyToClipboard(text: string, label: string): void {
        navigator.clipboard.writeText(text).then(() => {
            this.copiedText = label;
            setTimeout(() => this.copiedText = '', 2000);
        });
    }

    getMethodClass(method: string): string {
        return 'method-' + method.toLowerCase();
    }

    getStatusClass(status: number): string {
        if (status >= 200 && status < 300) return 'text-success';
        if (status >= 400 && status < 500) return 'text-warning';
        return 'text-danger';
    }

    getCurlCommand(endpoint: ApiEndpoint): string {
        const url = this.buildRequestUrl(endpoint);
        return `curl -H "X-API-Key: ${this.selectedApiKey || 'YOUR_API_KEY'}" \\\n  "${url}"`;
    }
}
