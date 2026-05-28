# 📋 IoT Backend — Full Project Mapping (Migration Reference)

> **Project:** `iot-backend`  
> **Framework:** NestJS 11 (TypeScript)  
> **Database:** PostgreSQL (TypeORM) + ClickHouse (time-series analytics)  
> **Auth:** JWT (passport-jwt) + API Key (external)  
> **Messaging:** MQTT v5 (device communication)  
> **Port:** 3000 (default)  
> **Deployment:** PM2 (`ecosystem.config.js`)  

---

## 📁 Struktur Direktori

```
iot-backend/
├── src/
│   ├── main.ts                          # Entry point, Swagger setup, CORS, global pipes
│   ├── app.module.ts                    # Root module, semua imports
│   ├── app.controller.ts               # Health check endpoint
│   ├── app.service.ts                   # App service
│   │
│   ├── auth/                            # Authentication module
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts           # /auth endpoints
│   │   ├── auth.service.ts              # JWT generation, password hash
│   │   ├── jwt.strategy.ts              # Passport JWT strategy
│   │   ├── guards/jwt-auth.guard.ts     # Global JWT guard
│   │   ├── decorators/                  # @Public(), @GetUser()
│   │   ├── dto/                         # LoginDto, RegisterDto
│   │   └── entities/                    # User entity
│   │
│   ├── users/                           # User management
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │
│   ├── audit/                           # Audit logging
│   │   ├── audit.module.ts
│   │   ├── audit.controller.ts
│   │   ├── audit.service.ts
│   │   ├── entities/
│   │   ├── dto/
│   │   └── interceptors/               # Auto-audit interceptor
│   │
│   ├── notifications/                   # Notification system
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── controllers/                 # Channel controller
│   │   ├── services/                    # Email service
│   │   ├── entities/
│   │   ├── dto/
│   │   └── templates/                   # Email templates (Handlebars)
│   │
│   ├── config/
│   │   └── clickhouse.config.ts         # ClickHouse configuration
│   │
│   ├── database/
│   │   ├── data-source.ts               # TypeORM DataSource config
│   │   ├── migrations/                  # Migration files
│   │   └── seeds/                       # Seeder scripts
│   │
│   ├── common/
│   │   ├── decorators/                  # Custom decorators
│   │   ├── dto/                         # Shared DTOs (pagination, etc.)
│   │   └── interceptors/               # Response interceptors
│   │
│   ├── entities/                        # ALL TypeORM entities (38 files)
│   │   └── index.ts                     # Barrel export
│   │
│   ├── utils/
│   │   └── code-generator.util.ts       # Auto-generate codes
│   │
│   └── modules/                         # Feature modules (30 modules)
│       ├── owners/
│       ├── projects/
│       ├── nodes/
│       ├── sensors/
│       ├── sensor-channels/
│       ├── sensor-logs/
│       ├── sensor-types/
│       ├── sensor-catalogs/
│       ├── alert-rules/
│       ├── alert-events/
│       ├── dashboard/
│       ├── dashboard-widgets/
│       ├── user-dashboards/
│       ├── widget-builder/
│       ├── node-models/
│       ├── node-model-commands/
│       ├── node-profiles/
│       ├── node-locations/
│       ├── node-assignments/
│       ├── unpaired-devices/
│       ├── mqtt/
│       ├── device-commands/
│       ├── iot-logs/
│       ├── clickhouse/
│       ├── external-api/
│       ├── ml/
│       ├── report/
│       ├── search/
│       ├── scada/
│       ├── webgis/
│       └── documents/
│
├── migrations/                          # Additional migration SQL files
├── uploads/                             # Uploaded files storage
├── docs/                                # Documentation
├── test/                                # E2E tests
├── ecosystem.config.js                  # PM2 config
├── .env.example                         # Environment variables template
├── package.json                         # Dependencies
├── tsconfig.json                        # TypeScript config
└── nest-cli.json                        # NestJS CLI config
```

---

## 🔧 Konfigurasi Environment

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `PORT` | 3000 | HTTP server port |
| `NODE_ENV` | development | Environment |
| `DATABASE_URL` | - | PostgreSQL connection string (takes precedence) |
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_USERNAME` | postgres | DB username |
| `DB_PASSWORD` | postgres | DB password |
| `DB_NAME` | iot | Database name |
| `DB_SSL` | false | Enable SSL |
| `JWT_SECRET` | change_me | JWT signing secret |
| `CLICKHOUSE_ENABLED` | false | Enable ClickHouse |
| `CLICKHOUSE_HOST` | localhost | ClickHouse host |
| `CLICKHOUSE_PORT` | 8123 | ClickHouse port (HTTP) |
| `CLICKHOUSE_DATABASE` | iot | ClickHouse database |
| `CLICKHOUSE_USERNAME` | default | ClickHouse user |
| `CLICKHOUSE_PASSWORD` | - | ClickHouse password |
| `CLICKHOUSE_REQUEST_TIMEOUT` | 30000 | Request timeout (ms) |
| `MQTT_BROKER_URL` | mqtt://... | MQTT broker URL |
| `MQTT_USERNAME` | - | MQTT username |
| `MQTT_PASSWORD` | - | MQTT password |

---

## 🔐 Authentication & Authorization

### Auth Flow (JWT)
1. **Register** (`POST /api/auth/register`) — Create user, hash password (bcrypt)
2. **Login** (`POST /api/auth/login`) — Validate credentials, return `access_token`
3. **JWT Payload:** `{ sub: idUser, email, role, idOwner }`
4. **Global Guard:** Semua route dilindungi JWT kecuali yang pakai `@Public()` decorator
5. **Roles:** `admin` (full access) | `tenant` (scoped to owner)

### Auth Endpoints (`/api/auth`)
| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/auth/register` | ❌ Public | Register user baru |
| POST | `/auth/login` | ❌ Public | Login → JWT token |
| GET | `/auth/me` | ✅ | Get current user profile |
| GET | `/auth/profile` | ✅ | Alias /me |
| PATCH | `/auth/profile` | ✅ | Update profile (name, email) |
| POST | `/auth/change-password` | ✅ | Change password (old + new) |
| POST | `/auth/forgot-password` | ❌ Public | Request reset token |
| POST | `/auth/reset-password` | ❌ Public | Reset with token |
| POST | `/auth/refresh` | ✅ | Refresh token |
| POST | `/auth/logout` | ❌ Public | Logout (client clears token) |

---

## 👥 Users Management (`/api/users`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/users` | List users (admin: all, tenant: self only) |
| GET | `/users/:id` | Get user by ID |
| POST | `/users` | Create user (admin only) |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user (admin only) |
| PATCH | `/users/:id/password` | Change password |
| PATCH | `/users/:id/toggle-active` | Toggle active status (admin only) |

---

## 🏢 Owners (`/api/owners`)

Multi-tenant root entity. Setiap owner punya projects, nodes, dll.

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/owners` | Create owner |
| GET | `/owners` | List (paginated, filtered by role) |
| GET | `/owners/:id` | Get basic info |
| PATCH | `/owners/:id` | Update |
| DELETE | `/owners/:id` | Delete (admin, cascade) |
| GET | `/owners/:id/detail` | Full detail + nested relations |
| GET | `/owners/:id/projects` | List owner's projects |
| GET | `/owners/:id/nodes` | List owner's nodes |
| GET | `/owners/statistics/overview` | Aggregated stats |
| GET | `/owners/:id/dashboard` | Dashboard data |
| GET | `/owners/:id/reports/monthly` | Monthly report (year, month) |
| GET | `/owners/reports/widgets` | Widget-ready aggregated data |
| POST | `/owners/:id/webhooks` | Create webhook forwarding |
| PUT | `/owners/:id/webhooks/:webhookId` | Update webhook |
| DELETE | `/owners/:id/webhooks/:webhookId` | Delete webhook |
| POST | `/owners/:id/webhooks/:webhookId/test` | Test webhook delivery |
| POST | `/owners/:id/databases` | Create DB forwarding |
| PUT | `/owners/:id/databases/:databaseId` | Update DB forwarding |
| DELETE | `/owners/:id/databases/:databaseId` | Delete DB forwarding |
| POST | `/owners/:id/databases/:databaseId/test` | Test DB connection |

---

## 📁 Projects (`/api/projects`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/projects` | Create project |
| GET | `/projects` | List (filter: ownerId, areaType, status, search) |
| GET | `/projects/statistics/overview` | Stats by area type & status |
| GET | `/projects/:id` | Get project |
| GET | `/projects/:id/detailed` | With nodes, locations, stats |
| PATCH | `/projects/:id` | Update |
| DELETE | `/projects/:id` | Delete |

---

## 🖥️ Nodes / Devices (`/api/nodes`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/nodes` | Create node |
| GET | `/nodes` | List (filter: idProject, idNodeModel, idNodeProfile, connectivity, ownerId, search) |
| GET | `/nodes/statistics/overview` | Aggregated stats |
| GET | `/nodes/:id` | Get node |
| GET | `/nodes/:id/detailed` | With sensors & stats |
| GET | `/nodes/:id/dashboard` | Health status & sensors |
| GET | `/nodes/:id/sensors` | All sensors for node |
| PATCH | `/nodes/:id` | Update |
| PATCH | `/nodes/:id/connectivity` | Update connectivity status |
| DELETE | `/nodes/:id` | Delete |

---

## 📡 Sensors (`/api/sensors`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/sensors` | Create sensor |
| GET | `/sensors` | List (filter: idNode, idSensorCatalog, search) |
| GET | `/sensors/statistics/overview` | Stats (calibration, by catalog, by node) |
| GET | `/sensors/:id` | Get sensor |
| GET | `/sensors/:id/detailed` | With channels & calibration status |
| GET | `/sensors/:id/dashboard` | Health & channel data |
| GET | `/sensors/:id/channels` | All channels for sensor |
| PATCH | `/sensors/:id` | Update |
| DELETE | `/sensors/:id` | Delete |

---

## 📊 Sensor Channels (`/api/sensor-channels`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/sensor-channels` | Create (unique metric_code per sensor) |
| GET | `/sensor-channels` | List (filter: idSensor, idSensorType, idNode, search) |
| GET | `/sensor-channels/statistics/overview` | Stats |
| GET | `/sensor-channels/:id` | Get channel |
| GET | `/sensor-channels/:id/detailed` | With latest values & stats |
| GET | `/sensor-channels/:id/readings` | ⭐ **Time-series data** (startTime, endTime, aggregation: raw/5m/15m/1h) |
| PATCH | `/sensor-channels/:id` | Update |
| DELETE | `/sensor-channels/:id` | Delete |

---

## 📈 Sensor Logs / Telemetry (`/api/sensor-logs`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/sensor-logs` | Create single log entry |
| POST | `/sensor-logs/bulk` | ⭐ **Bulk ingestion** (batch) |
| GET | `/sensor-logs` | List with filters (channel, sensor, node, project, owner, quality, time range) |
| GET | `/sensor-logs/telemetry/trends/:nodeId` | Time-series trends for charts |
| GET | `/sensor-logs/statistics` | Aggregated stats |
| GET | `/sensor-logs/export` | ⭐ **Export CSV** (aggregation: 5m, 15m, 1h, 1d, 1M) |
| GET | `/sensor-logs/:id` | Get single log |
| DELETE | `/sensor-logs/cleanup` | Delete old logs (daysToKeep) |

---

## 🚨 Alert Rules (`/api/alert-rules`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/alert-rules` | Create rule |
| GET | `/alert-rules` | List (filter: idSensorChannel, ruleType, severity, enabled) |
| GET | `/alert-rules/:id` | Get |
| GET | `/alert-rules/:id/detailed` | With event statistics |
| PATCH | `/alert-rules/:id` | Update |
| DELETE | `/alert-rules/:id` | Delete |

---

## ⚡ Alert Events (`/api/alert-events`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/alert-events` | Create event |
| GET | `/alert-events` | List (filter: idAlertRule, status, date range, ownerId) |
| GET | `/alert-events/statistics/summary` | Stats (dateRange, ownerId) |
| GET | `/alert-events/statistics/offline-nodes` | Offline nodes summary |
| GET | `/alert-events/:id` | Get |
| PATCH | `/alert-events/:id` | Update |
| PATCH | `/alert-events/:id/acknowledge` | Acknowledge alert |
| PATCH | `/alert-events/:id/clear` | Clear alert |
| DELETE | `/alert-events/:id` | Delete |

---

## 📊 Platform Dashboard (`/api/dashboard`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/dashboard/platform-stats` | Combined owner/project/node/sensor stats |
| GET | `/dashboard/kpi-stats` | KPIs: nodes online, alerts, telemetry rate |
| GET | `/dashboard/node-health` | Top impacted nodes (battery/health) |
| GET | `/dashboard/owner-leaderboard` | Owners ranked by throughput |
| GET | `/dashboard/activity-log` | Recent system activities |
| GET | `/dashboard/telemetry-streams` | Hourly telemetry flow/pressure |
| GET | `/dashboard/delivery-health` | Webhook & DB forwarding health |
| GET | `/dashboard/alert-stream` | Latest active alerts |
| GET | `/dashboard/release-schedule` | Firmware release window |

---

## 🎨 Dashboard Widgets (`/api/dashboard-widgets`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/dashboard-widgets` | Create widget instance |
| GET | `/dashboard-widgets` | List (filter: idDashboard, widgetType) |
| GET | `/dashboard-widgets/:id` | Get |
| PATCH | `/dashboard-widgets/:id` | Update |
| DELETE | `/dashboard-widgets/:id` | Delete |

---

## 📋 User Dashboards (`/api/user-dashboards`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/user-dashboards` | Create |
| GET | `/user-dashboards` | List (filter: idUser, idProject, isPublic) |
| GET | `/user-dashboards/:id` | Get |
| GET | `/user-dashboards/:id/detailed` | With widgets |
| PATCH | `/user-dashboards/:id` | Update |
| DELETE | `/user-dashboards/:id` | Delete |

---

## 🔧 Widget Builder (`/api/widget-builder`)

Custom SQL-based widget system.

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/widget-builder/dashboards` | List dashboards for owner |
| GET | `/widget-builder/projects/:projectId/dashboards` | By project |
| GET | `/widget-builder/dashboards/:id` | Get with widgets |
| POST | `/widget-builder/dashboards` | Create dashboard |
| PUT | `/widget-builder/dashboards/:id` | Update |
| DELETE | `/widget-builder/dashboards/:id` | Delete |
| GET | `/widget-builder/dashboards/:dashboardId/widgets` | List widgets |
| GET | `/widget-builder/dashboards/:dashboardId/widgets/:widgetId` | Get widget |
| POST | `/widget-builder/dashboards/:dashboardId/widgets` | Create widget |
| PUT | `/widget-builder/dashboards/:dashboardId/widgets/:widgetId` | Update |
| PATCH | `/widget-builder/dashboards/:dashboardId/widgets/positions` | Batch reorder |
| DELETE | `/widget-builder/dashboards/:dashboardId/widgets/:widgetId` | Delete |
| GET | `/widget-builder/datasources` | Available sources (PG + ClickHouse) |
| POST | `/widget-builder/query/validate` | Validate SQL query |
| POST | `/widget-builder/query/execute` | Execute query, return results |
| GET | `/widget-builder/templates` | Query templates |
| GET | `/widget-builder/templates/:id` | Get template |

---

## 🏭 Node Models / Hardware Catalog (`/api/node-models`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/node-models` | Create hardware catalog entry |
| GET | `/node-models` | List (filter: vendor, protocol, hardwareClass) |
| GET | `/node-models/:id` | Get |
| GET | `/node-models/:id/detailed` | With nodes & usage stats |
| PATCH | `/node-models/:id` | Update |
| DELETE | `/node-models/:id` | Delete |

---

## 🎛️ Node Model Commands (`/api/node-model-commands`)

Command templates per node model (SMS, MQTT, HTTP, etc.)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/node-model-commands` | Create template |
| GET | `/node-model-commands` | List (filter: idNodeModel, channel, isActive) |
| GET | `/node-model-commands/by-node-model/:idNodeModel` | For specific model |
| GET | `/node-model-commands/:id` | Get |
| GET | `/node-model-commands/:id/detailed` | With model details |
| PATCH | `/node-model-commands/:id` | Update |
| DELETE | `/node-model-commands/:id` | Delete |

---

## 📋 Node Profiles (`/api/node-profiles`)

Payload parsing/mapping configuration per node model.

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/node-profiles` | Create |
| GET | `/node-profiles` | List (filter: idNodeModel, idProject, enabled, search) |
| GET | `/node-profiles/by-code/:code` | Find by code |
| GET | `/node-profiles/:id` | Get |
| PATCH | `/node-profiles/:id` | Update |
| DELETE | `/node-profiles/:id` | Delete |

---

## 📍 Node Locations (`/api/node-locations`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/node-locations` | Create |
| GET | `/node-locations` | List (filter: idProject, type) |
| GET | `/node-locations/:id` | Get |
| PATCH | `/node-locations/:id` | Update |
| DELETE | `/node-locations/:id` | Delete |

---

## 🔗 Node Assignments (`/api/node-assignments`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/node-assignments` | Create |
| GET | `/node-assignments` | List (filter: idNode, idProject, idOwner) |
| GET | `/node-assignments/:id` | Get |
| PATCH | `/node-assignments/:id` | Update |
| DELETE | `/node-assignments/:id` | Delete |

---

## 📱 Unpaired Devices (`/api/unpaired-devices`)

Auto-discover devices yang belum di-pair ke project.

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/unpaired-devices` | Create (hardware_id unique) |
| POST | `/unpaired-devices/register-activity` | Upsert from MQTT |
| GET | `/unpaired-devices` | List (filter: status, nodeModelId, ownerId, seenAfter/Before) |
| GET | `/unpaired-devices/stats` | Statistics |
| GET | `/unpaired-devices/by-hardware-id/:hardwareId` | Find by hardware ID |
| GET | `/unpaired-devices/:id` | Get |
| PUT | `/unpaired-devices/:id` | Update |
| POST | `/unpaired-devices/:id/pair` | ⭐ **Pair** → creates Node in project |
| POST | `/unpaired-devices/:id/ignore` | Mark as ignored |
| DELETE | `/unpaired-devices/:id` | Delete |

---

## 🏷️ Sensor Types (`/api/sensor-types`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/sensor-types` | Create |
| GET | `/sensor-types` | List |
| GET | `/sensor-types/:id` | Get |
| PATCH | `/sensor-types/:id` | Update |
| DELETE | `/sensor-types/:id` | Delete |

---

## 📚 Sensor Catalogs (`/api/sensor-catalogs`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/sensor-catalogs` | Create |
| GET | `/sensor-catalogs` | List (filter: vendor, search) |
| GET | `/sensor-catalogs/:id` | Get |
| PATCH | `/sensor-catalogs/:id` | Update |
| DELETE | `/sensor-catalogs/:id` | Delete |

---

## 📡 MQTT Service (Internal)

**No HTTP endpoints** — Internal service yang mengelola koneksi ke MQTT broker.

- `publish(topic, payload, qos)` — Publish message
- `publishDeviceCommand(deviceId, command)` — Publish ke `sensor/{deviceId}/command`
- `isClientConnected()` — Status koneksi
- `forceReconnect()` — Manual reconnect
- Auto-reconnect on disconnect

---

## 🎮 Device Commands (`/api/device-commands`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/device-commands/relay` | Send relay ON/OFF/PULSE via MQTT |
| GET | `/device-commands/status` | MQTT connection status |

---

## 📝 IoT Logs (`/api/iot-logs`)

Raw device logs (dari MQTT/gateway).

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/iot-logs/stats` | Statistics (by label, processed, owner) |
| GET | `/iot-logs` | Paginated list (filter: deviceId, ownerId, projectId, label, processed, date range) |

**Labels:** telemetry, event, pairing, error, warning, command, response, debug, info, log

---

## 🗺️ WebGIS (`/api/webgis`)

### Layers (`/webgis/layers`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/webgis/layers` | Create map layer |
| GET | `/webgis/layers` | List (filter: projectId, ownerId, layerType, categoryCode) |
| POST | `/webgis/layers/seed-core/:projectId` | Seed core layers |
| GET | `/webgis/layers/:id` | Get layer |
| GET | `/webgis/layers/:id/geojson` | ⭐ Get GeoJSON (bbox filter) |
| PATCH | `/webgis/layers/:id` | Update |
| PATCH | `/webgis/layers/:id/style` | Update style only |
| POST | `/webgis/layers/reorder` | Reorder layers |
| DELETE | `/webgis/layers/:id` | Delete |

### Features (`/webgis/features`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/webgis/features/:layerId` | Create feature |
| POST | `/webgis/features/bulk` | Bulk create |
| GET | `/webgis/features/layer/:layerId` | Get by layer (bbox, limit) |
| GET | `/webgis/features/:id` | Get |
| PATCH | `/webgis/features/:id` | Update |
| DELETE | `/webgis/features/:id` | Delete |
| DELETE | `/webgis/features/layer/:layerId` | Delete all in layer |

### Categories (`/webgis/categories`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/webgis/categories` | Create |
| GET | `/webgis/categories` | List (filter: ownerId, industryCode, isOperational) |
| GET | `/webgis/categories/industries` | Supported industries |
| GET | `/webgis/categories/:id` | Get |
| GET | `/webgis/categories/code/:code` | Find by code |
| GET | `/webgis/categories/:code/template-fields` | Template fields |
| PATCH | `/webgis/categories/:id` | Update |
| DELETE | `/webgis/categories/:id` | Delete |
| POST | `/webgis/categories/seed-system` | Seed system categories (admin) |

---

## 📄 Documents (`/api/documents`)

File upload system (polymorphic, linked to any module).

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/documents/upload` | Upload file (multipart, module-linked) |
| GET | `/documents` | Query documents |
| GET | `/documents/:fromModule/:fromModuleId` | By module & entity |
| GET | `/documents/id/:id` | By ID |
| GET | `/documents/:id/download` | Download file |
| DELETE | `/documents/:id` | Delete |

---

## 🔑 External API (`/external-api`)

### Tenant API Keys (`/api/tenant-api-keys`) — JWT Auth
| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/tenant-api-keys` | Generate new API key |
| GET | `/tenant-api-keys` | List my keys |
| GET | `/tenant-api-keys/:idApiKey` | Get detail |
| PATCH | `/tenant-api-keys/:idApiKey` | Update (label, IP whitelist) |
| DELETE | `/tenant-api-keys/:idApiKey` | Revoke |
| POST | `/tenant-api-keys/:idApiKey/regenerate` | Regenerate key |

### External Data API (`/external-api/v1/`) — X-API-Key Auth
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/external-api/v1/info` | Tenant info |
| GET | `/external-api/v1/projects` | List projects |
| GET | `/external-api/v1/nodes` | List nodes |
| GET | `/external-api/v1/nodes/:nodeId` | Node detail |
| GET | `/external-api/v1/sensors` | List sensors |
| GET | `/external-api/v1/sensor-data` | ⭐ Query telemetry (max 7 days) |
| GET | `/external-api/v1/sensor-data/latest` | Latest values |
| GET | `/external-api/v1/sensor-data/aggregated` | Aggregated (avg, min, max, sum, count) |
| GET | `/external-api/v1/alerts` | Alert events |

**Rate Limiting:** Basic (60/min, 10K/day), Standard (120/min, 50K/day), Premium (300/min, 100K/day)

---

## 🤖 ML — Machine Learning (`/api/ml`)

### Anomalies (`/ml/anomalies`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/ml/anomalies/summary` | Stats summary |
| GET | `/ml/anomalies` | List with filters |
| GET | `/ml/anomalies/by-sensor/:idSensorChannel` | By sensor channel |
| GET | `/ml/anomalies/:id` | Get anomaly |
| POST | `/ml/anomalies/:id/acknowledge` | Acknowledge |

### Forecasts (`/ml/forecasts`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/ml/forecasts/channels` | Available forecast channels |
| GET | `/ml/forecasts` | List forecasts |
| GET | `/ml/forecasts/latest/:idSensorChannel` | Latest for channel |
| GET | `/ml/forecasts/range/:idSensorChannel` | Forecast range |
| GET | `/ml/forecasts/:id` | Get forecast |

### ML Dashboard (`/ml/dashboard`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/ml/dashboard/summary` | Combined ML summary |
| GET | `/ml/dashboard/anomaly-trend` | Anomaly trend over time |
| GET | `/ml/dashboard/top-anomalous-sensors` | Most anomalous sensors |

---

## 📊 Reports (`/api/reports`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/reports/preview` | Generate preview with chart data |
| POST | `/reports/export/xlsx` | ⭐ **Export XLSX** (ExcelJS) |
| POST | `/reports/sensor-types` | Get sensor types by nodes |
| GET | `/reports/templates` | List templates |
| GET | `/reports/templates/:id` | Get template |
| POST | `/reports/templates` | Create template |
| PUT | `/reports/templates/:id` | Update template |
| DELETE | `/reports/templates/:id` | Delete template |
| POST | `/reports/templates/:id/preview` | Preview from template |
| POST | `/reports/templates/:id/export/xlsx` | Export from template |

---

## 🔍 Search (`/api/search`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/search?q=...` | Global search across nodes, devices, alerts, projects, owners |

---

## 🏗️ SCADA (`/api/scada`)

Visual diagram editor with live data bindings.

### Diagrams (`/scada/diagrams`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/scada/diagrams` | List (filter: projectId, ownerId, status) |
| POST | `/scada/diagrams` | Create diagram |
| GET | `/scada/diagrams/:diagramId` | Get detail |
| PUT | `/scada/diagrams/:diagramId` | Update (full save) |
| POST | `/scada/diagrams/:diagramId/duplicate` | Duplicate |
| DELETE | `/scada/diagrams/:diagramId` | Archive |

### Runtime
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/scada/diagrams/:diagramId/runtime` | ⭐ Live data snapshot |

### Binding Options
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/scada/binding-options` | List bindable sensor channels |

---

## ⚡ ClickHouse (Internal Service)

Time-series analytics engine. No HTTP endpoints — dipakai internal.

- `isAvailable()` — Check connection
- `executeQuery(sql)` — Execute SELECT
- `healthCheck()` — Health with latency

**Used by:** Sensor Channels (readings), Widget Builder (query execute), SCADA (runtime)

---

## 🔔 Notifications (`/api/notifications`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/notifications` | Create & send (admin only) |
| GET | `/notifications` | List (admin: all, tenant: own) |
| GET | `/notifications/unread-count` | Unread count |
| PATCH | `/notifications/mark-all-read` | Mark all read |
| GET | `/notifications/:id` | Get |
| PATCH | `/notifications/:id/read` | Mark as read |
| DELETE | `/notifications/:id` | Delete |
| POST | `/notifications/channels` | Create channel (admin) |
| GET | `/notifications/channels/all` | List channels (admin) |
| GET | `/notifications/channels/:id` | Get channel |
| PATCH | `/notifications/channels/:id` | Update channel |
| DELETE | `/notifications/channels/:id` | Delete channel |

**Channel types:** email, webhook, sms, push, in_app

---

## 📋 Audit (`/api/audit`) — Admin Only

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/audit` | List (filter: user, action, entity, status, date range) |
| GET | `/audit/entity/:entityType/:entityId` | Logs for entity |
| GET | `/audit/user/:idUser` | Logs for user |
| GET | `/audit/statistics` | Stats (success rate, by action/entity) |

---

## 🗄️ Database Schema (43 Tables)

### Entity Relationship Diagram

```
Owner ─┬─< Project ─┬─< Node ─────< Sensor ────< SensorChannel
       │             │    │                              │
       │             │    ├── NodeModel                  ├─< SensorLog
       │             │    └── NodeProfile                ├─< AlertRule ──< AlertEvent
       │             │                                   ├─< AnomalyResult
       │             ├─< NodeLocation                    └─< ForecastResult
       │             ├─< UserDashboard ─< DashboardWidget
       │             └─< ScadaDiagram ─┬─< ScadaNode ──< ScadaNodeBinding
       │                               └─< ScadaEdge
       ├─< NodeAssignment
       ├─< OwnerForwardingWebhook
       ├─< OwnerForwardingDatabase
       ├─< OwnerForwardingLog
       ├─< CustomDashboard ──< CustomWidget
       ├─< MapLayer ──< MapLayerFeature
       ├─< MapLayerCategory
       ├─< SpatialUploadFile
       ├─< WidgetQueryTemplate
       ├─< TenantApiKey ──< TenantApiLog
       └─< ReportTemplate

User ─┬─< AuditLog
      ├─< Notification
      ├─< ReportTemplate
      └─< TenantApiKey

SensorCatalog ──< Sensor
SensorType ──< SensorChannel
NotificationChannel (standalone)
NodeUnpairedDevice (links to NodeModel, Project, Owner, Node)
Document (polymorphic: from_module + from_module_id)
IotLog (links to Node via device_id = code)
```

### Tabel Lengkap

| # | Table | Primary Key | Key Columns |
|---|-------|-------------|-------------|
| 1 | `owners` | id_owner (uuid) | owner_code, name, industry, sla_level, forwarding_settings(jsonb) |
| 2 | `projects` | id_project (uuid) | id_owner(FK), name, area_type, geofence(jsonb), status |
| 3 | `nodes` | id_node (uuid) | id_project(FK), id_node_model(FK), code, serial_number, dev_eui, connectivity_status, lat/lng, status, tags[] |
| 4 | `node_models` | id_node_model (uuid) | model_code, vendor, model_name, protocol, hardware_class, supports_codegen |
| 5 | `node_model_commands` | id_command (uuid) | id_node_model(FK), code, label, channel(enum), template, config(jsonb) |
| 6 | `node_profiles` | id_node_profile (uuid) | id_node_model(FK), id_project(FK), code, name, parser_type, mapping_json(jsonb) |
| 7 | `node_locations` | id_node_location (uuid) | id_project(FK), type, coordinates(point), elevation, address |
| 8 | `node_assignments` | id_node_assignment (uuid) | id_node(FK), id_project(FK), id_owner(FK), start_at, end_at |
| 9 | `node_unpaired_devices` | id (uuid) | hardware_id(unique), id_node_model(FK), last_payload(jsonb), status |
| 10 | `sensors` | id_sensor (uuid) | id_node(FK), id_sensor_catalog(FK), sensor_code, label, status |
| 11 | `sensor_channels` | id_sensor_channel (uuid) | id_sensor(FK), id_sensor_type(FK), metric_code, unit, min/max_threshold, multiplier |
| 12 | `sensor_types` | id_sensor_type (uuid) | category, default_unit, conversion_formula |
| 13 | `sensor_catalogs` | id_sensor_catalog (uuid) | vendor, model_name, default_channels_json(jsonb) |
| 14 | `sensor_logs` | id (bigint auto) | id_sensor_channel(FK), ts, value_raw, value_engineered, quality_flag |
| 15 | `alert_rules` | id_alert_rule (uuid) | id_sensor_channel(FK), rule_type, severity, params_json(jsonb), enabled |
| 16 | `alert_events` | id_alert_event (uuid) | id_alert_rule(FK), triggered_at, value, status, acknowledged_by/at, cleared_by/at |
| 17 | `anomaly_results` | id (uuid) | id_sensor_channel(FK), detected_at, anomaly_score, anomaly_grade, anomaly_type |
| 18 | `forecast_results` | id (uuid) | id_sensor_channel(FK), forecast_time, predicted_value, lower/upper_bound, confidence |
| 19 | `user_dashboards` | id_dashboard (uuid) | id_user, id_project(FK), name, layout_type, grid_cols, is_default, is_public |
| 20 | `dashboard_widgets` | id_widget_instance (uuid) | id_dashboard(FK), widget_type, id_sensor(FK), id_sensor_channel(FK), position, size, config_json |
| 21 | `custom_dashboards` | id_dashboard (uuid) | id_owner(FK), id_project(FK), name, layout_config(jsonb), time_range, refresh_interval |
| 22 | `custom_widgets` | id_widget (uuid) | id_dashboard(FK), name, widget_type, sql_query, data_source, config(jsonb) |
| 23 | `widget_query_templates` | id_template (uuid) | id_owner(FK), name, sql_template, widget_type, is_system |
| 24 | `iot_log` | id (uuid) | label(enum), topic, payload(jsonb), device_id, timestamp, processed |
| 25 | `documents` | id_document (uuid) | id_owner, from_module, from_module_id, file_path, mime_type, status |
| 26 | `report_templates` | id (uuid) | id_owner(FK), id_user(FK), name, config(jsonb), is_active |
| 27 | `scada_diagrams` | id_scada_diagram (uuid) | id_owner(FK), id_project(FK), name, status, canvas_config(jsonb) |
| 28 | `scada_nodes` | id_scada_node (uuid) | id_scada_diagram(FK), node_type, label, position, size, style_json(jsonb) |
| 29 | `scada_edges` | id_scada_edge (uuid) | id_scada_diagram(FK), source_node_id(FK), target_node_id(FK), edge_type, animated |
| 30 | `scada_node_bindings` | id (uuid) | id_scada_node(FK), binding_key, id_sensor_channel(FK), is_primary |
| 31 | `owner_forwarding_webhooks` | id (uuid) | id_owner(FK), endpoint_url, http_method, enabled, max_retry |
| 32 | `owner_forwarding_databases` | id (uuid) | id_owner(FK), db_type, host, port, database_name, target_table, enabled |
| 33 | `owner_forwarding_logs` | id (uuid) | id_owner(FK), config_type, config_id, status, attempts, duration_ms |
| 34 | `map_layer` | id_layer (uuid) | id_owner(FK), id_project(FK), layer_name, layer_type(enum), source_type(enum), style_json |
| 35 | `map_layer_feature` | id_feature (uuid) | id_layer(FK), geometry_json(jsonb), properties_json(jsonb), label |
| 36 | `map_layer_category` | id_category (uuid) | category_code, category_name, industry_code, template_fields(jsonb), is_system |
| 37 | `spatial_upload_file` | id_upload (uuid) | id_owner(FK), id_project(FK), file_type, status(enum), parsed_result(jsonb) |
| 38 | `users` | id_user (uuid) | email(unique), password, name, role(enum), id_owner, is_active |
| 39 | `audit_logs` | id_audit_log (uuid) | id_user(FK), action(enum), entity_type, entity_id, old/new_values(jsonb) |
| 40 | `notifications` | id_notification (uuid) | id_user(FK), id_channel, type(enum), title, message, status(enum) |
| 41 | `notification_channels` | id_channel (uuid) | name, type(enum: email/webhook/sms/push/in_app), config(jsonb) |
| 42 | `tenant_api_keys` | id_api_key (uuid) | id_user(FK), id_owner(FK), api_key_hash, rate_limit_plan, ip_whitelist[] |
| 43 | `tenant_api_logs` | id (bigint auto) | id_api_key(FK), endpoint, method, status_code, response_time_ms |

---

## 🏗️ Arsitektur & Pattern

### 1. Multi-Tenancy
- Root entity: `Owner` → scope semua data downstream
- Non-admin users auto-filtered by `id_owner` dari JWT claims
- Tenant hanya lihat data miliknya

### 2. Dual Database
- **PostgreSQL** — Relational data (semua entities)
- **ClickHouse** — Time-series analytics (`sensor_channel_latest` table), digunakan untuk:
  - Widget builder query execution
  - Sensor channel readings (aggregated)
  - SCADA runtime live data

### 3. MQTT Integration
- Broker configurable via env
- Topics: `sensor/{deviceId}/command`
- Auto-reconnect on disconnect
- Digunakan untuk: device commands, pairing, telemetry ingestion

### 4. External API (API Key)
- Separate auth system (X-API-Key header)
- Rate limiting per plan (basic/standard/premium)
- Max 7 days data query range
- API key with hash, prefix `tnt_`
- IP whitelist support

### 5. Data Forwarding
- **Webhook** — POST data to external endpoint (retry, backoff)
- **Database** — Write to external DB (MySQL, PostgreSQL, ClickHouse)
- Per-owner configuration
- Execution logs tracked

### 6. SCADA System
- Visual diagram editor (nodes + edges)
- Each diagram node can bind to sensor channels
- Runtime endpoint provides live data snapshot
- Supports: pipes, valves, pumps, tanks, sensors, labels

### 7. Validation & Serialization
- Global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform)
- `ClassSerializerInterceptor` for `@Exclude()` on password fields
- DTOs with `class-validator` decorators

### 8. Swagger Documentation
- **Internal API** — `/api` (JWT Bearer auth)
- **External API** — `/external-api/docs` (X-API-Key auth)

---

## 📦 Key Dependencies

| Package | Versi | Purpose |
|---------|-------|---------|
| @nestjs/core | ^11 | Framework core |
| @nestjs/typeorm | ^11 | ORM integration |
| typeorm | ^0.3.27 | Database ORM |
| pg | ^8.16 | PostgreSQL driver |
| @clickhouse/client | ^1.16 | ClickHouse client |
| @nestjs/jwt | ^11 | JWT handling |
| @nestjs/passport | ^11 | Auth strategies |
| passport-jwt | ^4 | JWT strategy |
| bcrypt | ^6 | Password hashing |
| mqtt | ^5.14 | MQTT client |
| @nestjs/swagger | ^11.2 | Swagger/OpenAPI |
| @nestjs/schedule | ^6 | Cron jobs |
| exceljs | ^4.4 | XLSX export |
| nodemailer | ^8 | Email sending |
| handlebars | ^4.7 | Email templates |
| class-validator | ^0.14 | DTO validation |
| class-transformer | ^0.5 | Serialization |

---

## 🚀 Running

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# PM2
npm run pm2:start

# Migrations
npm run migration:run
npm run migration:revert

# Seeding
npm run db:seed
```

---

## 📝 Catatan untuk Migrasi ke Go

1. **43 tabel** PostgreSQL perlu di-maintain (schema sama)
2. **ClickHouse** integration perlu dipertahankan (time-series query)
3. **MQTT** client perlu library Go (e.g., `paho.mqtt.golang`)
4. **JWT** auth dengan roles (admin/tenant) dan multi-tenancy scope
5. **File upload** system (polymorphic documents)
6. **XLSX export** (e.g., `excelize` untuk Go)
7. **Email** dengan templates (e.g., `html/template` untuk Go)
8. **Global search** across multiple entities
9. **Rate limiting** untuk external API
10. **Audit logging** (interceptor-based, auto-capture old/new values)
11. **WebSocket/SCADA runtime** — live data binding
12. **Pagination pattern** — consistent across all list endpoints
13. **Swagger** — 2 separate specs (internal + external)
