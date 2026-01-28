import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';

export interface ClickHouseQueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
}

@Injectable()
export class ClickhouseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClickhouseService.name);
  private client: ClickHouseClient | null = null;
  private isConnected = false;
  private isEnabled = false;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>('clickhouse.enabled') || false;
  }

  async onModuleInit() {
    if (this.isEnabled) {
      await this.connect();
    } else {
      this.logger.log('ClickHouse is disabled in configuration');
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Check if ClickHouse is available
   */
  isAvailable(): boolean {
    return this.isEnabled && this.isConnected;
  }

  /**
   * Connect to ClickHouse
   */
  private async connect(): Promise<void> {
    const host = this.configService.get<string>('clickhouse.host');
    const port = this.configService.get<number>('clickhouse.port');
    const database = this.configService.get<string>('clickhouse.database');
    const username = this.configService.get<string>('clickhouse.username');
    const password = this.configService.get<string>('clickhouse.password');

    this.logger.log(`Connecting to ClickHouse: ${host}:${port}/${database}`);

    try {
      this.client = createClient({
        host: `http://${host}:${port}`,
        database,
        username,
        password,
        request_timeout: this.configService.get<number>('clickhouse.requestTimeout') || 30000,
        compression: {
          request: true,
          response: true,
        },
      });

      // Test connection
      const result = await this.client.query({
        query: 'SELECT 1',
        format: 'JSONEachRow',
      });
      await result.json();

      this.isConnected = true;
      this.logger.log('✅ Connected to ClickHouse');
    } catch (error) {
      this.logger.error(`❌ Failed to connect to ClickHouse: ${error.message}`);
      this.isConnected = false;
    }
  }

  /**
   * Disconnect from ClickHouse
   */
  private async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.logger.log('Disconnected from ClickHouse');
      } catch (error) {
        this.logger.error(`Error disconnecting from ClickHouse: ${error.message}`);
      }
    }
  }

  /**
   * Execute a SELECT query
   */
  async executeQuery(sql: string): Promise<ClickHouseQueryResult> {
    if (!this.isAvailable() || !this.client) {
      throw new Error('ClickHouse is not available');
    }

    const startTime = Date.now();

    try {
      const result = await this.client.query({
        query: sql,
        format: 'JSONEachRow',
      });

      const rows = await result.json() as any[];
      const executionTime = Date.now() - startTime;

      // Extract column names from first row
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTime,
      };
    } catch (error) {
      this.logger.error(`ClickHouse query error: ${error.message}`);
      throw new Error(`ClickHouse query failed: ${error.message}`);
    }
  }

  /**
   * Get health status
   */
  async healthCheck(): Promise<{ status: string; latency?: number }> {
    if (!this.isEnabled) {
      return { status: 'disabled' };
    }

    if (!this.isConnected || !this.client) {
      return { status: 'disconnected' };
    }

    try {
      const startTime = Date.now();
      await this.client.query({
        query: 'SELECT 1',
        format: 'JSONEachRow',
      });
      return {
        status: 'healthy',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return { status: 'error' };
    }
  }
}
