import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenSearchService } from './opensearch.service';
import { SyncService } from './sync.service';
import { ForecastPoint, TelemetryPoint } from '../interfaces/telemetry.interface';

export interface ForecastResult {
  deviceId: string;
  sensorKey: string;
  forecastPoints: ForecastPoint[];
  modelVersion: string;
  generatedAt: Date;
  trainingDataPoints: number;
}

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  // Config
  private readonly forecastHorizonDays: number;
  private readonly forecastTrainingDays: number;
  private readonly forecastEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly openSearchService: OpenSearchService,
    private readonly syncService: SyncService,
  ) {
    this.forecastHorizonDays = this.configService.get<number>('opensearch.forecastHorizonDays', 7);
    this.forecastTrainingDays = this.configService.get<number>('opensearch.forecastTrainingDays', 30);
    this.forecastEnabled = this.configService.get<boolean>('opensearch.forecastEnabled', true);
  }

  /**
   * Generate forecasts for all active sensors
   * Called by ForecastJob at 00:00 and 12:00 UTC
   */
  async runForecastGeneration(): Promise<{
    processed: number;
    forecastsGenerated: number;
    errors: number;
    duration: number;
  }> {
    if (!this.forecastEnabled) {
      this.logger.debug('Forecast generation disabled');
      return { processed: 0, forecastsGenerated: 0, errors: 0, duration: 0 };
    }

    const startTime = Date.now();
    let processed = 0;
    let forecastsGenerated = 0;
    let errors = 0;

    if (!this.openSearchService.isReady()) {
      this.logger.warn('OpenSearch not ready, skipping forecast generation');
      return { processed: 0, forecastsGenerated: 0, errors: 0, duration: 0 };
    }

    try {
      // Get all active sensors
      const activeSensors = await this.syncService.getActiveSensors();
      this.logger.log(`Generating forecasts for ${activeSensors.length} sensors`);

      // Process sensors (can be parallelized in batches)
      const batchSize = 20; // Smaller batch for forecast as it's more compute-intensive
      for (let i = 0; i < activeSensors.length; i += batchSize) {
        const batch = activeSensors.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map((sensor) =>
            this.generateForecastForSensor(sensor.deviceId, sensor.sensorKey),
          ),
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            processed++;
            forecastsGenerated += result.value.forecastPoints.length;
          } else if (result.status === 'rejected') {
            errors++;
            this.logger.warn(`Forecast failed: ${result.reason}`);
          }
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Forecast generation completed: ${processed} sensors, ${forecastsGenerated} points, ${errors} errors, ${duration}ms`,
      );

      return { processed, forecastsGenerated, errors, duration };
    } catch (error) {
      this.logger.error(`Forecast generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate forecast for a specific sensor
   */
  async generateForecastForSensor(
    deviceId: string,
    sensorKey: string,
  ): Promise<ForecastResult | null> {
    try {
      // Get training data (historical telemetry)
      const trainingData = await this.openSearchService.getTrainingData(
        deviceId,
        sensorKey,
        this.forecastTrainingDays,
      );

      if (trainingData.length < 100) {
        // Need at least ~100 data points (roughly 17 hours at 10-min intervals)
        this.logger.debug(
          `Insufficient training data for ${deviceId}/${sensorKey}: ${trainingData.length} points`,
        );
        return null;
      }

      // Generate forecast using simple time-series decomposition
      // In production, this would use OpenSearch ML or external model
      const forecastPoints = this.simpleSeasonalForecast(
        deviceId,
        sensorKey,
        trainingData,
      );

      const result: ForecastResult = {
        deviceId,
        sensorKey,
        forecastPoints,
        modelVersion: 'seasonal-decomposition-v1',
        generatedAt: new Date(),
        trainingDataPoints: trainingData.length,
      };

      this.logger.debug(
        `Generated ${forecastPoints.length} forecast points for ${deviceId}/${sensorKey}`,
      );

      return result;
    } catch (error) {
      this.logger.warn(
        `Failed to generate forecast for ${deviceId}/${sensorKey}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Simple seasonal forecast using hourly patterns
   * This is a placeholder - production would use proper time-series models
   */
  private simpleSeasonalForecast(
    deviceId: string,
    sensorKey: string,
    trainingData: TelemetryPoint[],
  ): ForecastPoint[] {
    const forecastPoints: ForecastPoint[] = [];
    const modelVersion = 'seasonal-decomposition-v1';
    const now = new Date();

    // Group data by hour of day to find patterns
    const hourlyPatterns: Record<number, number[]> = {};
    for (let h = 0; h < 24; h++) {
      hourlyPatterns[h] = [];
    }

    for (const point of trainingData) {
      const hour = point.timestamp.getUTCHours();
      hourlyPatterns[hour].push(point.avgValue);
    }

    // Calculate mean and std for each hour
    const hourlyStats: Record<number, { mean: number; std: number }> = {};
    for (let h = 0; h < 24; h++) {
      const values = hourlyPatterns[h];
      if (values.length > 0) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance =
          values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        hourlyStats[h] = { mean, std: Math.sqrt(variance) };
      } else {
        // Fallback if no data for this hour
        const overallMean = trainingData.reduce((a, b) => a + b.avgValue, 0) / trainingData.length;
        hourlyStats[h] = { mean: overallMean, std: overallMean * 0.1 };
      }
    }

    // Generate hourly forecasts for the horizon period
    const horizonHours = this.forecastHorizonDays * 24;
    for (let i = 1; i <= horizonHours; i++) {
      const forecastTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = forecastTime.getUTCHours();
      const stats = hourlyStats[hour];

      // Add some randomness for realistic variance
      const jitter = (Math.random() - 0.5) * 0.02 * stats.mean;

      forecastPoints.push({
        deviceId,
        sensorKey,
        forecastTime,
        predictedValue: parseFloat((stats.mean + jitter).toFixed(4)),
        confidenceLower: parseFloat((stats.mean - 1.96 * stats.std).toFixed(4)),
        confidenceUpper: parseFloat((stats.mean + 1.96 * stats.std).toFixed(4)),
        modelVersion,
        createdAt: now,
      });
    }

    return forecastPoints;
  }

  /**
   * Get latest forecast for a sensor
   */
  async getLatestForecast(
    deviceId: string,
    sensorKey: string,
  ): Promise<ForecastResult | null> {
    // This would query stored forecasts from PostgreSQL or cache
    // For now, generate on demand
    return this.generateForecastForSensor(deviceId, sensorKey);
  }

  /**
   * Get predicted value at a specific time (for anomaly baseline)
   */
  getForecastedBaseline(
    forecastPoints: ForecastPoint[],
    targetTime: Date,
  ): { predictedValue: number; confidenceLower: number; confidenceUpper: number } | null {
    // Find the closest forecast point
    let closest: ForecastPoint | null = null;
    let minDiff = Infinity;

    for (const point of forecastPoints) {
      const diff = Math.abs(point.forecastTime.getTime() - targetTime.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    }

    if (!closest || minDiff > 30 * 60 * 1000) { // Within 30 minutes
      return null;
    }

    return {
      predictedValue: closest.predictedValue,
      confidenceLower: closest.confidenceLower,
      confidenceUpper: closest.confidenceUpper,
    };
  }
}
