# IoT Service — Full Project Map

A multi-tenant IoT platform: **Owner → Project → Node → Sensor → SensorChannel → SensorLog (telemetry)**, plus alerts, dashboards, SCADA, WebGIS, ML (anomaly/forecast), reports, notifications, audit, and an external tenant API.

---

## 1. Repos & Roles

| Repo | Path | Role |
|------|------|------|
| Frontend | `pra-project/iot-service/iot-angular` | Angular 20 SPA (this repo) |
| Backend | `../../../iot-backend-go` (`/Users/arivin29macmini/Documents/DEVETEK/iot-backend-go`) | Goravel Go API, port 3000 |
| Legacy docs | `pra-project/iot-service/iot-backend/docs` | Old NestJS design — reference for endpoints & DB schema (`FULL_PROJECT_MAPPING.md`) |

Backend was rewritten **NestJS → Goravel (Go)**; HTTP/JSON contract preserved so the generated Angular SDK still works.

---

## 2. Frontend (iot-angular)

**Stack:** Angular 20.1, TypeScript 5.8, RxJS (no NgRx/Signals), Bootstrap 5.3 + ng-bootstrap + Angular Material + FontAwesome 6, ECharts/ApexCharts/Chart.js, OpenLayers. NgModule-based, `standalone: false`. Deploy: Firebase / PM2.

**Structure:**
```
src/app/
  components/        shared UI: card/, header/, sidebar/, top-nav/, theme-panel/, widgets/
  services/          auth.service.ts, jwt.interceptor.ts, auth.guard.ts, guest.guard.ts
  pages/             lazy feature modules
    iot/             nodes/ projects/ dashboard/ ml-dashboard/ widget-builder/ webgis/ alerts/ owners/ search/
       <feature>/    <feature>-list/  <feature>-add/  <feature>-edit/  <feature>-detail/  <feature>.module.ts
    admin/           users/ audit-logs/
    auth/
  models/            domain interfaces (iot/, widgets/, auth.model.ts)
  shared/            shared-components.module.ts (exports card, etc.)
src/sdk/core/        GENERATED ng-openapi-gen SDK (services/, models/, fn/, api.module.ts) — do not edit
src/environments/    environment.ts (localhost:3000), environment.prod.ts, environment.go.ts
src/scss/            styles.scss + _variables, _layout, _app, _widgets, ...
```

**Reusable patterns** (each has a skill):
- List/Index → `ui-list` — e.g. `pages/iot/nodes/nodes-list/`, `pages/iot/projects/projects-list/`
- Detail → `ui-detail` — e.g. `pages/iot/nodes/nodes-detail/`
- Card/Widget → `ui-card` — e.g. `components/widgets/numeric/info-card-widget.component.*`
- Form → `ui-form` — e.g. `pages/iot/nodes/nodes-add/`
- Conventions/theme → `ui-coding-style`

**API access:** generated services like `NodesService.nodesControllerFindAll$Response(params)`; read `response.body` then `.data`. Auth via `JwtInterceptor` (Bearer token from localStorage, 401→refresh). Path aliases: `@app @sdk @models @services @components @pages`.

---

## 3. Backend (iot-backend-go)

**Stack:** Goravel v1.17 (Gin + GORM), PostgreSQL (primary) + MySQL (legacy pengaduan) + ClickHouse (telemetry) + MQTT, JWT + bcrypt. Entry `main.go`; routes `routes/api.go`; CLI `artisan`; hot reload `air`.

**Layered module** (`backend-module` skill) — for module `x`:
```
app/models/x/x.go                 GORM struct + TableName()
app/dto/x/x_dto.go                CreateXDTO, UpdateXDTO, XFilter
app/repositories/x/x_repository.go FindByID, FindAllFiltered, Create, Update, Delete (parameterized)
app/services/x/x_service.go       BaseService + RBAC via ServiceContext; returns *AppError
app/http/controllers/x/x_controller.go  BaseController; Index/Show/Store/Update/Destroy
routes/api.go                     register under /api with middleware.JwtAuth()
```
Shared: `app/http/controllers/base_controller.go`, `app/dto/response.go` (APIResponse, PaginatedResponse, PaginationMeta), `app/dto/pagination.go`, `app/errors/app_error.go`, `app/http/middleware/jwt_auth.go`.

---

## 4. Shared API Contract (camelCase, fixed)

- **List:** `{ "data": [...], "meta": { "total", "page", "limit", "totalPages" } }`
- **Single / Create / Update:** entity returned directly (POST=201, others=200)
- **Error:** `{ "statusCode", "message", "error" }` (message = string[] for validation, 400)
- **Login:** `{ "user": {...}, "access_token": "jwt" }`
- **List query params:** `page`, `limit` (≤100), `search`, + per-resource filters (`ownerId`, `idProject`, `status`, ...). Default sort `created_at DESC`.

JWT claims: `sub`, `email`, `role` (admin|tenant), `idOwner`. Tenant data is scoped to `idOwner` in the **service layer**.

---

## 5. Core Domain (PostgreSQL, ~43 tables)

`owners` → `projects` → `nodes` → `sensors` → `sensor_channels` → `sensor_logs`.
Around them: `node_models`, `node_profiles`, `node_locations`, `node_assignments`, `node_unpaired_devices`, `sensor_types`, `sensor_catalogs`, `alert_rules` → `alert_events`, `anomaly_results`, `forecast_results`, `user_dashboards`/`dashboard_widgets`, `custom_dashboards`/`custom_widgets`, `scada_diagrams`/`scada_nodes`/`scada_edges`/`scada_node_bindings`, `map_layer(_feature/_category)`, `owner_forwarding_*`, `tenant_api_keys`/`tenant_api_logs`, `users`, `audit_logs`, `notifications`/`notification_channels`, `documents`, `iot_log`. Full column-level detail: `../iot-backend/docs/FULL_PROJECT_MAPPING.md`.

PKs are UUID (`id_<entity>`, `gen_random_uuid()`); columns snake_case; JSON camelCase; nullable = Go pointers.
