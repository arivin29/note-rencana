import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnomalyResult as AnomalyResultInterface } from '../interfaces/telemetry.interface';
import { AnomalyResult } from '../../../entities/existing/anomaly-result.entity';

@Injectable()
export class AnomalyNotifierService {
  private readonly logger = new Logger(AnomalyNotifierService.name);
  private readonly enabled: boolean;
  private readonly minGradeAlert: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AnomalyResult)
    private readonly anomalyRepository: Repository<AnomalyResult>,
  ) {
    this.enabled = this.configService.get<boolean>('opensearch.notificationEnabled', true);
    this.minGradeAlert = this.configService.get<string>('opensearch.mlMinGradeAlert', 'severe');
  }

  /**
   * Check if severity meets the minimum threshold for notification
   */
  private meetsMinSeverity(grade: string): boolean {
    const severityOrder: Record<string, number> = {
      normal: 0,
      mild: 1,
      moderate: 2,
      severe: 3,
      critical: 4,
    };
    const level = severityOrder[grade] || 0;
    const minLevel = severityOrder[this.minGradeAlert] || 3;
    return level >= minLevel;
  }

  /**
   * Determine anomaly type based on deviation direction
   */
  private determineAnomalyType(anomaly: AnomalyResultInterface): string {
    const diff = anomaly.actualValue - anomaly.baselineValue;
    const percentDiff = anomaly.deviationPercent;

    if (percentDiff > 50) {
      return diff > 0 ? 'spike' : 'drop';
    } else if (percentDiff > 20) {
      return diff > 0 ? 'high' : 'low';
    } else {
      return 'drift';
    }
  }

  /**
   * Check for duplicate anomaly within time window
   */
  private async checkDuplicate(
    idSensorChannel: string,
    detectedAt: Date,
    anomalyType: string,
    windowMinutes: number = 10,
  ): Promise<boolean> {
    const existing = await this.anomalyRepository.findOne({
      where: {
        idSensorChannel,
        anomalyType,
      },
    });

    if (existing) {
      const existingTime = new Date(existing.detectedAt).getTime();
      const targetTime = detectedAt.getTime();
      const diffMinutes = Math.abs(existingTime - targetTime) / (60 * 1000);
      
      if (diffMinutes <= windowMinutes) {
        return true;
      }
    }

    return false;
  }

  /**
   * Save anomalies directly to PostgreSQL (no HTTP call needed)
   */
  async notifyAnomaliesBulk(anomalies: AnomalyResultInterface[]): Promise<{
    total: number;
    sent: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      total: anomalies.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (!this.enabled) {
      this.logger.debug('Notifications disabled, skipping all');
      result.skipped = anomalies.length;
      return result;
    }

    // Filter anomalies meeting severity threshold
    const toSave = anomalies.filter((a) => this.meetsMinSeverity(a.severity));
    result.skipped = anomalies.length - toSave.length;

    if (toSave.length === 0) {
      this.logger.debug('No anomalies meet severity threshold');
      return result;
    }

    const entities: Partial<AnomalyResult>[] = [];

    for (const anomaly of toSave) {
      // Must have idSensorChannel for RCF detection
      if (!anomaly.idSensorChannel) {
        this.logger.warn(`Skipping anomaly: No idSensorChannel provided`);
        result.skipped++;
        continue;
      }

      const anomalyType = this.determineAnomalyType(anomaly);

      // Check for duplicate
      const isDuplicate = await this.checkDuplicate(
        anomaly.idSensorChannel,
        anomaly.detectedAt,
        anomalyType,
        10,
      );

      if (isDuplicate) {
        this.logger.debug(`Skipping duplicate anomaly for channel ${anomaly.idSensorChannel}`);
        result.skipped++;
        continue;
      }

      entities.push({
        idSensorChannel: anomaly.idSensorChannel,
        detectedAt: anomaly.detectedAt,
        actualValue: anomaly.actualValue,
        expectedValue: anomaly.baselineValue,
        anomalyScore: anomaly.rcfScore,
        anomalyGrade: anomaly.severity,
        anomalyType,
        detectorId: anomaly.detectorId,
        detectorName: anomaly.detectorName,
        note: `RCF Grade: ${anomaly.anomalyGrade?.toFixed(2) || 0}, Deviation: ${anomaly.deviationPercent.toFixed(1)}%`,
        isAcknowledged: false,
      });
    }

    if (entities.length === 0) {
      return result;
    }

    try {
      const saved = await this.anomalyRepository.save(entities);
      result.sent = saved.length;
      this.logger.log(`Direct PostgreSQL insert: ${result.sent} anomalies saved, ${result.skipped} skipped`);
    } catch (error) {
      this.logger.error(`Failed to save anomalies to PostgreSQL: ${error.message}`);
      result.failed = entities.length;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Check if notification service is ready
   */
  isReady(): boolean {
    return this.enabled;
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    minGradeAlert: string;
    mode: string;
  } {
    return {
      enabled: this.enabled,
      minGradeAlert: this.minGradeAlert,
      mode: 'direct-postgresql',
    };
  }
}
