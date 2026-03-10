import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface AnomalyAlertData {
  anomalyId: string;
  deviceId: string;
  deviceName: string;
  sensorKey: string;
  sensorName: string;
  ownerName: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  actualValue: number;
  expectedValue: number;
  deviationPercent: number;
  unit: string;
  detectedAt: Date;
  dashboardUrl: string;
}

export interface DailySummaryData {
  ownerName: string;
  reportDate: Date;
  totalAnomalies: number;
  criticalCount: number;
  severeCount: number;
  moderateCount: number;
  mildCount: number;
  topAnomalousSensors: Array<{
    deviceName: string;
    sensorName: string;
    count: number;
  }>;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  dashboardUrl: string;
}

export interface SystemStatusData {
  statusType: 'service_down' | 'service_restored' | 'high_load' | 'maintenance';
  serviceName: string;
  message: string;
  timestamp: Date;
  details?: string;
}

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
    this.registerHelpers();
    this.loadTemplates();
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Format date helper
    Handlebars.registerHelper('formatDate', (date: Date, format?: string) => {
      if (!date) return '';
      const d = new Date(date);
      if (format === 'time') {
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
      if (format === 'datetime') {
        return d.toLocaleString('id-ID', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return d.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Format number helper
    Handlebars.registerHelper('formatNumber', (value: number, decimals?: number) => {
      if (value === undefined || value === null) return '';
      return value.toLocaleString('id-ID', {
        minimumFractionDigits: decimals ?? 2,
        maximumFractionDigits: decimals ?? 2,
      });
    });

    // Severity color helper
    Handlebars.registerHelper('severityColor', (severity: string) => {
      const colors: Record<string, string> = {
        critical: '#dc2626',
        severe: '#ea580c',
        moderate: '#d97706',
        mild: '#ca8a04',
        normal: '#22c55e',
      };
      return colors[severity] || '#6b7280';
    });

    // Severity label helper
    Handlebars.registerHelper('severityLabel', (severity: string) => {
      const labels: Record<string, string> = {
        critical: 'KRITIS',
        severe: 'PARAH',
        moderate: 'SEDANG',
        mild: 'RINGAN',
        normal: 'NORMAL',
      };
      return labels[severity] || severity.toUpperCase();
    });

    // System health color helper
    Handlebars.registerHelper('healthColor', (health: string) => {
      const colors: Record<string, string> = {
        healthy: '#22c55e',
        degraded: '#d97706',
        critical: '#dc2626',
      };
      return colors[health] || '#6b7280';
    });

    // If equals helper
    Handlebars.registerHelper('ifEq', function (this: any, a: any, b: any, options: Handlebars.HelperOptions) {
      return a === b ? options.fn(this) : options.inverse(this);
    });

    // If greater than helper
    Handlebars.registerHelper('ifGt', function (this: any, a: number, b: number, options: Handlebars.HelperOptions) {
      return a > b ? options.fn(this) : options.inverse(this);
    });
  }

  /**
   * Load email templates from files
   */
  private loadTemplates(): void {
    const templateFiles = [
      'anomaly-alert',
      'daily-summary',
      'system-status',
    ];

    for (const name of templateFiles) {
      try {
        const filePath = path.join(this.templatesDir, `${name}.hbs`);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          this.templates.set(name, Handlebars.compile(content));
          this.logger.debug(`Loaded template: ${name}`);
        } else {
          // Use inline template as fallback
          const inlineTemplate = this.getInlineTemplate(name);
          this.templates.set(name, Handlebars.compile(inlineTemplate));
          this.logger.debug(`Loaded inline template: ${name}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to load template ${name}: ${error.message}`);
      }
    }
  }

  /**
   * Get inline template as fallback
   */
  private getInlineTemplate(name: string): string {
    switch (name) {
      case 'anomaly-alert':
        return this.getAnomalyAlertInlineTemplate();
      case 'daily-summary':
        return this.getDailySummaryInlineTemplate();
      case 'system-status':
        return this.getSystemStatusInlineTemplate();
      default:
        return '<p>Template not found</p>';
    }
  }

  /**
   * Render anomaly alert email
   */
  renderAnomalyAlert(data: AnomalyAlertData): { subject: string; html: string } {
    const template = this.templates.get('anomaly-alert');
    if (!template) {
      throw new Error('Anomaly alert template not found');
    }

    const subject = `[${data.severity.toUpperCase()}] Anomali Terdeteksi - ${data.deviceName} / ${data.sensorName}`;
    const html = template(data);

    return { subject, html };
  }

  /**
   * Render daily summary email
   */
  renderDailySummary(data: DailySummaryData): { subject: string; html: string } {
    const template = this.templates.get('daily-summary');
    if (!template) {
      throw new Error('Daily summary template not found');
    }

    const dateStr = new Date(data.reportDate).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const subject = `Laporan Harian ML - ${data.ownerName} - ${dateStr}`;
    const html = template(data);

    return { subject, html };
  }

  /**
   * Render system status email
   */
  renderSystemStatus(data: SystemStatusData): { subject: string; html: string } {
    const template = this.templates.get('system-status');
    if (!template) {
      throw new Error('System status template not found');
    }

    const statusLabels: Record<string, string> = {
      service_down: 'Layanan Tidak Tersedia',
      service_restored: 'Layanan Pulih',
      high_load: 'Beban Tinggi',
      maintenance: 'Pemeliharaan',
    };

    const subject = `[SISTEM] ${statusLabels[data.statusType] || data.statusType} - ${data.serviceName}`;
    const html = template(data);

    return { subject, html };
  }

  // Inline Templates (fallback)

  private getAnomalyAlertInlineTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: {{severityColor severity}}; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .metric { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid {{severityColor severity}}; }
    .label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 24px; font-weight: bold; color: #111827; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 Anomali {{severityLabel severity}}</h1>
    <p>{{deviceName}} / {{sensorName}}</p>
  </div>
  <div class="content">
    <div class="metric">
      <div class="label">Nilai Aktual</div>
      <div class="value">{{formatNumber actualValue}} {{unit}}</div>
    </div>
    <div class="metric">
      <div class="label">Nilai Prediksi</div>
      <div class="value">{{formatNumber expectedValue}} {{unit}}</div>
    </div>
    <div class="metric">
      <div class="label">Deviasi</div>
      <div class="value" style="color: {{severityColor severity}}">{{formatNumber deviationPercent}}%</div>
    </div>
    <p><strong>Waktu Deteksi:</strong> {{formatDate detectedAt "datetime"}}</p>
    <p><strong>Owner:</strong> {{ownerName}}</p>
    <p style="text-align: center; margin-top: 20px;">
      <a href="{{dashboardUrl}}" class="btn">Lihat di Dashboard</a>
    </p>
  </div>
  <div class="footer">
    <p>Email ini dikirim otomatis oleh sistem IoT PDAM.</p>
  </div>
</body>
</html>`;
  }

  private getDailySummaryInlineTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .stats { display: flex; flex-wrap: wrap; gap: 10px; }
    .stat { background: white; padding: 15px; flex: 1; min-width: 120px; text-align: center; border-radius: 8px; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #6b7280; }
    .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .table th { background: #f3f4f6; }
    .health { padding: 5px 10px; border-radius: 4px; color: white; font-weight: bold; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Laporan Harian ML</h1>
    <p>{{ownerName}} - {{formatDate reportDate}}</p>
  </div>
  <div class="content">
    <h3>Ringkasan Anomali (24 jam terakhir)</h3>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">{{totalAnomalies}}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #dc2626">{{criticalCount}}</div>
        <div class="stat-label">Kritis</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #ea580c">{{severeCount}}</div>
        <div class="stat-label">Parah</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #d97706">{{moderateCount}}</div>
        <div class="stat-label">Sedang</div>
      </div>
    </div>
    
    {{#ifGt topAnomalousSensors.length 0}}
    <h3>Sensor Paling Banyak Anomali</h3>
    <table class="table">
      <tr><th>Device</th><th>Sensor</th><th>Jumlah</th></tr>
      {{#each topAnomalousSensors}}
      <tr><td>{{deviceName}}</td><td>{{sensorName}}</td><td>{{count}}</td></tr>
      {{/each}}
    </table>
    {{/ifGt}}
    
    <h3>Status Sistem</h3>
    <p><span class="health" style="background: {{healthColor systemHealth}}">{{systemHealth}}</span></p>
    
    <p style="text-align: center; margin-top: 20px;">
      <a href="{{dashboardUrl}}" class="btn">Buka Dashboard</a>
    </p>
  </div>
  <div class="footer">
    <p>Email ini dikirim otomatis oleh sistem IoT PDAM.</p>
  </div>
</body>
</html>`;
  }

  private getSystemStatusInlineTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { padding: 20px; text-align: center; }
    .header.service_down { background: #dc2626; color: white; }
    .header.service_restored { background: #22c55e; color: white; }
    .header.high_load { background: #d97706; color: white; }
    .header.maintenance { background: #3b82f6; color: white; }
    .content { padding: 20px; background: #f9fafb; }
    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header {{statusType}}">
    {{#ifEq statusType "service_down"}}🔴{{/ifEq}}
    {{#ifEq statusType "service_restored"}}🟢{{/ifEq}}
    {{#ifEq statusType "high_load"}}🟡{{/ifEq}}
    {{#ifEq statusType "maintenance"}}🔵{{/ifEq}}
    <h1>{{serviceName}}</h1>
  </div>
  <div class="content">
    <p><strong>{{message}}</strong></p>
    <p><strong>Waktu:</strong> {{formatDate timestamp "datetime"}}</p>
    {{#if details}}
    <div class="details">
      <strong>Detail:</strong>
      <pre>{{details}}</pre>
    </div>
    {{/if}}
  </div>
  <div class="footer">
    <p>Email ini dikirim otomatis oleh sistem IoT PDAM.</p>
  </div>
</body>
</html>`;
  }
}
