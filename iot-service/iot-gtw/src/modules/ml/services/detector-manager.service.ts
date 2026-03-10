import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';

/**
 * Detector configuration interface
 */
export interface DetectorConfig {
  name: string;
  description: string;
  timeField: string;
  indices: string[];
  filterQuery: object;
  featureAttributes: FeatureAttribute[];
  detectionInterval: {
    interval: number;
    unit: 'MINUTES' | 'HOURS';
  };
  windowDelay: {
    interval: number;
    unit: 'MINUTES' | 'HOURS';
  };
  shingleSize: number;
  categoryField?: string[];
  resultIndex?: string;
}

interface FeatureAttribute {
  featureName: string;
  featureEnabled: boolean;
  importance: number;
  aggregationQuery: object;
}

export interface DetectorInfo {
  id: string;
  name: string;
  state: string;
  metricCode: string;
  createdAt?: string;
}

/**
 * Service for managing OpenSearch Anomaly Detection detectors
 * Uses Random Cut Forest (RCF) algorithm
 */
@Injectable()
export class DetectorManagerService implements OnModuleInit {
  private readonly logger = new Logger(DetectorManagerService.name);
  private client: Client | null = null;

  // Configuration
  private readonly url: string;
  private readonly username: string;
  private readonly password: string;
  private readonly sslVerify: boolean;
  private readonly indexPrefix: string;

  // Predefined detector configurations
  private readonly detectorConfigs: Map<string, DetectorConfig> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('opensearch.url', 'https://localhost:9200');
    this.username = this.configService.get<string>('opensearch.username', 'admin');
    this.password = this.configService.get<string>('opensearch.password', '');
    this.sslVerify = this.configService.get<boolean>('opensearch.sslVerify', false);
    this.indexPrefix = this.configService.get<string>('opensearch.indexPrefix', 'sensor-telemetry-10min-');

    // Initialize detector configurations
    this.initializeDetectorConfigs();
  }

  async onModuleInit() {
    await this.connect();
    await this.checkMlPluginStatus();
  }

  /**
   * Initialize OpenSearch client
   */
  private async connect(): Promise<void> {
    try {
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

      const health = await this.client.cluster.health();
      this.logger.log(
        `DetectorManager connected to OpenSearch: ${this.url}, cluster status: ${health.body.status}`,
      );
    } catch (error) {
      this.logger.error(`Failed to connect to OpenSearch: ${error.message}`);
    }
  }

  /**
   * Check if ML plugin is available
   */
  private async checkMlPluginStatus(): Promise<boolean> {
    if (!this.client) return false;

    try {
      const response = await this.client.transport.request({
        method: 'GET',
        path: '/_plugins/_ml/stats',
      });
      
      this.logger.log('OpenSearch ML plugin is available');
      return true;
    } catch (error) {
      this.logger.warn(`ML plugin not available: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize predefined detector configurations for PDAM sensors
   * Using metric_unit for filtering (more consistent than user-defined metric_code)
   */
  private initializeDetectorConfigs(): void {
    // Pressure Detector (unit: bar)
    this.detectorConfigs.set('pressure', {
      name: 'pdam-pressure-detector',
      description: 'Detect pressure anomalies per sensor channel (unit: bar)',
      timeField: 'time_bucket',
      indices: [`${this.indexPrefix}*`],
      filterQuery: {
        bool: {
          must: [{ term: { metric_unit: 'bar' } }],
        },
      },
      featureAttributes: [
        {
          featureName: 'pressure_avg',
          featureEnabled: true,
          importance: 5,
          aggregationQuery: {
            pressure_avg: { avg: { field: 'avg_eng' } },
          },
        },
      ],
      detectionInterval: { interval: 10, unit: 'MINUTES' },
      windowDelay: { interval: 2, unit: 'MINUTES' },
      shingleSize: 8,
      categoryField: ['channel_id'],
      resultIndex: 'opensearch-ad-plugin-result-pressure',
    });

    // Flow Detector (unit: m3/h or m³/h)
    this.detectorConfigs.set('flow', {
      name: 'pdam-flow-detector',
      description: 'Detect flow rate anomalies per sensor channel (unit: m3/h)',
      timeField: 'time_bucket',
      indices: [`${this.indexPrefix}*`],
      filterQuery: {
        bool: {
          should: [
            { term: { metric_unit: 'm3/h' } },
            { term: { metric_unit: 'm³/h' } },
          ],
          minimum_should_match: 1,
        },
      },
      featureAttributes: [
        {
          featureName: 'flow_avg',
          featureEnabled: true,
          importance: 5,
          aggregationQuery: {
            flow_avg: { avg: { field: 'avg_eng' } },
          },
        },
      ],
      detectionInterval: { interval: 10, unit: 'MINUTES' },
      windowDelay: { interval: 2, unit: 'MINUTES' },
      shingleSize: 8,
      categoryField: ['channel_id'],
      resultIndex: 'opensearch-ad-plugin-result-flow',
    });

    // Level Detector (no specific unit yet - placeholder)
    // TODO: Update when level sensor data is available with consistent unit
    this.detectorConfigs.set('level', {
      name: 'pdam-level-detector',
      description: 'Detect water level anomalies per sensor channel',
      timeField: 'time_bucket',
      indices: [`${this.indexPrefix}*`],
      filterQuery: {
        bool: {
          should: [
            { term: { metric_unit: 'm' } },
            { term: { metric_unit: 'meter' } },
            { term: { metric_unit: 'cm' } },
          ],
          minimum_should_match: 1,
        },
      },
      featureAttributes: [
        {
          featureName: 'level_avg',
          featureEnabled: true,
          importance: 5,
          aggregationQuery: {
            level_avg: { avg: { field: 'avg_eng' } },
          },
        },
      ],
      detectionInterval: { interval: 10, unit: 'MINUTES' },
      windowDelay: { interval: 2, unit: 'MINUTES' },
      shingleSize: 8,
      categoryField: ['channel_id'],
      resultIndex: 'opensearch-ad-plugin-result-level',
    });

    // =========================================================================
    // Industrial Sensors: Power Meter, VSD
    // =========================================================================

    // Voltage Detector (unit: volt)
    this.detectorConfigs.set('voltage', {
      name: 'pdam-voltage-detector',
      description: 'Detect voltage anomalies per sensor channel (unit: volt)',
      timeField: 'time_bucket',
      indices: [`${this.indexPrefix}*`],
      filterQuery: {
        bool: {
          must: [{ term: { metric_unit: 'volt' } }],
        },
      },
      featureAttributes: [
        {
          featureName: 'voltage_avg',
          featureEnabled: true,
          importance: 5,
          aggregationQuery: {
            voltage_avg: { avg: { field: 'avg_eng' } },
          },
        },
      ],
      detectionInterval: { interval: 10, unit: 'MINUTES' },
      windowDelay: { interval: 2, unit: 'MINUTES' },
      shingleSize: 8,
      categoryField: ['channel_id'],
      resultIndex: 'opensearch-ad-plugin-result-voltage',
    });

    // Current Detector (unit: ampere, A)
    this.detectorConfigs.set('current', {
      name: 'pdam-current-detector',
      description: 'Detect current anomalies per sensor channel (unit: ampere)',
      timeField: 'time_bucket',
      indices: [`${this.indexPrefix}*`],
      filterQuery: {
        bool: {
          should: [
            { term: { metric_unit: 'ampere' } },
            { term: { metric_unit: 'A' } },
          ],
          minimum_should_match: 1,
        },
      },
      featureAttributes: [
        {
          featureName: 'current_avg',
          featureEnabled: true,
          importance: 5,
          aggregationQuery: {
            current_avg: { avg: { field: 'avg_eng' } },
          },
        },
      ],
      detectionInterval: { interval: 10, unit: 'MINUTES' },
      windowDelay: { interval: 2, unit: 'MINUTES' },
      shingleSize: 8,
      categoryField: ['channel_id'],
      resultIndex: 'opensearch-ad-plugin-result-current',
    });

    // Power Detector (unit: kW)
    this.detectorConfigs.set('power', {
      name: 'pdam-power-detector',
      description: 'Detect power anomalies per sensor channel (unit: kW)',
      timeField: 'time_bucket',
      indices: [`${this.indexPrefix}*`],
      filterQuery: {
        bool: {
          should: [
            { term: { metric_unit: 'kW' } },
            { term: { metric_unit: 'kWh' } },
          ],
          minimum_should_match: 1,
        },
      },
      featureAttributes: [
        {
          featureName: 'power_avg',
          featureEnabled: true,
          importance: 5,
          aggregationQuery: {
            power_avg: { avg: { field: 'avg_eng' } },
          },
        },
      ],
      detectionInterval: { interval: 10, unit: 'MINUTES' },
      windowDelay: { interval: 2, unit: 'MINUTES' },
      shingleSize: 8,
      categoryField: ['channel_id'],
      resultIndex: 'opensearch-ad-plugin-result-power',
    });

    // Frequency Detector (unit: Hz) - VSD monitoring
    this.detectorConfigs.set('frequency', {
      name: 'pdam-frequency-detector',
      description: 'Detect frequency anomalies per sensor channel (unit: Hz) - VSD',
      timeField: 'time_bucket',
      indices: [`${this.indexPrefix}*`],
      filterQuery: {
        bool: {
          must: [{ term: { metric_unit: 'Hz' } }],
        },
      },
      featureAttributes: [
        {
          featureName: 'frequency_avg',
          featureEnabled: true,
          importance: 5,
          aggregationQuery: {
            frequency_avg: { avg: { field: 'avg_eng' } },
          },
        },
      ],
      detectionInterval: { interval: 10, unit: 'MINUTES' },
      windowDelay: { interval: 2, unit: 'MINUTES' },
      shingleSize: 8,
      categoryField: ['channel_id'],
      resultIndex: 'opensearch-ad-plugin-result-frequency',
    });

    // Debit/Volume Detector - same as flow (m3/h)
    this.detectorConfigs.set('debit', {
      name: 'pdam-debit-detector',
      description: 'Detect water volume (debit) anomalies - alias for flow detector',
      timeField: 'time_bucket',
      indices: [`${this.indexPrefix}*`],
      filterQuery: {
        bool: {
          should: [
            { term: { metric_unit: 'm3/h' } },
            { term: { metric_unit: 'm³/h' } },
          ],
          minimum_should_match: 1,
        },
      },
      featureAttributes: [
        {
          featureName: 'debit_avg',
          featureEnabled: true,
          importance: 5,
          aggregationQuery: {
            debit_avg: { avg: { field: 'avg_eng' } },
          },
        },
      ],
      detectionInterval: { interval: 10, unit: 'MINUTES' },
      windowDelay: { interval: 2, unit: 'MINUTES' },
      shingleSize: 8,
      categoryField: ['channel_id'],
      resultIndex: 'opensearch-ad-plugin-result-debit',
    });

    this.logger.log(`Initialized ${this.detectorConfigs.size} detector configurations`);
  }

  /**
   * Create a detector in OpenSearch
   */
  async createDetector(metricCode: string): Promise<{ id: string; name: string } | null> {
    if (!this.client) {
      throw new Error('OpenSearch client not initialized');
    }

    const config = this.detectorConfigs.get(metricCode);
    if (!config) {
      throw new Error(`No detector configuration found for metric: ${metricCode}`);
    }

    // Check if detector already exists
    const existing = await this.findDetectorByName(config.name);
    if (existing) {
      this.logger.log(`Detector ${config.name} already exists with ID: ${existing.id}`);
      return { id: existing.id, name: config.name };
    }

    try {
      const detectorBody = {
        name: config.name,
        description: config.description,
        time_field: config.timeField,
        indices: config.indices,
        filter_query: config.filterQuery,
        feature_attributes: config.featureAttributes.map((f) => ({
          feature_name: f.featureName,
          feature_enabled: f.featureEnabled,
          importance: f.importance,
          aggregation_query: f.aggregationQuery,
        })),
        detection_interval: {
          period: {
            interval: config.detectionInterval.interval,
            unit: config.detectionInterval.unit,
          },
        },
        window_delay: {
          period: {
            interval: config.windowDelay.interval,
            unit: config.windowDelay.unit,
          },
        },
        shingle_size: config.shingleSize,
        ...(config.categoryField && { category_field: config.categoryField }),
        ...(config.resultIndex && { result_index: config.resultIndex }),
      };

      const response = await this.client.transport.request({
        method: 'POST',
        path: '/_plugins/_anomaly_detection/detectors',
        body: detectorBody,
      });

      const detectorId = (response.body as any)._id;
      this.logger.log(`Created detector ${config.name} with ID: ${detectorId}`);

      return { id: detectorId, name: config.name };
    } catch (error) {
      this.logger.error(`Failed to create detector ${config.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find detector by name
   */
  async findDetectorByName(name: string): Promise<{ id: string; state: string } | null> {
    if (!this.client) return null;

    try {
      const response = await this.client.transport.request({
        method: 'POST',
        path: '/_plugins/_anomaly_detection/detectors/_search',
        body: {
          query: {
            term: { 'name.keyword': name },
          },
        },
      });

      const hits = (response.body as any).hits?.hits || [];
      if (hits.length > 0) {
        return {
          id: hits[0]._id,
          state: hits[0]._source.state || 'UNKNOWN',
        };
      }
      return null;
    } catch (error) {
      this.logger.warn(`Error searching for detector ${name}: ${error.message}`);
      return null;
    }
  }

  /**
   * Start a detector (enable real-time detection)
   */
  async startDetector(detectorId: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('OpenSearch client not initialized');
    }

    try {
      await this.client.transport.request({
        method: 'POST',
        path: `/_plugins/_anomaly_detection/detectors/${detectorId}/_start`,
      });

      this.logger.log(`Started detector: ${detectorId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to start detector ${detectorId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop a detector
   */
  async stopDetector(detectorId: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('OpenSearch client not initialized');
    }

    try {
      await this.client.transport.request({
        method: 'POST',
        path: `/_plugins/_anomaly_detection/detectors/${detectorId}/_stop`,
      });

      this.logger.log(`Stopped detector: ${detectorId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to stop detector ${detectorId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get detector status
   */
  async getDetectorStatus(detectorId: string): Promise<any> {
    if (!this.client) {
      throw new Error('OpenSearch client not initialized');
    }

    try {
      const response = await this.client.transport.request({
        method: 'GET',
        path: `/_plugins/_anomaly_detection/detectors/${detectorId}`,
      });

      return response.body;
    } catch (error) {
      this.logger.error(`Failed to get detector status ${detectorId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete a detector
   */
  async deleteDetector(detectorId: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('OpenSearch client not initialized');
    }

    try {
      // Stop detector first
      await this.stopDetector(detectorId);

      // Then delete
      await this.client.transport.request({
        method: 'DELETE',
        path: `/_plugins/_anomaly_detection/detectors/${detectorId}`,
      });

      this.logger.log(`Deleted detector: ${detectorId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete detector ${detectorId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get detector profile (includes real-time state)
   */
  async getDetectorProfile(detectorId: string): Promise<{ state: string; init_progress?: { percentage: string } } | null> {
    if (!this.client) {
      return null;
    }

    try {
      const response = await this.client.transport.request({
        method: 'GET',
        path: `/_plugins/_anomaly_detection/detectors/${detectorId}/_profile`,
      });

      return response.body as any;
    } catch (error) {
      this.logger.debug(`Failed to get detector profile ${detectorId}: ${error.message}`);
      return null;
    }
  }

  /**
   * List all detectors with real-time state from profile
   */
  async listDetectors(): Promise<DetectorInfo[]> {
    if (!this.client) {
      throw new Error('OpenSearch client not initialized');
    }

    try {
      const response = await this.client.transport.request({
        method: 'POST',
        path: '/_plugins/_anomaly_detection/detectors/_search',
        body: {
          query: { match_all: {} },
          size: 100,
        },
      });

      const hits = (response.body as any).hits?.hits || [];
      const detectors = hits.map((hit: any) => ({
        id: hit._id,
        name: hit._source.name,
        state: 'UNKNOWN',
        metricCode: this.extractMetricCode(hit._source.name),
        createdAt: hit._source.last_update_time,
      }));

      // Fetch real-time state from profile for each detector
      for (const detector of detectors) {
        const profile = await this.getDetectorProfile(detector.id);
        if (profile?.state) {
          detector.state = profile.state;
        }
      }

      return detectors;
    } catch (error) {
      this.logger.error(`Failed to list detectors: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract metric code from detector name
   */
  private extractMetricCode(name: string): string {
    const match = name.match(/pdam-(\w+)-detector/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Create all predefined detectors
   */
  async createAllDetectors(): Promise<{ created: string[]; existing: string[]; failed: string[] }> {
    const results = {
      created: [] as string[],
      existing: [] as string[],
      failed: [] as string[],
    };

    for (const [metricCode, _config] of this.detectorConfigs) {
      try {
        const result = await this.createDetector(metricCode);
        if (result) {
          results.created.push(`${metricCode}: ${result.id}`);
        }
      } catch (error) {
        results.failed.push(`${metricCode}: ${error.message}`);
      }
    }

    this.logger.log(
      `Create all detectors result - Created: ${results.created.length}, Failed: ${results.failed.length}`,
    );

    return results;
  }

  /**
   * Start all detectors
   */
  async startAllDetectors(): Promise<{ started: string[]; failed: string[] }> {
    const results = {
      started: [] as string[],
      failed: [] as string[],
    };

    const detectors = await this.listDetectors();

    for (const detector of detectors) {
      try {
        const success = await this.startDetector(detector.id);
        if (success) {
          results.started.push(detector.name);
        } else {
          results.failed.push(detector.name);
        }
      } catch (error) {
        results.failed.push(`${detector.name}: ${error.message}`);
      }
    }

    this.logger.log(
      `Start all detectors result - Started: ${results.started.length}, Failed: ${results.failed.length}`,
    );

    return results;
  }

  /**
   * Get detector results (anomalies detected)
   */
  async getDetectorResults(
    detectorId: string,
    startTime: Date,
    endTime: Date,
    size: number = 100,
  ): Promise<any[]> {
    if (!this.client) {
      throw new Error('OpenSearch client not initialized');
    }

    try {
      const response = await this.client.transport.request({
        method: 'POST',
        path: `/_plugins/_anomaly_detection/detectors/${detectorId}/results/_search`,
        body: {
          query: {
            bool: {
              must: [
                {
                  range: {
                    data_start_time: {
                      gte: startTime.getTime(),
                      lte: endTime.getTime(),
                    },
                  },
                },
              ],
            },
          },
          sort: [{ data_start_time: { order: 'desc' } }],
          size,
        },
      });

      const hits = (response.body as any).hits?.hits || [];
      return hits.map((hit: any) => hit._source);
    } catch (error) {
      this.logger.error(`Failed to get detector results: ${error.message}`);
      return [];
    }
  }

  /**
   * Get available detector types
   */
  getAvailableDetectorTypes(): string[] {
    return Array.from(this.detectorConfigs.keys());
  }

  /**
   * Get detector configuration
   */
  getDetectorConfig(metricCode: string): DetectorConfig | undefined {
    return this.detectorConfigs.get(metricCode);
  }

  /**
   * Get historical detection results from custom result index
   * Searches both real-time and historical result indices
   */
  async getHistoricalResults(
    metricCode: string,
    size: number = 100,
    minGrade: number = 0,
  ): Promise<any[]> {
    if (!this.client) {
      throw new Error('OpenSearch client not initialized');
    }

    const config = this.detectorConfigs.get(metricCode);
    if (!config || !config.resultIndex) {
      throw new Error(`No result index configured for metric: ${metricCode}`);
    }

    // Search both real-time and historical indices
    const indexPattern = `${config.resultIndex}*`;

    try {
      const response = await this.client.search({
        index: indexPattern,
        body: {
          query: {
            bool: {
              must: [
                { range: { anomaly_grade: { gt: minGrade } } },
              ],
            },
          },
          // Sort by anomaly_grade descending to get highest anomalies first
          sort: [
            { anomaly_grade: { order: 'desc' } },
            { data_end_time: { order: 'desc' } },
          ],
          size,
        },
      });

      const hits = response.body.hits?.hits || [];
      this.logger.log(
        `Historical results for ${metricCode}: ${hits.length} anomalies (grade > ${minGrade}) from index ${indexPattern}`,
      );

      return hits.map((hit: any) => ({
        ...hit._source,
        index: hit._index,
      }));
    } catch (error) {
      this.logger.error(`Failed to get historical results: ${error.message}`);
      return [];
    }
  }
}
