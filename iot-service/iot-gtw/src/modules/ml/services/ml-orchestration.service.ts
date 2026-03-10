import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenSearchService } from './opensearch.service';
import { SyncService } from './sync.service';
import { AnomalyNotifierService } from './anomaly-notifier.service';
import { DetectorManagerService } from './detector-manager.service';
import { AnomalyResult, TelemetryPoint } from '../interfaces/telemetry.interface';

export interface AnomalyDetectionResult {
  deviceId: string;
  sensorKey: string;
  anomaliesDetected: number;
  anomalies: AnomalyResult[];
  processedAt: Date;
}

/**
 * OpenSearch RCF result structure
 */
interface RcfAnomalyResult {
  detector_id: string;
  anomaly_score: number;
  anomaly_grade: number;
  data_start_time: number;
  data_end_time: number;
  feature_data: Array<{
    feature_id: string;
    feature_name: string;
    data: number;
  }>;
  entity?: Array<{
    name: string;
    value: string;
  }>;
}

@Injectable()
export class MlOrchestrationService {
  private readonly logger = new Logger(MlOrchestrationService.name);

  // Deviation thresholds from config
  private readonly deviationMild: number;
  private readonly deviationModerate: number;
  private readonly deviationSevere: number;
  private readonly deviationCritical: number;
  private readonly mlSensitivity: number;
  private readonly minGradeAlert: string;
  private readonly useRcf: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly openSearchService: OpenSearchService,
    private readonly syncService: SyncService,
    private readonly anomalyNotifier: AnomalyNotifierService,
    private readonly detectorManager: DetectorManagerService,
  ) {
    this.deviationMild = this.configService.get<number>('opensearch.deviationMild', 0.20);
    this.deviationModerate = this.configService.get<number>('opensearch.deviationModerate', 0.35);
    this.deviationSevere = this.configService.get<number>('opensearch.deviationSevere', 0.50);
    this.deviationCritical = this.configService.get<number>('opensearch.deviationCritical', 0.80);
    this.mlSensitivity = this.configService.get<number>('opensearch.mlSensitivity', 0.8);
    this.minGradeAlert = this.configService.get<string>('opensearch.mlMinGradeAlert', 'severe');
    this.useRcf = this.configService.get<boolean>('opensearch.useRcf', true);
  }

  /**
   * Run anomaly detection using OpenSearch RCF detectors
   * This queries all active detectors for recent anomaly results
   * Also checks historical detection results for INIT detectors
   */
  async runRcfAnomalyDetection(): Promise<{
    processed: number;
    anomaliesFound: number;
    errors: number;
    duration: number;
  }> {
    const startTime = Date.now();
    let processed = 0;
    let anomaliesFound = 0;
    let errors = 0;
    const allAnomalies: AnomalyResult[] = [];

    try {
      // Get list of active detectors
      const detectors = await this.detectorManager.listDetectors();
      const runningDetectors = detectors.filter((d) => d.state === 'RUNNING');
      const initDetectors = detectors.filter((d) => d.state === 'INIT');

      // If all detectors are INIT, try to use historical results
      if (runningDetectors.length === 0 && initDetectors.length > 0) {
        this.logger.log('All detectors in INIT state, checking historical results...');
        
        // Query historical results from each metric type
        const metricTypes = this.detectorManager.getAvailableDetectorTypes();
        
        for (const metricCode of metricTypes) {
          try {
            // Get recent anomalies from historical detection (grade > 0)
            const historicalResults = await this.detectorManager.getHistoricalResults(
              metricCode,
              50, // Limit results
              0,  // minGrade (will return grade > 0)
            );

            processed++;

            // Convert historical results to AnomalyResult format  
            for (const rcf of historicalResults) {
              const anomaly = this.convertRcfToAnomalyResult(rcf, `${metricCode}-detector`);
              if (anomaly) {
                allAnomalies.push(anomaly);
                anomaliesFound++;
              }
            }

            if (historicalResults.length > 0) {
              this.logger.log(
                `Historical ${metricCode}: ${historicalResults.length} anomalies found`,
              );
            }
          } catch (error) {
            errors++;
            this.logger.debug(`No historical results for ${metricCode}: ${error.message}`);
          }
        }
      } else if (runningDetectors.length > 0) {
        // Normal flow: query running detectors
        this.logger.log(`Running RCF detection on ${runningDetectors.length} detectors`);

        // Query each detector for recent anomalies
        const now = new Date();
        const lookbackMinutes = 15; // Look for anomalies in last 15 minutes
        const fromTime = new Date(now.getTime() - lookbackMinutes * 60 * 1000);

        for (const detector of runningDetectors) {
          try {
            const rcfResults = await this.detectorManager.getDetectorResults(
              detector.id,
              fromTime,
              now,
              50,
            );

            processed++;

            // Filter for actual anomalies (anomaly_grade > 0)
            const anomalyResults = rcfResults.filter(
              (r: RcfAnomalyResult) => r.anomaly_grade > 0,
            );

            // Convert RCF results to our AnomalyResult format
            for (const rcf of anomalyResults) {
              const anomaly = this.convertRcfToAnomalyResult(rcf, detector.name);
              if (anomaly) {
                allAnomalies.push(anomaly);
                anomaliesFound++;
              }
            }

            this.logger.debug(
              `Detector ${detector.name}: ${rcfResults.length} results, ${anomalyResults.length} anomalies`,
            );
          } catch (error) {
            errors++;
            this.logger.warn(`Failed to get results from detector ${detector.name}: ${error.message}`);
          }
        }
      } else {
        // No detectors at all, fallback to Z-score
        this.logger.warn('No detectors found, falling back to Z-score detection');
        return this.runZScoreAnomalyDetection();
      }

      // Index anomalies to OpenSearch
      if (allAnomalies.length > 0) {
        await this.openSearchService.bulkIndexAnomalies(allAnomalies);

        // Send to backend for notification
        try {
          const notifyResult = await this.anomalyNotifier.notifyAnomaliesBulk(allAnomalies);
          if (notifyResult.sent > 0) {
            this.logger.log(`Notified backend: ${notifyResult.sent} RCF anomalies`);
          }
        } catch (notifyError) {
          this.logger.warn(`Failed to notify backend: ${notifyError.message}`);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `RCF detection completed: ${processed} detectors, ${anomaliesFound} anomalies, ${errors} errors, ${duration}ms`,
      );

      return { processed, anomaliesFound, errors, duration };
    } catch (error) {
      this.logger.error(`RCF detection failed: ${error.message}`);
      // Fallback to Z-score
      this.logger.warn('Falling back to Z-score detection');
      return this.runZScoreAnomalyDetection();
    }
  }

  /**
   * Convert OpenSearch RCF result to our AnomalyResult format
   */
  private convertRcfToAnomalyResult(
    rcf: RcfAnomalyResult,
    detectorName: string,
  ): AnomalyResult | null {
    try {
      // Extract channel_id from entity (if using HCAD - High Cardinality Anomaly Detection)
      // channel_id is the sensor channel UUID from PostgreSQL
      const channelId = rcf.entity?.find((e) => e.name === 'channel_id')?.value;
      
      if (!channelId) {
        this.logger.warn(`No channel_id in RCF result for detector ${detectorName}`);
        return null;
      }

      // Get actual value from feature data
      const featureData = rcf.feature_data?.[0];
      const actualValue = featureData?.data ?? 0;

      // Convert RCF anomaly_grade (0-1) to severity string
      const severity = this.rcfGradeToSeverity(rcf.anomaly_grade);

      // Skip normal readings
      if (severity === 'normal') {
        return null;
      }

      return {
        // Use idSensorChannel directly since channel_id is the UUID
        idSensorChannel: channelId,
        deviceId: 'rcf-detector',
        sensorKey: detectorName,
        timestamp: new Date(rcf.data_start_time),
        rcfScore: rcf.anomaly_score,
        anomalyGrade: rcf.anomaly_grade,
        actualValue,
        baselineValue: 0, // RCF doesn't provide baseline directly
        deviationPercent: rcf.anomaly_grade * 100,
        severity,
        detectedAt: new Date(),
        detectorId: rcf.detector_id,
        detectorName,
      };
    } catch (error) {
      this.logger.warn(`Failed to convert RCF result: ${error.message}`);
      return null;
    }
  }

  /**
   * Convert RCF anomaly grade (0-1) to severity string
   */
  private rcfGradeToSeverity(grade: number): 'normal' | 'mild' | 'moderate' | 'severe' | 'critical' {
    if (grade >= 0.8) return 'critical';
    if (grade >= 0.6) return 'severe';
    if (grade >= 0.4) return 'moderate';
    if (grade >= 0.2) return 'mild';
    return 'normal';
  }

  /**
   * Run anomaly detection using Z-score (fallback method)
   * This is the original per-sensor detection
   */
  async runZScoreAnomalyDetection(): Promise<{
    processed: number;
    anomaliesFound: number;
    errors: number;
    duration: number;
  }> {
    const startTime = Date.now();
    let processed = 0;
    let anomaliesFound = 0;
    let errors = 0;

    try {
      const activeSensors = await this.syncService.getActiveSensors();
      this.logger.debug(`Z-score detection: ${activeSensors.length} sensors`);

      const batchSize = 50;
      for (let i = 0; i < activeSensors.length; i += batchSize) {
        const batch = activeSensors.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map((sensor) =>
            this.detectAnomaliesForSensor(sensor.deviceId, sensor.sensorKey),
          ),
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            processed++;
            anomaliesFound += result.value.anomaliesDetected;

            if (result.value.anomalies.length > 0) {
              await this.openSearchService.bulkIndexAnomalies(result.value.anomalies);

              try {
                const notifyResult = await this.anomalyNotifier.notifyAnomaliesBulk(result.value.anomalies);
                if (notifyResult.sent > 0) {
                  this.logger.debug(`Notified backend: ${notifyResult.sent} anomalies`);
                }
              } catch (notifyError) {
                this.logger.warn(`Failed to notify backend: ${notifyError.message}`);
              }
            }
          } else {
            errors++;
            this.logger.warn(`Z-score detection failed: ${result.reason}`);
          }
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Z-score detection completed: ${processed} sensors, ${anomaliesFound} anomalies, ${errors} errors, ${duration}ms`,
      );

      return { processed, anomaliesFound, errors, duration };
    } catch (error) {
      this.logger.error(`Z-score detection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run anomaly detection for all active sensors
   * Called by AnomalyPollJob every 10 minutes (offset by 2 min from sync)
   * Uses RCF when available (including historical results), falls back to Z-score
   */
  async runAnomalyDetection(): Promise<{
    processed: number;
    anomaliesFound: number;
    errors: number;
    duration: number;
  }> {
    if (!this.openSearchService.isReady()) {
      this.logger.warn('OpenSearch not ready, skipping anomaly detection');
      return { processed: 0, anomaliesFound: 0, errors: 0, duration: 0 };
    }

    // Try RCF first if enabled
    if (this.useRcf) {
      try {
        const detectors = await this.detectorManager.listDetectors();
        const runningDetectors = detectors.filter((d) => d.state === 'RUNNING');
        const initDetectors = detectors.filter((d) => d.state === 'INIT');

        if (runningDetectors.length > 0) {
          this.logger.log(`Using RCF detection (${runningDetectors.length} active detectors)`);
          return this.runRcfAnomalyDetection();
        } else if (initDetectors.length > 0) {
          // Detectors are initializing, try historical results
          this.logger.log(`Using RCF historical results (${initDetectors.length} INIT detectors)`);
          return this.runRcfAnomalyDetection();
        } else {
          this.logger.debug('No detectors found, using Z-score fallback');
        }
      } catch (error) {
        this.logger.warn(`Failed to check detectors: ${error.message}, using Z-score`);
      }
    }

    // Fallback to Z-score
    return this.runZScoreAnomalyDetection();
  }

  /**
   * Run legacy anomaly detection for all active sensors (original method)
   * Kept for backward compatibility - now calls runZScoreAnomalyDetection
   */
  async runLegacyAnomalyDetection(): Promise<{
    processed: number;
    anomaliesFound: number;
    errors: number;
    duration: number;
  }> {
    const startTime = Date.now();
    let processed = 0;
    let anomaliesFound = 0;
    let errors = 0;

    if (!this.openSearchService.isReady()) {
      this.logger.warn('OpenSearch not ready, skipping anomaly detection');
      return { processed: 0, anomaliesFound: 0, errors: 0, duration: 0 };
    }

    try {
      // Get all active sensors
      const activeSensors = await this.syncService.getActiveSensors();
      this.logger.debug(`Processing ${activeSensors.length} active sensors for anomaly detection`);

      // Process in batches to avoid overload
      const batchSize = 50;
      for (let i = 0; i < activeSensors.length; i += batchSize) {
        const batch = activeSensors.slice(i, i + batchSize);

        // Process batch in parallel
        const results = await Promise.allSettled(
          batch.map((sensor) =>
            this.detectAnomaliesForSensor(sensor.deviceId, sensor.sensorKey),
          ),
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            processed++;
            anomaliesFound += result.value.anomaliesDetected;

            // Index anomalies to OpenSearch
            if (result.value.anomalies.length > 0) {
              await this.openSearchService.bulkIndexAnomalies(result.value.anomalies);

              // Send to backend for notification
              try {
                const notifyResult = await this.anomalyNotifier.notifyAnomaliesBulk(result.value.anomalies);
                if (notifyResult.sent > 0) {
                  this.logger.debug(`Notified backend: ${notifyResult.sent} anomalies`);
                }
              } catch (notifyError) {
                this.logger.warn(`Failed to notify backend: ${notifyError.message}`);
              }
            }
          } else {
            errors++;
            this.logger.warn(`Anomaly detection failed: ${result.reason}`);
          }
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Anomaly detection completed: ${processed} sensors, ${anomaliesFound} anomalies, ${errors} errors, ${duration}ms`,
      );

      return { processed, anomaliesFound, errors, duration };
    } catch (error) {
      this.logger.error(`Anomaly detection run failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect anomalies for a specific sensor
   */
  async detectAnomaliesForSensor(
    deviceId: string,
    sensorKey: string,
  ): Promise<AnomalyDetectionResult> {
    const anomalies: AnomalyResult[] = [];

    try {
      // Get recent telemetry (last 60 minutes for context)
      const recentData = await this.openSearchService.getLatestTelemetry(
        deviceId,
        sensorKey,
        60,
      );

      if (recentData.length < 3) {
        // Not enough data for meaningful anomaly detection
        return {
          deviceId,
          sensorKey,
          anomaliesDetected: 0,
          anomalies: [],
          processedAt: new Date(),
        };
      }

      // Calculate baseline from historical data (simple moving average approach)
      // In production, this would use OpenSearch ML RCF model
      const baseline = this.calculateBaseline(recentData);
      const stdDev = this.calculateStdDev(recentData, baseline);

      // Check the most recent data point
      const latest = recentData[0];
      const deviation = Math.abs(latest.avgValue - baseline) / (baseline || 1);

      // Determine severity based on deviation thresholds
      const severity = this.classifyDeviation(deviation);

      // Calculate RCF-like score (simplified)
      // Real implementation would query OpenSearch ML API
      const rcfScore = this.calculateRcfScore(latest.avgValue, baseline, stdDev);

      if (severity !== 'normal') {
        const anomaly: AnomalyResult = {
          deviceId,
          sensorKey,
          timestamp: latest.timestamp,
          rcfScore,
          anomalyGrade: this.severityToGrade(severity),
          actualValue: latest.avgValue,
          baselineValue: baseline,
          deviationPercent: deviation * 100,
          severity,
          detectedAt: new Date(),
        };

        anomalies.push(anomaly);
        this.logger.debug(
          `Anomaly detected: ${deviceId}/${sensorKey} - ${severity} (${(deviation * 100).toFixed(1)}% deviation)`,
        );
      }

      return {
        deviceId,
        sensorKey,
        anomaliesDetected: anomalies.length,
        anomalies,
        processedAt: new Date(),
      };
    } catch (error) {
      this.logger.warn(`Failed to detect anomalies for ${deviceId}/${sensorKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate baseline from historical data (simple moving average)
   */
  private calculateBaseline(data: TelemetryPoint[]): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, point) => acc + point.avgValue, 0);
    return sum / data.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(data: TelemetryPoint[], mean: number): number {
    if (data.length < 2) return 0;
    const squaredDiffs = data.map((point) => Math.pow(point.avgValue - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate RCF-like anomaly score
   * In production, this would be replaced by actual OpenSearch ML RCF model
   */
  private calculateRcfScore(value: number, baseline: number, stdDev: number): number {
    if (stdDev === 0) {
      return value === baseline ? 0 : 1;
    }

    // Z-score based calculation (simplified RCF approximation)
    const zScore = Math.abs(value - baseline) / stdDev;

    // Normalize to 0-1 range with sensitivity adjustment
    const normalizedScore = Math.min(1, zScore / (5 * this.mlSensitivity));
    return parseFloat(normalizedScore.toFixed(4));
  }

  /**
   * Classify deviation into severity categories
   */
  private classifyDeviation(
    deviation: number,
  ): 'normal' | 'mild' | 'moderate' | 'severe' | 'critical' {
    if (deviation >= this.deviationCritical) return 'critical';
    if (deviation >= this.deviationSevere) return 'severe';
    if (deviation >= this.deviationModerate) return 'moderate';
    if (deviation >= this.deviationMild) return 'mild';
    return 'normal';
  }

  /**
   * Convert severity to numeric grade (0-1)
   */
  private severityToGrade(severity: string): number {
    const grades: Record<string, number> = {
      normal: 0,
      mild: 0.25,
      moderate: 0.5,
      severe: 0.75,
      critical: 1.0,
    };
    return grades[severity] ?? 0;
  }

  /**
   * Check if severity meets minimum alert threshold
   */
  shouldTriggerAlert(severity: string): boolean {
    const severityOrder = ['normal', 'mild', 'moderate', 'severe', 'critical'];
    const severityIndex = severityOrder.indexOf(severity);
    const minIndex = severityOrder.indexOf(this.minGradeAlert);
    return severityIndex >= minIndex;
  }

  /**
   * Query anomaly history for a sensor
   */
  async getAnomalyHistory(
    deviceId: string,
    sensorKey: string,
    hours: number = 24,
  ): Promise<any[]> {
    const now = new Date();
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);

    const currentIndex = this.openSearchService.getMonthlyIndexName('anomaly-results-', now);
    const prevMonth = new Date(now);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevIndex = this.openSearchService.getMonthlyIndexName('anomaly-results-', prevMonth);

    try {
      const result = await this.openSearchService.search(
        `${currentIndex},${prevIndex}`,
        {
          query: {
            bool: {
              must: [
                { term: { device_id: deviceId } },
                { term: { sensor_key: sensorKey } },
                {
                  range: {
                    timestamp: {
                      gte: from.toISOString(),
                      lte: now.toISOString(),
                    },
                  },
                },
              ],
            },
          },
          sort: [{ timestamp: { order: 'desc' } }],
          size: 100,
        },
      );

      return result.hits?.hits?.map((hit: any) => hit._source) || [];
    } catch (error) {
      this.logger.warn(`Failed to get anomaly history: ${error.message}`);
      return [];
    }
  }
}
