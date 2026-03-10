import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';
import { OpenSearchService } from './opensearch.service';
import { TelemetryPoint, SyncCheckpoint } from '../interfaces/telemetry.interface';

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);
  private clickhouseClient: ClickHouseClient | null = null;

  // Sync state
  private lastSyncTimestamp: Date | null = null;
  private isSyncing = false;

  // Configuration
  private readonly clickhouseUrl: string;
  private readonly clickhouseUser: string;
  private readonly clickhousePassword: string;
  private readonly clickhouseDatabase: string;
  private readonly syncBatchSize: number;
  private readonly syncLookbackMinutes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly openSearchService: OpenSearchService,
  ) {
    this.clickhouseUrl = this.configService.get<string>('clickhouse.url', 'http://localhost:8123');
    this.clickhouseUser = this.configService.get<string>('clickhouse.username', 'default');
    this.clickhousePassword = this.configService.get<string>('clickhouse.password', '');
    this.clickhouseDatabase = this.configService.get<string>('clickhouse.database', 'iot');
    this.syncBatchSize = this.configService.get<number>('opensearch.syncBatchSize', 1000);
    this.syncLookbackMinutes = this.configService.get<number>('opensearch.syncLookbackMinutes', 15);
  }

  async onModuleInit() {
    await this.initClickhouse();
  }

  private async initClickhouse(): Promise<void> {
    try {
      this.clickhouseClient = createClient({
        url: this.clickhouseUrl,
        username: this.clickhouseUser,
        password: this.clickhousePassword,
        database: this.clickhouseDatabase,
      });

      // Test connection
      const result = await this.clickhouseClient.query({
        query: 'SELECT 1',
        format: 'JSONEachRow',
      });
      await result.json();

      this.logger.log('SyncService: ClickHouse connection established');
    } catch (error) {
      this.logger.error(`SyncService: Failed to connect to ClickHouse: ${error.message}`);
    }
  }

  /**
   * Sync aggregated telemetry from ClickHouse to OpenSearch
   * Called by scheduler every 10 minutes
   */
  async syncTelemetry(): Promise<SyncCheckpoint> {
    if (this.isSyncing) {
      this.logger.warn('Sync already in progress, skipping');
      return {
        lastSyncedTimestamp: this.lastSyncTimestamp || new Date(),
        lastSyncedCount: 0,
        lastSyncDuration: 0,
      };
    }

    if (!this.openSearchService.isReady()) {
      this.logger.warn('OpenSearch not ready, skipping sync');
      return {
        lastSyncedTimestamp: this.lastSyncTimestamp || new Date(),
        lastSyncedCount: 0,
        lastSyncDuration: 0,
      };
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      // Calculate time range
      const now = new Date();
      // Sync lookback period - default 15 minutes to catch late data
      const fromTime = this.lastSyncTimestamp
        ? new Date(this.lastSyncTimestamp.getTime() - this.syncLookbackMinutes * 60 * 1000)
        : new Date(now.getTime() - 60 * 60 * 1000); // First run: last hour

      // Query aggregated data from ClickHouse materialized view
      const aggregatedData = await this.queryAggregatedData(fromTime, now);

      if (aggregatedData.length === 0) {
        this.logger.debug('No new aggregated data to sync');
        this.lastSyncTimestamp = now;
        return {
          lastSyncedTimestamp: now,
          lastSyncedCount: 0,
          lastSyncDuration: Date.now() - startTime,
        };
      }

      // Convert to TelemetryPoint format
      const telemetryPoints = this.convertToTelemetryPoints(aggregatedData);

      // Bulk index in batches
      let totalSuccess = 0;
      let totalErrors = 0;

      for (let i = 0; i < telemetryPoints.length; i += this.syncBatchSize) {
        const batch = telemetryPoints.slice(i, i + this.syncBatchSize);
        const result = await this.openSearchService.bulkIndexTelemetry(batch);
        totalSuccess += result.success;
        totalErrors += result.errors;
      }

      this.lastSyncTimestamp = now;
      const duration = Date.now() - startTime;

      this.logger.log(
        `Sync completed: ${totalSuccess} indexed, ${totalErrors} errors, ${duration}ms`,
      );

      return {
        lastSyncedTimestamp: now,
        lastSyncedCount: totalSuccess,
        lastSyncDuration: duration,
      };
    } catch (error) {
      this.logger.error(`Sync failed: ${error.message}`);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Query aggregated data from ClickHouse materialized view
   */
  private async queryAggregatedData(from: Date, to: Date): Promise<any[]> {
    if (!this.clickhouseClient) {
      throw new Error('ClickHouse client not initialized');
    }

    // Format dates for ClickHouse (remove trailing Z and milliseconds handling)
    const formatDateForClickHouse = (date: Date): string => {
      return date.toISOString().replace('Z', '').slice(0, 23);
    };

    // Query the materialized view for 10-minute aggregated data
    // Using actual column names from sensor_telemetry_10min table
    const query = `
      SELECT
        node_code AS device_id,
        toString(channel_id) AS sensor_key,
        metric_code,
        metric_unit AS unit_code,
        time_bucket AS period_start,
        addMinutes(time_bucket, 10) AS period_end,
        avgMerge(eng_avg_state) AS avg_value,
        minMerge(eng_min_state) AS min_value,
        maxMerge(eng_max_state) AS max_value,
        countMerge(sample_count_state) AS sample_count
      FROM iot.sensor_telemetry_10min
      WHERE time_bucket >= parseDateTimeBestEffort('${formatDateForClickHouse(from)}')
        AND time_bucket < parseDateTimeBestEffort('${formatDateForClickHouse(to)}')
      GROUP BY
        node_code,
        channel_id,
        metric_code,
        metric_unit,
        time_bucket
      ORDER BY time_bucket ASC
      LIMIT 50000
    `;

    try {
      const result = await this.clickhouseClient.query({
        query,
        format: 'JSONEachRow',
      });

      return (await result.json()) as any[];
    } catch (error) {
      this.logger.error(`ClickHouse query failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Query all distinct device/sensor combinations for anomaly detection
   */
  async getActiveSensors(): Promise<Array<{ deviceId: string; sensorKey: string }>> {
    if (!this.clickhouseClient) {
      throw new Error('ClickHouse client not initialized');
    }

    // Get sensors with data in the last 24 hours
    // Using actual column names: node_code and channel_id
    const query = `
      SELECT DISTINCT
        node_code AS device_id,
        toString(channel_id) AS sensor_key
      FROM iot.sensor_telemetry_10min
      WHERE time_bucket >= now() - INTERVAL 24 HOUR
      ORDER BY device_id, sensor_key
    `;

    try {
      const result = await this.clickhouseClient.query({
        query,
        format: 'JSONEachRow',
      });

      const rows = (await result.json()) as any[];
      return rows.map((row) => ({
        deviceId: row.device_id,
        sensorKey: row.sensor_key,
      }));
    } catch (error) {
      this.logger.error(`Failed to get active sensors: ${error.message}`);
      return [];
    }
  }

  /**
   * Convert ClickHouse rows to TelemetryPoint format
   */
  private convertToTelemetryPoints(rows: any[]): TelemetryPoint[] {
    return rows.map((row) => ({
      deviceId: row.device_id,
      sensorKey: row.sensor_key,
      metricCode: row.metric_code,
      unitCode: row.unit_code,
      timestamp: new Date(row.period_start),
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      avgValue: parseFloat(row.avg_value) || 0,
      minValue: parseFloat(row.min_value) || 0,
      maxValue: parseFloat(row.max_value) || 0,
      sampleCount: parseInt(row.sample_count, 10) || 0,
      sumValue: (parseFloat(row.avg_value) || 0) * (parseInt(row.sample_count, 10) || 0), // Calculate sum from avg * count
    }));
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isSyncing: boolean;
    lastSyncTimestamp: Date | null;
    openSearchReady: boolean;
    circuitBreaker: any;
  } {
    return {
      isSyncing: this.isSyncing,
      lastSyncTimestamp: this.lastSyncTimestamp,
      openSearchReady: this.openSearchService.isReady(),
      circuitBreaker: this.openSearchService.getCircuitBreakerStatus(),
    };
  }

  /**
   * Force a full resync from specific date
   */
  async forceResync(fromDate: Date): Promise<SyncCheckpoint> {
    this.lastSyncTimestamp = fromDate;
    return this.syncTelemetry();
  }
}
