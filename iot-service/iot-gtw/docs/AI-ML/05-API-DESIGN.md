# API Endpoints Design: ML Module

**Date:** 2026-02-27  
**Status:** 📋 Design Phase  
**Version:** 1.0  
**Service:** `iot-backend` ← Frontend API

---

## 1. Overview

### 1.1 Service Location

> **IMPORTANT:** Semua API endpoint di dokumen ini diimplementasikan di `iot-backend` (bukan iot-gtw).

| Service | Tanggung Jawab |
|---------|----------------|
| **iot-backend** | REST API untuk Angular dashboard, user authentication, CRUD operations |
| **iot-gtw** | Background jobs (sync, ML orchestration), data ingestion, tidak expose public API |

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SERVICE RESPONSIBILITY                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   iot-gtw (Port 3001)              iot-backend (Port 3000)               │
│   ─────────────────────            ───────────────────────               │
│   ✓ Sync ClickHouse→OpenSearch     ✓ GET /ml/anomalies                   │
│   ✓ Poll anomaly results           ✓ GET /ml/forecasts                   │
│   ✓ Generate forecasts             ✓ POST /ml/alerts/:id/acknowledge     │
│   ✓ Save to PostgreSQL             ✓ GET /ml/dashboard/summary           │
│   ✓ Send email notifications       ✓ JWT authentication                 │
│   ✗ No public REST API             ✓ Angular frontend access             │
│                                                                          │
│   [Background Worker]              [Public API]                          │
│         │                                │                               │
│         └────► anomaly_results ◄─────────┘                               │
│                forecast_results                                          │
│                alert_events                                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Base URL

```
Production: https://api.iot.pdam.id/v1/ml
Development: http://localhost:3000/api/v1/ml
```

### 1.2 Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

### 1.3 Common Response Format

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "ANOMALY_NOT_FOUND",
    "message": "Anomaly result not found",
    "details": { ... }
  }
}
```

---

## 2. Anomaly Endpoints

### 2.1 GET /ml/anomalies

List anomaly results with filtering and pagination.

**Request:**
```http
GET /ml/anomalies?channel_id=uuid&from=2026-02-01&to=2026-02-27&grade=severe,critical&page=1&limit=20
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel_id` | UUID | No | Filter by sensor channel |
| `project_id` | UUID | No | Filter by project |
| `owner_code` | string | No | Filter by owner |
| `from` | ISO date | No | Start date (default: 7 days ago) |
| `to` | ISO date | No | End date (default: now) |
| `grade` | string | No | Comma-separated: mild,moderate,severe,critical |
| `type` | string | No | Anomaly type filter |
| `is_acknowledged` | boolean | No | Filter by acknowledgment status |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `sort` | string | No | Sort field (default: detected_at:desc) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "idAnomalyResult": "uuid",
      "detectedAt": "2026-02-27T10:30:00Z",
      "actualValue": 9.2,
      "expectedValue": 4.5,
      "anomalyScore": 0.92,
      "anomalyGrade": "critical",
      "anomalyType": "threshold_breach",
      "detectorId": "pdam-pressure-detector",
      "isAcknowledged": false,
      "sensorChannel": {
        "idSensorChannel": "uuid",
        "channelName": "Pressure IN",
        "metricCode": "tekanan",
        "metricUnit": "bar"
      },
      "project": {
        "idProject": "uuid",
        "projectCode": "WTP-01",
        "projectName": "Water Treatment Plant 01"
      },
      "node": {
        "idNode": "uuid",
        "nodeCode": "NODE-001"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

### 2.2 GET /ml/anomalies/:id

Get single anomaly detail.

**Request:**
```http
GET /ml/anomalies/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "idAnomalyResult": "uuid",
    "detectedAt": "2026-02-27T10:30:00Z",
    "actualValue": 9.2,
    "expectedValue": 4.5,
    "anomalyScore": 0.92,
    "anomalyGrade": "critical",
    "anomalyType": "threshold_breach",
    "detectorId": "pdam-pressure-detector",
    "detectorName": "PDAM Pressure Detector",
    "opensearchResult": {
      "anomaly_grade": 0.92,
      "data_start_time": "2026-02-27T10:20:00Z",
      "data_end_time": "2026-02-27T10:30:00Z",
      "feature_data": [...]
    },
    "isAcknowledged": false,
    "acknowledgedBy": null,
    "acknowledgedAt": null,
    "note": null,
    "sensorChannel": {
      "idSensorChannel": "uuid",
      "channelName": "Pressure IN",
      "metricCode": "tekanan",
      "metricUnit": "bar",
      "minThreshold": 2.0,
      "maxThreshold": 8.0
    },
    "alertEvent": {
      "idAlertEvent": "uuid",
      "status": "open",
      "triggeredAt": "2026-02-27T10:30:15Z"
    },
    "relatedAnomalies": [
      {
        "idAnomalyResult": "uuid",
        "detectedAt": "2026-02-27T10:20:00Z",
        "anomalyGrade": "severe"
      }
    ]
  }
}
```

---

### 2.3 POST /ml/anomalies/:id/acknowledge

Acknowledge an anomaly.

**Request:**
```http
POST /ml/anomalies/550e8400-e29b-41d4-a716-446655440000/acknowledge
Content-Type: application/json

{
  "note": "Checked, valve adjustment needed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "idAnomalyResult": "uuid",
    "isAcknowledged": true,
    "acknowledgedBy": "user-uuid",
    "acknowledgedAt": "2026-02-27T11:00:00Z",
    "note": "Checked, valve adjustment needed"
  }
}
```

---

### 2.4 GET /ml/anomalies/stats

Get anomaly statistics.

**Request:**
```http
GET /ml/anomalies/stats?from=2026-02-01&to=2026-02-27&group_by=grade,project
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | ISO date | Start date |
| `to` | ISO date | End date |
| `group_by` | string | Grouping: grade, type, project, channel, day, hour |
| `project_id` | UUID | Filter by project |
| `owner_code` | string | Filter by owner |

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 156,
    "byGrade": {
      "mild": 45,
      "moderate": 62,
      "severe": 38,
      "critical": 11
    },
    "byType": {
      "threshold_breach": 32,
      "forecast_deviation": 89,
      "spike": 20,
      "flatline": 15
    },
    "byProject": [
      { "projectId": "uuid", "projectCode": "WTP-01", "count": 78 },
      { "projectId": "uuid", "projectCode": "WTP-02", "count": 78 }
    ],
    "trend": [
      { "date": "2026-02-20", "count": 12 },
      { "date": "2026-02-21", "count": 18 },
      { "date": "2026-02-22", "count": 8 }
    ]
  }
}
```

---

## 3. Forecast Endpoints

### 3.1 GET /ml/forecasts

List forecasts with filtering.

**Request:**
```http
GET /ml/forecasts?channel_id=uuid&from=2026-02-27&to=2026-03-06
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel_id` | UUID | Yes | Sensor channel ID |
| `from` | ISO date | No | Start forecast time |
| `to` | ISO date | No | End forecast time |
| `current_only` | boolean | No | Only latest forecasts (default: true) |

**Response:**
```json
{
  "success": true,
  "data": {
    "channelId": "uuid",
    "channelName": "Pressure IN",
    "metricCode": "tekanan",
    "metricUnit": "bar",
    "generatedAt": "2026-02-27T00:00:00Z",
    "forecastBatchId": "batch-uuid",
    "forecasts": [
      {
        "forecastTime": "2026-02-27T13:00:00Z",
        "predictedValue": 4.52,
        "lowerBound": 4.10,
        "upperBound": 4.95,
        "confidence": 0.95
      },
      {
        "forecastTime": "2026-02-27T14:00:00Z",
        "predictedValue": 4.61,
        "lowerBound": 4.18,
        "upperBound": 5.04,
        "confidence": 0.95
      }
    ]
  },
  "meta": {
    "horizon": "7d",
    "granularity": "1h",
    "totalPoints": 168
  }
}
```

---

### 3.2 GET /ml/forecasts/current/:channelId

Get current forecast for a specific channel.

**Request:**
```http
GET /ml/forecasts/current/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "channelId": "uuid",
    "generatedAt": "2026-02-27T00:00:00Z",
    "nextUpdate": "2026-02-27T12:00:00Z",
    "currentValue": 4.35,
    "forecastNow": {
      "forecastTime": "2026-02-27T10:00:00Z",
      "predictedValue": 4.48,
      "lowerBound": 4.05,
      "upperBound": 4.91,
      "deviation": -2.9
    },
    "forecastNext6h": [
      { "time": "2026-02-27T11:00:00Z", "value": 4.52 },
      { "time": "2026-02-27T12:00:00Z", "value": 4.61 },
      { "time": "2026-02-27T13:00:00Z", "value": 4.55 },
      { "time": "2026-02-27T14:00:00Z", "value": 4.42 },
      { "time": "2026-02-27T15:00:00Z", "value": 4.38 },
      { "time": "2026-02-27T16:00:00Z", "value": 4.35 }
    ]
  }
}
```

---

### 3.3 GET /ml/forecasts/compare/:channelId

Compare forecast vs actual values (for accuracy analysis).

**Request:**
```http
GET /ml/forecasts/compare/uuid?from=2026-02-20&to=2026-02-27
```

**Response:**
```json
{
  "success": true,
  "data": {
    "channelId": "uuid",
    "accuracy": {
      "mape": 8.5,
      "rmse": 0.42,
      "mae": 0.35
    },
    "comparison": [
      {
        "time": "2026-02-26T10:00:00Z",
        "predicted": 4.52,
        "actual": 4.45,
        "deviation": -1.5
      },
      {
        "time": "2026-02-26T11:00:00Z",
        "predicted": 4.61,
        "actual": 4.70,
        "deviation": 1.9
      }
    ]
  }
}
```

---

## 4. Alert Endpoints

### 4.1 GET /ml/alerts

List alerts with filtering.

**Request:**
```http
GET /ml/alerts?status=open&severity=HIGH,CRITICAL&page=1&limit=20
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | open, acknowledged, cleared |
| `severity` | string | LOW, MEDIUM, HIGH, CRITICAL |
| `project_id` | UUID | Filter by project |
| `from` | ISO date | Start date |
| `to` | ISO date | End date |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "idAlertEvent": "uuid",
      "triggeredAt": "2026-02-27T10:30:15Z",
      "status": "open",
      "value": 9.2,
      "alertRule": {
        "idAlertRule": "uuid",
        "ruleType": "ml_anomaly",
        "severity": "CRITICAL"
      },
      "sensorChannel": {
        "idSensorChannel": "uuid",
        "channelName": "Pressure IN"
      },
      "anomalyResult": {
        "idAnomalyResult": "uuid",
        "anomalyGrade": "critical",
        "anomalyType": "threshold_breach"
      },
      "project": {
        "projectCode": "WTP-01"
      },
      "node": {
        "nodeCode": "NODE-001"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 4.2 GET /ml/alerts/:id

Get single alert detail.

**Request:**
```http
GET /ml/alerts/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "idAlertEvent": "uuid",
    "triggeredAt": "2026-02-27T10:30:15Z",
    "status": "open",
    "value": 9.2,
    "acknowledgedBy": null,
    "acknowledgedAt": null,
    "clearedBy": null,
    "clearedAt": null,
    "note": null,
    "alertRule": {
      "idAlertRule": "uuid",
      "ruleType": "ml_anomaly",
      "severity": "CRITICAL",
      "paramsJson": {
        "min_grade": "severe"
      }
    },
    "anomalyResult": {
      "idAnomalyResult": "uuid",
      "detectedAt": "2026-02-27T10:30:00Z",
      "actualValue": 9.2,
      "expectedValue": 4.5,
      "anomalyGrade": "critical",
      "anomalyType": "threshold_breach"
    },
    "timeline": [
      {
        "action": "triggered",
        "timestamp": "2026-02-27T10:30:15Z",
        "actor": "system"
      }
    ],
    "relatedAlerts": [
      {
        "idAlertEvent": "uuid2",
        "triggeredAt": "2026-02-27T10:20:15Z",
        "status": "acknowledged"
      }
    ]
  }
}
```

---

### 4.3 POST /ml/alerts/:id/acknowledge

Acknowledge an alert.

**Request:**
```http
POST /ml/alerts/uuid/acknowledge
Content-Type: application/json

{
  "note": "Investigating the issue"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "idAlertEvent": "uuid",
    "status": "acknowledged",
    "acknowledgedBy": "user-uuid",
    "acknowledgedAt": "2026-02-27T10:45:00Z",
    "note": "Investigating the issue"
  }
}
```

---

### 4.4 POST /ml/alerts/:id/clear

Clear (resolve) an alert.

**Request:**
```http
POST /ml/alerts/uuid/clear
Content-Type: application/json

{
  "note": "Issue resolved, valve replaced"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "idAlertEvent": "uuid",
    "status": "cleared",
    "clearedBy": "user-uuid",
    "clearedAt": "2026-02-27T14:00:00Z",
    "note": "Issue resolved, valve replaced"
  }
}
```

---

### 4.5 POST /ml/alerts/bulk-acknowledge

Bulk acknowledge multiple alerts.

**Request:**
```http
POST /ml/alerts/bulk-acknowledge
Content-Type: application/json

{
  "alertIds": ["uuid1", "uuid2", "uuid3"],
  "note": "Bulk acknowledgment - shift handover"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "acknowledged": 3,
    "failed": 0,
    "results": [
      { "id": "uuid1", "status": "acknowledged" },
      { "id": "uuid2", "status": "acknowledged" },
      { "id": "uuid3", "status": "acknowledged" }
    ]
  }
}
```

---

## 5. Dashboard Endpoints

### 5.1 GET /ml/dashboard/summary

Get ML dashboard summary.

**Request:**
```http
GET /ml/dashboard/summary?project_id=uuid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "anomalies": {
      "total24h": 12,
      "critical": 2,
      "severe": 3,
      "moderate": 5,
      "mild": 2,
      "unacknowledged": 5
    },
    "alerts": {
      "open": 5,
      "acknowledged": 8,
      "criticalOpen": 2
    },
    "forecasts": {
      "lastUpdated": "2026-02-27T00:00:00Z",
      "nextUpdate": "2026-02-27T12:00:00Z",
      "activeChannels": 45
    },
    "topAnomalyChannels": [
      { "channelId": "uuid1", "channelName": "Pressure IN", "count": 5 },
      { "channelId": "uuid2", "channelName": "Flow Main", "count": 3 },
      { "channelId": "uuid3", "channelName": "Level Tank A", "count": 2 }
    ],
    "recentCritical": [
      {
        "idAnomalyResult": "uuid",
        "detectedAt": "2026-02-27T10:30:00Z",
        "channelName": "Pressure IN",
        "anomalyType": "threshold_breach",
        "status": "open"
      }
    ]
  }
}
```

---

### 5.2 GET /ml/dashboard/anomaly-trend

Get anomaly trend over time.

**Request:**
```http
GET /ml/dashboard/anomaly-trend?period=7d&granularity=1d&project_id=uuid
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | 24h, 7d, 30d |
| `granularity` | string | 1h, 6h, 1d |
| `project_id` | UUID | Filter by project |

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "granularity": "1d",
    "trend": [
      { "time": "2026-02-21", "total": 8, "critical": 1, "severe": 2, "moderate": 3, "mild": 2 },
      { "time": "2026-02-22", "total": 12, "critical": 0, "severe": 3, "moderate": 5, "mild": 4 },
      { "time": "2026-02-23", "total": 5, "critical": 0, "severe": 1, "moderate": 2, "mild": 2 },
      { "time": "2026-02-24", "total": 15, "critical": 2, "severe": 4, "moderate": 5, "mild": 4 },
      { "time": "2026-02-25", "total": 10, "critical": 1, "severe": 2, "moderate": 4, "mild": 3 },
      { "time": "2026-02-26", "total": 7, "critical": 0, "severe": 2, "moderate": 3, "mild": 2 },
      { "time": "2026-02-27", "total": 12, "critical": 2, "severe": 3, "moderate": 5, "mild": 2 }
    ]
  }
}
```

---

### 5.3 GET /ml/dashboard/channel-health

Get health status of all monitored channels.

**Request:**
```http
GET /ml/dashboard/channel-health?project_id=uuid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalChannels": 45,
    "healthy": 38,
    "warning": 5,
    "critical": 2,
    "channels": [
      {
        "channelId": "uuid",
        "channelName": "Pressure IN",
        "nodeCode": "NODE-001",
        "status": "critical",
        "lastValue": 9.2,
        "lastAnomaly": "2026-02-27T10:30:00Z",
        "anomalyCount24h": 5
      },
      {
        "channelId": "uuid2",
        "channelName": "Flow Main",
        "nodeCode": "NODE-001",
        "status": "warning",
        "lastValue": 180.5,
        "lastAnomaly": "2026-02-27T08:00:00Z",
        "anomalyCount24h": 2
      }
    ]
  }
}
```

---

## 6. Alert Rules Configuration

### 6.1 GET /ml/alert-rules

List all alert rules.

**Request:**
```http
GET /ml/alert-rules?channel_id=uuid
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "idAlertRule": "uuid",
      "idSensorChannel": "channel-uuid",
      "ruleType": "ml_anomaly",
      "severity": "CRITICAL",
      "enabled": true,
      "paramsJson": {
        "min_grade": "severe",
        "suppression_minutes": 30
      },
      "sensorChannel": {
        "channelName": "Pressure IN"
      }
    }
  ]
}
```

---

### 6.2 POST /ml/alert-rules

Create alert rule.

**Request:**
```http
POST /ml/alert-rules
Content-Type: application/json

{
  "idSensorChannel": "channel-uuid",
  "ruleType": "ml_anomaly",
  "severity": "CRITICAL",
  "enabled": true,
  "paramsJson": {
    "min_grade": "severe",
    "suppression_minutes": 30
  }
}
```

---

### 6.3 PUT /ml/alert-rules/:id

Update alert rule.

**Request:**
```http
PUT /ml/alert-rules/uuid
Content-Type: application/json

{
  "severity": "HIGH",
  "enabled": true,
  "paramsJson": {
    "min_grade": "moderate",
    "suppression_minutes": 15
  }
}
```

---

### 6.4 DELETE /ml/alert-rules/:id

Delete alert rule.

**Request:**
```http
DELETE /ml/alert-rules/uuid
```

---

## 7. DTO Definitions

### 7.1 anomaly-query.dto.ts

```typescript
import { IsOptional, IsUUID, IsDateString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class AnomalyQueryDto {
  @IsOptional()
  @IsUUID()
  channel_id?: string;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  owner_code?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => value?.split(','))
  grade?: string[];

  @IsOptional()
  type?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  is_acknowledged?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsOptional()
  sort?: string = 'detected_at:desc';
}
```

### 7.2 alert-acknowledge.dto.ts

```typescript
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AcknowledgeDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class BulkAcknowledgeDto {
  @IsUUID('4', { each: true })
  alertIds: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
```

---

## 8. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ANOMALY_NOT_FOUND` | 404 | Anomaly result not found |
| `ALERT_NOT_FOUND` | 404 | Alert event not found |
| `FORECAST_NOT_FOUND` | 404 | No forecast available for channel |
| `CHANNEL_NOT_FOUND` | 404 | Sensor channel not found |
| `ALREADY_ACKNOWLEDGED` | 400 | Anomaly/alert already acknowledged |
| `ALREADY_CLEARED` | 400 | Alert already cleared |
| `INVALID_DATE_RANGE` | 400 | Invalid from/to date range |
| `UNAUTHORIZED_PROJECT` | 403 | User not authorized for this project |
| `RULE_EXISTS` | 409 | Alert rule already exists for channel |

---

## 9. Related Documents

- [03-SERVICE-ARCHITECTURE.md](03-SERVICE-ARCHITECTURE.md) - Service structure
- [04-OPENSEARCH-TEMPLATES.md](04-OPENSEARCH-TEMPLATES.md) - OpenSearch schemas
- [06-ENVIRONMENT-VARIABLES.md](06-ENVIRONMENT-VARIABLES.md) - Configuration

---

**Next:** Environment Variables
