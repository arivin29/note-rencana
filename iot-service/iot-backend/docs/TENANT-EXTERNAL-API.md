# Tenant External API - Dokumentasi Spesifikasi

## 📋 Overview

Dokumentasi ini menjelaskan API eksternal untuk tenant (pelanggan) agar dapat menarik data sensor mereka sendiri dari sistem IoT Platform.

### Tujuan
- Menyediakan API yang aman untuk tenant mengakses data sensor mereka
- Menggunakan API Key authentication berbasis User ID (UUID)
- Endpoint terpisah dari internal API agar tidak mengganggu production

### Prinsip Desain
1. **Isolated Module** - Module terpisah `/external-api/v1/*`
2. **API Key Based** - Setiap tenant punya API key yang di-generate dari user UUID
3. **Scoped Data** - Data otomatis ter-filter berdasarkan `id_owner` tenant
4. **Rate Limited** - Batasan request per menit untuk mencegah abuse
5. **Read Only** - Hanya operasi GET, tidak ada write operation

---

## 🔐 Authentication

### API Key Generation
- API Key di-generate berdasarkan `id_user` (UUID) yang sudah ada
- Format: `tnt_{base64(user_id + secret + timestamp)}`
- Disimpan di tabel baru `tenant_api_keys`

### Header Authentication
```http
GET /external-api/v1/sensor-data
X-API-Key: tnt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Rate Limiting
| Plan | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Basic | 60 | 10,000 |
| Standard | 120 | 50,000 |
| Premium | 300 | 100,000 |

---

## 📊 Entity Relationship (Context)

```
Owner (Tenant)
  └── User (has API Key)
  └── Project
        └── Node (Device/Gateway)
              └── Sensor
                    └── SensorChannel (metric: suhu, kelembaban, dll)
                          └── SensorLog (telemetry data)
```

---

## 🚀 API Endpoints

### Base URL
```
Production: https://api.yourdomain.com/external-api/v1
Development: http://localhost:3000/external-api/v1
```

---

### 1. Health Check & Info

#### `GET /external-api/v1/info`
Mendapatkan informasi tenant dan status API key.

**Response:**
```json
{
  "status": "active",
  "tenant": {
    "idOwner": "uuid",
    "ownerCode": "TNT01",
    "name": "PT Contoh Tenant",
    "email": "admin@tenant.com"
  },
  "apiKey": {
    "createdAt": "2025-01-01T00:00:00Z",
    "lastUsedAt": "2025-02-10T10:30:00Z",
    "expiresAt": "2026-01-01T00:00:00Z",
    "rateLimitPlan": "standard",
    "requestsToday": 150,
    "requestsRemaining": 49850
  }
}
```

---

### 2. Projects

#### `GET /external-api/v1/projects`
Mendapatkan daftar project milik tenant.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status: `active`, `inactive` |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "data": [
    {
      "idProject": "uuid",
      "name": "Project A",
      "areaType": "industrial",
      "status": "active",
      "nodeCount": 5,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

### 3. Nodes (Devices)

#### `GET /external-api/v1/nodes`
Mendapatkan daftar node/device milik tenant.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | uuid | No | Filter by project |
| `status` | string | No | Filter: `active`, `maintenance`, `offline` |
| `connectivityStatus` | string | No | Filter: `online`, `offline` |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "data": [
    {
      "idNode": "uuid",
      "code": "NODE-001",
      "name": "Gateway Gedung A",
      "serialNumber": "SN123456",
      "status": "active",
      "connectivityStatus": "online",
      "lastSeenAt": "2025-02-10T10:25:00Z",
      "location": {
        "address": "Jl. Contoh No. 1",
        "city": "Jakarta",
        "latitude": -6.2088,
        "longitude": 106.8456
      },
      "project": {
        "idProject": "uuid",
        "name": "Project A"
      },
      "sensorCount": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

#### `GET /external-api/v1/nodes/:nodeId`
Mendapatkan detail node beserta sensor-sensornya.

**Response:**
```json
{
  "idNode": "uuid",
  "code": "NODE-001",
  "name": "Gateway Gedung A",
  "description": "Gateway utama gedung A lantai 1",
  "serialNumber": "SN123456",
  "devEui": "0011223344556677",
  "firmwareVersion": "v2.1.0",
  "status": "active",
  "connectivityStatus": "online",
  "lastSeenAt": "2025-02-10T10:25:00Z",
  "telemetryIntervalSec": 300,
  "location": {
    "address": "Jl. Contoh No. 1",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "postalCode": "12345",
    "country": "Indonesia",
    "latitude": -6.2088,
    "longitude": 106.8456,
    "elevationM": 15.5
  },
  "project": {
    "idProject": "uuid",
    "name": "Project A"
  },
  "sensors": [
    {
      "idSensor": "uuid",
      "sensorCode": "TEMP-01",
      "label": "Temperature Sensor",
      "status": "active",
      "channels": [
        {
          "idSensorChannel": "uuid",
          "metricCode": "temperature",
          "unit": "°C",
          "minThreshold": 0,
          "maxThreshold": 50
        }
      ]
    }
  ]
}
```

---

### 4. Sensors

#### `GET /external-api/v1/sensors`
Mendapatkan daftar semua sensor milik tenant.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | uuid | No | Filter by project |
| `nodeId` | uuid | No | Filter by node |
| `status` | string | No | Filter: `active`, `maintenance`, `inactive` |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "data": [
    {
      "idSensor": "uuid",
      "sensorCode": "TEMP-01",
      "label": "Temperature Sensor",
      "status": "active",
      "node": {
        "idNode": "uuid",
        "code": "NODE-001",
        "name": "Gateway Gedung A"
      },
      "channels": [
        {
          "idSensorChannel": "uuid",
          "metricCode": "temperature",
          "unit": "°C"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

---

### 5. Sensor Data (Telemetry) ⭐ MAIN FEATURE

#### `GET /external-api/v1/sensor-data`
Mendapatkan data telemetry sensor dengan filter lengkap.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | uuid | No | Filter by project |
| `nodeId` | uuid | No | Filter by node |
| `sensorId` | uuid | No | Filter by sensor |
| `channelId` | uuid | No | Filter by specific channel |
| `metricCode` | string | No | Filter by metric: `temperature`, `humidity`, dll |
| `startDate` | ISO8601 | **Yes** | Start date range |
| `endDate` | ISO8601 | **Yes** | End date range (max 7 days from start) |
| `qualityFlag` | string | No | Filter: `good`, `bad`, `uncertain` |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 100, max: 1000) |
| `order` | string | No | Sort order: `asc`, `desc` (default: desc) |

**Request Example:**
```http
GET /external-api/v1/sensor-data?nodeId=xxx&startDate=2025-02-01T00:00:00Z&endDate=2025-02-07T23:59:59Z&limit=500
X-API-Key: tnt_xxxxxxxx
```

**Response:**
```json
{
  "data": [
    {
      "id": "123456",
      "timestamp": "2025-02-10T10:30:00Z",
      "value": 25.5,
      "valueRaw": 2550,
      "unit": "°C",
      "qualityFlag": "good",
      "channel": {
        "idSensorChannel": "uuid",
        "metricCode": "temperature"
      },
      "sensor": {
        "idSensor": "uuid",
        "sensorCode": "TEMP-01",
        "label": "Temperature Sensor"
      },
      "node": {
        "idNode": "uuid",
        "code": "NODE-001",
        "name": "Gateway Gedung A"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 5000,
    "totalPages": 50
  },
  "meta": {
    "queryTimeMs": 45,
    "dateRange": {
      "start": "2025-02-01T00:00:00Z",
      "end": "2025-02-07T23:59:59Z"
    }
  }
}
```

---

### 6. Sensor Data - Latest Values

#### `GET /external-api/v1/sensor-data/latest`
Mendapatkan nilai terbaru dari semua sensor/channel.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | uuid | No | Filter by project |
| `nodeId` | uuid | No | Filter by node |
| `sensorId` | uuid | No | Filter by sensor |

**Response:**
```json
{
  "data": [
    {
      "channel": {
        "idSensorChannel": "uuid",
        "metricCode": "temperature",
        "unit": "°C"
      },
      "sensor": {
        "idSensor": "uuid",
        "sensorCode": "TEMP-01",
        "label": "Temperature Sensor"
      },
      "node": {
        "idNode": "uuid",
        "code": "NODE-001",
        "name": "Gateway Gedung A"
      },
      "latestValue": 25.5,
      "latestTimestamp": "2025-02-10T10:30:00Z",
      "qualityFlag": "good"
    }
  ],
  "timestamp": "2025-02-10T10:35:00Z"
}
```

---

### 7. Sensor Data - Aggregated/Statistics

#### `GET /external-api/v1/sensor-data/aggregated`
Mendapatkan data agregasi (min, max, avg, sum, count) per interval waktu.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channelId` | uuid | **Yes** | Channel ID to aggregate |
| `startDate` | ISO8601 | **Yes** | Start date range |
| `endDate` | ISO8601 | **Yes** | End date range |
| `interval` | string | No | Aggregation interval: `1m`, `5m`, `15m`, `1h`, `1d` (default: 1h) |
| `aggregation` | string | No | Type: `avg`, `min`, `max`, `sum`, `count` (default: avg) |

**Response:**
```json
{
  "channel": {
    "idSensorChannel": "uuid",
    "metricCode": "temperature",
    "unit": "°C"
  },
  "interval": "1h",
  "aggregation": "avg",
  "data": [
    {
      "timestamp": "2025-02-10T00:00:00Z",
      "value": 24.5,
      "count": 12
    },
    {
      "timestamp": "2025-02-10T01:00:00Z",
      "value": 24.8,
      "count": 12
    }
  ],
  "statistics": {
    "min": 22.1,
    "max": 28.5,
    "avg": 25.2,
    "count": 288
  },
  "meta": {
    "queryTimeMs": 120,
    "dateRange": {
      "start": "2025-02-10T00:00:00Z",
      "end": "2025-02-10T23:59:59Z"
    }
  }
}
```

---

### 8. Alerts

#### `GET /external-api/v1/alerts`
Mendapatkan daftar alert events.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | uuid | No | Filter by project |
| `nodeId` | uuid | No | Filter by node |
| `severity` | string | No | Filter: `info`, `warning`, `critical` |
| `status` | string | No | Filter: `active`, `acknowledged`, `resolved` |
| `startDate` | ISO8601 | No | Start date range |
| `endDate` | ISO8601 | No | End date range |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "data": [
    {
      "idAlertEvent": "uuid",
      "alertType": "threshold_exceeded",
      "severity": "warning",
      "status": "active",
      "message": "Temperature exceeded maximum threshold (50°C)",
      "triggeredAt": "2025-02-10T10:30:00Z",
      "acknowledgedAt": null,
      "resolvedAt": null,
      "channel": {
        "idSensorChannel": "uuid",
        "metricCode": "temperature"
      },
      "node": {
        "idNode": "uuid",
        "code": "NODE-001",
        "name": "Gateway Gedung A"
      },
      "triggerValue": 52.3,
      "thresholdValue": 50
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

## 📁 Export Data

### `GET /external-api/v1/export/sensor-data`
Export data dalam format CSV atau JSON (untuk data besar).

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | string | No | Export format: `csv`, `json` (default: json) |
| `projectId` | uuid | No | Filter by project |
| `nodeId` | uuid | No | Filter by node |
| `channelId` | uuid | No | Filter by channel |
| `startDate` | ISO8601 | **Yes** | Start date range |
| `endDate` | ISO8601 | **Yes** | End date range (max 30 days) |

**Response (CSV):**
```csv
timestamp,node_code,sensor_code,metric_code,value,unit,quality_flag
2025-02-10T10:30:00Z,NODE-001,TEMP-01,temperature,25.5,°C,good
2025-02-10T10:35:00Z,NODE-001,TEMP-01,temperature,25.6,°C,good
```

---

## ❌ Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired API key",
    "details": null
  },
  "timestamp": "2025-02-10T10:30:00Z",
  "path": "/external-api/v1/sensor-data"
}
```

### Error Codes
| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `BAD_REQUEST` | Invalid parameters |
| 401 | `UNAUTHORIZED` | Invalid/missing API key |
| 403 | `FORBIDDEN` | API key doesn't have access to this resource |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## 🗄️ Database Schema (New Tables)

### Table: `tenant_api_keys`

> ⚠️ **Security**: API Key TIDAK disimpan dalam bentuk plain text. Hanya hash yang disimpan.
> User harus menyimpan API key saat pertama kali di-generate karena tidak bisa ditampilkan lagi.

```sql
CREATE TABLE tenant_api_keys (
  id_api_key UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  id_owner UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
  
  -- Security: HANYA simpan hash, BUKAN plain text
  api_key_hash VARCHAR(255) NOT NULL,        -- bcrypt/argon2 hash
  api_key_prefix VARCHAR(20) NOT NULL,       -- untuk display: "tnt_abc1****"
  
  label VARCHAR(255),
  description TEXT,
  rate_limit_plan VARCHAR(20) DEFAULT 'basic',  -- basic, standard, premium
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  requests_today INTEGER DEFAULT 0,
  requests_total BIGINT DEFAULT 0,
  last_request_date DATE,                    -- untuk reset requests_today
  ip_whitelist TEXT[],                       -- optional IP restriction
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk lookup cepat saat validasi API key
CREATE INDEX idx_tenant_api_keys_prefix ON tenant_api_keys(api_key_prefix);
CREATE INDEX idx_tenant_api_keys_user ON tenant_api_keys(id_user);
CREATE INDEX idx_tenant_api_keys_owner ON tenant_api_keys(id_owner);
CREATE INDEX idx_tenant_api_keys_active ON tenant_api_keys(is_active) WHERE is_active = true;
```

### Table: `tenant_api_logs` (Optional - for audit)
```sql
CREATE TABLE tenant_api_logs (
  id BIGSERIAL PRIMARY KEY,
  id_api_key UUID REFERENCES tenant_api_keys(id_api_key) ON DELETE SET NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  request_params JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_api_logs_api_key ON tenant_api_logs(id_api_key);
CREATE INDEX idx_tenant_api_logs_created ON tenant_api_logs(created_at);
-- Partition by month untuk performa (optional)
```

### API Key Security Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    API KEY SECURITY FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Generate API Key:
═════════════════
  1. Generate random key: "tnt_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  2. Hash dengan bcrypt: "$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  3. Simpan di DB:
     - api_key_hash = "$2b$12$xxxx..."
     - api_key_prefix = "tnt_a1b2****"
  4. Return plain key ke user (SEKALI INI SAJA!)
  5. User WAJIB simpan key ini

Validate API Key (setiap request):
══════════════════════════════════
  1. Request masuk dengan header: X-API-Key: tnt_a1b2c3d4...
  2. Ambil prefix: "tnt_a1b2"
  3. Query DB: SELECT * FROM tenant_api_keys WHERE api_key_prefix LIKE 'tnt_a1b2%'
  4. Untuk setiap row, bandingkan bcrypt.compare(api_key, api_key_hash)
  5. Jika cocok → authenticated ✓
  6. Jika tidak ada yang cocok → 401 Unauthorized

Regenerate (jika lupa):
═══════════════════════
  1. User request regenerate via dashboard (JWT auth)
  2. Generate key baru
  3. Update hash dan prefix di DB (key lama otomatis invalid)
  4. Return key baru (SEKALI INI SAJA!)
```

---

## 📂 Module Structure

```
src/
  modules/
    external-api/
      external-api.module.ts
      guards/
        api-key.guard.ts
      decorators/
        api-key.decorator.ts
        tenant.decorator.ts
      dto/
        common.dto.ts
        query.dto.ts
        response.dto.ts
      entities/
        tenant-api-key.entity.ts
        tenant-api-log.entity.ts
      controllers/
        info.controller.ts
        projects.controller.ts
        nodes.controller.ts
        sensors.controller.ts
        sensor-data.controller.ts
        alerts.controller.ts
        export.controller.ts
      services/
        api-key.service.ts
        external-projects.service.ts
        external-nodes.service.ts
        external-sensors.service.ts
        external-sensor-data.service.ts
        external-alerts.service.ts
        export.service.ts
```

---

## 🔧 Configuration

### Environment Variables
```env
# External API Configuration
EXTERNAL_API_ENABLED=true
EXTERNAL_API_KEY_PREFIX=tnt_
EXTERNAL_API_KEY_SECRET=your-secret-key-here
EXTERNAL_API_DEFAULT_RATE_LIMIT=60
EXTERNAL_API_MAX_DATE_RANGE_DAYS=7
EXTERNAL_API_MAX_EXPORT_DAYS=30
```

---

## 📚 Swagger Documentation (Terpisah)

### Dual Swagger Setup

| Swagger | URL | Audience | Auth |
|---------|-----|----------|------|
| Internal API | `/api/docs` | Tim Internal | JWT Bearer Token |
| **External API** | `/external-api/docs` | **Tenant/Customer** | **API Key** |

### External Swagger Features
- Dokumentasi khusus untuk endpoint `/external-api/v1/*`
- Contoh request/response yang jelas
- "Try it out" dengan API Key authentication
- Tidak expose endpoint internal

### Swagger UI Preview
```
┌─────────────────────────────────────────────────────────┐
│  🌐 Tenant External API Documentation                   │
│  Version: 1.0.0                                         │
├─────────────────────────────────────────────────────────┤
│  🔐 Authorize [X-API-Key] ─────────────────────────────│
├─────────────────────────────────────────────────────────┤
│  📁 Info                                                │
│     GET /external-api/v1/info                          │
│                                                         │
│  📁 Projects                                            │
│     GET /external-api/v1/projects                      │
│                                                         │
│  📁 Nodes                                               │
│     GET /external-api/v1/nodes                         │
│     GET /external-api/v1/nodes/{nodeId}                │
│                                                         │
│  📁 Sensors                                             │
│     GET /external-api/v1/sensors                       │
│                                                         │
│  📁 Sensor Data ⭐                                      │
│     GET /external-api/v1/sensor-data                   │
│     GET /external-api/v1/sensor-data/latest            │
│     GET /external-api/v1/sensor-data/aggregated        │
│                                                         │
│  📁 Alerts                                              │
│     GET /external-api/v1/alerts                        │
│                                                         │
│  📁 Export                                              │
│     GET /external-api/v1/export/sensor-data            │
└─────────────────────────────────────────────────────────┘
```

### Implementation in main.ts
```typescript
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ExternalApiModule } from './modules/external-api/external-api.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ... existing setup ...

  // ============================================
  // SWAGGER 1: Internal API (existing)
  // ============================================
  const internalConfig = new DocumentBuilder()
    .setTitle('IoT Monitoring System API')
    .setDescription('Internal API for IoT Platform management')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Owners', 'Owner management')
    .addTag('Projects', 'Project management')
    .addTag('Nodes', 'Node management')
    .addTag('Sensors', 'Sensor configuration')
    // ... other tags
    .build();
  
  const internalDocument = SwaggerModule.createDocument(app, internalConfig, {
    include: [
      // List all INTERNAL modules here (exclude ExternalApiModule)
      AuthModule,
      OwnersModule,
      ProjectsModule,
      NodesModule,
      SensorsModule,
      // ... etc
    ],
  });
  SwaggerModule.setup('api', app, internalDocument);

  // ============================================
  // SWAGGER 2: External API (NEW - untuk Tenant)
  // ============================================
  const externalConfig = new DocumentBuilder()
    .setTitle('Tenant External API')
    .setDescription(
      'REST API untuk tenant/customer mengakses data sensor IoT mereka. ' +
      'Gunakan API Key untuk authentication.'
    )
    .setVersion('1.0.0')
    .addApiKey(
      { 
        type: 'apiKey', 
        name: 'X-API-Key', 
        in: 'header',
        description: 'API Key untuk authentication. Format: tnt_xxxxxxxx'
      },
      'X-API-Key'
    )
    .addTag('Info', 'Tenant information and API key status')
    .addTag('Projects', 'List projects owned by tenant')
    .addTag('Nodes', 'List and detail nodes/devices')
    .addTag('Sensors', 'List sensors and channels')
    .addTag('Sensor Data', 'Query telemetry data - Main Feature ⭐')
    .addTag('Alerts', 'Alert events')
    .addTag('Export', 'Export data to CSV/JSON')
    .build();

  const externalDocument = SwaggerModule.createDocument(app, externalConfig, {
    include: [ExternalApiModule],  // HANYA module external
  });
  SwaggerModule.setup('external-api/docs', app, externalDocument);

  // ... rest of bootstrap
}
```

### Swagger URLs
| Environment | Internal Swagger | External Swagger |
|-------------|------------------|------------------|
| Development | `http://localhost:3000/api` | `http://localhost:3000/external-api/docs` |
| Production | `https://api.domain.com/api` | `https://api.domain.com/external-api/docs` |

---

## 📝 Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `tenant_api_keys` table migration
- [ ] Create `TenantApiKey` entity
- [ ] Create `ApiKeyGuard` for authentication
- [ ] Create `ExternalApiModule`

### Phase 2: Basic Endpoints
- [ ] `GET /info` - Tenant info
- [ ] `GET /projects` - List projects
- [ ] `GET /nodes` - List nodes
- [ ] `GET /nodes/:id` - Node detail
- [ ] `GET /sensors` - List sensors

### Phase 3: Sensor Data Endpoints
- [ ] `GET /sensor-data` - Query telemetry
- [ ] `GET /sensor-data/latest` - Latest values
- [ ] `GET /sensor-data/aggregated` - Aggregated data

### Phase 4: Additional Features
- [ ] `GET /alerts` - Alert events
- [ ] `GET /export/sensor-data` - Export data
- [ ] Rate limiting middleware
- [ ] API logging (optional)

### Phase 5: Admin Management
- [ ] Endpoint generate API key
- [ ] Endpoint revoke API key
- [ ] Endpoint list API keys

---

## 🔑 API Key Management

### Cara Mendapatkan API Key

Ada 2 cara untuk mendapatkan API Key:

#### Opsi 1: Admin Generate (Internal)
Admin internal generate API key untuk tenant melalui endpoint internal.

#### Opsi 2: Self-Service (Tenant Dashboard)
Tenant login ke dashboard (JWT auth), lalu generate API key sendiri.

---

### Management Endpoints (Internal API - JWT Auth)

Endpoint ini ada di **Internal Swagger** (`/api`), bukan di External API.
Hanya bisa diakses oleh user yang sudah login (JWT Bearer Token).

#### 1. Generate New API Key

```http
POST /api/tenant-api-keys
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "label": "Production API Key",
  "expiresInDays": 365,
  "rateLimitPlan": "standard",
  "ipWhitelist": ["103.xxx.xxx.xxx", "192.168.1.0/24"]  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "API Key generated successfully",
  "data": {
    "idApiKey": "uuid",
    "apiKey": "tnt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",  // HANYA DITAMPILKAN SEKALI!
    "label": "Production API Key",
    "rateLimitPlan": "standard",
    "expiresAt": "2027-02-10T00:00:00Z",
    "createdAt": "2026-02-10T10:30:00Z"
  },
  "warning": "Simpan API Key ini! Tidak akan ditampilkan lagi."
}
```

> ⚠️ **PENTING**: API Key hanya ditampilkan **SEKALI** saat generate. Setelah itu hanya disimpan hash-nya di database.

---

#### 2. List My API Keys

```http
GET /api/tenant-api-keys
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "data": [
    {
      "idApiKey": "uuid",
      "label": "Production API Key",
      "apiKeyPrefix": "tnt_xxxx****",  // masked
      "rateLimitPlan": "standard",
      "isActive": true,
      "expiresAt": "2027-02-10T00:00:00Z",
      "lastUsedAt": "2026-02-10T09:15:00Z",
      "requestsToday": 150,
      "requestsTotal": 5420,
      "createdAt": "2026-02-10T10:30:00Z"
    },
    {
      "idApiKey": "uuid2",
      "label": "Development API Key",
      "apiKeyPrefix": "tnt_yyyy****",
      "rateLimitPlan": "basic",
      "isActive": true,
      "expiresAt": "2026-05-10T00:00:00Z",
      "lastUsedAt": "2026-02-09T14:20:00Z",
      "requestsToday": 45,
      "requestsTotal": 1230,
      "createdAt": "2026-01-15T08:00:00Z"
    }
  ],
  "total": 2
}
```

---

#### 3. Get API Key Detail

```http
GET /api/tenant-api-keys/:idApiKey
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "idApiKey": "uuid",
  "label": "Production API Key",
  "apiKeyPrefix": "tnt_xxxx****",
  "rateLimitPlan": "standard",
  "isActive": true,
  "expiresAt": "2027-02-10T00:00:00Z",
  "lastUsedAt": "2026-02-10T09:15:00Z",
  "requestsToday": 150,
  "requestsTotal": 5420,
  "ipWhitelist": ["103.xxx.xxx.xxx"],
  "createdAt": "2026-02-10T10:30:00Z",
  "updatedAt": "2026-02-10T10:30:00Z"
}
```

---

#### 4. Update API Key

```http
PATCH /api/tenant-api-keys/:idApiKey
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "label": "Production API Key - Updated",
  "isActive": true,
  "ipWhitelist": ["103.xxx.xxx.xxx", "110.xxx.xxx.xxx"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "API Key updated successfully",
  "data": {
    "idApiKey": "uuid",
    "label": "Production API Key - Updated",
    "isActive": true,
    "ipWhitelist": ["103.xxx.xxx.xxx", "110.xxx.xxx.xxx"],
    "updatedAt": "2026-02-10T11:00:00Z"
  }
}
```

---

#### 5. Revoke/Delete API Key

```http
DELETE /api/tenant-api-keys/:idApiKey
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "message": "API Key revoked successfully"
}
```

---

#### 6. Regenerate API Key (Get New Key)

Jika tenant lupa atau API key compromised, bisa regenerate (key lama akan di-revoke).

```http
POST /api/tenant-api-keys/:idApiKey/regenerate
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "message": "API Key regenerated successfully",
  "data": {
    "idApiKey": "uuid",
    "apiKey": "tnt_newapikeyyyyyyyyyyyyyyyyyyyyy",  // NEW KEY
    "label": "Production API Key",
    "expiresAt": "2027-02-10T00:00:00Z"
  },
  "warning": "API Key lama sudah tidak valid. Simpan key baru ini!"
}
```

---

### Admin-Only Endpoints (Role: Admin)

Endpoint khusus untuk Admin mengelola API key semua tenant.

#### List All API Keys (Admin)

```http
GET /api/admin/tenant-api-keys
Authorization: Bearer {admin_jwt_token}
```

Query params: `ownerId`, `userId`, `isActive`, `page`, `limit`

#### Generate API Key for Specific User (Admin)

```http
POST /api/admin/tenant-api-keys
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json

{
  "userId": "uuid-of-tenant-user",
  "label": "API Key for Tenant XYZ",
  "expiresInDays": 365,
  "rateLimitPlan": "premium"
}
```

#### Revoke Any API Key (Admin)

```http
DELETE /api/admin/tenant-api-keys/:idApiKey
Authorization: Bearer {admin_jwt_token}
```

---

### Flow Diagram: Mendapatkan API Key

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLOW MENDAPATKAN API KEY                     │
└─────────────────────────────────────────────────────────────────┘

Opsi 1: Self-Service (Tenant)
═══════════════════════════════
                                          
  ┌──────────┐    Login     ┌──────────┐    Generate    ┌──────────┐
  │  Tenant  │ ──────────▶  │ Dashboard │ ────────────▶  │ API Key  │
  │  User    │   (JWT)      │  /login   │    POST        │ Created  │
  └──────────┘              └──────────┘  /tenant-api-   └──────────┘
                                            keys              │
                                                              ▼
                                                    ┌──────────────────┐
                                                    │ tnt_xxxxxxxxxxxx │
                                                    │ (simpan baik²!)  │
                                                    └──────────────────┘

Opsi 2: Admin Generate
═══════════════════════
                                          
  ┌──────────┐   Request    ┌──────────┐   Generate     ┌──────────┐
  │  Tenant  │ ──────────▶  │  Admin   │ ────────────▶  │ API Key  │
  │          │   via email  │          │  POST /admin   │ Created  │
  └──────────┘   /ticket    └──────────┘  /tenant-api-  └──────────┘
                                            keys              │
                                                              ▼
                                                    ┌──────────────────┐
                                                    │ Admin kirim key  │
                                                    │ ke tenant secara │
                                                    │ secure           │
                                                    └──────────────────┘


Menggunakan API Key:
════════════════════

  ┌──────────┐                           ┌─────────────────────────┐
  │  Tenant  │   GET /external-api/v1/   │   IoT Platform          │
  │  System  │ ─────────────────────────▶│                         │
  │          │   X-API-Key: tnt_xxx      │   ✓ Validate API Key    │
  └──────────┘                           │   ✓ Check rate limit    │
       ▲                                 │   ✓ Scope by id_owner   │
       │                                 │   ✓ Return data         │
       │      { sensor data... }         │                         │
       └─────────────────────────────────│                         │
                                         └─────────────────────────┘
```

---

## 📖 Usage Example (Client Side)

### cURL
```bash
# Get latest sensor data
curl -X GET "https://api.yourdomain.com/external-api/v1/sensor-data/latest?nodeId=xxx" \
  -H "X-API-Key: tnt_xxxxxxxxxxxxxxxx"

# Get historical data
curl -X GET "https://api.yourdomain.com/external-api/v1/sensor-data?startDate=2025-02-01T00:00:00Z&endDate=2025-02-07T23:59:59Z" \
  -H "X-API-Key: tnt_xxxxxxxxxxxxxxxx"
```

### JavaScript/Node.js
```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.yourdomain.com/external-api/v1',
  headers: {
    'X-API-Key': 'tnt_xxxxxxxxxxxxxxxx'
  }
});

// Get latest values
const latest = await client.get('/sensor-data/latest');

// Get historical data
const history = await client.get('/sensor-data', {
  params: {
    nodeId: 'xxx',
    startDate: '2025-02-01T00:00:00Z',
    endDate: '2025-02-07T23:59:59Z'
  }
});
```

### Python
```python
import requests

API_KEY = 'tnt_xxxxxxxxxxxxxxxx'
BASE_URL = 'https://api.yourdomain.com/external-api/v1'

headers = {'X-API-Key': API_KEY}

# Get latest values
response = requests.get(f'{BASE_URL}/sensor-data/latest', headers=headers)
data = response.json()

# Get historical data
params = {
    'nodeId': 'xxx',
    'startDate': '2025-02-01T00:00:00Z',
    'endDate': '2025-02-07T23:59:59Z'
}
response = requests.get(f'{BASE_URL}/sensor-data', headers=headers, params=params)
```

---

## 🔒 Security Considerations

1. **API Key Storage**: Hash API key sebelum disimpan (bcrypt)
2. **HTTPS Only**: Enforce HTTPS untuk semua request
3. **Rate Limiting**: Prevent abuse dengan rate limit per tenant
4. **IP Whitelist**: Optional - tenant bisa set IP yang diizinkan
5. **Audit Logging**: Log semua request untuk monitoring
6. **Data Scoping**: Semua query HARUS filter by `id_owner`
7. **Expiration**: API key punya masa berlaku (1 tahun default)

---

## 📞 Support

Untuk bantuan teknis atau pertanyaan tentang API:
- Email: support@yourdomain.com
- Documentation: https://docs.yourdomain.com/external-api

---

*Dokumentasi ini dibuat: 10 Februari 2026*
*Versi: 1.0.0*
