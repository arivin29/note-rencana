import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import {
  TelemetryPoint,
  AnomalyResult,
  CircuitBreakerState,
  OpenSearchBulkItem,
} from '../interfaces/telemetry.interface';

@Injectable()
export class OpenSearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpenSearchService.name);
  private client: Client | null = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // Circuit breaker state
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failures: 0,
    lastFailure: null,
    nextAttempt: null,
  };

  // Configuration
  private readonly url: string;
  private readonly username: string;
  private readonly password: string;
  private readonly sslVerify: boolean;
  private readonly indexPrefix: string;
  private readonly anomalyIndexPrefix: string;
  private readonly retryMaxAttempts: number;
  private readonly retryInitialDelayMs: number;
  private readonly retryMaxDelayMs: number;
  private readonly circuitBreakerFailureThreshold: number;
  private readonly circuitBreakerResetTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('opensearch.url', 'https://localhost:9200');
    this.username = this.configService.get<string>('opensearch.username', 'admin');
    this.password = this.configService.get<string>('opensearch.password', '');
    this.sslVerify = this.configService.get<boolean>('opensearch.sslVerify', false);
    this.indexPrefix = this.configService.get<string>('opensearch.indexPrefix', 'sensor-telemetry-10min-');
    this.anomalyIndexPrefix = this.configService.get<string>('opensearch.anomalyIndexPrefix', 'anomaly-results-');
    this.retryMaxAttempts = this.configService.get<number>('opensearch.retryMaxAttempts', 3);
    this.retryInitialDelayMs = this.configService.get<number>('opensearch.retryInitialDelayMs', 2000);
    this.retryMaxDelayMs = this.configService.get<number>('opensearch.retryMaxDelayMs', 30000);
    this.circuitBreakerFailureThreshold = this.configService.get<number>('opensearch.circuitBreakerFailureThreshold', 5);
    this.circuitBreakerResetTimeoutMs = this.configService.get<number>('opensearch.circuitBreakerResetTimeoutMs', 60000);
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    this.cleanup();
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.isConnected = false;
    this.logger.log('OpenSearch connection closed');
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async connect(): Promise<void> {
    try {
      this.cleanup();

      this.client = new Client({
        node: this.url,
        auth: {
          username: this.username,
          password: this.password,
        },
        ssl: {
          rejectUnauthorized: this.sslVerify,
        },
      });

      // Test connection
      const health = await this.client.cluster.health();
      this.isConnected = true;
      this.resetCircuitBreaker();

      this.logger.log(
        `OpenSearch connected: ${this.url}, cluster: ${health.body.cluster_name}, status: ${health.body.status}`,
      );
    } catch (error) {
      this.isConnected = false;
      this.handleFailure(error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(delayMs?: number): void {
    const delay = delayMs ?? this.calculateBackoff();
    this.logger.warn(`Scheduling OpenSearch reconnect in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      await this.connect();
    }, delay);
  }

  private calculateBackoff(): number {
    const attempt = this.circuitBreaker.failures;
    const delay = Math.min(
      this.retryInitialDelayMs * Math.pow(2, attempt),
      this.retryMaxDelayMs,
    );
    return delay;
  }

  private handleFailure(error: any): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = new Date();

    if (this.circuitBreaker.failures >= this.circuitBreakerFailureThreshold) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.nextAttempt = new Date(
        Date.now() + this.circuitBreakerResetTimeoutMs,
      );
      this.logger.error(
        `Circuit breaker OPEN after ${this.circuitBreaker.failures} failures. Next attempt at ${this.circuitBreaker.nextAttempt}`,
      );
    }

    this.logger.error(`OpenSearch error: ${error.message}`);
  }

  private resetCircuitBreaker(): void {
    this.circuitBreaker = {
      isOpen: false,
      failures: 0,
      lastFailure: null,
      nextAttempt: null,
    };
  }

  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreaker.isOpen) {
      return false;
    }

    // Check if reset timeout has passed
    if (this.circuitBreaker.nextAttempt && new Date() >= this.circuitBreaker.nextAttempt) {
      this.logger.log('Circuit breaker attempting half-open state');
      return false; // Allow one request through
    }

    return true;
  }

  /**
   * Get the current month index name
   */
  getMonthlyIndexName(prefix: string, date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${prefix}${year}.${month}`;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isConnected && !this.isCircuitBreakerOpen();
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Bulk index telemetry data
   */
  async bulkIndexTelemetry(data: TelemetryPoint[]): Promise<{ success: number; errors: number }> {
    if (!this.isReady()) {
      throw new Error('OpenSearch service not ready');
    }

    if (data.length === 0) {
      return { success: 0, errors: 0 };
    }

    const body: any[] = [];
    for (const point of data) {
      const indexName = this.getMonthlyIndexName(this.indexPrefix, point.timestamp);
      const docId = `${point.deviceId}-${point.sensorKey}-${point.periodStart.toISOString()}`;

      body.push({
        index: {
          _index: indexName,
          _id: docId,
        },
      });

      body.push({
        // Use field names matching OpenSearch index mapping
        node_code: point.deviceId,
        channel_id: point.sensorKey,
        metric_code: point.metricCode || '',
        metric_unit: point.unitCode,
        '@timestamp': point.timestamp.toISOString(),
        time_bucket: point.periodStart.toISOString(),
        avg_eng: point.avgValue,
        min_eng: point.minValue,
        max_eng: point.maxValue,
        sample_count: point.sampleCount,
      });
    }

    try {
      const response = await this.client!.bulk({ body, refresh: false });

      let errorCount = 0;
      if (response.body.errors) {
        for (const item of response.body.items) {
          if (item.index?.error) {
            errorCount++;
            this.logger.warn(`Bulk index error: ${JSON.stringify(item.index.error)}`);
          }
        }
      }

      const successCount = data.length - errorCount;
      this.resetCircuitBreaker();

      this.logger.debug(`Bulk indexed ${successCount}/${data.length} telemetry points`);
      return { success: successCount, errors: errorCount };
    } catch (error) {
      this.handleFailure(error);
      throw error;
    }
  }

  /**
   * Bulk index anomaly results
   */
  async bulkIndexAnomalies(anomalies: AnomalyResult[]): Promise<{ success: number; errors: number }> {
    if (!this.isReady()) {
      throw new Error('OpenSearch service not ready');
    }

    if (anomalies.length === 0) {
      return { success: 0, errors: 0 };
    }

    const body: any[] = [];
    for (const anomaly of anomalies) {
      const indexName = this.getMonthlyIndexName(this.anomalyIndexPrefix, anomaly.timestamp);
      const docId = `${anomaly.deviceId}-${anomaly.sensorKey}-${anomaly.timestamp.toISOString()}`;

      body.push({
        index: {
          _index: indexName,
          _id: docId,
        },
      });

      body.push({
        device_id: anomaly.deviceId,
        sensor_key: anomaly.sensorKey,
        timestamp: anomaly.timestamp.toISOString(),
        rcf_score: anomaly.rcfScore,
        anomaly_grade: anomaly.anomalyGrade,
        actual_value: anomaly.actualValue,
        baseline_value: anomaly.baselineValue,
        deviation_percent: anomaly.deviationPercent,
        severity: anomaly.severity,
        detected_at: anomaly.detectedAt.toISOString(),
      });
    }

    try {
      const response = await this.client!.bulk({ body, refresh: true });

      let errorCount = 0;
      if (response.body.errors) {
        for (const item of response.body.items) {
          if (item.index?.error) {
            errorCount++;
          }
        }
      }

      const successCount = anomalies.length - errorCount;
      return { success: successCount, errors: errorCount };
    } catch (error) {
      this.handleFailure(error);
      throw error;
    }
  }

  /**
   * Query latest telemetry for anomaly detection
   */
  async getLatestTelemetry(
    deviceId: string,
    sensorKey: string,
    lookbackMinutes: number = 60,
  ): Promise<TelemetryPoint[]> {
    if (!this.isReady()) {
      throw new Error('OpenSearch service not ready');
    }

    const now = new Date();
    const from = new Date(now.getTime() - lookbackMinutes * 60 * 1000);

    // Query both current and previous month indices
    const currentIndex = this.getMonthlyIndexName(this.indexPrefix, now);
    const prevMonth = new Date(now);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevIndex = this.getMonthlyIndexName(this.indexPrefix, prevMonth);

    try {
      const response = await this.client!.search({
        index: `${currentIndex},${prevIndex}`,
        ignore_unavailable: true,
        body: {
          query: {
            bool: {
              must: [
                { term: { node_code: deviceId } },
                { term: { channel_id: sensorKey } },
                {
                  range: {
                    '@timestamp': {
                      gte: from.toISOString(),
                      lte: now.toISOString(),
                    },
                  },
                },
              ],
            },
          },
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: 100,
        },
      });

      const hits = response.body.hits.hits || [];
      return hits.map((hit: any) => ({
        deviceId: hit._source.node_code,
        sensorKey: hit._source.channel_id,
        unitCode: hit._source.metric_unit,
        timestamp: new Date(hit._source['@timestamp']),
        periodStart: new Date(hit._source.time_bucket),
        periodEnd: new Date(new Date(hit._source.time_bucket).getTime() + 10 * 60 * 1000),
        avgValue: hit._source.avg_eng,
        minValue: hit._source.min_eng,
        maxValue: hit._source.max_eng,
        sampleCount: hit._source.sample_count,
        sumValue: hit._source.avg_eng * hit._source.sample_count,
      }));
    } catch (error) {
      this.handleFailure(error);
      throw error;
    }
  }

  /**
   * Get aggregated history for training data
   */
  async getTrainingData(
    deviceId: string,
    sensorKey: string,
    days: number = 30,
  ): Promise<TelemetryPoint[]> {
    if (!this.isReady()) {
      throw new Error('OpenSearch service not ready');
    }

    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Build index pattern for date range
    const indices: string[] = [];
    const current = new Date(from);
    while (current <= now) {
      indices.push(this.getMonthlyIndexName(this.indexPrefix, current));
      current.setMonth(current.getMonth() + 1);
    }

    try {
      const response = await this.client!.search({
        index: [...new Set(indices)].join(','),
        ignore_unavailable: true,
        body: {
          query: {
            bool: {
              must: [
                { term: { node_code: deviceId } },
                { term: { channel_id: sensorKey } },
                {
                  range: {
                    '@timestamp': {
                      gte: from.toISOString(),
                      lte: now.toISOString(),
                    },
                  },
                },
              ],
            },
          },
          sort: [{ '@timestamp': { order: 'asc' } }],
          size: 10000, // 30 days * 144 points/day = 4320 points
        },
      });

      const hits = response.body.hits.hits || [];
      return hits.map((hit: any) => ({
        deviceId: hit._source.node_code,
        sensorKey: hit._source.channel_id,
        unitCode: hit._source.metric_unit,
        timestamp: new Date(hit._source['@timestamp']),
        periodStart: new Date(hit._source.time_bucket),
        periodEnd: new Date(new Date(hit._source.time_bucket).getTime() + 10 * 60 * 1000),
        avgValue: hit._source.avg_eng,
        minValue: hit._source.min_eng,
        maxValue: hit._source.max_eng,
        sampleCount: hit._source.sample_count,
        sumValue: hit._source.avg_eng * hit._source.sample_count,
      }));
    } catch (error) {
      this.handleFailure(error);
      throw error;
    }
  }

  /**
   * Generic search method for custom queries
   */
  async search(index: string, body: any): Promise<any> {
    if (!this.isReady()) {
      throw new Error('OpenSearch service not ready');
    }

    try {
      const response = await this.client!.search({
        index,
        ignore_unavailable: true,
        body,
      });
      return response.body;
    } catch (error) {
      this.handleFailure(error);
      throw error;
    }
  }

  /**
   * Check cluster health
   */
  async getClusterHealth(): Promise<any> {
    if (!this.client) {
      throw new Error('OpenSearch client not initialized');
    }

    const response = await this.client.cluster.health();
    return response.body;
  }

  /**
   * Get ML plugin status
   */
  async getMlPluginStatus(): Promise<any> {
    if (!this.isReady()) {
      throw new Error('OpenSearch service not ready');
    }

    try {
      const response = await this.client!.transport.request({
        method: 'GET',
        path: '/_plugins/_ml/stats',
      });
      return response.body;
    } catch (error) {
      this.logger.warn(`ML plugin status check failed: ${error.message}`);
      return null;
    }
  }
}
