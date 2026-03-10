import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { AnomalyResult } from '../../entities/anomaly-result.entity';
import { SensorChannel } from '../../entities/sensor-channel.entity';
import { EmailTemplateService, AnomalyAlertData, DailySummaryData } from './email-template.service';
import { AlertDeduplicationService, AlertKey } from './alert-deduplication.service';

interface MlNotificationConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  smtpSecure: boolean;
  dashboardBaseUrl: string;
  enableEmail: boolean;
  enableWebhook: boolean;
  webhookUrl?: string;
  minSeverityForAlert: 'mild' | 'moderate' | 'severe' | 'critical';
}

// Extended anomaly data for notification purposes
export interface AnomalyNotificationData {
  idAnomalyResult: string;
  idSensorChannel: string;
  detectedAt: Date;
  actualValue: number;
  expectedValue: number;
  anomalyScore: number;
  anomalyGrade: string;
  anomalyType: string;
  // Extended fields from relations or passed in
  deviceId?: string;
  deviceName?: string;
  sensorKey?: string;
  sensorName?: string;
  ownerCode?: string;
  ownerName?: string;
  unit?: string;
}

@Injectable()
export class MlNotificationService {
  private readonly logger = new Logger(MlNotificationService.name);
  private config: MlNotificationConfig;
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(AnomalyResult)
    private anomalyRepo: Repository<AnomalyResult>,
    @InjectRepository(SensorChannel)
    private sensorChannelRepo: Repository<SensorChannel>,
    private emailTemplateService: EmailTemplateService,
    private dedupService: AlertDeduplicationService,
  ) {
    this.loadConfig();
    this.initTransporter();
  }

  private loadConfig(): void {
    this.config = {
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: process.env.SMTP_PASS || '',
      smtpFrom: process.env.SMTP_FROM || 'IoT PDAM <noreply@pdam.id>',
      smtpSecure: process.env.SMTP_SECURE === 'true',
      dashboardBaseUrl: process.env.DASHBOARD_URL || 'https://iot.pdam.id',
      enableEmail: process.env.ML_NOTIFICATION_EMAIL !== 'false',
      enableWebhook: process.env.ML_NOTIFICATION_WEBHOOK === 'true',
      webhookUrl: process.env.ML_WEBHOOK_URL,
      minSeverityForAlert: (process.env.ML_MIN_SEVERITY || 'moderate') as MlNotificationConfig['minSeverityForAlert'],
    };
  }

  private initTransporter(): void {
    if (!this.config.smtpUser || !this.config.smtpPass) {
      this.logger.warn('SMTP credentials not configured, email notifications disabled');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpSecure,
        auth: {
          user: this.config.smtpUser,
          pass: this.config.smtpPass,
        },
      });

      this.transporter.verify((error) => {
        if (error) {
          this.logger.error(`SMTP verification failed: ${error.message}`);
        } else {
          this.logger.log('SMTP transporter ready');
        }
      });
    } catch (error) {
      this.logger.error(`Failed to initialize SMTP: ${error.message}`);
    }
  }

  /**
   * Check if severity meets minimum threshold
   */
  private meetsMinSeverity(grade: string): boolean {
    const severityOrder = { mild: 1, moderate: 2, severe: 3, critical: 4 };
    const level = severityOrder[grade as keyof typeof severityOrder] || 0;
    const minLevel = severityOrder[this.config.minSeverityForAlert] || 2;
    return level >= minLevel;
  }

  /**
   * Calculate deviation percent from actual and expected values
   */
  private calculateDeviationPercent(actual: number, expected: number): number {
    if (expected === 0) return actual !== 0 ? 100 : 0;
    return Math.abs((actual - expected) / expected * 100);
  }

  /**
   * Send anomaly alert notification with extended data
   */
  async sendAnomalyAlert(
    data: AnomalyNotificationData,
    recipientEmail: string,
  ): Promise<boolean> {
    if (!this.config.enableEmail) {
      this.logger.debug('Email notifications disabled');
      return false;
    }

    // Check severity threshold
    if (!this.meetsMinSeverity(data.anomalyGrade)) {
      this.logger.debug(`Grade ${data.anomalyGrade} below threshold ${this.config.minSeverityForAlert}`);
      return false;
    }

    // Check deduplication
    const alertKey: AlertKey = {
      deviceId: data.deviceId || data.idSensorChannel,
      sensorKey: data.sensorKey || data.idSensorChannel,
      severity: data.anomalyGrade,
    };

    if (!this.dedupService.shouldSendAlert(alertKey)) {
      this.logger.debug(`Alert suppressed for ${alertKey.deviceId}/${alertKey.sensorKey}`);
      return false;
    }

    // Prepare alert data
    const alertData: AnomalyAlertData = {
      anomalyId: data.idAnomalyResult,
      deviceId: data.deviceId || data.idSensorChannel,
      deviceName: data.deviceName || 'Unknown Device',
      sensorKey: data.sensorKey || data.idSensorChannel,
      sensorName: data.sensorName || data.sensorKey || 'Unknown Sensor',
      ownerName: data.ownerName || 'Unknown',
      severity: data.anomalyGrade as AnomalyAlertData['severity'],
      actualValue: data.actualValue,
      expectedValue: data.expectedValue,
      deviationPercent: this.calculateDeviationPercent(data.actualValue, data.expectedValue),
      unit: data.unit || '',
      detectedAt: data.detectedAt,
      dashboardUrl: `${this.config.dashboardBaseUrl}/ml/anomalies/${data.idAnomalyResult}`,
    };

    try {
      const { subject, html } = this.emailTemplateService.renderAnomalyAlert(alertData);
      await this.sendEmail(recipientEmail, subject, html);
      this.logger.log(`Anomaly alert sent to ${recipientEmail} for ${alertKey.deviceId}/${alertKey.sensorKey}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send anomaly alert: ${error.message}`);
      return false;
    }
  }

  /**
   * Send daily summary notification
   */
  async sendDailySummary(
    ownerCode: string,
    ownerName: string,
    recipientEmail: string,
  ): Promise<boolean> {
    if (!this.config.enableEmail) {
      return false;
    }

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get anomaly stats
    const stats = await this.getAnomalyStats(yesterday, now);
    const topSensors = await this.getTopAnomalousSensors(yesterday, now);

    const summaryData: DailySummaryData = {
      ownerName,
      reportDate: now,
      totalAnomalies: stats.total,
      criticalCount: stats.critical,
      severeCount: stats.severe,
      moderateCount: stats.moderate,
      mildCount: stats.mild,
      topAnomalousSensors: topSensors,
      systemHealth: this.calculateSystemHealth(stats),
      dashboardUrl: `${this.config.dashboardBaseUrl}/ml/dashboard`,
    };

    try {
      const { subject, html } = this.emailTemplateService.renderDailySummary(summaryData);
      await this.sendEmail(recipientEmail, subject, html);
      this.logger.log(`Daily summary sent to ${recipientEmail} for owner ${ownerCode}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send daily summary: ${error.message}`);
      return false;
    }
  }

  /**
   * Get anomaly statistics for time range
   */
  private async getAnomalyStats(
    startDate: Date,
    endDate: Date,
  ): Promise<{ total: number; critical: number; severe: number; moderate: number; mild: number }> {
    const anomalies = await this.anomalyRepo.find({
      where: {
        detectedAt: Between(startDate, endDate),
      },
      select: ['anomalyGrade'],
    });

    const stats = { total: 0, critical: 0, severe: 0, moderate: 0, mild: 0 };
    for (const a of anomalies) {
      stats.total++;
      if (a.anomalyGrade === 'critical') stats.critical++;
      else if (a.anomalyGrade === 'severe') stats.severe++;
      else if (a.anomalyGrade === 'moderate') stats.moderate++;
      else if (a.anomalyGrade === 'mild') stats.mild++;
    }
    return stats;
  }

  /**
   * Get top anomalous sensors for time range
   */
  private async getTopAnomalousSensors(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ deviceName: string; sensorName: string; count: number }>> {
    const results = await this.anomalyRepo
      .createQueryBuilder('a')
      .select('a.id_sensor_channel', 'idSensorChannel')
      .addSelect('COUNT(*)', 'count')
      .where('a.detected_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('a.id_sensor_channel')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    // Map to display format (would need to join with sensor/device for real names)
    return results.map((r) => ({
      deviceName: `Sensor ${(r.idSensorChannel || '').substring(0, 8)}...`,
      sensorName: r.idSensorChannel || 'unknown',
      count: parseInt(r.count, 10),
    }));
  }

  /**
   * Calculate overall system health based on stats
   */
  private calculateSystemHealth(
    stats: { total: number; critical: number; severe: number },
  ): 'healthy' | 'degraded' | 'critical' {
    if (stats.critical >= 5) return 'critical';
    if (stats.critical >= 1 || stats.severe >= 5) return 'degraded';
    return 'healthy';
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(payload: any): Promise<boolean> {
    if (!this.config.enableWebhook || !this.config.webhookUrl) {
      return false;
    }

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      this.logger.log(`Webhook sent successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Webhook failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Send email using transporter
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not configured');
    }

    await this.transporter.sendMail({
      from: this.config.smtpFrom,
      to,
      subject,
      html,
    });
  }

  /**
   * Process new anomalies and send alerts
   * Called by scheduler or event handler
   * @param recipientEmail - Single recipient for all alerts (admin email)
   */
  async processNewAnomalies(recipientEmail: string): Promise<number> {
    // Get unacknowledged anomalies from last 10 minutes
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const anomalies = await this.anomalyRepo.find({
      where: {
        detectedAt: MoreThan(since),
        isAcknowledged: false,
      },
      relations: ['sensorChannel'],
    });

    let sentCount = 0;
    for (const anomaly of anomalies) {
      const data: AnomalyNotificationData = {
        idAnomalyResult: anomaly.idAnomalyResult,
        idSensorChannel: anomaly.idSensorChannel,
        detectedAt: anomaly.detectedAt,
        actualValue: anomaly.actualValue,
        expectedValue: anomaly.expectedValue,
        anomalyScore: anomaly.anomalyScore,
        anomalyGrade: anomaly.anomalyGrade,
        anomalyType: anomaly.anomalyType,
        sensorKey: anomaly.sensorChannel?.metricCode,
        unit: anomaly.sensorChannel?.unit,
      };

      const sent = await this.sendAnomalyAlert(data, recipientEmail);
      if (sent) sentCount++;
    }

    this.logger.log(`Processed ${anomalies.length} anomalies, sent ${sentCount} alerts`);
    return sentCount;
  }

  /**
   * Get unacknowledged anomaly count
   */
  async getUnacknowledgedCount(): Promise<number> {
    return this.anomalyRepo.count({
      where: { isAcknowledged: false },
    });
  }

  /**
   * Get deduplication stats
   */
  getDedupStats(): { activeKeys: number; totalAlertsSent: number } {
    return this.dedupService.getStats();
  }
}
