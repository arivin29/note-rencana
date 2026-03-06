# Tenant External API - Quick Reference

## � Swagger Documentation

| Swagger | URL | Untuk |
|---------|-----|-------|
| Internal | `/api` | Tim Internal (JWT Auth) |
| **External** | `/external-api/docs` | **Tenant (API Key)** |

---

## �🔑 Authentication
```http
X-API-Key: tnt_xxxxxxxxxxxxxxxx
```

## 📍 Base URL
```
/external-api/v1
```

---

## 📋 Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/info` | Info tenant & API key status |
| GET | `/projects` | Daftar project |
| GET | `/nodes` | Daftar node/device |
| GET | `/nodes/:id` | Detail node + sensors |
| GET | `/sensors` | Daftar sensors |
| GET | `/sensor-data` | **Query telemetry data** ⭐ |
| GET | `/sensor-data/latest` | Nilai terbaru semua sensor |
| GET | `/sensor-data/aggregated` | Data agregasi (avg, min, max) |
| GET | `/alerts` | Daftar alert events |
| GET | `/export/sensor-data` | Export CSV/JSON |

---

## ⭐ Main Endpoint: Sensor Data

### Query Telemetry
```http
GET /external-api/v1/sensor-data
  ?nodeId=xxx
  &startDate=2025-02-01T00:00:00Z
  &endDate=2025-02-07T23:59:59Z
  &limit=500
```

### Latest Values
```http
GET /external-api/v1/sensor-data/latest
  ?nodeId=xxx
```

### Aggregated Data
```http
GET /external-api/v1/sensor-data/aggregated
  ?channelId=xxx
  &startDate=2025-02-01T00:00:00Z
  &endDate=2025-02-01T23:59:59Z
  &interval=1h
  &aggregation=avg
```

---

## 🔧 Common Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | uuid | Filter by project |
| `nodeId` | uuid | Filter by node |
| `sensorId` | uuid | Filter by sensor |
| `channelId` | uuid | Filter by channel |
| `startDate` | ISO8601 | Start date (required for sensor-data) |
| `endDate` | ISO8601 | End date (required for sensor-data) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page |

---

## 📊 Response Format

### Success
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 5000,
    "totalPages": 50
  },
  "meta": {
    "queryTimeMs": 45
  }
}
```

### Error
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired API key"
  },
  "timestamp": "2025-02-10T10:30:00Z",
  "path": "/external-api/v1/sensor-data"
}
```

---

## 🚦 Rate Limits

| Plan | Requests/Min | Requests/Day |
|------|--------------|--------------|
| Basic | 60 | 10,000 |
| Standard | 120 | 50,000 |
| Premium | 300 | 100,000 |

---

## 💻 Code Examples

### cURL
```bash
curl -X GET "https://api.domain.com/external-api/v1/sensor-data/latest" \
  -H "X-API-Key: tnt_xxxxxxxx"
```

### JavaScript
```javascript
const response = await fetch(
  'https://api.domain.com/external-api/v1/sensor-data/latest',
  { headers: { 'X-API-Key': 'tnt_xxxxxxxx' } }
);
const data = await response.json();
```

### Python
```python
import requests

response = requests.get(
    'https://api.domain.com/external-api/v1/sensor-data/latest',
    headers={'X-API-Key': 'tnt_xxxxxxxx'}
)
data = response.json()
```

---

**Full Documentation:** [TENANT-EXTERNAL-API.md](./TENANT-EXTERNAL-API.md)

---

## 🔑 Cara Mendapatkan API Key

### Self-Service (Tenant Login)
```http
# 1. Login dulu (dapat JWT token)
POST /api/auth/login
Content-Type: application/json
{
  "email": "tenant@example.com",
  "password": "password123"
}

# 2. Generate API Key
POST /api/tenant-api-keys
Authorization: Bearer {jwt_token}
Content-Type: application/json
{
  "label": "My API Key",
  "expiresInDays": 365
}

# Response: API Key (SIMPAN! hanya tampil sekali)
{
  "apiKey": "tnt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Management Endpoints (JWT Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tenant-api-keys` | Generate new API key |
| GET | `/api/tenant-api-keys` | List my API keys |
| GET | `/api/tenant-api-keys/:id` | Get API key detail |
| PATCH | `/api/tenant-api-keys/:id` | Update API key |
| DELETE | `/api/tenant-api-keys/:id` | Revoke API key |
| POST | `/api/tenant-api-keys/:id/regenerate` | Regenerate (new key) |

---

## 📁 Files Created

### Module Structure
```
src/modules/external-api/
├── external-api.module.ts
├── index.ts
├── controllers/
│   ├── tenant-api-keys.controller.ts  (API key management)
│   └── external-api.controller.ts     (External endpoints)
├── services/
│   ├── tenant-api-keys.service.ts
│   └── external-api.service.ts
├── guards/
│   └── api-key.guard.ts
├── decorators/
│   └── tenant.decorator.ts
├── entities/
│   ├── tenant-api-key.entity.ts
│   └── tenant-api-log.entity.ts
└── dto/
    ├── tenant-api-key.dto.ts
    └── query.dto.ts
```

### Migration Files
```
migrations/
├── 020_create_tenant_api_keys.sql
└── 020_create_tenant_api_keys_rollback.sql
```

---

## 🚀 Deployment Steps

```bash
# 1. Run migration
psql -U postgres -d your_database -f migrations/020_create_tenant_api_keys.sql

# 2. Rebuild application
npm run build

# 3. Restart server
pm2 restart iot-backend
```

---

## 📚 Swagger URLs

| Environment | Internal API | External API |
|-------------|--------------|--------------|
| Development | http://localhost:3000/api | http://localhost:3000/external-api/docs |
| Production | https://your-domain/api | https://your-domain/external-api/docs |
