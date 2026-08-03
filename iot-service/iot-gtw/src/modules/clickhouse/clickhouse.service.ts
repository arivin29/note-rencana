import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';
import {
  SensorTelemetryDto,
  SensorChannelLatestDto,
  NodeLatestDto,
} from './dto';

@Injectable()
export class ClickhouseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClickhouseService.name);
  private client: ClickHouseClient;
  private isConnected = false;

  // Batch buffers
  private telemetryBuffer: SensorTelemetryDto[] = [];
  private channelLatestBuffer: SensorChannelLatestDto[] = [];
  private nodeLatestBuffer: NodeLatestDto[] = [];

  // Config
  private batchSize: number;
  private flushIntervalMs: number;
  private flushTimer: NodeJS.Timeout;

  // Reconnect settings
  private reconnectTimer: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private readonly maxFastReconnectAttempts = 10;
  private readonly reconnectIntervalMs = 10000; // 10 seconds
  private readonly slowReconnectIntervalMs = 60000; // 1 minute, after fast attempts exhausted
  private isReconnecting = false;

  constructor(private readonly configService: ConfigService) {
    this.batchSize = this.configService.get<number>('clickhouse.batchSize') || 1000;
    this.flushIntervalMs = this.configService.get<number>('clickhouse.flushIntervalMs') || 5000;
  }

  async onModuleInit() {
    await this.connect();
    this.startFlushTimer();
  }

  async onModuleDestroy() {
    this.stopFlushTimer();
    this.stopReconnectTimer();
    await this.flushAll();
    await this.disconnect();
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
        clickhouse_settings: {
          async_insert: 1,
          wait_for_async_insert: 0,
        },
      });

      // Test connection
      const result = await this.client.query({
        query: 'SELECT 1',
        format: 'JSONEachRow',
      });
      await result.json();

      this.isConnected = true;
      this.reconnectAttempts = 0; // Reset on successful connection
      this.logger.log('✅ Connected to ClickHouse');
    } catch (error) {
      this.logger.error(`❌ Failed to connect to ClickHouse: ${error.message}`, error.stack);
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    // Never give up: fast retries first, then a slow steady interval so the
    // service survives long ClickHouse maintenance windows.
    const delayMs =
      this.reconnectAttempts <= this.maxFastReconnectAttempts
        ? this.reconnectIntervalMs
        : this.slowReconnectIntervalMs;

    this.logger.warn(`Scheduling ClickHouse reconnect attempt ${this.reconnectAttempts} in ${delayMs / 1000}s`);

    this.reconnectTimer = setTimeout(async () => {
      this.isReconnecting = false;
      await this.reconnect();
    }, delayMs);
  }

  /**
   * Attempt to reconnect
   */
  private async reconnect(): Promise<void> {
    this.logger.log('Attempting to reconnect to ClickHouse...');
    
    // Close existing client if any
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // Ignore close errors
      }
    }

    await this.connect();
  }

  /**
   * Stop reconnect timer
   */
  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Disconnect from ClickHouse
   */
  private async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      this.logger.log('Disconnected from ClickHouse');
    }
  }

  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushAll();
    }, this.flushIntervalMs);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }

  // ==========================================
  // INSERT METHODS
  // ==========================================

  /**
   * Add telemetry data to buffer
   */
  async insertTelemetry(data: SensorTelemetryDto): Promise<void> {
    this.telemetryBuffer.push(data);
    this.trimBuffer(this.telemetryBuffer, 'telemetry');

    if (this.telemetryBuffer.length >= this.batchSize) {
      await this.flushTelemetry();
    }
  }

  /**
   * Add multiple telemetry records to buffer
   */
  async insertTelemetryBatch(data: SensorTelemetryDto[]): Promise<void> {
    this.telemetryBuffer.push(...data);
    this.trimBuffer(this.telemetryBuffer, 'telemetry');

    if (this.telemetryBuffer.length >= this.batchSize) {
      await this.flushTelemetry();
    }
  }

  /**
   * Update channel latest status
   */
  async updateChannelLatest(data: SensorChannelLatestDto): Promise<void> {
    this.channelLatestBuffer.push(data);
    this.trimBuffer(this.channelLatestBuffer, 'channelLatest');

    if (this.channelLatestBuffer.length >= this.batchSize) {
      await this.flushChannelLatest();
    }
  }

  /**
   * Drop oldest buffered rows past the cap so a long ClickHouse outage
   * can't grow the buffers unbounded (Postgres keeps the full history).
   */
  private trimBuffer(buffer: unknown[], name: string): void {
    const max = this.batchSize * 10;
    if (buffer.length > max) {
      const dropped = buffer.length - max;
      buffer.splice(0, dropped);
      this.logger.warn(`Buffer ${name} over capacity while ClickHouse unavailable — dropped ${dropped} oldest rows`);
    }
  }

  /**
   * Update node latest status
   */
  async updateNodeLatest(data: NodeLatestDto): Promise<void> {
    // Remove existing entry for same node_id to avoid duplicates in buffer
    this.nodeLatestBuffer = this.nodeLatestBuffer.filter(n => n.node_id !== data.node_id);
    this.nodeLatestBuffer.push(data);

    if (this.nodeLatestBuffer.length >= this.batchSize) {
      await this.flushNodeLatest();
    }
  }

  // ==========================================
  // FLUSH METHODS
  // ==========================================

  /**
   * Flush all buffers
   */
  async flushAll(): Promise<void> {
    await Promise.all([
      this.flushTelemetry(),
      this.flushChannelLatest(),
      this.flushNodeLatest(),
    ]);
  }

  /**
   * Flush telemetry buffer to ClickHouse
   * Note: Materialized Views (10min, 1hour, daily) are auto-populated by ClickHouse
   */
  private async flushTelemetry(): Promise<void> {
    if (this.telemetryBuffer.length === 0) return;

    this.logger.log(`🔄 Flushing ${this.telemetryBuffer.length} telemetry records, isConnected: ${this.isConnected}`);
    
    if (!this.isConnected) {
      this.scheduleReconnect();
      return;
    }

    const batch = [...this.telemetryBuffer];
    this.telemetryBuffer = [];

    try {
      const insertData = batch.map(row => ({
        ...row,
        event_time: this.toClickHouseDateTime(row.event_time),
        signal_quality: row.signal_quality || 0,
        firmware_version: row.firmware_version || '',
      }));

      // Debug: log first record structure
      if (insertData.length > 0) {
        this.logger.debug(`Inserting telemetry sample: ${JSON.stringify(insertData[0])}`);
      }

      await this.client.insert({
        table: 'iot.sensor_telemetry',
        values: insertData,
        format: 'JSONEachRow',
      });

      this.reconnectAttempts = 0; // Reset on successful operation
      this.logger.log(`✅ Flushed ${batch.length} telemetry records to ClickHouse`);
    } catch (error) {
      this.logger.error(`❌ Failed to flush telemetry: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      // Re-add failed batch to buffer (with limit to prevent memory issues)
      if (this.telemetryBuffer.length < this.batchSize * 10) {
        this.telemetryBuffer.unshift(...batch);
      }
      // Handle connection-related errors
      if (this.isConnectionError(error)) {
        this.isConnected = false;
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Flush channel latest buffer
   */
  private async flushChannelLatest(): Promise<void> {
    if (this.channelLatestBuffer.length === 0) return;

    if (!this.isConnected) {
      this.scheduleReconnect();
      return;
    }

    const batch = [...this.channelLatestBuffer];
    this.channelLatestBuffer = [];

    try {
      await this.client.insert({
        table: 'iot.sensor_channel_latest',
        values: batch.map(row => ({
          ...row,
          last_update: this.toClickHouseDateTime(row.last_update),
          signal_quality: row.signal_quality || 0,
        })),
        format: 'JSONEachRow',
      });

      this.reconnectAttempts = 0; // Reset on successful operation
      this.logger.debug( `Flushed ${batch.length} channel latest records to ClickHouse `);
    } catch (error) {
      this.logger.error( `Failed to flush channel latest: ${error.message} `);
      if (this.channelLatestBuffer.length < this.batchSize * 10) {
        this.channelLatestBuffer.unshift(...batch);
      }
      // Handle connection-related errors
      if (this.isConnectionError(error)) {
        this.isConnected = false;
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Flush node latest buffer
   */
  private async flushNodeLatest(): Promise<void> {
    if (this.nodeLatestBuffer.length === 0) return;

    if (!this.isConnected) {
      this.scheduleReconnect();
      return;
    }

    const batch = [...this.nodeLatestBuffer];
    this.nodeLatestBuffer = [];

    try {
      await this.client.insert({
        table: 'iot.node_latest',
        values: batch.map(row => ({
          ...row,
          last_seen: this.toClickHouseDateTime(row.last_seen),
          signal_quality: row.signal_quality || 0,
          firmware_version: row.firmware_version || '',
          ip_address: row.ip_address || '',
          total_channels: row.total_channels || 0,
          active_channels: row.active_channels || 0,
        })),
        format: 'JSONEachRow',
      });

      this.reconnectAttempts = 0; // Reset on successful operation
      this.logger.debug( `Flushed ${batch.length} node latest records to ClickHouse `);
    } catch (error) {
      this.logger.error( `Failed to flush node latest: ${error.message} `);
      if (this.nodeLatestBuffer.length < this.batchSize * 10) {
        this.nodeLatestBuffer.unshift(...batch);
      }
      // Handle connection-related errors
      if (this.isConnectionError(error)) {
        this.isConnected = false;
        this.scheduleReconnect();
      }
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Check if error is a connection-related error
   */
  private isConnectionError(error: any): boolean {
    const connectionErrorPatterns = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EHOSTUNREACH',
      'socket hang up',
      'Connection refused',
      'connection closed',
      'network error',
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || '';

    return connectionErrorPatterns.some(
      pattern => errorMessage.includes(pattern.toLowerCase()) || errorCode === pattern
    );
  }

  /**
   * Convert Date to ClickHouse DateTime64 format
   * ClickHouse format: YYYY-MM-DD HH:MM:SS.sss
   */
  private toClickHouseDateTime(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }

  /**
   * Get buffer statistics
   */
  getBufferStats(): { telemetry: number; channelLatest: number; nodeLatest: number } {
    return {
      telemetry: this.telemetryBuffer.length,
      channelLatest: this.channelLatestBuffer.length,
      nodeLatest: this.nodeLatestBuffer.length,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; connected: boolean; buffers: any }> {
    let pingOk = false;

    if (this.isConnected) {
      try {
        const result = await this.client.query({
          query: 'SELECT 1',
          format: 'JSONEachRow',
        });
        await result.json();
        pingOk = true;
      } catch {
        pingOk = false;
      }
    }

    return {
      status: pingOk ? 'healthy' : 'unhealthy',
      connected: this.isConnected && pingOk,
      buffers: this.getBufferStats(),
    };
  }

  /**
   * Execute a query and return results
   * Used for data forwarding to read from ClickHouse
   */
  async query<T = any>(sql: string, params?: Record<string, any>): Promise<T[]> {
    if (!this.isConnected) {
      throw new Error('ClickHouse not connected');
    }

    try {
      const result = await this.client.query({
        query: sql,
        query_params: params,
        format: 'JSONEachRow',
      });

      const data = await result.json<T>();
      return data as T[];
    } catch (error) {
      this.logger.error(`Query failed: ${error.message}`);
      
      // Handle connection-related errors
      if (this.isConnectionError(error)) {
        this.isConnected = false;
        this.scheduleReconnect();
      }
      
      throw error;
    }
  }
}
