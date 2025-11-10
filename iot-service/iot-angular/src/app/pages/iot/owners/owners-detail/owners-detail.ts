import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface OwnerProfile {
  name: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  projects: number;
  nodes: number;
  sensors: number;
  forwardingStatus: string;
}

interface ForwardingLog {
  id: string;
  target: string;
  type: 'webhook' | 'mysql' | 'postgres';
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  attempts: number;
  message: string;
  durationMs: number;
}

interface WebhookHeader {
  key: string;
  value: string;
}

interface WebhookConfig {
  enabled: boolean;
  label: string;
  endpointUrl: string;
  httpMethod: 'POST' | 'PUT';
  secretToken: string;
  headers: WebhookHeader[];
  payloadFormat: 'timeseries' | 'raw';
  retry: {
    maxRetry: number;
    backoffMs: number;
  };
  lastStatus: string;
  lastDeliveryAt?: string;
  lastError?: string;
}

interface DatabaseConfig {
  id: string;
  label: string;
  type: 'mysql' | 'postgres';
  enabled: boolean;
  host: string;
  port: number;
  database: string;
  schema?: string;
  username: string;
  password: string;
  targetTable: string;
  writeMode: 'append' | 'upsert';
  batchSize: number;
  lastStatus: string;
  lastDeliveryAt?: string;
  lastError?: string;
}

@Component({
  selector: 'owners-detail',
  templateUrl: './owners-detail.html',
  styleUrls: ['./owners-detail.scss'],
  standalone: false
})
export class OwnersDetailPage {
  ownerId = '';
  ownerProfile: OwnerProfile = {
    name: 'PT Adhi Tirta Utama',
    industry: 'Utilities / Water Supply',
    contactPerson: 'Farhan Prasetyo',
    email: 'farhan@adhiwater.co.id',
    phone: '+62 811-2345-678',
    projects: 6,
    nodes: 124,
    sensors: 498,
    forwardingStatus: 'Operational'
  };

  activeDeliveryTab: 'webhook' | 'mysql' | 'postgres' = 'webhook';
  webhookTestMessage = '';

  webhookConfig: WebhookConfig = {
    enabled: true,
    label: 'Command Center Webhook',
    endpointUrl: 'https://hooks.adhiwater.co.id/iot/ingest',
    httpMethod: 'POST',
    secretToken: 'whsec-demo-token',
    headers: [
      { key: 'X-Tenant-Code', value: 'ADHI-WATER' },
      { key: 'X-Signature', value: 'HMAC-SHA256' }
    ],
    payloadFormat: 'timeseries',
    retry: {
      maxRetry: 3,
      backoffMs: 2000
    },
    lastStatus: 'Healthy',
    lastDeliveryAt: '2024-05-26T09:12:00Z'
  };

  databaseConfigs: DatabaseConfig[] = [
    {
      id: 'mysql-default',
      label: 'MySQL Warehouse',
      type: 'mysql',
      enabled: true,
      host: 'mysql-fw.adhiwater.local',
      port: 3306,
      database: 'iot_forwarder',
      schema: undefined,
      username: 'forwarder',
      password: '********',
      targetTable: 'telemetry_logs',
      writeMode: 'append',
      batchSize: 200,
      lastStatus: 'Healthy',
      lastDeliveryAt: '2024-05-26T09:10:22Z'
    },
    {
      id: 'postgres-ops',
      label: 'PostgreSQL Ops DB',
      type: 'postgres',
      enabled: false,
      host: 'pg-fw.ops.internal',
      port: 5432,
      database: 'ops_datahub',
      schema: 'public',
      username: 'ops_forwarder',
      password: '********',
      targetTable: 'sensor_channels_buffer',
      writeMode: 'upsert',
      batchSize: 100,
      lastStatus: 'Disabled',
      lastDeliveryAt: undefined,
      lastError: 'Connection disabled by user'
    }
  ];

  forwardingLogs: ForwardingLog[] = [
    {
      id: 'LOG-20240526-01',
      target: 'Command Center Webhook',
      type: 'webhook',
      status: 'success',
      timestamp: '2024-05-26 09:12',
      attempts: 1,
      message: 'Delivered 37 telemetry rows',
      durationMs: 220
    },
    {
      id: 'LOG-20240526-02',
      target: 'MySQL Warehouse',
      type: 'mysql',
      status: 'success',
      timestamp: '2024-05-26 09:10',
      attempts: 1,
      message: 'Batch insert (200 rows)',
      durationMs: 410
    },
    {
      id: 'LOG-20240526-03',
      target: 'PostgreSQL Ops DB',
      type: 'postgres',
      status: 'failed',
      timestamp: '2024-05-26 08:55',
      attempts: 3,
      message: 'Target disabled – skipping execution',
      durationMs: 35
    }
  ];

  constructor(route: ActivatedRoute) {
    route.paramMap.subscribe((params) => {
      this.ownerId = params.get('ownerId') ?? '';
    });
  }

  setActiveDeliveryTab(tab: 'webhook' | 'mysql' | 'postgres') {
    this.activeDeliveryTab = tab;
    this.webhookTestMessage = '';
  }

  toggleWebhookEnabled() {
    this.webhookConfig.enabled = !this.webhookConfig.enabled;
  }

  addWebhookHeader() {
    this.webhookConfig.headers.push({ key: '', value: '' });
  }

  removeWebhookHeader(index: number) {
    this.webhookConfig.headers.splice(index, 1);
  }

  testWebhookDelivery() {
    this.webhookTestMessage = 'Testing delivery...';
    setTimeout(() => {
      this.webhookTestMessage = 'Delivery test succeeded (HTTP 200).';
      this.webhookConfig.lastStatus = 'Healthy';
      this.webhookConfig.lastDeliveryAt = new Date().toISOString();
    }, 600);
  }

  saveWebhookConfig() {
    this.webhookTestMessage = 'Configuration saved.';
  }

  getDatabaseConfigsByType(type: 'mysql' | 'postgres') {
    return this.databaseConfigs.filter((config) => config.type === type);
  }

  toggleDatabaseEnabled(config: DatabaseConfig) {
    config.enabled = !config.enabled;
    config.lastStatus = config.enabled ? 'Enabled' : 'Disabled';
  }

  testDatabaseConnection(config: DatabaseConfig) {
    config.lastStatus = 'Testing...';
    setTimeout(() => {
      config.lastStatus = 'Healthy';
      config.lastDeliveryAt = new Date().toISOString();
      config.lastError = undefined;
    }, 800);
  }

  saveDatabaseConfig(config: DatabaseConfig) {
    config.lastStatus = 'Pending';
    setTimeout(() => {
      config.lastStatus = 'Saved';
    }, 400);
  }
}
