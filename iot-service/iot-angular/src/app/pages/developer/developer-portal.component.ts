import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TenantApiKeysService, TenantApiKeyResponse, CreateTenantApiKeyRequest } from '../../services/tenant-api-keys.service';
import {
    OwnerForwardingMqttService,
    OwnerForwardingMqtt,
    OwnerForwardingMqttRequest,
    OwnerForwardingMqttStatus,
    OwnerForwardingMqttLog
} from '../../services/owner-forwarding-mqtt.service';
import { environment } from '../../../environments/environment';

// Flat form object mirroring the backend Create/Update DTO (camelCase).
interface MqttConfigForm {
    label: string;
    brokerUrl: string;
    username: string;
    password: string;
    topicTemplate: string;
    qos: number;
    retained: boolean;
    tlsEnabled: boolean;
    tlsInsecure: boolean;
    isActive: boolean;
}

const DEFAULT_MQTT_FORM: MqttConfigForm = {
    label: '',
    brokerUrl: '',
    username: '',
    password: '',
    topicTemplate: '{ownerCode}/telemetry/{deviceId}/{metricCode}',
    qos: 1,
    retained: true,
    tlsEnabled: true,
    tlsInsecure: false,
    isActive: true
};




@Component({
    selector: 'developer-portal',
    standalone: false,
    templateUrl: './developer-portal.html',
    styleUrls: ['./developer-portal.scss']
})
export class DeveloperPortalComponent implements OnInit, AfterViewInit {
    activeTab: 'explorer' | 'keys' | 'realtime' | 'guide' = 'explorer';
    apiKeys: TenantApiKeyResponse[] = [];
    loadingKeys = false;
    baseUrl = environment.apiUrl;
    selectedApiKey = '';
    copiedText = '';

    // Swagger UI di-embed lewat iframe srcdoc (same-origin) yang memuat swagger
    // dari /assets — terisolasi total dari tema admin (tak ada bentrok CSS).
    // Spec External API v2 = sumber tunggal (/external-api/docs-json).
    // requestInterceptor menyuntik X-API-Key dari key yang dipilih user (tab Keys).
    @ViewChild('swaggerFrame') swaggerFrame?: ElementRef<HTMLIFrameElement>;
    specUrl = `${environment.apiUrl}/external-api/docs-json`;
    private swaggerMounted = false;

    // Create key form
    showCreateKey = false;
    newKeyForm: CreateTenantApiKeyRequest = { label: '', description: '', expiresAt: null, rateLimitPlan: 'standard' };
    createdKeyResult: string | null = null;
    creatingKey = false;


    constructor(
        private apiKeysService: TenantApiKeysService,
        private mqttService: OwnerForwardingMqttService,
        private http: HttpClient
    ) {}

    ngOnInit(): void {
        this.loadApiKeys();
    }

    ngAfterViewInit(): void {
        // Iframe tab Explorer selalu ada di DOM ([hidden], bukan *ngIf) → set srcdoc sekali.
        // getExternalApiKey dibaca oleh script di dalam iframe (same-origin) agar
        // "Try it out" selalu memakai key terkini yang dipilih user.
        (window as any).getExternalApiKey = () => (this.selectedApiKey || '').trim();
        this.mountSwagger();
    }

    /** Bangun iframe srcdoc self-contained yang me-render Swagger UI dari /assets. */
    private mountSwagger(): void {
        if (this.swaggerMounted || !this.swaggerFrame) { return; }
        this.swaggerFrame.nativeElement.srcdoc = this.buildSwaggerHtml();
        this.swaggerMounted = true;
    }

    private buildSwaggerHtml(): string {
        return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="/assets/swagger/swagger-ui.css">
  <style>body{margin:0;background:#fff}</style>
</head>
<body>
  <div id="swagger"></div>
  <script src="/assets/swagger/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: ${JSON.stringify(this.specUrl)},
      dom_id: '#swagger',
      deepLinking: false,
      docExpansion: 'list',
      defaultModelsExpandDepth: 0,
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout',
      requestInterceptor: function (req) {
        try {
          var k = window.parent.getExternalApiKey && window.parent.getExternalApiKey();
          if (k) { req.headers['X-API-Key'] = k; }
        } catch (e) {}
        return req;
      }
    });
  </script>
</body>
</html>`;
    }

    // ===================================================================
    // Tab: Realtime (MQTT Broadcast)
    // ===================================================================
    // --- A. Broker config CRUD ---
    mqttConfigs: OwnerForwardingMqtt[] = [];
    loadingConfigs = false;
    configError: string | null = null;

    showConfigForm = false;
    editingConfigId: string | null = null;
    savingConfig = false;
    configForm: MqttConfigForm = { ...DEFAULT_MQTT_FORM };

    togglingId: string | null = null;

    // --- B. Delivery logs + live status ---
    selectedConfig: OwnerForwardingMqtt | null = null;
    brokerStatus: OwnerForwardingMqttStatus | null = null;
    loadingStatus = false;

    logs: OwnerForwardingMqttLog[] = [];
    loadingLogs = false;
    logError: string | null = null;
    logFilters = { status: '', dateFrom: '', dateTo: '' };
    logStatusOptions = [
        { value: '', label: 'All Status' },
        { value: 'success', label: 'Success' },
        { value: 'failed', label: 'Failed' }
    ];
    logPage = 1;
    logLimit = 10;
    logTotal = 0;
    logTotalPages = 1;

    onRealtimeTab(): void {
        this.activeTab = 'realtime';
        if (!this.mqttConfigs.length && !this.loadingConfigs) {
            this.loadConfigs();
        }
    }

    loadConfigs(): void {
        this.loadingConfigs = true;
        this.configError = null;
        this.mqttService.findAll({ page: 1, limit: 100 }).subscribe({
            next: (res) => {
                this.mqttConfigs = (res?.data || []) as OwnerForwardingMqtt[];
                this.loadingConfigs = false;
                // keep the log panel selection valid / auto-select the first broker
                if (this.selectedConfig) {
                    const still = this.mqttConfigs.find(c => c.idOwnerForwardingMqtt === this.selectedConfig!.idOwnerForwardingMqtt);
                    this.selectedConfig = still || null;
                }
                if (!this.selectedConfig && this.mqttConfigs.length) {
                    this.selectBroker(this.mqttConfigs[0]);
                }
            },
            error: (err) => { this.configError = err?.error?.message || err?.message || 'Failed to load brokers'; this.loadingConfigs = false; }
        });
    }

    // extract host (hide credentials) from a broker URL for display
    brokerHost(url: string): string {
        if (!url) return '';
        try {
            const u = new URL(url);
            return u.host || url;
        } catch {
            // strip scheme + any user:pass@ prefix manually as a fallback
            return url.replace(/^[a-z]+:\/\//i, '').replace(/^[^@/]*@/, '').split('/')[0];
        }
    }

    configStatusClass(cfg: OwnerForwardingMqtt): string {
        if (!cfg.isActive) return 'badge bg-secondary-subtle text-secondary';
        if (cfg.lastStatus === 'failed' || cfg.lastError) return 'badge bg-danger-subtle text-danger';
        return 'badge bg-success-subtle text-success';
    }

    configStatusLabel(cfg: OwnerForwardingMqtt): string {
        if (!cfg.isActive) return 'Nonaktif';
        if (cfg.lastStatus === 'failed' || cfg.lastError) return 'Error';
        return 'Aktif';
    }

    // --- form ---
    openCreateConfig(): void {
        this.editingConfigId = null;
        this.configForm = { ...DEFAULT_MQTT_FORM };
        this.showConfigForm = true;
        this.configError = null;
    }

    openEditConfig(cfg: OwnerForwardingMqtt): void {
        this.editingConfigId = cfg.idOwnerForwardingMqtt;
        this.configForm = {
            label: cfg.label || '',
            brokerUrl: cfg.brokerUrl || '',
            username: cfg.username || '',
            password: '', // write-only — empty means keep existing
            topicTemplate: cfg.topicTemplate || DEFAULT_MQTT_FORM.topicTemplate,
            qos: cfg.qos ?? 1,
            retained: cfg.retained ?? true,
            tlsEnabled: cfg.tlsEnabled ?? true,
            tlsInsecure: cfg.tlsInsecure ?? false,
            isActive: cfg.isActive ?? true
        };
        this.showConfigForm = true;
        this.configError = null;
    }

    cancelConfigForm(): void {
        this.showConfigForm = false;
        this.editingConfigId = null;
        this.configForm = { ...DEFAULT_MQTT_FORM };
    }

    saveConfig(): void {
        if (!this.configForm.label || !this.configForm.brokerUrl) return;
        this.savingConfig = true;
        this.configError = null;

        const body: OwnerForwardingMqttRequest = {
            label: this.configForm.label,
            brokerUrl: this.configForm.brokerUrl,
            username: this.configForm.username,
            topicTemplate: this.configForm.topicTemplate,
            qos: Number(this.configForm.qos),
            retained: this.configForm.retained,
            tlsEnabled: this.configForm.tlsEnabled,
            tlsInsecure: this.configForm.tlsInsecure,
            isActive: this.configForm.isActive
        };
        // write-only password: only send when the user typed a new one
        if (this.configForm.password) body.password = this.configForm.password;

        const req = this.editingConfigId
            ? this.mqttService.update(this.editingConfigId, body)
            : this.mqttService.create(body);

        req.subscribe({
            next: () => { this.savingConfig = false; this.cancelConfigForm(); this.loadConfigs(); },
            error: (err) => { this.configError = err?.error?.message || err?.message || 'Save failed'; this.savingConfig = false; }
        });
    }

    deleteConfig(cfg: OwnerForwardingMqtt): void {
        if (!confirm(`Delete broker "${cfg.label}"? This cannot be undone.`)) return;
        this.mqttService.remove(cfg.idOwnerForwardingMqtt).subscribe({
            next: () => {
                if (this.selectedConfig?.idOwnerForwardingMqtt === cfg.idOwnerForwardingMqtt) {
                    this.selectedConfig = null;
                    this.logs = [];
                    this.brokerStatus = null;
                }
                this.loadConfigs();
            },
            error: (err) => { this.configError = err?.error?.message || err?.message || 'Delete failed'; }
        });
    }

    toggleConfig(cfg: OwnerForwardingMqtt): void {
        this.togglingId = cfg.idOwnerForwardingMqtt;
        this.mqttService.toggle(cfg.idOwnerForwardingMqtt).subscribe({
            next: () => { this.togglingId = null; this.loadConfigs(); },
            error: (err) => { this.togglingId = null; this.configError = err?.error?.message || err?.message || 'Toggle failed'; }
        });
    }

    // --- B. logs + status ---
    selectBroker(cfg: OwnerForwardingMqtt): void {
        this.selectedConfig = cfg;
        this.logPage = 1;
        this.loadStatus();
        this.loadLogs();
    }

    loadStatus(): void {
        if (!this.selectedConfig) return;
        this.loadingStatus = true;
        this.brokerStatus = null;
        this.mqttService.getStatus(this.selectedConfig.idOwnerForwardingMqtt).subscribe({
            next: (res) => { this.brokerStatus = res; this.loadingStatus = false; },
            error: () => { this.brokerStatus = null; this.loadingStatus = false; }
        });
    }

    loadLogs(): void {
        if (!this.selectedConfig) return;
        this.loadingLogs = true;
        this.logError = null;
        this.mqttService.getLogs(this.selectedConfig.idOwnerForwardingMqtt, {
            page: this.logPage,
            limit: this.logLimit,
            status: this.logFilters.status || undefined,
            dateFrom: this.logFilters.dateFrom || undefined,
            dateTo: this.logFilters.dateTo || undefined
        }).subscribe({
            next: (res) => {
                this.logs = (res?.data || []) as OwnerForwardingMqttLog[];
                this.logTotal = res?.meta?.total || 0;
                this.logTotalPages = res?.meta?.totalPages || 1;
                this.loadingLogs = false;
            },
            error: (err) => { this.logError = err?.error?.message || err?.message || 'Failed to load logs'; this.loadingLogs = false; }
        });
    }

    applyLogFilters(): void {
        this.logPage = 1;
        this.loadLogs();
    }

    goToLogPage(page: number): void {
        if (page < 1 || page > this.logTotalPages || page === this.logPage) return;
        this.logPage = page;
        this.loadLogs();
    }

    logStatusClass(status: string): string {
        return status === 'success' ? 'badge bg-success-subtle text-success' : 'badge bg-danger-subtle text-danger';
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

    // Regenerate — rotate: bikin key baru (tampil FULL sekali), key lama otomatis
    // tak valid lagi karena hash-nya ditimpa. Backend tak simpan plaintext, jadi
    // inilah satu-satunya cara user dapat key yang bisa disalin penuh.
    regeneratingId: string | null = null;
    regeneratedKey: string | null = null;
    regenerateKey(id: string): void {
        if (!confirm('Regenerate this key? The old key stops working immediately and the new key is shown only once.')) return;
        this.regeneratingId = id;
        this.apiKeysService.regenerate(id).subscribe({
            next: (res) => {
                this.regeneratedKey = res.key;
                this.regeneratingId = null;
                this.loadApiKeys();
            },
            error: () => { this.regeneratingId = null; }
        });
    }
    dismissRegenerated(): void {
        this.regeneratedKey = null;
    }

    resetCreateForm(): void {
        this.showCreateKey = false;
        this.createdKeyResult = null;
        this.newKeyForm = { label: '', description: '', expiresAt: null, rateLimitPlan: 'standard' };
    }

    // === Try It (Swagger-like) ===



    copyToClipboard(text: string, label: string): void {
        navigator.clipboard.writeText(text).then(() => {
            this.copiedText = label;
            setTimeout(() => this.copiedText = '', 2000);
        });
    }



}
