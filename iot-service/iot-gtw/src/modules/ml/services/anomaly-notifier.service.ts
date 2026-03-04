import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnomalyResult } from '../interfaces/telemetry.interface';

interface CreateAnomalyPayload {
  // Either idSensorChannel OR (deviceId + sensorKey) must be provided
  idSensorChannel?: string;
  deviceId?: string;
  sensorKey?: string;
  metricCode?: string;
  detectedAt: string;
  actualValue: number;
  expectedValue?: number;
  anomalyScore: number;
  anomalyGrade: string;
  anomalyType: string;
  detectorId?: string;
  detectorName?: string;
  opensearchResult?: Record<string, any>;
  note?: string;
}

interface NotificationResult {
  success: boolean;
  idAnomalyResult?: string;
  message?: string;
  error?: string;
}

@Injectable()
export class AnomalyNotifierService {
  private readonly logger = new Logger(AnomalyNotifierService.name);
  private readonly backendUrl: string;
  private readonly backendApiKey: string;
  private readonly enabled: boolean;
  private readonly minGradeAlert: string;

  constructor(private readonly configService: ConfigService) {
    this.backendUrl = this.configService.get<string>('opensearch.backendUrl', 'http://localhost:3000');
    this.backendApiKey = this.configService.get<string>('opensearch.backendApiKey', '');
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
   * Map internal severity string to grade string for backend
   */
  private mapSeverityToGrade(severity: string): string {
    return severity; // Already using same naming convention
  }

  /**
   * Send a single anomaly to the backend
   */
  async notifyAnomaly(anomaly: AnomalyResult): Promise<NotificationResult> {
    if (!this.enabled) {
      this.logger.debug('Notifications disabled, skipping');
      return { success: false, message: 'Notifications disabled' };
    }

    if (!this.meetsMinSeverity(anomaly.severity)) {
      this.logger.debug(`Anomaly grade ${anomaly.severity} below threshold ${this.minGradeAlert}`);
      return { success: false, message: 'Below severity threshold' };
    }

    const payload: CreateAnomalyPayload = {
      deviceId: anomaly.deviceId,
      sensorKey: anomaly.sensorKey,
      detectedAt: anomaly.detectedAt.toISOString(),
      actualValue: anomaly.actualValue,
      expectedValue: anomaly.baselineValue,
      anomalyScore: anomaly.rcfScore,
      anomalyGrade: this.mapSeverityToGrade(anomaly.severity),
      anomalyType: this.determineAnomalyType(anomaly),
      note: `Deviation: ${anomaly.deviationPercent.toFixed(1)}%`,
    };

    try {
      const url = `${this.backendUrl}/api/ml/anomalies`;
      this.logger.debug(`Sending anomaly to backend: ${url}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.backendApiKey) {
        headers['X-API-Key'] = this.backendApiKey;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      this.logger.log(
        `Anomaly reported to backend: ${anomaly.deviceId}/${anomaly.sensorKey} (${anomaly.severity}) -> ${result.idAnomalyResult}`,
      );

      return {
        success: true,
        idAnomalyResult: result.idAnomalyResult,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Failed to notify backend: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send multiple anomalies in bulk
   */
  async notifyAnomaliesBulk(anomalies: AnomalyResult[]): Promise<{
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
    const toNotify = anomalies.filter((a) => this.meetsMinSeverity(a.severity));
    result.skipped = anomalies.length - toNotify.length;

    if (toNotify.length === 0) {
      this.logger.debug('No anomalies meet severity threshold');
      return result;
    }

    // Send bulk if available, otherwise send individually
    const payloads: CreateAnomalyPayload[] = toNotify.map((anomaly) => ({
      // Use idSensorChannel if available (from RCF detection)
      idSensorChannel: anomaly.idSensorChannel,
      // Fallback to deviceId/sensorKey (from Z-score detection)
      deviceId: anomaly.deviceId,
      sensorKey: anomaly.sensorKey,
      detectedAt: anomaly.detectedAt.toISOString(),
      actualValue: anomaly.actualValue,
      expectedValue: anomaly.baselineValue,
      anomalyScore: anomaly.rcfScore,
      anomalyGrade: this.mapSeverityToGrade(anomaly.severity),
      anomalyType: this.determineAnomalyType(anomaly),
      detectorId: anomaly.detectorId,
      detectorName: anomaly.detectorName,
      note: `RCF Grade: ${anomaly.anomalyGrade?.toFixed(2) || 0}, Deviation: ${anomaly.deviationPercent.toFixed(1)}%`,
    }));

    try {
      const url = `${this.backendUrl}/api/ml/anomalies/bulk`;
      this.logger.debug(`Sending ${payloads.length} anomalies to backend: ${url}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.backendApiKey) {
        headers['X-API-Key'] = this.backendApiKey;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ anomalies: payloads }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      result.sent = responseData.created || payloads.length;
      this.logger.log(`Bulk anomaly report: ${result.sent} sent, ${result.skipped} skipped`);
    } catch (error) {
      this.logger.error(`Bulk notification failed: ${error.message}`);
      result.failed = toNotify.length;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Determine anomaly type based on deviation direction
   */
  private determineAnomalyType(anomaly: AnomalyResult): string {
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
   * Check if notification service is ready
   */
  isReady(): boolean {
    return this.enabled && !!this.backendUrl;
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    backendUrl: string;
    minGradeAlert: string;
  } {
    return {
      enabled: this.enabled,
      backendUrl: this.backendUrl,
      minGradeAlert: this.minGradeAlert,
    };
  }
}
