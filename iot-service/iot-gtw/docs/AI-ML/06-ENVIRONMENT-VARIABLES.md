# Environment Variables: ML Module Configuration

**Date:** 2026-02-27  
**Status:** 📋 Design Phase  
**Version:** 1.0

---

## 1. Overview

This document lists all environment variables required for the ML module in both `iot-gtw` and `iot-backend`.

---

## 1.1 OpenSearch Server Details

> **✅ OpenSearch sudah di-proxy dengan domain dan valid SSL**

| Property | Value |
|----------|-------|
| **Public URL** | `https://iot-open-api.demo.vm.devetek.com` |
| **Internal IP** | `10.0.15.69` |
| **HTTP Port** | `9200` |
| **Dashboard Port** | `5601` |
| **Protocol** | `HTTPS` (valid SSL via reverse proxy) |
| **Auth** | Basic Auth (Security plugin enabled) |
| **Username** | `admin` |
| **Password** | `Dev3tek#Helios2026!` |
| **Version** | `2.19.4` |
| **Mode** | Single-node production-lite |
| **Cluster Name** | `opensearch` |
| **Node Name** | `opensearch` |

**VM Specs:**
| Resource | Value |
|----------|-------|
| OS | Debian 12 |
| CPU | 6 cores |
| RAM | 6 GB |
| Disk | 100 GB SSD |
| Heap Size | 2g (Xms/Xmx) |
| GC | G1GC |
| Swap | Disabled |
| Timezone | Asia/Jakarta |

**Test Connection:**
```bash
# Test via public domain (recommended)
curl -u admin:'Dev3tek#Helios2026!' https://iot-open-api.demo.vm.devetek.com

# Test via internal IP (from same network)
curl -k -u admin:'Dev3tek#Helios2026!' https://10.0.15.69:9200
```

---

## 2. iot-gtw Environment Variables

### 2.1 OpenSearch Configuration

```bash
# ===== OPENSEARCH =====
# OpenSearch connection (via reverse proxy with valid SSL)
OPENSEARCH_URL=https://iot-open-api.demo.vm.devetek.com
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Dev3tek#Helios2026!
OPENSEARCH_SSL_VERIFY=true           # valid SSL, bisa verify

# Index settings
OPENSEARCH_INDEX_PREFIX=sensor-telemetry-10min-
OPENSEARCH_ANOMALY_INDEX_PREFIX=anomaly-results-
OPENSEARCH_SHARDS=2
OPENSEARCH_REPLICAS=0                # single-node, no replicas
```

### 2.2 ML Configuration

```bash
# ===== ML SETTINGS =====
# Anomaly detection
ML_ANOMALY_ENABLED=true
ML_ANOMALY_SENSITIVITY=0.8
ML_ANOMALY_MIN_GRADE_ALERT=severe    # mild | moderate | severe | critical

# Forecast settings
ML_FORECAST_ENABLED=true
ML_FORECAST_HORIZON_DAYS=7
ML_FORECAST_UPDATE_HOURS=12          # Update setiap 12 jam
ML_FORECAST_TRAINING_DAYS=30         # Data training 30 hari

# Dynamic baseline
ML_DEVIATION_MILD=0.20               # 20% deviation = mild
ML_DEVIATION_MODERATE=0.35           # 35% = moderate  
ML_DEVIATION_SEVERE=0.50             # 50% = severe
ML_DEVIATION_CRITICAL=0.80           # 80% = critical
```

### 2.3 Sync Configuration

```bash
# ===== SYNC SETTINGS =====
# ClickHouse → OpenSearch sync
SYNC_ENABLED=true
SYNC_INTERVAL_MINUTES=10
SYNC_BATCH_SIZE=1000
SYNC_RETRY_ATTEMPTS=3
SYNC_RETRY_DELAY_MS=5000
```

### 2.4 ClickHouse Configuration (Existing)

```bash
# ===== CLICKHOUSE =====
CLICKHOUSE_URL=http://109.105.194.174:8123
CLICKHOUSE_USER=iot_ingest
CLICKHOUSE_PASSWORD=<secret>
CLICKHOUSE_DATABASE=iot
```

### 2.5 PostgreSQL Configuration (Existing)

```bash
# ===== POSTGRESQL =====
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=<secret>
DATABASE_NAME=iot_db
```

### 2.6 Scheduler Configuration

```bash
# ===== SCHEDULER =====
# Enable/disable specific jobs
JOB_SYNC_ENABLED=true
JOB_ANOMALY_POLL_ENABLED=true
JOB_FORECAST_ENABLED=true
JOB_CLEANUP_ENABLED=true

# Cron expressions (optional override)
JOB_SYNC_CRON=*/10 * * * *           # Every 10 minutes
JOB_ANOMALY_POLL_CRON=2,12,22,32,42,52 * * * *  # Offset by 2 min
JOB_FORECAST_CRON=0 0,12 * * *       # 00:00 and 12:00 UTC
JOB_CLEANUP_CRON=0 1 * * *           # 01:00 UTC daily
```

---

## 3. iot-backend Environment Variables

### 3.1 SMTP Configuration

```bash
# ===== SMTP (Email) =====
# Development (Mailtrap)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=415ec201e9cc83
SMTP_PASS=<secret>
SMTP_FROM="IoT PDAM <notifications@iot.pdam.id>"

# Production (SendGrid example)
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=apikey
# SMTP_PASS=<sendgrid_api_key>
# SMTP_FROM="IoT PDAM <notifications@iot.pdam.id>"
```

### 3.2 Notification Configuration

```bash
# ===== NOTIFICATIONS =====
NOTIFICATION_ENABLED=true
NOTIFICATION_EMAIL_ENABLED=true
NOTIFICATION_TELEGRAM_ENABLED=false
NOTIFICATION_SMS_ENABLED=false

# Rate limiting (per recipient per hour)
NOTIFICATION_RATE_LIMIT=10

# Quiet hours (no non-critical notifications)
NOTIFICATION_QUIET_START=22:00       # 10 PM
NOTIFICATION_QUIET_END=07:00         # 7 AM
NOTIFICATION_QUIET_BYPASS_CRITICAL=true
```

### 3.3 Alert Configuration

```bash
# ===== ALERTS =====
ALERT_SUPPRESSION_MINUTES=30         # Same alert type suppression window
ALERT_AUTO_CLEAR_HOURS=24            # Auto-clear stale alerts
ALERT_ESCALATION_ENABLED=false
```

### 3.4 Dashboard/API Configuration

```bash
# ===== API =====
API_BASE_URL=https://api.iot.pdam.id
DASHBOARD_URL=https://dashboard.iot.pdam.id

# CORS
CORS_ORIGINS=https://dashboard.iot.pdam.id,http://localhost:4200
```

---

## 4. Complete .env.example Files

### 4.1 iot-gtw/.env.example

```bash
# =============================================================================
# IOT-GTW ENVIRONMENT VARIABLES
# =============================================================================

# ----- NODE -----
NODE_ENV=development
PORT=3001

# ----- POSTGRESQL -----
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password_here
DATABASE_NAME=iot_db
DATABASE_SYNC=false
DATABASE_LOGGING=true

# ----- CLICKHOUSE -----
CLICKHOUSE_URL=http://109.105.194.174:8123
CLICKHOUSE_USER=iot_ingest
CLICKHOUSE_PASSWORD=your_password_here
CLICKHOUSE_DATABASE=iot

# ----- OPENSEARCH -----
# HTTPS via reverse proxy (valid SSL)
OPENSEARCH_URL=https://iot-open-api.demo.vm.devetek.com
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Dev3tek#Helios2026!
OPENSEARCH_SSL_VERIFY=true
OPENSEARCH_INDEX_PREFIX=sensor-telemetry-10min-
OPENSEARCH_ANOMALY_INDEX_PREFIX=anomaly-results-
OPENSEARCH_SHARDS=2
OPENSEARCH_REPLICAS=0

# ----- ML SETTINGS -----
ML_ANOMALY_ENABLED=true
ML_ANOMALY_SENSITIVITY=0.8
ML_ANOMALY_MIN_GRADE_ALERT=severe
ML_FORECAST_ENABLED=true
ML_FORECAST_HORIZON_DAYS=7
ML_FORECAST_UPDATE_HOURS=12
ML_FORECAST_TRAINING_DAYS=30
ML_DEVIATION_MILD=0.20
ML_DEVIATION_MODERATE=0.35
ML_DEVIATION_SEVERE=0.50
ML_DEVIATION_CRITICAL=0.80

# ----- SYNC SETTINGS -----
SYNC_ENABLED=true
SYNC_INTERVAL_MINUTES=10
SYNC_BATCH_SIZE=1000
SYNC_RETRY_ATTEMPTS=3
SYNC_RETRY_DELAY_MS=5000

# ----- SCHEDULER -----
JOB_SYNC_ENABLED=true
JOB_ANOMALY_POLL_ENABLED=true
JOB_FORECAST_ENABLED=true
JOB_CLEANUP_ENABLED=true

# ----- MQTT (Existing) -----
MQTT_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# ----- TELTONIKA (Existing) -----
TELTONIKA_TCP_PORT=5027
TELTONIKA_UDP_PORT=5028
```

### 4.2 iot-backend/.env.example

```bash
# =============================================================================
# IOT-BACKEND ENVIRONMENT VARIABLES
# =============================================================================

# ----- NODE -----
NODE_ENV=development
PORT=3000

# ----- POSTGRESQL -----
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password_here
DATABASE_NAME=iot_db
DATABASE_SYNC=false
DATABASE_LOGGING=true

# ----- JWT (Existing) -----
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# ----- SMTP -----
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=415ec201e9cc83
SMTP_PASS=your_smtp_password_here
SMTP_FROM="IoT PDAM <notifications@iot.pdam.id>"

# ----- NOTIFICATIONS -----
NOTIFICATION_ENABLED=true
NOTIFICATION_EMAIL_ENABLED=true
NOTIFICATION_TELEGRAM_ENABLED=false
NOTIFICATION_SMS_ENABLED=false
NOTIFICATION_RATE_LIMIT=10
NOTIFICATION_QUIET_START=22:00
NOTIFICATION_QUIET_END=07:00
NOTIFICATION_QUIET_BYPASS_CRITICAL=true

# ----- ALERTS -----
ALERT_SUPPRESSION_MINUTES=30
ALERT_AUTO_CLEAR_HOURS=24
ALERT_ESCALATION_ENABLED=false

# ----- API -----
API_BASE_URL=https://api.iot.pdam.id
DASHBOARD_URL=https://dashboard.iot.pdam.id
CORS_ORIGINS=https://dashboard.iot.pdam.id,http://localhost:4200

# ----- CLICKHOUSE (Read-only for API queries) -----
CLICKHOUSE_URL=http://109.105.194.174:8123
CLICKHOUSE_USER=iot_ingest
CLICKHOUSE_PASSWORD=your_password_here
CLICKHOUSE_DATABASE=iot
```

---

## 5. Configuration Module (NestJS)

### 5.1 ml.config.ts (iot-gtw)

```typescript
// src/config/ml.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('ml', () => ({
  opensearch: {
    url: process.env.OPENSEARCH_URL || 'https://localhost:9200',
    user: process.env.OPENSEARCH_USER || 'admin',
    password: process.env.OPENSEARCH_PASSWORD || '',
    sslVerify: process.env.OPENSEARCH_SSL_VERIFY === 'true',
    indexPrefix: process.env.OPENSEARCH_INDEX_PREFIX || 'sensor-telemetry-10min-',
    anomalyIndexPrefix: process.env.OPENSEARCH_ANOMALY_INDEX_PREFIX || 'anomaly-results-',
    shards: parseInt(process.env.OPENSEARCH_SHARDS || '2', 10),
    replicas: parseInt(process.env.OPENSEARCH_REPLICAS || '0', 10),
  },
  anomaly: {
    enabled: process.env.ML_ANOMALY_ENABLED !== 'false',
    sensitivity: parseFloat(process.env.ML_ANOMALY_SENSITIVITY || '0.8'),
    minGradeAlert: process.env.ML_ANOMALY_MIN_GRADE_ALERT || 'severe',
  },
  forecast: {
    enabled: process.env.ML_FORECAST_ENABLED !== 'false',
    horizonDays: parseInt(process.env.ML_FORECAST_HORIZON_DAYS || '7', 10),
    updateHours: parseInt(process.env.ML_FORECAST_UPDATE_HOURS || '12', 10),
    trainingDays: parseInt(process.env.ML_FORECAST_TRAINING_DAYS || '30', 10),
  },
  deviation: {
    mild: parseFloat(process.env.ML_DEVIATION_MILD || '0.20'),
    moderate: parseFloat(process.env.ML_DEVIATION_MODERATE || '0.35'),
    severe: parseFloat(process.env.ML_DEVIATION_SEVERE || '0.50'),
    critical: parseFloat(process.env.ML_DEVIATION_CRITICAL || '0.80'),
  },
  sync: {
    enabled: process.env.SYNC_ENABLED !== 'false',
    intervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '10', 10),
    batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '1000', 10),
    retryAttempts: parseInt(process.env.SYNC_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.SYNC_RETRY_DELAY_MS || '5000', 10),
  },
  jobs: {
    sync: {
      enabled: process.env.JOB_SYNC_ENABLED !== 'false',
      cron: process.env.JOB_SYNC_CRON || '*/10 * * * *',
    },
    anomalyPoll: {
      enabled: process.env.JOB_ANOMALY_POLL_ENABLED !== 'false',
      cron: process.env.JOB_ANOMALY_POLL_CRON || '2,12,22,32,42,52 * * * *',
    },
    forecast: {
      enabled: process.env.JOB_FORECAST_ENABLED !== 'false',
      cron: process.env.JOB_FORECAST_CRON || '0 0,12 * * *',
    },
    cleanup: {
      enabled: process.env.JOB_CLEANUP_ENABLED !== 'false',
      cron: process.env.JOB_CLEANUP_CRON || '0 1 * * *',
    },
  },
}));
```

### 5.2 email.config.ts (iot-backend)

```typescript
// src/config/email.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'noreply@localhost',
  },
  notification: {
    enabled: process.env.NOTIFICATION_ENABLED !== 'false',
    emailEnabled: process.env.NOTIFICATION_EMAIL_ENABLED !== 'false',
    telegramEnabled: process.env.NOTIFICATION_TELEGRAM_ENABLED === 'true',
    smsEnabled: process.env.NOTIFICATION_SMS_ENABLED === 'true',
    rateLimit: parseInt(process.env.NOTIFICATION_RATE_LIMIT || '10', 10),
    quietStart: process.env.NOTIFICATION_QUIET_START || '22:00',
    quietEnd: process.env.NOTIFICATION_QUIET_END || '07:00',
    quietBypassCritical: process.env.NOTIFICATION_QUIET_BYPASS_CRITICAL !== 'false',
  },
  alert: {
    suppressionMinutes: parseInt(process.env.ALERT_SUPPRESSION_MINUTES || '30', 10),
    autoClearHours: parseInt(process.env.ALERT_AUTO_CLEAR_HOURS || '24', 10),
    escalationEnabled: process.env.ALERT_ESCALATION_ENABLED === 'true',
  },
}));
```

---

## 6. Validation

### 6.1 Required vs Optional

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `OPENSEARCH_URL` | ✅ | - | Must be set |
| `OPENSEARCH_USER` | ✅ | - | Must be set |
| `OPENSEARCH_PASSWORD` | ✅ | - | Must be set |
| `SMTP_HOST` | ✅ | - | For email notifications |
| `SMTP_USER` | ✅ | - | For email notifications |
| `SMTP_PASS` | ✅ | - | For email notifications |
| `ML_ANOMALY_ENABLED` | ❌ | `true` | Optional |
| `ML_FORECAST_ENABLED` | ❌ | `true` | Optional |
| `SYNC_ENABLED` | ❌ | `true` | Optional |
| `JOB_*_ENABLED` | ❌ | `true` | Optional |

### 6.2 Environment Check on Startup

```typescript
// src/main.ts
function validateEnv() {
  const required = [
    'DATABASE_HOST',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'CLICKHOUSE_URL',
    'CLICKHOUSE_USER',
    'CLICKHOUSE_PASSWORD',
    'OPENSEARCH_URL',
    'OPENSEARCH_USER',
    'OPENSEARCH_PASSWORD',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    process.exit(1);
  }
}

validateEnv();
```

---

## 7. Secrets Management

### 7.1 Development

```bash
# Store in .env files (gitignored)
cp .env.example .env
# Edit .env with actual values
```

### 7.2 Production Recommendations

| Option | Description |
|--------|-------------|
| **PM2 Ecosystem** | Set env in ecosystem.config.js |
| **Docker Secrets** | Use Docker secrets for sensitive values |
| **Vault** | HashiCorp Vault for enterprise |
| **AWS SSM** | AWS Systems Manager Parameter Store |
| **Doppler** | SaaS secrets management |

### 7.3 PM2 Ecosystem Example

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'iot-gtw',
    script: 'dist/main.js',
    env_production: {
      NODE_ENV: 'production',
      OPENSEARCH_URL: 'https://opensearch.internal:9200',
      OPENSEARCH_USER: 'admin',
      OPENSEARCH_PASSWORD: '${OPENSEARCH_PASSWORD}', // From env
      // ... other vars
    }
  }]
};
```

---

## 8. Related Documents

- [03-SERVICE-ARCHITECTURE.md](03-SERVICE-ARCHITECTURE.md) - Service structure
- [07-SCHEDULER-CONFIG.md](07-SCHEDULER-CONFIG.md) - Scheduler details
- [09-ERROR-HANDLING.md](09-ERROR-HANDLING.md) - Error handling

---

**Next:** Scheduler Jobs Configuration
