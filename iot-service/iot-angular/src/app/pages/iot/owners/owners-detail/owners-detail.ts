import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OwnersService } from '../../../../../sdk/core/services/owners.service';
import { OwnerDetailResponseDto } from '../../../../../sdk/core/models/owner-detail-response-dto';
import { ForwardingWebhookResponseDto } from '../../../../../sdk/core/models/forwarding-webhook-response-dto';
import { ForwardingDatabaseResponseDto } from '../../../../../sdk/core/models/forwarding-database-response-dto';

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
export class OwnersDetailPage implements OnInit {
  ownerId = '';
  ownerData: OwnerDetailResponseDto | null = null;
  loading = false;
  error = '';
  
  // Track webhook ID for update operations
  webhookId: string | null = null;
  
  // Track database config IDs for update operations (keyed by database type)
  mysqlDatabaseId: string | null = null;
  postgresDatabaseId: string | null = null;
  
  // Test messages for each database type
  mysqlTestMessage = '';
  postgresTestMessage = '';

  ownerProfile: OwnerProfile = {
    name: '',
    industry: '',
    contactPerson: '',
    email: '',
    phone: '',
    projects: 0,
    nodes: 0,
    sensors: 0,
    forwardingStatus: 'Unknown'
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

  constructor(
    private route: ActivatedRoute,
    private ownersService: OwnersService
  ) {
    this.route.paramMap.subscribe((params) => {
      this.ownerId = params.get('ownerId') ?? '';
      if (this.ownerId) {
        this.loadOwnerDetail();
      }
    });
  }

  ngOnInit(): void {
    // Initialization handled in constructor
  }

  loadOwnerDetail(): void {
    this.loading = true;
    this.error = '';

    this.ownersService
      .ownersControllerFindOneDetailed({ id: this.ownerId })
      .subscribe({
        next: (data) => {
          this.ownerData = data;
          this.mapOwnerDataToProfile(data);
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading owner detail:', err);
          this.error = 'Failed to load owner details';
          this.loading = false;
        }
      });
  }

  mapOwnerDataToProfile(data: OwnerDetailResponseDto): void {
    this.ownerProfile = {
      name: data.name || 'Unknown Owner',
      industry: data.industry || 'Not Specified',
      contactPerson: data.contactPerson || 'N/A',
      email: '', // Not in API yet
      phone: '', // Not in API yet
      projects: data.statistics?.totalProjects || 0,
      nodes: data.statistics?.totalNodes || 0,
      sensors: data.statistics?.activeSensors || 0,
      forwardingStatus: this.determineForwardingStatus(data)
    };

    // Map webhook configuration from API
    if (data.forwardingWebhooks && data.forwardingWebhooks.length > 0) {
      const webhook = data.forwardingWebhooks[0]; // Use first webhook
      this.webhookId = webhook.idOwnerForwardingWebhook; // Store ID for updates
      this.webhookConfig = {
        enabled: webhook.enabled || false,
        label: webhook.label || 'Webhook',
        endpointUrl: webhook.endpointUrl || '',
        httpMethod: (webhook.httpMethod as 'POST' | 'PUT') || 'POST',
        secretToken: webhook.secretToken || '',
        headers: this.parseHeadersJson(webhook.headersJson),
        payloadFormat: 'timeseries', // Default
        retry: {
          maxRetry: webhook.maxRetry || 3,
          backoffMs: webhook.retryBackoffMs || 2000
        },
        lastStatus: webhook.lastStatus || 'Unknown',
        lastDeliveryAt: webhook.lastDeliveryAt
      };
    } else {
      // No webhook exists, reset ID
      this.webhookId = null;
    }

    // Map database configurations from API
    if (data.forwardingDatabases && data.forwardingDatabases.length > 0) {
      this.databaseConfigs = data.forwardingDatabases.map(db => ({
        id: db.idOwnerForwardingDb,
        label: db.label,
        type: (db.dbType === 'mysql' ? 'mysql' : 'postgres') as 'mysql' | 'postgres',
        enabled: db.enabled || false,
        host: db.host,
        port: db.port,
        database: db.databaseName,
        schema: db.targetSchema,
        username: db.username,
        password: db.passwordCipher, // Already masked
        targetTable: db.targetTable,
        writeMode: (db.writeMode as 'append' | 'upsert') || 'append',
        batchSize: db.batchSize || 100,
        lastStatus: db.lastStatus || 'Unknown',
        lastDeliveryAt: db.lastDeliveryAt,
        lastError: db.lastError
      }));
      
      // Track database IDs by type for updates
      data.forwardingDatabases.forEach(db => {
        if (db.dbType === 'mysql') {
          this.mysqlDatabaseId = db.idOwnerForwardingDb;
        } else if (db.dbType === 'postgresql') {
          this.postgresDatabaseId = db.idOwnerForwardingDb;
        }
      });
    } else {
      // No databases configured, reset IDs
      this.mysqlDatabaseId = null;
      this.postgresDatabaseId = null;
    }

    // Map forwarding logs from API
    if (data.forwardingLogs && data.forwardingLogs.length > 0) {
      this.forwardingLogs = data.forwardingLogs.map(log => {
        // Find target name from webhook or database config
        let targetName = 'Unknown Target';
        if (log.configType === 'webhook') {
          const webhook = data.forwardingWebhooks?.find(w => w.idOwnerForwardingWebhook === log.configId);
          targetName = webhook?.label || 'Webhook';
        } else if (log.configType === 'database') {
          const db = data.forwardingDatabases?.find(d => d.idOwnerForwardingDb === log.configId);
          targetName = db?.label || 'Database';
        }

        return {
          id: log.idOwnerForwardingLog,
          target: targetName,
          type: (log.configType as 'webhook' | 'mysql' | 'postgres'),
          status: (log.status as 'success' | 'failed' | 'pending'),
          timestamp: new Date(log.createdAt).toLocaleString(),
          attempts: log.attempts || 1,
          message: log.errorMessage || `${log.status === 'success' ? 'Delivered successfully' : 'Delivery failed'}`,
          durationMs: log.durationMs || 0
        };
      });
    }
  }

  determineForwardingStatus(data: OwnerDetailResponseDto): string {
    const hasWebhooks = data.forwardingWebhooks && data.forwardingWebhooks.length > 0;
    const hasDatabases = data.forwardingDatabases && data.forwardingDatabases.length > 0;
    
    if (!hasWebhooks && !hasDatabases) {
      return 'Not Configured';
    }

    const enabledWebhooks = data.forwardingWebhooks?.filter(w => w.enabled) || [];
    const enabledDatabases = data.forwardingDatabases?.filter(d => d.enabled) || [];

    if (enabledWebhooks.length > 0 || enabledDatabases.length > 0) {
      return 'Operational';
    }

    return 'Disabled';
  }

  parseHeadersJson(headersJson: any): WebhookHeader[] {
    if (!headersJson || typeof headersJson !== 'object') {
      return [];
    }
    
    return Object.keys(headersJson).map(key => ({
      key: key,
      value: headersJson[key]
    }));
  }

  setActiveDeliveryTab(tab: 'webhook' | 'mysql' | 'postgres') {
    this.activeDeliveryTab = tab;
    this.webhookTestMessage = '';
  }

  onWebhookToggle(enabled: boolean) {
    this.webhookConfig.enabled = enabled;
  }

  addWebhookHeader() {
    this.webhookConfig.headers.push({ key: '', value: '' });
  }

  removeWebhookHeader(index: number) {
    this.webhookConfig.headers.splice(index, 1);
  }

  testWebhookDelivery() {
    if (!this.webhookId) {
      this.webhookTestMessage = 'Please save the webhook configuration first.';
      return;
    }

    this.webhookTestMessage = 'Testing delivery...';
    
    this.ownersService
      .ownersControllerTestWebhook({
        id: this.ownerId,
        webhookId: this.webhookId
      })
      .subscribe({
        next: (result: any) => {
          if (result.success) {
            this.webhookTestMessage = `Test delivery succeeded! Duration: ${result.duration}ms`;
            this.webhookConfig.lastStatus = 'Healthy';
            this.webhookConfig.lastDeliveryAt = new Date().toISOString();
          } else {
            this.webhookTestMessage = `Test failed: ${result.message}`;
            this.webhookConfig.lastStatus = 'Failed';
          }
        },
        error: (err: any) => {
          console.error('Error testing webhook:', err);
          this.webhookTestMessage = `Test error: ${err.error?.message || 'Unknown error'}`;
          this.webhookConfig.lastStatus = 'Failed';
        }
      });
  }

  saveWebhookConfig() {
    this.webhookTestMessage = 'Saving configuration...';

    // Prepare headers JSON
    const headersJson: Record<string, any> = {};
    this.webhookConfig.headers.forEach(header => {
      if (header.key && header.value) {
        headersJson[header.key] = header.value;
      }
    });

    const webhookData = {
      label: this.webhookConfig.label,
      endpointUrl: this.webhookConfig.endpointUrl,
      httpMethod: this.webhookConfig.httpMethod,
      headersJson: Object.keys(headersJson).length > 0 ? headersJson : undefined,
      secretToken: this.webhookConfig.secretToken || undefined,
      maxRetry: this.webhookConfig.retry.maxRetry,
      retryBackoffMs: this.webhookConfig.retry.backoffMs,
      enabled: this.webhookConfig.enabled
    };

    if (this.webhookId) {
      // Update existing webhook
      this.ownersService
        .ownersControllerUpdateWebhook({
          id: this.ownerId,
          webhookId: this.webhookId,
          body: webhookData
        })
        .subscribe({
          next: (response: ForwardingWebhookResponseDto) => {
            this.webhookTestMessage = 'Configuration saved successfully!';
            this.webhookConfig.lastStatus = 'Saved';
            setTimeout(() => {
              this.webhookTestMessage = '';
            }, 3000);
          },
          error: (err: any) => {
            console.error('Error saving webhook:', err);
            this.webhookTestMessage = `Error: ${err.error?.message || 'Failed to save configuration'}`;
          }
        });
    } else {
      // Create new webhook
      this.ownersService
        .ownersControllerCreateWebhook({
          id: this.ownerId,
          body: webhookData
        })
        .subscribe({
          next: (response: ForwardingWebhookResponseDto) => {
            this.webhookId = response.idOwnerForwardingWebhook; // Store new ID
            this.webhookTestMessage = 'Configuration created successfully!';
            this.webhookConfig.lastStatus = 'Created';
            setTimeout(() => {
              this.webhookTestMessage = '';
            }, 3000);
          },
          error: (err: any) => {
            console.error('Error creating webhook:', err);
            this.webhookTestMessage = `Error: ${err.error?.message || 'Failed to create configuration'}`;
          }
        });
    }
  }

  getDatabaseConfigsByType(type: 'mysql' | 'postgres') {
    return this.databaseConfigs.filter((config) => config.type === type);
  }

  toggleDatabaseEnabled(config: DatabaseConfig, enabled: boolean) {
    config.enabled = enabled;
    config.lastStatus = config.enabled ? 'Enabled' : 'Disabled';
  }

  testDatabaseConnection(config: DatabaseConfig) {
    const databaseId = config.type === 'mysql' ? this.mysqlDatabaseId : this.postgresDatabaseId;
    
    if (!databaseId) {
      const message = 'Please save the database configuration first.';
      if (config.type === 'mysql') {
        this.mysqlTestMessage = message;
      } else {
        this.postgresTestMessage = message;
      }
      return;
    }

    config.lastStatus = 'Testing...';
    const message = 'Testing connection...';
    if (config.type === 'mysql') {
      this.mysqlTestMessage = message;
    } else {
      this.postgresTestMessage = message;
    }

    this.ownersService
      .ownersControllerTestDatabase({
        id: this.ownerId,
        databaseId: databaseId
      })
      .subscribe({
        next: (result: any) => {
          if (result.success) {
            const successMsg = `Connection test succeeded! Duration: ${result.duration}ms`;
            config.lastStatus = 'Healthy';
            config.lastDeliveryAt = new Date().toISOString();
            config.lastError = undefined;
            
            if (config.type === 'mysql') {
              this.mysqlTestMessage = successMsg;
            } else {
              this.postgresTestMessage = successMsg;
            }

            setTimeout(() => {
              this.mysqlTestMessage = '';
              this.postgresTestMessage = '';
            }, 3000);
          } else {
            const failMsg = `Test failed: ${result.message}`;
            config.lastStatus = 'Failed';
            config.lastError = result.message;
            
            if (config.type === 'mysql') {
              this.mysqlTestMessage = failMsg;
            } else {
              this.postgresTestMessage = failMsg;
            }
          }
        },
        error: (err: any) => {
          console.error('Error testing database:', err);
          const errorMsg = `Test error: ${err.error?.message || 'Unknown error'}`;
          config.lastStatus = 'Failed';
          config.lastError = err.error?.message || 'Unknown error';
          
          if (config.type === 'mysql') {
            this.mysqlTestMessage = errorMsg;
          } else {
            this.postgresTestMessage = errorMsg;
          }
        }
      });
  }

  saveDatabaseConfig(config: DatabaseConfig) {
    config.lastStatus = 'Saving...';
    const savingMsg = 'Saving configuration...';
    if (config.type === 'mysql') {
      this.mysqlTestMessage = savingMsg;
    } else {
      this.postgresTestMessage = savingMsg;
    }

    const databaseId = config.type === 'mysql' ? this.mysqlDatabaseId : this.postgresDatabaseId;

    if (databaseId) {
      // UPDATE existing database config
      const updateData = {
        label: config.label,
        dbType: (config.type === 'mysql' ? 'mysql' : 'postgresql') as 'mysql' | 'postgresql',
        host: config.host,
        port: config.port,
        databaseName: config.database,
        targetSchema: config.schema || undefined,
        username: config.username,
        passwordCipher: config.password === '********' ? undefined : config.password, // Only send if changed
        targetTable: config.targetTable,
        writeMode: config.writeMode,
        batchSize: config.batchSize,
        enabled: config.enabled
      };

      this.ownersService
        .ownersControllerUpdateDatabase({
          id: this.ownerId,
          databaseId: databaseId,
          body: updateData
        })
        .subscribe({
          next: (response: ForwardingDatabaseResponseDto) => {
            config.lastStatus = 'Saved';
            const successMsg = 'Configuration saved successfully!';
            
            if (config.type === 'mysql') {
              this.mysqlTestMessage = successMsg;
            } else {
              this.postgresTestMessage = successMsg;
            }

            setTimeout(() => {
              this.mysqlTestMessage = '';
              this.postgresTestMessage = '';
            }, 3000);
          },
          error: (err: any) => {
            console.error('Error saving database config:', err);
            config.lastStatus = 'Failed';
            const errorMsg = `Error: ${err.error?.message || 'Failed to save configuration'}`;
            
            if (config.type === 'mysql') {
              this.mysqlTestMessage = errorMsg;
            } else {
              this.postgresTestMessage = errorMsg;
            }
          }
        });
    } else {
      // CREATE new database config
      const createData = {
        label: config.label,
        dbType: (config.type === 'mysql' ? 'mysql' : 'postgresql') as 'mysql' | 'postgresql',
        host: config.host,
        port: config.port,
        databaseName: config.database,
        targetSchema: config.schema || undefined,
        username: config.username,
        passwordCipher: config.password, // Required for create
        targetTable: config.targetTable,
        writeMode: config.writeMode,
        batchSize: config.batchSize,
        enabled: config.enabled
      };

      this.ownersService
        .ownersControllerCreateDatabase({
          id: this.ownerId,
          body: createData
        })
        .subscribe({
          next: (response: ForwardingDatabaseResponseDto) => {
            // Store new ID
            if (config.type === 'mysql') {
              this.mysqlDatabaseId = response.idOwnerForwardingDb;
            } else {
              this.postgresDatabaseId = response.idOwnerForwardingDb;
            }
            
            config.id = response.idOwnerForwardingDb;
            config.lastStatus = 'Created';
            const successMsg = 'Configuration created successfully!';
            
            if (config.type === 'mysql') {
              this.mysqlTestMessage = successMsg;
            } else {
              this.postgresTestMessage = successMsg;
            }

            setTimeout(() => {
              this.mysqlTestMessage = '';
              this.postgresTestMessage = '';
            }, 3000);
          },
          error: (err: any) => {
            console.error('Error creating database config:', err);
            config.lastStatus = 'Failed';
            const errorMsg = `Error: ${err.error?.message || 'Failed to create configuration'}`;
            
            if (config.type === 'mysql') {
              this.mysqlTestMessage = errorMsg;
            } else {
              this.postgresTestMessage = errorMsg;
            }
          }
        });
    }
  }
}
