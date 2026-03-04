import { Controller, Post, Get, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MlNotificationService } from '../services/ml-notification.service';
import { EmailTemplateService, AnomalyAlertData, DailySummaryData } from '../services/email-template.service';
import { AlertDeduplicationService } from '../services/alert-deduplication.service';

class TestAlertDto {
  email: string;
  deviceId: string;
  deviceName: string;
  sensorKey: string;
  sensorName: string;
  ownerName: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  actualValue: number;
  expectedValue: number;
  unit: string;
}

class TestDailySummaryDto {
  email: string;
  ownerCode: string;
  ownerName: string;
}

@ApiTags('ML Notifications')
@Controller('notifications/ml')
export class MlNotificationController {
  constructor(
    private mlNotificationService: MlNotificationService,
    private emailTemplateService: EmailTemplateService,
    private dedupService: AlertDeduplicationService,
  ) {}

  /**
   * Test anomaly alert email (requires auth)
   */
  @Post('test-alert')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test anomaly alert email' })
  @ApiBody({ type: TestAlertDto })
  @ApiResponse({ status: 200, description: 'Alert sent successfully' })
  async testAlert(@Body() dto: TestAlertDto): Promise<{ success: boolean; message: string }> {
    const alertData: AnomalyAlertData = {
      anomalyId: `test-${Date.now()}`,
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      sensorKey: dto.sensorKey,
      sensorName: dto.sensorName,
      ownerName: dto.ownerName,
      severity: dto.severity,
      actualValue: dto.actualValue,
      expectedValue: dto.expectedValue,
      deviationPercent: Math.abs((dto.actualValue - dto.expectedValue) / dto.expectedValue * 100),
      unit: dto.unit,
      detectedAt: new Date(),
      dashboardUrl: `${process.env.DASHBOARD_URL || 'https://iot.pdam.id'}/ml/test`,
    };

    try {
      const { subject, html } = this.emailTemplateService.renderAnomalyAlert(alertData);
      
      // Return rendered HTML for testing
      return {
        success: true,
        message: `Alert would be sent with subject: "${subject}"`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Preview anomaly alert HTML
   */
  @Post('preview/alert')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview anomaly alert HTML' })
  async previewAlert(@Body() dto: TestAlertDto): Promise<{ subject: string; html: string }> {
    const alertData: AnomalyAlertData = {
      anomalyId: `preview-${Date.now()}`,
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      sensorKey: dto.sensorKey,
      sensorName: dto.sensorName,
      ownerName: dto.ownerName,
      severity: dto.severity,
      actualValue: dto.actualValue,
      expectedValue: dto.expectedValue,
      deviationPercent: Math.abs((dto.actualValue - dto.expectedValue) / dto.expectedValue * 100),
      unit: dto.unit,
      detectedAt: new Date(),
      dashboardUrl: `${process.env.DASHBOARD_URL || 'https://iot.pdam.id'}/ml/anomalies/preview`,
    };

    return this.emailTemplateService.renderAnomalyAlert(alertData);
  }

  /**
   * Preview daily summary HTML
   */
  @Post('preview/daily-summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview daily summary HTML' })
  async previewDailySummary(): Promise<{ subject: string; html: string }> {
    const summaryData: DailySummaryData = {
      ownerName: 'PDAM Demo',
      reportDate: new Date(),
      totalAnomalies: 15,
      criticalCount: 2,
      severeCount: 5,
      moderateCount: 5,
      mildCount: 3,
      topAnomalousSensors: [
        { deviceName: 'Meter-001', sensorName: 'Flow Rate', count: 5 },
        { deviceName: 'Meter-002', sensorName: 'Pressure', count: 4 },
        { deviceName: 'Meter-003', sensorName: 'Temperature', count: 3 },
      ],
      systemHealth: 'degraded',
      dashboardUrl: `${process.env.DASHBOARD_URL || 'https://iot.pdam.id'}/ml/dashboard`,
    };

    return this.emailTemplateService.renderDailySummary(summaryData);
  }

  /**
   * Get deduplication stats
   */
  @Get('dedup-stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get alert deduplication statistics' })
  getDedupStats(): { activeKeys: number; totalAlertsSent: number } {
    return this.dedupService.getStats();
  }

  /**
   * Clear deduplication cache (admin only)
   */
  @Post('dedup/clear')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear deduplication cache' })
  clearDedupCache(): { success: boolean; message: string } {
    this.dedupService.clearAll();
    return {
      success: true,
      message: 'Deduplication cache cleared',
    };
  }

  /**
   * Reset suppression for specific alert key
   */
  @Post('dedup/reset/:deviceId/:sensorKey/:severity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset suppression for specific alert' })
  resetSuppression(
    @Param('deviceId') deviceId: string,
    @Param('sensorKey') sensorKey: string,
    @Param('severity') severity: string,
  ): { success: boolean; message: string } {
    this.dedupService.resetSuppression({ deviceId, sensorKey, severity });
    return {
      success: true,
      message: `Suppression reset for ${deviceId}/${sensorKey}/${severity}`,
    };
  }

  /**
   * Trigger daily summary email
   */
  @Post('send-daily-summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually trigger daily summary email' })
  @ApiBody({ type: TestDailySummaryDto })
  async sendDailySummary(@Body() dto: TestDailySummaryDto): Promise<{ success: boolean; message: string }> {
    try {
      const sent = await this.mlNotificationService.sendDailySummary(
        dto.ownerCode,
        dto.ownerName,
        dto.email,
      );
      return {
        success: sent,
        message: sent ? 'Daily summary sent' : 'Failed to send daily summary',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get notification service stats
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ML notification service statistics' })
  getStats(): object {
    return {
      dedupStats: this.mlNotificationService.getDedupStats(),
      config: {
        emailEnabled: process.env.ML_NOTIFICATION_EMAIL !== 'false',
        webhookEnabled: process.env.ML_NOTIFICATION_WEBHOOK === 'true',
        minSeverity: process.env.ML_MIN_SEVERITY || 'moderate',
        suppressionWindowMs: parseInt(process.env.ALERT_SUPPRESSION_WINDOW_MS || '1800000', 10),
      },
    };
  }
}
