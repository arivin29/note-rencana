# Email Templates

**Date:** 2026-02-27  
**Status:** 📋 Design Phase  
**Version:** 1.0

---

## 1. Overview

### 1.1 Email Types

| Type | Trigger | Recipients | Frequency |
|------|---------|------------|-----------|
| **Alert Notification** | New anomaly detected | Project owners | Real-time |
| **Daily Summary** | Scheduled (06:00 UTC) | Project owners | Daily |
| **Weekly Report** | Scheduled (Monday 06:00) | Admins | Weekly |
| **System Status** | Circuit breaker events | System admins | As needed |

### 1.2 Template Engine

Using **Handlebars** for template rendering.

```typescript
// src/modules/notifications/services/email-template.service.ts

import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailTemplateService {
  private templates = new Map<string, Handlebars.TemplateDelegate>();

  constructor() {
    this.loadTemplates();
    this.registerHelpers();
  }

  private loadTemplates(): void {
    const templateDir = path.join(__dirname, '../templates');
    const files = fs.readdirSync(templateDir);
    
    for (const file of files) {
      if (file.endsWith('.hbs')) {
        const name = file.replace('.hbs', '');
        const content = fs.readFileSync(path.join(templateDir, file), 'utf-8');
        this.templates.set(name, Handlebars.compile(content));
      }
    }
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date) => {
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    });

    Handlebars.registerHelper('formatNumber', (num: number, decimals = 2) => {
      return num.toFixed(decimals);
    });

    Handlebars.registerHelper('sevColor', (severity: string) => {
      const colors = {
        CRITICAL: '#dc3545',
        HIGH: '#fd7e14',
        MEDIUM: '#ffc107',
        LOW: '#17a2b8',
      };
      return colors[severity] || '#6c757d';
    });

    Handlebars.registerHelper('gradeColor', (grade: string) => {
      const colors = {
        critical: '#dc3545',
        severe: '#fd7e14',
        moderate: '#ffc107',
        mild: '#17a2b8',
      };
      return colors[grade] || '#6c757d';
    });

    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });
  }

  render(templateName: string, data: object): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    return template(data);
  }
}
```

---

## 2. Alert Notification Template

### 2.1 File: `alert-notification.hbs`

```handlebars
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IoT Alert: {{anomalyType}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: {{gradeColor grade}};
      color: white;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header .badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(255,255,255,0.2);
      border-radius: 20px;
      font-size: 14px;
      margin-top: 10px;
    }
    .content {
      padding: 20px;
    }
    .alert-info {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .alert-info table {
      width: 100%;
      border-collapse: collapse;
    }
    .alert-info td {
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .alert-info td:first-child {
      color: #6c757d;
      width: 40%;
    }
    .alert-info td:last-child {
      font-weight: 500;
    }
    .value-comparison {
      display: flex;
      justify-content: space-around;
      text-align: center;
      margin: 20px 0;
    }
    .value-box {
      padding: 15px 25px;
      border-radius: 8px;
    }
    .value-box.actual {
      background: {{gradeColor grade}}20;
      color: {{gradeColor grade}};
    }
    .value-box.expected {
      background: #28a74520;
      color: #28a745;
    }
    .value-box .label {
      font-size: 12px;
      text-transform: uppercase;
      opacity: 0.8;
    }
    .value-box .value {
      font-size: 28px;
      font-weight: bold;
    }
    .value-box .unit {
      font-size: 14px;
      opacity: 0.8;
    }
    .deviation {
      text-align: center;
      font-size: 14px;
      color: #6c757d;
      margin-bottom: 20px;
    }
    .deviation strong {
      color: {{gradeColor grade}};
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
    }
    .btn-secondary {
      background: #6c757d;
      margin-left: 10px;
    }
    .footer {
      padding: 20px;
      background: #f8f9fa;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
    .arrow {
      font-size: 24px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>⚠️ Anomali Terdeteksi</h1>
      <div class="badge">{{toUpperCase grade}}</div>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Alert Info -->
      <div class="alert-info">
        <table>
          <tr>
            <td>Node</td>
            <td>{{node.nodeCode}} - {{node.name}}</td>
          </tr>
          <tr>
            <td>Sensor</td>
            <td>{{channel.name}} ({{channel.unit}})</td>
          </tr>
          <tr>
            <td>Jenis Anomali</td>
            <td>{{anomalyTypeLabel}}</td>
          </tr>
          <tr>
            <td>Waktu Deteksi</td>
            <td>{{formatDate detectedAt}}</td>
          </tr>
          <tr>
            <td>Alert ID</td>
            <td style="font-family: monospace; font-size: 12px;">{{alertId}}</td>
          </tr>
        </table>
      </div>

      <!-- Value Comparison -->
      <div class="value-comparison">
        <div class="value-box expected">
          <div class="label">Expected</div>
          <div class="value">{{formatNumber expectedValue 1}}</div>
          <div class="unit">{{channel.unit}}</div>
        </div>
        <div class="arrow">→</div>
        <div class="value-box actual">
          <div class="label">Actual</div>
          <div class="value">{{formatNumber actualValue 1}}</div>
          <div class="unit">{{channel.unit}}</div>
        </div>
      </div>

      <div class="deviation">
        Deviasi: <strong>{{formatNumber deviationPercent 1}}%</strong>
        {{#ifEquals anomalyType "threshold_breach_high"}}
          (Melebihi batas atas)
        {{/ifEquals}}
        {{#ifEquals anomalyType "threshold_breach_low"}}
          (Di bawah batas minimum)
        {{/ifEquals}}
        {{#ifEquals anomalyType "forecast_deviation"}}
          (Menyimpang dari prediksi)
        {{/ifEquals}}
      </div>

      <!-- Actions -->
      <div style="text-align: center; margin-top: 20px;">
        <a href="{{dashboardUrl}}" class="btn">Lihat Dashboard</a>
        <a href="{{acknowledgeUrl}}" class="btn btn-secondary">Acknowledge</a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Email ini dikirim otomatis oleh sistem IoT PDAM.</p>
      <p>{{projectName}} | {{formatDate now}}</p>
    </div>
  </div>
</body>
</html>
```

### 2.2 Plain Text Version: `alert-notification.txt.hbs`

```handlebars
===================================
⚠️ ANOMALI TERDETEKSI - {{toUpperCase grade}}
===================================

Node: {{node.nodeCode}} - {{node.name}}
Sensor: {{channel.name}} ({{channel.unit}})
Jenis: {{anomalyTypeLabel}}
Waktu: {{formatDate detectedAt}}

NILAI:
- Expected: {{formatNumber expectedValue 1}} {{channel.unit}}
- Actual: {{formatNumber actualValue 1}} {{channel.unit}}
- Deviasi: {{formatNumber deviationPercent 1}}%

TINDAKAN:
- Lihat Dashboard: {{dashboardUrl}}
- Acknowledge: {{acknowledgeUrl}}

---
Alert ID: {{alertId}}
{{projectName}}
```

---

## 3. Daily Summary Template

### 3.1 File: `daily-summary.hbs`

```handlebars
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Harian IoT - {{formatDate date}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 700px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #007bff, #6610f2);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .header .date {
      opacity: 0.9;
    }
    .content {
      padding: 20px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    .summary-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .summary-card .number {
      font-size: 32px;
      font-weight: bold;
    }
    .summary-card .label {
      font-size: 12px;
      color: #6c757d;
      margin-top: 5px;
    }
    .summary-card.critical .number { color: #dc3545; }
    .summary-card.high .number { color: #fd7e14; }
    .summary-card.medium .number { color: #ffc107; }
    .summary-card.resolved .number { color: #28a745; }

    h2 {
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
      margin-top: 25px;
    }

    .alert-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .alert-table th,
    .alert-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
    }
    .alert-table th {
      background: #f8f9fa;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-critical { background: #dc354520; color: #dc3545; }
    .badge-severe { background: #fd7e1420; color: #fd7e14; }
    .badge-moderate { background: #ffc10720; color: #856404; }
    .badge-mild { background: #17a2b820; color: #0c5460; }
    .badge-open { background: #dc354520; color: #dc3545; }
    .badge-acknowledged { background: #ffc10720; color: #856404; }
    .badge-cleared { background: #28a74520; color: #155724; }

    .node-group {
      margin-bottom: 20px;
    }
    .node-header {
      background: #e9ecef;
      padding: 10px 15px;
      border-radius: 6px 6px 0 0;
      font-weight: 600;
    }

    .chart-placeholder {
      background: #f8f9fa;
      border: 2px dashed #dee2e6;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      color: #6c757d;
      margin: 20px 0;
    }

    .footer {
      padding: 20px;
      background: #f8f9fa;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📊 Laporan Harian IoT</h1>
      <div class="date">{{formatDate date}}</div>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card critical">
          <div class="number">{{summary.critical}}</div>
          <div class="label">CRITICAL</div>
        </div>
        <div class="summary-card high">
          <div class="number">{{summary.severe}}</div>
          <div class="label">SEVERE</div>
        </div>
        <div class="summary-card medium">
          <div class="number">{{summary.moderate}}</div>
          <div class="label">MODERATE</div>
        </div>
        <div class="summary-card resolved">
          <div class="number">{{summary.resolved}}</div>
          <div class="label">RESOLVED</div>
        </div>
      </div>

      <!-- Active Alerts -->
      <h2>🚨 Alert Aktif ({{activeAlerts.length}})</h2>
      {{#if activeAlerts.length}}
        <table class="alert-table">
          <thead>
            <tr>
              <th>Node</th>
              <th>Channel</th>
              <th>Type</th>
              <th>Grade</th>
              <th>Status</th>
              <th>Durasi</th>
            </tr>
          </thead>
          <tbody>
            {{#each activeAlerts}}
            <tr>
              <td>{{this.nodeCode}}</td>
              <td>{{this.channelName}}</td>
              <td>{{this.anomalyType}}</td>
              <td><span class="badge badge-{{this.grade}}">{{toUpperCase this.grade}}</span></td>
              <td><span class="badge badge-{{this.status}}">{{this.status}}</span></td>
              <td>{{this.duration}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
      {{else}}
        <p style="color: #28a745; text-align: center;">✅ Tidak ada alert aktif</p>
      {{/if}}

      <!-- Resolved Today -->
      <h2>✅ Resolved Hari Ini ({{resolvedAlerts.length}})</h2>
      {{#if resolvedAlerts.length}}
        <table class="alert-table">
          <thead>
            <tr>
              <th>Node</th>
              <th>Channel</th>
              <th>Type</th>
              <th>Total Durasi</th>
              <th>Occurences</th>
            </tr>
          </thead>
          <tbody>
            {{#each resolvedAlerts}}
            <tr>
              <td>{{this.nodeCode}}</td>
              <td>{{this.channelName}}</td>
              <td>{{this.anomalyType}}</td>
              <td>{{this.totalDuration}}</td>
              <td>{{this.occurrenceCount}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
      {{else}}
        <p style="color: #6c757d; text-align: center;">Tidak ada alert yang di-resolve hari ini</p>
      {{/if}}

      <!-- Top Affected Nodes -->
      <h2>📍 Node Paling Banyak Alert</h2>
      {{#each topNodes}}
        <div class="node-group">
          <div class="node-header">
            {{this.nodeCode}} - {{this.name}} ({{this.alertCount}} alerts)
          </div>
        </div>
      {{/each}}

      <!-- Actions -->
      <div style="text-align: center; margin-top: 30px;">
        <a href="{{dashboardUrl}}" class="btn">Buka Dashboard</a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Laporan otomatis dari sistem IoT PDAM</p>
      <p>{{projectName}} | Generated: {{formatDate now}}</p>
    </div>
  </div>
</body>
</html>
```

---

## 4. System Status Template

### 4.1 File: `system-status.hbs`

```handlebars
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>System Status Alert</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }
    .header {
      {{#ifEquals eventType "circuit_open"}}
      background: #dc3545;
      {{else}}
      background: #28a745;
      {{/ifEquals}}
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
    }
    .status-box {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 15px;
      margin: 15px 0;
    }
    .status-box table {
      width: 100%;
    }
    .status-box td {
      padding: 5px 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-open { background: #dc3545; color: white; }
    .badge-closed { background: #28a745; color: white; }
    .badge-half-open { background: #ffc107; color: #333; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#ifEquals eventType "circuit_open"}}
        <h1>⛔ Circuit Breaker OPEN</h1>
      {{else}}
        <h1>✅ Circuit Breaker RECOVERED</h1>
      {{/ifEquals}}
    </div>
    
    <div class="content">
      <p>
        {{#ifEquals eventType "circuit_open"}}
          Service <strong>{{serviceName}}</strong> tidak dapat dijangkau setelah {{failureCount}} kali gagal.
          Sistem akan menggunakan fallback detection.
        {{else}}
          Service <strong>{{serviceName}}</strong> telah kembali normal.
          Sistem kembali menggunakan {{serviceName}} untuk detection.
        {{/ifEquals}}
      </p>

      <div class="status-box">
        <table>
          <tr>
            <td>Service</td>
            <td><strong>{{serviceName}}</strong></td>
          </tr>
          <tr>
            <td>Status</td>
            <td><span class="badge badge-{{circuitState}}">{{circuitState}}</span></td>
          </tr>
          <tr>
            <td>Failures</td>
            <td>{{failureCount}}</td>
          </tr>
          {{#if nextAttempt}}
          <tr>
            <td>Next Attempt</td>
            <td>{{formatDate nextAttempt}}</td>
          </tr>
          {{/if}}
          <tr>
            <td>Timestamp</td>
            <td>{{formatDate timestamp}}</td>
          </tr>
        </table>
      </div>

      {{#ifEquals eventType "circuit_open"}}
        <p><strong>Fallback Mode:</strong></p>
        <ul>
          <li>Menggunakan forecast-based detection</li>
          <li>Jika tidak ada forecast, menggunakan static threshold</li>
        </ul>
        <p>Engineer akan diberitahu jika masalah berlanjut lebih dari 30 menit.</p>
      {{/ifEquals}}
    </div>
  </div>
</body>
</html>
```

---

## 5. Template Data Interfaces

### 5.1 TypeScript Interfaces

```typescript
// src/modules/notifications/interfaces/template-data.interface.ts

// Alert Notification
export interface AlertNotificationData {
  alertId: string;
  anomalyType: string;
  anomalyTypeLabel: string;
  grade: 'mild' | 'moderate' | 'severe' | 'critical';
  detectedAt: Date;
  actualValue: number;
  expectedValue: number;
  deviationPercent: number;
  node: {
    idNode: string;
    nodeCode: string;
    name: string;
  };
  channel: {
    idSensorChannel: string;
    name: string;
    unit: string;
  };
  dashboardUrl: string;
  acknowledgeUrl: string;
  projectName: string;
  now: Date;
}

// Daily Summary
export interface DailySummaryData {
  date: Date;
  summary: {
    total: number;
    critical: number;
    severe: number;
    moderate: number;
    mild: number;
    resolved: number;
  };
  activeAlerts: Array<{
    idAlertEvent: string;
    nodeCode: string;
    channelName: string;
    anomalyType: string;
    grade: string;
    status: string;
    duration: string;
  }>;
  resolvedAlerts: Array<{
    nodeCode: string;
    channelName: string;
    anomalyType: string;
    totalDuration: string;
    occurrenceCount: number;
  }>;
  topNodes: Array<{
    nodeCode: string;
    name: string;
    alertCount: number;
  }>;
  dashboardUrl: string;
  projectName: string;
  now: Date;
}

// System Status
export interface SystemStatusData {
  eventType: 'circuit_open' | 'circuit_recovered';
  serviceName: string;
  circuitState: 'open' | 'closed' | 'half-open';
  failureCount: number;
  nextAttempt?: Date;
  timestamp: Date;
}
```

---

## 6. Email Service Implementation

### 6.1 Email Service

```typescript
// src/modules/notifications/services/email.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailTemplateService } from './email-template.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private templateService: EmailTemplateService,
  ) {
    this.initTransporter();
  }

  private initTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendAlertNotification(
    recipients: string[],
    data: AlertNotificationData
  ): Promise<void> {
    const html = this.templateService.render('alert-notification', data);
    const text = this.templateService.render('alert-notification.txt', data);

    await this.send({
      to: recipients.join(', '),
      subject: `[${data.grade.toUpperCase()}] Alert: ${data.channel.name} - ${data.anomalyTypeLabel}`,
      html,
      text,
    });

    this.logger.log(
      `Alert notification sent to ${recipients.length} recipients for alert ${data.alertId}`
    );
  }

  async sendDailySummary(
    recipients: string[],
    data: DailySummaryData
  ): Promise<void> {
    const html = this.templateService.render('daily-summary', data);

    await this.send({
      to: recipients.join(', '),
      subject: `IoT Daily Report - ${data.date.toLocaleDateString('id-ID')} (${data.activeAlerts.length} Active Alerts)`,
      html,
    });

    this.logger.log(
      `Daily summary sent to ${recipients.length} recipients`
    );
  }

  async sendSystemStatus(
    recipients: string[],
    data: SystemStatusData
  ): Promise<void> {
    const html = this.templateService.render('system-status', data);

    const statusEmoji = data.eventType === 'circuit_open' ? '⛔' : '✅';
    
    await this.send({
      to: recipients.join(', '),
      subject: `${statusEmoji} System: ${data.serviceName} ${data.circuitState.toUpperCase()}`,
      html,
    });
  }

  private async send(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    const mailOptions = {
      from: `"${this.configService.get('SMTP_FROM_NAME')}" <${this.configService.get('SMTP_FROM_EMAIL')}>`,
      ...options,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
```

### 6.2 Notification Orchestrator

```typescript
// src/modules/notifications/services/notification.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from './email.service';
import { AlertEvent } from '../../../entities/alert-event.entity';
import { Owner } from '../../../entities/owner.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Owner)
    private ownerRepo: Repository<Owner>,
    @InjectRepository(AlertEvent)
    private alertRepo: Repository<AlertEvent>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async notifyAlert(alertEvent: AlertEvent, anomaly: AnomalyResult): Promise<void> {
    // Get recipients for this project
    const recipients = await this.getRecipients(alertEvent.alertRule.project);

    if (recipients.length === 0) {
      this.logger.warn(`No recipients for project ${alertEvent.alertRule.project.name}`);
      return;
    }

    // Build template data
    const data = await this.buildAlertNotificationData(alertEvent, anomaly);

    // Send email
    await this.emailService.sendAlertNotification(recipients, data);
  }

  private async getRecipients(project: Project): Promise<string[]> {
    // Get owner emails for this project
    const owners = await this.ownerRepo.find({
      where: { 
        idProject: project.idProject,
        alertNotifications: true,  // If you have this preference
      },
    });

    return owners
      .map(o => o.email)
      .filter(Boolean);
  }

  private async buildAlertNotificationData(
    alertEvent: AlertEvent,
    anomaly: AnomalyResult
  ): Promise<AlertNotificationData> {
    const channel = alertEvent.alertRule.sensorChannel;
    const node = channel.node;
    const baseUrl = this.configService.get('DASHBOARD_BASE_URL');

    return {
      alertId: alertEvent.idAlertEvent,
      anomalyType: anomaly.anomalyType,
      anomalyTypeLabel: this.getAnomalyTypeLabel(anomaly.anomalyType),
      grade: anomaly.anomalyGrade,
      detectedAt: anomaly.detectedAt,
      actualValue: anomaly.actualValue,
      expectedValue: anomaly.expectedValue,
      deviationPercent: anomaly.anomalyScore * 100,
      node: {
        idNode: node.idNode,
        nodeCode: node.nodeCode,
        name: node.name,
      },
      channel: {
        idSensorChannel: channel.idSensorChannel,
        name: channel.name,
        unit: channel.unit,
      },
      dashboardUrl: `${baseUrl}/nodes/${node.idNode}/dashboard`,
      acknowledgeUrl: `${baseUrl}/alerts/${alertEvent.idAlertEvent}/acknowledge`,
      projectName: alertEvent.alertRule.project.name,
      now: new Date(),
    };
  }

  private getAnomalyTypeLabel(type: string): string {
    const labels = {
      'threshold_breach_high': 'Melebihi Batas Atas',
      'threshold_breach_low': 'Di Bawah Batas Minimum',
      'forecast_deviation': 'Menyimpang dari Prediksi',
      'sudden_spike': 'Lonjakan Mendadak',
      'sudden_drop': 'Penurunan Mendadak',
      'zero_reading': 'Pembacaan Nol',
      'flatline': 'Tidak Ada Perubahan',
    };
    return labels[type] || type;
  }
}
```

---

## 7. File Structure

```
src/modules/notifications/
├── templates/
│   ├── alert-notification.hbs
│   ├── alert-notification.txt.hbs
│   ├── daily-summary.hbs
│   ├── system-status.hbs
│   └── partials/
│       ├── header.hbs
│       ├── footer.hbs
│       └── styles.hbs
├── services/
│   ├── email.service.ts
│   ├── email-template.service.ts
│   └── notification.service.ts
├── interfaces/
│   └── template-data.interface.ts
└── notifications.module.ts
```

---

## 8. Testing Templates

### 8.1 Preview Endpoint

```typescript
// For development - preview templates

@Controller('dev/email-preview')
export class EmailPreviewController {
  constructor(private templateService: EmailTemplateService) {}

  @Get('alert')
  previewAlert(@Res() res: Response): void {
    const mockData: AlertNotificationData = {
      alertId: 'mock-123',
      anomalyType: 'threshold_breach_high',
      anomalyTypeLabel: 'Melebihi Batas Atas',
      grade: 'severe',
      detectedAt: new Date(),
      actualValue: 9.2,
      expectedValue: 7.5,
      deviationPercent: 22.7,
      node: {
        idNode: 'node-1',
        nodeCode: 'WTP-001',
        name: 'Water Treatment Plant Utara',
      },
      channel: {
        idSensorChannel: 'ch-1',
        name: 'Pressure Inlet',
        unit: 'bar',
      },
      dashboardUrl: 'http://localhost:4200/nodes/node-1/dashboard',
      acknowledgeUrl: 'http://localhost:4200/alerts/mock-123/acknowledge',
      projectName: 'PDAM IoT Demo',
      now: new Date(),
    };

    const html = this.templateService.render('alert-notification', mockData);
    res.contentType('text/html').send(html);
  }

  @Get('daily')
  previewDaily(@Res() res: Response): void {
    const mockData: DailySummaryData = {
      date: new Date(),
      summary: { total: 12, critical: 1, severe: 3, moderate: 5, mild: 3, resolved: 8 },
      activeAlerts: [
        { idAlertEvent: '1', nodeCode: 'WTP-001', channelName: 'Pressure', anomalyType: 'spike', grade: 'severe', status: 'open', duration: '2h 15m' },
      ],
      resolvedAlerts: [],
      topNodes: [
        { nodeCode: 'WTP-001', name: 'Water Treatment Utara', alertCount: 5 },
      ],
      dashboardUrl: 'http://localhost:4200',
      projectName: 'PDAM IoT Demo',
      now: new Date(),
    };

    const html = this.templateService.render('daily-summary', mockData);
    res.contentType('text/html').send(html);
  }
}
```

---

## 9. Related Documents

- [08-ALERT-DEDUPLICATION.md](08-ALERT-DEDUPLICATION.md) - Alert deduplication
- [09-ERROR-HANDLING.md](09-ERROR-HANDLING.md) - Error handling
- [05-API-DESIGN.md](05-API-DESIGN.md) - API design
- [06-ENVIRONMENT-VARIABLES.md](06-ENVIRONMENT-VARIABLES.md) - SMTP configuration

---

**Phase 1 Design Complete!** ✅
