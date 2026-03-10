import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenSearchService } from '../services/opensearch.service';
import { SyncService } from '../services/sync.service';
import { TelemetryPoint } from '../interfaces/telemetry.interface';

/**
 * Test job untuk memverifikasi ML pipeline berfungsi dengan benar
 * Dapat dipanggil manual atau via API untuk testing
 */
@Injectable()
export class TestJob {
  private readonly logger = new Logger(TestJob.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly openSearchService: OpenSearchService,
    private readonly syncService: SyncService,
  ) {}

  /**
   * Run full integration test
   */
  async runFullTest(): Promise<{
    success: boolean;
    results: Record<string, any>;
    errors: string[];
  }> {
    const results: Record<string, any> = {};
    const errors: string[] = [];

    this.logger.log('Starting ML pipeline integration test...');

    // Test 1: OpenSearch Connection
    try {
      const health = await this.openSearchService.getClusterHealth();
      results['opensearch_connection'] = {
        status: 'pass',
        cluster: health.cluster_name,
        health: health.status,
      };
      this.logger.log(`✅ OpenSearch connection: ${health.status}`);
    } catch (error) {
      results['opensearch_connection'] = { status: 'fail', error: error.message };
      errors.push(`OpenSearch connection failed: ${error.message}`);
      this.logger.error(`❌ OpenSearch connection failed: ${error.message}`);
    }

    // Test 2: ML Plugin Status
    try {
      const mlStats = await this.openSearchService.getMlPluginStatus();
      if (mlStats) {
        results['ml_plugin'] = {
          status: 'pass',
          ml_node_count: mlStats.ml_node_count || 0,
        };
        this.logger.log(`✅ ML plugin active`);
      } else {
        results['ml_plugin'] = { status: 'warn', message: 'ML plugin not responding' };
        this.logger.warn(`⚠️ ML plugin not responding`);
      }
    } catch (error) {
      results['ml_plugin'] = { status: 'fail', error: error.message };
      errors.push(`ML plugin check failed: ${error.message}`);
    }

    // Test 3: Circuit Breaker Status
    const cbStatus = this.openSearchService.getCircuitBreakerStatus();
    results['circuit_breaker'] = {
      status: cbStatus.isOpen ? 'open' : 'closed',
      failures: cbStatus.failures,
    };
    this.logger.log(`✅ Circuit breaker: ${cbStatus.isOpen ? 'OPEN' : 'closed'}`);

    // Test 4: Sync Service Status
    const syncStatus = this.syncService.getSyncStatus();
    results['sync_service'] = {
      status: syncStatus.openSearchReady ? 'ready' : 'not_ready',
      isSyncing: syncStatus.isSyncing,
      lastSync: syncStatus.lastSyncTimestamp,
    };
    this.logger.log(`✅ Sync service ready: ${syncStatus.openSearchReady}`);

    // Test 5: Test Bulk Insert (with dummy data)
    try {
      const testData = this.generateTestTelemetry();
      const insertResult = await this.openSearchService.bulkIndexTelemetry(testData);
      results['bulk_insert'] = {
        status: insertResult.errors === 0 ? 'pass' : 'partial',
        success: insertResult.success,
        errors: insertResult.errors,
      };
      this.logger.log(`✅ Bulk insert: ${insertResult.success}/${testData.length} records`);
    } catch (error) {
      results['bulk_insert'] = { status: 'fail', error: error.message };
      errors.push(`Bulk insert failed: ${error.message}`);
      this.logger.error(`❌ Bulk insert failed: ${error.message}`);
    }

    // Test 6: Query Test
    try {
      const queryResult = await this.openSearchService.search(
        'sensor-telemetry-10min-*',
        {
          query: { match_all: {} },
          size: 1,
        },
      );
      results['query_test'] = {
        status: 'pass',
        total_docs: queryResult.hits?.total?.value || 0,
      };
      this.logger.log(`✅ Query test: ${queryResult.hits?.total?.value || 0} total docs`);
    } catch (error) {
      results['query_test'] = { status: 'fail', error: error.message };
      errors.push(`Query test failed: ${error.message}`);
    }

    // Test 7: Active Sensors Query
    try {
      const activeSensors = await this.syncService.getActiveSensors();
      results['active_sensors'] = {
        status: 'pass',
        count: activeSensors.length,
        sample: activeSensors.slice(0, 5),
      };
      this.logger.log(`✅ Active sensors: ${activeSensors.length} found`);
    } catch (error) {
      results['active_sensors'] = { status: 'fail', error: error.message };
      errors.push(`Active sensors query failed: ${error.message}`);
    }

    const success = errors.length === 0;
    this.logger.log(`Test completed: ${success ? 'ALL PASS' : `${errors.length} errors`}`);

    return { success, results, errors };
  }

  /**
   * Test OpenSearch connection only
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const health = await this.openSearchService.getClusterHealth();
      return {
        success: true,
        message: `Connected to cluster: ${health.cluster_name}`,
        details: {
          cluster: health.cluster_name,
          status: health.status,
          nodes: health.number_of_nodes,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Test sync from ClickHouse to OpenSearch
   */
  async testSync(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const result = await this.syncService.syncTelemetry();
      return {
        success: true,
        message: `Synced ${result.lastSyncedCount} records in ${result.lastSyncDuration}ms`,
        details: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Generate test telemetry data
   */
  private generateTestTelemetry(): TelemetryPoint[] {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setMinutes(Math.floor(periodStart.getMinutes() / 10) * 10, 0, 0);
    const periodEnd = new Date(periodStart.getTime() + 10 * 60 * 1000);

    return [
      {
        deviceId: 'TEST-DEVICE-001',
        sensorKey: 'flow_rate',
        unitCode: 'm3/h',
        timestamp: now,
        periodStart,
        periodEnd,
        avgValue: 42.5,
        minValue: 40.0,
        maxValue: 45.0,
        sampleCount: 60,
        sumValue: 2550,
      },
      {
        deviceId: 'TEST-DEVICE-001',
        sensorKey: 'pressure',
        unitCode: 'bar',
        timestamp: now,
        periodStart,
        periodEnd,
        avgValue: 3.2,
        minValue: 3.0,
        maxValue: 3.5,
        sampleCount: 60,
        sumValue: 192,
      },
    ];
  }

  /**
   * Get service health summary
   */
  getHealthSummary(): {
    openSearchReady: boolean;
    circuitBreakerOpen: boolean;
    syncInProgress: boolean;
    lastSyncTime: Date | null;
  } {
    const syncStatus = this.syncService.getSyncStatus();
    return {
      openSearchReady: this.openSearchService.isReady(),
      circuitBreakerOpen: this.openSearchService.getCircuitBreakerStatus().isOpen,
      syncInProgress: syncStatus.isSyncing,
      lastSyncTime: syncStatus.lastSyncTimestamp,
    };
  }
}
