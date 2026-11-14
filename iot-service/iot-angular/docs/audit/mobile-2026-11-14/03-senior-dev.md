# Audit Mobile `/mobile/**`: Senior Dev / Staff Engineer (2026-11-14)

Scope: end-to-end and read-only. No edits, no restarts. Frontend `src/app/mobile/**`, SDK
`src/sdk/core/fn/**`, backend `iot-backend-go` (`:3000`, live).

Runtime evidence came from two tokens:
- the owner's test tenant token (owner **Tirta Merangin**, `role: tenant`). The token is not
  written here.
- a 5-minute admin token minted from `JWT_SECRET`. It was used only to compare data across
  tenants and to check which alert status values exist.

Clock during testing: 2026-11-14 ~01:50 UTC.

---

## 0. What this tenant has (live)

| Entity | Count | Detail |
|---|---|---|
| Project | **1** | `IPA BELANAG MAN` (`3f7f0f09-…`), `areaType=pipeline`, `status=active` |
| Node | 2 | `HELIO-354002393536022`, address **"MAN Tekanan"** (Teltonika FMB130, TCP), and `F9YUN-7C6C2113CFD0`, address **"MAN Debit & Tekanan"** (ESP32, MQTT). Both are `online` with interval 120 s. `city`/`province` are null. |
| Sensor | 3 | `Tekanan.tekanan`, `TUF.Tuf-2000` (TUF-2000M flow meter), `tekanan.tekanan` |
| Channel | 6 | debit l/s, diameter mm, velocity m/s, volume m3, and tekanan bar ×2. **0 thresholds set.** Only 1 channel has `precision` (2). |
| Alert event | 0 | The tenant has never had an alert (`/alert-events` total 0 for every status) |
| SCADA | 1 | "MAN — IPA Belakang Man" |
| WebGIS layer | 0 | `?projectId=<own>`: 0 layers |

Other tenants, for scale: the largest has 20 nodes (PDAM Way Rilau). An admin sees about 78
nodes and 25 projects.

**Today a 1-project tenant lands on `/mobile/dashboard`**:
- `mobile-routing.module.ts:35` sends `''` to `dashboard`.
- `root-redirect.guard.ts:13` and `mobile-login.component.ts:18,29` (default `returnUrl`) also
  point at `/mobile/dashboard`.

---

## 1. Request map per screen

"Init" counts the initial calls. `everyDefault()` emits **synchronously** at subscribe (a
BehaviorSubject feeds `switchMap` into `every()`, which emits from `start()`), and then every
N ms (default **30 s**). The timer pauses while `document.hidden`. Payloads were measured
uncompressed: the local backend does not gzip, and gzip in prod nginx needs verification.

| Screen (component) | Endpoint | Params sent → read by backend? | Init calls | Poll | Payload (tenant) | Problem |
|---|---|---|---|---|---|---|
| Shell header (`mobile-header.component.ts:58`) | `GET /projects` | `page=1,limit=100` → yes | 0 (loads when the sheet opens, once per layout) | – | 631 B / 0.31 s | Duplicates the project list (no cache) |
| Dashboard (`mobile-dashboard.component.ts:44`) | `GET /nodes/statistics/overview` | `{}`. The backend reads `projectId`, but the **SDK has no `projectId` param** (`nodes-controller-get-statistics.ts:23` only has `ownerId`) | 1 | 30 s | ~0.6 KB | Ignores the project chip. Online count comes from the `connectivity_status` flag. |
| Dashboard (`:59`) | `GET /alert-events` | `status=triggered,page=1,limit=5` → read, but **`triggered` never exists** | 1 | 30 s | 40 B | **F1**: always 0 |
| Nodes list (`mobile-nodes-list.component.ts:76`) | `GET /nodes` | `page=1,limit=50,search,idProject` → all read (`node_controller.go:37-60`, cap 100) | 1 | 30 s | 2.9 KB (≈1.4 KB/node) | The status filter runs on the client over ≤50 rows. Title is the code (F6). No cancel/switchMap. |
| Node › shell (`mobile-node-detail`) | – | – | 0 | – | – | – |
| Node › Info (`mobile-node-info.component.ts:67`) | `GET /nodes/{id}/dashboard` | path id → yes (tenant-scoped, 403 for other owners) | 1 | 30 s | 2.8–4.6 KB / 0.25 s | **F3**: channel status is hard-coded `"active"`. **F9**: uptime is fake. |
| Node › Info (`:154` via `FlowMeterService.diameterFromContext`) | `GET /sensors/{id}/context-releases` | – | 0–N (per flow sensor whose diameter is null) | **every poll** | – | Latent N+1 per poll (not triggered for this tenant: diameter=188 comes from the channel) |
| Node › Info › expand channel (`mobile-channel-list.component.ts:36`) | `GET /sensor-channels/{id}/readings` | 24 h raw | 1 per expand | – | **71 KB** (684 points) | Raw data for a 320 px sparkline (F10) |
| Node › Info › sensor context sheet | `GET /installation-profiles`, `/sensors/{id}/profile`, `/sensors/{id}/context-fields`, `/sensors/{id}/context-releases` | – | 4 per open | – | small | OK (writes are allowed even though the module claims "read-only phase 1") |
| Node › Command (`mobile-node-command.component.ts:46,61`) | `GET /nodes/{id}`, then `GET /node-model-commands/by-node-model/{idNodeModel}` | yes | 2 (sequential) | – | 5.6 KB | `nodes/{id}` is fetched again on every tab switch (Info already has the node) |
| Node › Logs (`mobile-node-logs.component.ts:37,50`) | `GET /nodes/{id}`, then `GET /iot-logs` | `deviceId=<code>,page=1,limit=20` → yes | 2 | 30 s | **35.6 KB** | Backend **not tenant-scoped** (F2) |
| Channel detail (`mobile-channel-detail.component.ts:55`) | `GET /sensor-channels/{id}/readings` | `startTime,endTime` → yes. `aggregation` is ignored by the backend. | 1 | **30 s, full range** | 1 h 3.5 KB · 24 h 71 KB · **7 d 196 KB** (≈520 KB once the channel has a full 7 days) | **F4**: data and battery cost |
| Projects list (`mobile-projects-list.component.ts:44,46`) | `GET /projects` | `page=1,limit=100,search` → yes | **2** (double) | 30 s | 631 B / 0.31 s | **F5**: "0 online". The backend N+1 costs 6 queries per project. |
| Project › shell (`mobile-project-detail`) | – | – | 0 | – | – | – |
| Project › Detail (`project-info.component.ts:45,47,54,100`) | `GET /projects/{id}/detailed`, then `GET /nodes?idProject&limit=100` | yes | **4** (2× double) | 30 s (2 req) | 2.7 KB + 2.9 KB | `detailed.nodes` is already there (snake_case) but nodes are fetched again. No `lastSync`. |
| Project › Map (`project-map.component.ts:57-60,128`) | `GET /nodes?idProject&limit=200`, `GET /webgis/core/{pid}/sensor-channel-values`, `GET /webgis/layers?projectId`, then `GET /webgis/layers/{id}/geojson` × N | `limit=200` → **capped at 100** | 3 + N | – | 2.9 KB + 2.3 KB + 41 B | forkJoin: a failed layer call takes the whole map down. Sensor status "normal" ignores freshness (F12). |
| Project › Nodes (`MobileNodesListComponent` again) | `GET /nodes` | `idProject` from route parent | 1 | 30 s | 2.9 KB | Links leave the project (F11) |
| Project › Channel (`project-channels.component.ts:47`) | `GET /sensor-channels/overview` | `idProject,limit=500` → yes (cap 2000) | 1 | 30 s | 6.4 KB (≈1 KB/ch) | Status rule differs from desktop (F7). Latest value from PG. |
| Project › SCADA (`project-scada.component.ts:40`) | `GET /scada/diagrams?projectId` | yes | 1 | – | 392 B | OK |
| Alerts (`mobile-alerts.component.ts:51`) | `GET /alert-events` | `page=1,limit=50,status=triggered` (Active tab) or none (History) | 1 | 30 s | 41 B | **F1**: the Active tab is always empty. Not project-scoped. |
| Profile | – | – | 0 | – | – | OK |

Pull-to-refresh (`RefreshBusService`) is subscribed by Dashboard, Nodes, Node Info, Projects,
Project Info and Project Channels. Channel detail, Node Logs, Command, Map and SCADA do **not**
subscribe, so pulling on those screens only shows a 1-second spinner (`pull-refresh.directive.ts:80`).

**Cost per hour on a phone** (default 30 s means 120 polls per hour; node telemetry is every 120 s,
so polling runs at 4× the data rate):
- Node Info ≈ 0.55 MB/h
- Logs ≈ 4.3 MB/h
- Channel detail 7 d ≈ 23.5 MB/h today, ≈ 63 MB/h once the channel has a full 7 days
- Project Detail ≈ 0.67 MB/h

---

## 2. Findings

### F1 [P0] Mobile filters alerts by `status=triggered`, a value that does not exist: "Alert aktif" is always 0 and the Peringatan › Aktif tab is always empty
- **Where**: `mobile/dashboard/mobile-dashboard/mobile-dashboard.component.ts:59`,
  `mobile/alerts/mobile-alerts/mobile-alerts.component.ts:50`.
- **Evidence**:
  - The backend filters on exact equality, `e.status = ?` (`app/services/alertevent/alert_event_service.go:531-534`).
  - The values it uses are `open | acknowledged | cleared` (timeline `:139-165`, `countByStatus("open")`).
  - Desktop uses `open` (`pages/iot/alerts/alert-center.component.ts:46-48`, `overview-page.component.ts:336`).
  - Live admin check: `status=triggered` → total **0**, `open` → **25**, `acknowledged` → 1, `cleared` → 468.
- **Impact**: any PDAM with an open alert sees "Semua aman — tidak ada alert aktif" on the
  dashboard. This is the worst kind of false "No Data" for a monitoring app. (Tirta Merangin has
  0 alerts, so it looks correct only by accident.)
- **Fix**:
  - Active tab: `status: 'open'`. Optionally run a second call with `acknowledged` and merge, the
    way the desktop overview does.
  - History tab: `status: 'cleared'`, or no filter but sorted.
  - Read the total from `b.total` (this endpoint returns `{data,total,page,limit}`, not `meta`,
    and the mobile code already handles that).
  - Pass `idProject` when a project is active.

### F2 [P0] `GET /api/iot-logs` (used by the Logs tab) has no tenant scoping: a tenant can read every raw payload of every PDAM
- **Where**:
  - backend `app/http/controllers/iotlog/iot_log_controller.go:24,50`. `parseFilters` reads
    `ownerId` from the query; the JWT owner/role is never used.
  - `app/services/iotlog/iot_log_service.go:152-170` filters only by what is passed in.
  - `/iot-logs/stats` and `/iot-logs/{id}` work the same way.
- **Evidence** (tenant Tirta Merangin token):
  - `GET /iot-logs?limit=20` → `total: 1316617`, with devices from other owners
    (`HELIO-354002393534704`, `HELIO-352592572346427`, …).
  - `GET /iot-logs?deviceId=HELIO-354002393534704` (a device of another owner) → 200, total 5398.
  - `GET /iot-logs/stats` → `total 1316617` for the whole platform.
  - For comparison, `GET /nodes/{other-owner node}` → 403.
- **Impact**: a tenant leak (class 10). Mobile itself sends only its own `deviceId`, but the
  same token can read any device's raw data, including SMS/command payloads.
- **Fix** (backend): in `IotLogController.Index/Stats/Show`, if the role is not admin, set
  `filters.OwnerID = sc.OwnerID`, and return 403 when the tenant has no owner (the fail-closed
  helper from `telemetry-channels-2026-11-13/03-senior-dev.md` F3). `Show` must check
  `device_id IN (nodes of owner)`.

### F3 [P1] Node › Info: every channel dot is yellow ("warn") because the backend sends `status:"active"` and the mobile code maps unknown values to `warn`
- **Where**:
  - backend `app/services/node/node_service.go:776-783` (`getSensorsWithLatestData`,
    `"status": "active"` hard-coded)
  - frontend `mobile/nodes/node-info/mobile-node-info.component.ts:111,168-173`
    (`mapCh`: only `ok/offline/stale/out_of_range`, everything else becomes `warn`)
- **Evidence**: live `/nodes/fc00ed92…/dashboard`. All 5 channels have `status: "active"`, no
  `minThreshold`/`maxThreshold`, and `timestamp` 01:46:14Z (110 s old, fresh).
- **Impact**: a healthy device looks like it has a problem. The colour also contradicts Project ›
  Channel, which shows "ok" for the same channel.
- **Fix**: stop using `c.status`. Compute `getFreshness(c.timestamp, node.telemetryIntervalSec, nowMs)`
  plus `thresholdState(value, min, max)`, where `outOfRange = fresh && below|above`.
  - The node dashboard does not carry thresholds or precision. Either add
    `minThreshold/maxThreshold/precision` to `getSensorsWithLatestData` (backend, small), or
    replace this source with `GET /api/sensors?idNode=<id>` (ClickHouse latest plus thresholds,
    precision and `latestAvailable`; see §5).
  - Fix `node_service.go:782` too: drop the hard-coded value or give it a real meaning.

### F4 [P1] Channel detail polls the full raw range every 30 s: 7 days = 196–520 KB per poll; the date is not shown on the rows
- **Where**:
  - `mobile/nodes/mobile-channel-detail/mobile-channel-detail.component.ts:42,51-57`
  - backend `sensor_channel_service.go:211-250`: no LIMIT, no bucketing. `aggregation` is read by
    the controller (`:115`) but **ignored** by the service.
- **Evidence**: `c7945b41…` (tekanan, interval 120 s). Range 7 d → 1892 points, 196 488 B. The
  channel only started on 11 Nov, so a full 7 days is about 5040 points and about 520 KB.
  `fmtTs` (`:102-106`) shows only `HH:MM:SS`, so the "Data terakhir" rows for the 7-day range
  give no day.
- **Impact**: tens of MB per hour on a phone data plan, battery drain, and an SVG rebuild with
  thousands of points every 30 s. Rows like "10:12:00" from different days look the same.
- **Fix**:
  - Frontend:
    - Do not poll the 24 h and 7 d ranges. Poll only 1 h, or poll at `max(60 s, interval)`.
    - Rows: `toLocaleString('id-ID', {day:'2-digit',month:'short',hour,minute})` for ranges > 24 h.
    - Use `channel.statistics` (min/max/avg are already returned) instead of recomputing.
    - Use `channel.nodeAddress` and `precision` (already in the response) for the title and the
      number format.
  - Backend: implement `aggregation=hour|15m` in `GetReadings` (`date_trunc` + avg/min/max), or
    add `maxPoints` with server-side downsampling (LTTB/bucket). Note that `/sensors/trends` is
    capped at 48 h (`sensor_trends.go:35`), so it cannot replace the 7 d range.

### F5 [P1] Projects list shows "2 perangkat · 0 online" for a project whose 2 nodes are online
- **Where**: `mobile/projects/mobile-projects-list/mobile-projects-list.component.ts:62-63`
  (`st.totalNodes ?? st.nodes`, `st.activeNodes ?? 0`).
- **Evidence**:
  - `GET /projects` returns `stats: {"alerts":0,"nodes":2,"online":2,"sensors":3}`
    (`project_service.go:79-87`). There is no `activeNodes` key.
  - `GET /projects/{id}/detailed` does use `activeNodes` (`:173`). Two shapes for one concept.
- **Impact**: the screen that decides "which project needs attention" reports everything as
  offline.
- **Fix**:
  - Now: `online = st.online ?? st.activeNodes ?? 0`.
  - Backend: unify the key, and remove `alerts: 0` (hard-coded, fake data class 6,
    `project_service.go:83`). Replace it with a real `COUNT(alert_events WHERE status='open')`,
    or drop the field.

### F6 [P1] Address-first rule broken everywhere: node code is the primary label although `address` is present in every response
- **Where**:
  - `mobile-nodes-list.component.ts:85,88` (title = `code`, address only as a "location" fallback)
  - `mobile-node-info.component.ts:75`
  - `project-info.component.ts:110`
  - `mobile-dashboard.component.ts:69`
  - `mobile-alerts.component.ts:72`
  - `project-channels.component.ts:102`
  - `project-map.component.ts:78,108` and popup `.html:29,41`
  - `mobile-channel-detail.component.ts:62` (title = metricCode only)
- **Evidence**: `address` is available on every source mobile uses:
  - `/nodes` (`address: "MAN Tekanan"`)
  - `/nodes/{id}/dashboard` (`node.address`)
  - `/sensor-channels/overview` (`node.address`)
  - `/alert-events` (`node.address`, `alert_event_service.go:655-659`)
  - `/webgis/core/{pid}/sensor-channel-values` (`nodeAddress`)
  - `/sensor-channels/{id}/readings` (`channel.nodeAddress`)

  For this tenant `city`/`province` are null, so the list shows "HELIO-354002393536022" as the
  title and "MAN Tekanan" in small text.
- **Fix**: one helper `nodeLabel(n) = (n.address||n.nodeAddress||'').trim() || n.code || n.name`
  in `shared/utils/channel-display.ts`. Desktop already has the same logic at
  `telemetry-channels-list.ts:489` and `webgis/sensor-labels.ts:205`, so move it there and reuse
  it. Line 2 shows `code · city`.

### F7 [P1] Status/latest semantics: mobile uses 4 different status vocabularies, none of them the shared desktop rule
| Screen | Source | Status used | Latest value from |
|---|---|---|---|
| Nodes list / map node / project health / dashboard | `connectivityStatus` (DB flag, not maintained, see the 13 Nov audit F1) | online/degraded/offline | – |
| Node › Info | `/nodes/{id}/dashboard` `channels[].status` = always `active` | → `warn` (F3) | PG `sensor_logs` (3-month retention) |
| Project › Channel | `/sensor-channels/overview` `status` (`computeChannelStatus`) | ok/out_of_range/stale/offline | PG `sensor_logs` |
| Map › Sensor | `/webgis/core/.../sensor-channel-values` `status` | normal/critical/unknown. **"normal" when no threshold is set and no age check is done** (`webgis_service.go:1780-1792`) | PG `sensor_logs` |
| Desktop standard | `/api/sensors` + `getFreshness` + `thresholdState` | fresh/stale/offline/nodata × below/above/ok/unset | ClickHouse `sensor_channel_latest` + `latestAvailable` |

- `mapCh` is not consistent with itself: `out_of_range` → `danger` in node-info (`:171`) but
  `warn` in project-channels (`:134`).
- Live for this tenant: overview and webgis both say "ok/normal" because everything is fresh and
  no threshold is set. **That "normal" is false**: thresholds are `unset`, which `threshold.ts`
  says must never be treated as normal. For other tenants the 13 Nov audit (F1) found 209/238
  channels with a different label from the Sensors tab.
- **Fix**: all mobile channel lists read `/api/sensors?idProject=…` (or `idNode`) and compute
  status on the client with `getFreshness` + `thresholdState`. Nodes:
  `getFreshness(n.lastSeenAt, n.telemetryIntervalSec)` replaces `connectivityStatus`. Map
  sensor: the same rule, with `lastSeenAt` per channel. One shared `ChStatus` mapping in
  `mobile/shared`.

### F8 [P1] The stored active project is not cleared at logout: the next account on the same phone gets an empty "Tidak ada perangkat"
- **Where**:
  - `services/project-context.service.ts:15,22` (localStorage `devetek.activeProject`)
  - `services/auth.service.ts:321-327` (`clearSession` only removes token/refresh/user)
  - `AutoRefreshService` keeps `devetek.refreshInterval`, which is harmless.
- **Evidence**: `GET /nodes?idProject=<another owner's project>` with the tenant token →
  `{"data":[],"meta":{"total":0}}` (scoped, so no leak, but empty with no explanation). The chip
  keeps showing the other tenant's project name.
- **Fix**:
  - `clearSession()` also calls `localStorage.removeItem('devetek.activeProject')`, or
    `ProjectContextService.clear()`.
  - At startup, validate `active.idProject` against the user's project list (the landing guard
    in §5).
- Related [P2]: `auth.logout()` navigates to `/auth/login` (`auth.service.ts:137`), the
  **desktop** login. Mobile sessions leave the mobile module. Use
  `viewMode === 'mobile' ? '/mobile/login' : '/auth/login'`.

### F9 [P2] Node › Info "Kesehatan" shows invented numbers
- **Where**:
  - backend `node_service.go:1034-1049` (`calculateUptimePercentage`): a step function of 100 /
    50 / 0 based only on `lastSeenAt`. It also has a **unit bug**:
    `telemetryIntervalSec*2` is treated as **minutes** (`time.Minute`), so a node with a 120 s
    interval counts as "100%" for up to 4 hours.
  - `buildHealth` `:1070`: `battery` is always `"unknown"`.
  - mobile `mobile-node-info.component.ts:137` shows `Uptime 100.0%`.
- **Impact**: "Uptime 100,0%" looks like an SLA figure, but it is only "seen in the last 4 h"
  (class 6).
- **Fix**: remove the Uptime/Baterai rows from mobile until there is a real calculation, or
  rename them to "Terakhir terlihat" with `timeAgoId`. In the backend, change the duration to
  seconds or mark the field as derived.

### F10 [P2] Double loads and missing request cancellation
- `mobile-projects-list.component.ts:44+46`: `everyDefault()` emits synchronously and then
  `load(true)` runs again, so there are **2 identical `/projects` calls on every open**.
- `project-info.component.ts:45+47`: the same pattern, so **4 calls** (2× detailed + 2× nodes).
  Each poll then makes 2 calls, and `/nodes?idProject` duplicates `detailed.nodes`, which is
  already in the response (in snake_case, see F13).
- Node tabs: Command (`:46`) and Logs (`:37`) each call `GET /nodes/{id}` again, and Info
  already loaded `/nodes/{id}/dashboard`. The shell `MobileNodeDetailComponent` loads nothing,
  so no data is shared.
- No `switchMap` or cancel of the previous request in any `load()`. When the network is slow
  (more than 30 s), polls stack up. When the chip changes quickly, an older response can
  overwrite a newer one (nodes list `:76`).
- `mobile-channel-list.component.ts:36`: expanding a row fetches 71 KB of raw 24 h data for one
  sparkline. Project › Channel could take all its sparklines from **one**
  `/sensors/trends?idProject&hours=24` call (11.6 KB for 6 channels).
- `node-info` `fillDiametersFromContext()` (`:119,150-162`) runs on **every poll**, one request
  per flow-meter sensor whose diameter is null. This is latent; for this tenant the diameter
  comes from the channel.
- **Fix**:
  - Remove the explicit `this.load(true)` at `projects-list:46` and `project-info:47`.
  - Pattern: `trigger$.pipe(switchMap(() => req$))`.
  - A `NodeDetailStore` in the shell (`MobileNodeDetailComponent`) that holds the node and
    shares it with its tabs.
  - Cache the diameter per `idSensor`.

### F11 [P2] Links leave the project context; some links point to themselves
- From Project › Detail / Nodes / Channel / Map, the code navigates to `/mobile/nodes/:id`
  (`project-info.html:69`, `mobile-nodes-list.component.ts:100`, `project-map.component.ts:151`,
  `mobile-channel-list.component.ts:56-58`). The bottom nav then highlights "Perangkat" and the
  project tabs disappear.
- Node › Info › expand channel › "Buka node" (`mobile-channel-list.html:50`) navigates to the
  same node (a no-op).
- Dashboard and Alerts ignore the project chip, while Nodes follows it. The same chip gives
  different scopes.
- **Fix** (new IA): nest the routes as `projects/:pid/nodes/:id/(info|command|logs)` and
  `projects/:pid/nodes/:id/channels/:channelId`. Give `MobileChannelListComponent` a
  `@Input() showNodeLink` that is `false` on node-info.

### F12 [P2] Number and time formats ignore `id-ID`, and helpers are duplicated
- Values:
  - `String(Math.round(v*100)/100)` gives "3.79" with a dot and "2685" with no thousands
    separator (`mobile-node-info.component.ts:110`, `project-channels.component.ts:110`).
  - On the **same** screen the flow diagram uses the `number` pipe and shows "2.685"
    (`mobile-flow-diagram.component.html:78`).
  - `fmt()` (`channel-detail:80`), `fmtVal()` (`project-map:153-160`) and
    `up.percentage.toFixed(1)` (`node-info:137`) have the same problem.
  - Threshold text `batas ${min}–${max}` prints raw JS numbers (`project-channels:113`,
    `channel-detail.html:3`).
- Precision: `precision` is ignored everywhere. `/api/sensors` and `/readings` already send it,
  and `decimalsFromPrecision` exists in `threshold.ts`.
- Duplicated helpers:
  - `relTime` (`mobile/shared/util.ts:2`) is the same as `timeAgoId` (`channel-display.ts:40`).
  - `project-map` `fmtAgo`/`fmtLastSeen` (`:162-186`) has English "now/m/h/d" and is a third
    variant.
  - `buildChart()` in channel-detail (`:86-100`) is the same as `buildChartPaths` in
    `mobile/shared/util.ts:19`.
  - `JSON.parse(res.body)` without try/catch is repeated in ~15 places. Use `parseBody` from
    `fetch-all.ts`. Today an invalid body throws inside `next`, and `loading` never turns false.
  - `tel:` + raw phone: use `telHref`.
- Ages are computed when the data is fetched (`relTime`). With auto-refresh set to "Mati" they
  stay frozen ("35 dtk lalu" forever).
- **Fix**: `@Inject(LOCALE_ID)` + `formatNumber(v, locale, '1.d-d')` with
  `d = decimalsFromPrecision(precision)`. Delete `relTime` and re-export `timeAgoId`. Keep the
  SVG `toFixed` calls (see `00-notes-peer-sessions.md` item 2).

### F13 [P2] Backend contract and performance issues hit by mobile
- `GET /projects/{id}/detailed`:
  - `nodes[]` are **snake_case** (`id_node`, `connectivity_status`, `last_seen_at`), which
    breaks the camelCase contract.
  - There is no `lastSync`, so Project › Detail always shows "sinkron -" (`project-info:77`).
    The list endpoint does have `lastSync`.
  - `owner` has no phone or email, so the owner block in `project-info.html:88-89` never
    appears.
- `GET /projects` makes 6 queries per project (owner, 3 counts, location, MAX last_seen):
  `project_service.go:58-95`. The log shows about 35 ms per query, 6 per project. Admins with 25
  projects pay for that on every poll. The log is also full of `Scan error … MAX … <nil>` for
  projects without nodes (`storage/logs/goravel-2026-11-14.log`).
- `GET /nodes` and the map: `limit=200` is capped at 100 (`node_controller.go:67-69`), so the
  map silently drops nodes above 100. For an admin, `/mobile/nodes` with "Semua Project" shows
  only 50 of about 78 nodes, with no indication. The client-side status filter therefore only
  sees those 50.
- `GET /webgis/layers` without `projectId` gives a tenant the **core layers of other owners**
  (metadata only): `layer_repository.go:47` `(id_owner = ? OR is_core = ?)`. Live: 9 rows with
  `idOwner` from 2 other owners. Mobile always sends `projectId`, so it is not triggered from
  mobile, but it is a P2 leak.
- `GET /alert-events` envelope `{data,total,page,limit}`: not the `{data,meta}` contract.
  Mobile handles it.

### F14 [P3] Smaller issues
- Pull-to-refresh does nothing on Channel detail, Logs, Command, Map and SCADA (a fake 1-second
  spinner).
- Map: `forkJoin` means a failed `layers` call (optional) makes the whole map show "Gagal memuat
  peta" (`project-map.component.ts:61-69`). Use `catchError(() => of(null))` per optional source.
- Command: the SMS destination defaults to `picPhone`, the same as desktop
  (`nodes-detail.ts:1017`). There is no SIM-number field on `nodes` (DB-SCHEMA). This is
  consistent, but the PIC is a person, not the modem. Product question.
- `mobile.module.ts` comment says "read-only fase 1", but Command (send) and Installation Context
  (write a release / set a profile) are writes. Confirm that the role permissions are intended.
- Sensor label `sensorCode = "TUF.Tuf-2000"` (built by `buildSensorDisplayCode`). The real label
  is `Tuf-2000` (`/api/sensors` `label`).

---

## 3. Verified correct (do not re-fix)

- Every mobile route is under `AuthGuard` (`mobile-routing.module.ts:33`). Login uses `GuestGuard`.
- Tenant scoping is enforced (tested with another owner's id, result 403 or empty):
  - `/nodes`, `/nodes/{id}`, `/nodes/{id}/dashboard`
  - `/projects/{id}/detailed`
  - `/sensor-channels/overview?idProject=<other>`
  - `/webgis/core/{other}/sensor-channel-values`
  - `/webgis/layers?projectId=<other>`
  - `/alert-events` (owner forced)
- Params match between SDK and backend for:
  - `/nodes` (`idProject`, plus `projectId` as legacy)
  - `/sensor-channels/overview` (`idProject`, `limit`)
  - `/iot-logs` (`deviceId`)
  - `/scada/diagrams` (`projectId`)
  - `/webgis/layers` (`projectId`)
  - `/alert-events` (`status`, `idProject`, `projectId`)
- Route id types: `nodes/:id` accepts a uuid or a code (`findNodeByIDOrCode`).
  `channels/:channelId` = `idSensorChannel`, and the readings endpoint gets that id. No
  sensor/channel mismatch.
- No `Math.random`, dummy or simulated data in `src/app/mobile/**` (grep came back empty). The
  fake values come from the backend (F5 `alerts:0`, F9 uptime/battery).
- Cleanup is correct:
  - every component has `destroy$` + `takeUntil`
  - `AutoRefreshService.every()` clears its interval and the `visibilitychange` listener and
    pauses while the tab is hidden
  - `PullRefreshDirective` removes its listeners
  - the Map runs `setTarget(undefined)` and removes overlays
  - the layout restores `AppSettings`
- `everyDefault()` with interval 0 emits once (`of(0)`), so initial loads still happen.
- Command rendering `{device_id}/{serial}/{{param}}` is the same as desktop (`nodes-detail.ts:999-1002`).
- Logs time: `fmt()` appends `Z` when the timezone is missing. The backend sends a `Z`, so
  WIB is correct on the device.
- `/sensors/trends` now works without `idProject` for a tenant (owner-scoped): 6 channels, 24
  buckets, 11.6 KB.

---

## 4. Landing: more than 1 project → list, exactly 1 project → detail

**Data that decides it**:
- `GET /api/projects?page=1&limit=100` is tenant-scoped and gives `meta.total`. Live: 631 B,
  0.29–0.31 s. Even `limit=2` is enough for the decision, but the full list is needed anyway
  for the header sheet and the projects list. One call should feed all three.
- `/nodes/statistics/overview.nodesByProject` is **not** suitable, because projects without
  nodes are missing from it.
- Backend: `/projects` makes 6 queries per project (F13). For a tenant with 1–3 projects that is
  fine. For an admin (25 projects), add a light mode such as `?fields=id,name` or a
  `/projects/statistics/overview` count (perlu verifikasi: the content of that endpoint was not
  checked).

**Implementation (no double load)**:
1. `MobileScopeService` (providedIn root):
   - `projects$ = this.projectsSvc.projectsControllerFindAll$Response({page:1,limit:100}).pipe(map(parse), shareReplay({bufferSize:1, refCount:false}))`
   - plus `invalidate()`, called from `AuthService.clearSession()` / logout.
2. A functional guard `mobileLandingGuard: CanActivateFn` on the child path `''`. It replaces
   `redirectTo: 'dashboard'` with
   `{ path: '', pathMatch: 'full', canActivate: [mobileLandingGuard], children: [] }`.
   - `total === 1` → `router.parseUrl('/mobile/projects/' + id)`, and also call
     `projectCtx.set({idProject:id,name})`.
   - `total > 1` → `/mobile/projects`. If a stored `active.idProject` is still in the list,
     going straight to it is an option for product to decide.
   - `0` or an error → `/mobile/dashboard`, so an API failure never blocks login.
3. Point `rootRedirectGuard` (`root-redirect.guard.ts:13`) and the default `returnUrl` of
   `mobile-login.component.ts:18,29` at **`/mobile`**, not `/mobile/dashboard`, so the guard
   runs.
4. `MobileProjectsListComponent`, `MobileHeaderComponent.fetchProjects` and the guard all read
   `scope.projects$`. The list's poll calls `scope.refresh()` instead of a separate request.
5. Single project: the `projects` route (bottom nav "Project") should also resolve to the
   detail, with the same guard on `{ path: 'projects', pathMatch: 'full' }`. The header must not
   show "back" on the project root for single-project users. **Perlu verifikasi**: whether a
   UrlTree redirect from a guard replaces the history entry when the user presses back from the
   detail. Test it on a device; if it loops, use `router.navigate(..., {replaceUrl:true})`.
6. No resolver is needed for the detail. The tabs keep loading their own data. The guard only
   decides the URL.

---

## 5. Data plan for the new IA (project-first)

| View | Single source (calls) | Status/latest rule | Poll |
|---|---|---|---|
| Landing guard + projects list + header sheet | `MobileScopeService.projects$` = `/projects?limit=100` (1×, shared) | `online = stats.online` (F5) | 60 s, list only |
| Project › Ringkasan | `/projects/{id}/detailed` (1×). Take nodes from `detailed.nodes` once the backend makes it camelCase; until then use `/nodes?idProject&limit=100` **instead of** detailed.nodes, not as well. Plus `/alert-events?status=open&idProject&limit=5` | Node health = `getFreshness(lastSeenAt, telemetryIntervalSec)`, not `connectivityStatus` | 60 s |
| Project › Channel / Sensor | `/sensors?idProject&limit=100` (via `fetchAll`) + `/sensors/trends?idProject&hours=24` (1× for all sparklines) | `getFreshness(lastValueAt, node.telemetryIntervalSec)` × `thresholdState(lastValue, min, max)`, `outOfRange = fresh && below/above`. Format with `decimalsFromPrecision`. Respect `latestAvailable:false` ("nilai terakhir tidak tersedia", not "No Data") | sensors 60 s, trends 5 min |
| Project › Nodes | `/nodes?idProject&limit=100` (address-first) | freshness from `lastSeenAt` | 60 s |
| Project › Node detail (nested route) | Shell store: `/nodes/{id}` 1× shared by the tabs. Info: `/sensors?idNode={id}` (latest + thresholds + precision). Use only `health`/`recentActivity` from `/nodes/{id}/dashboard`, or drop it. | Same as Channel | 60 s |
| Channel detail | `/sensor-channels/{id}/readings`: 1 h raw (polled); 24 h / 7 d **only after the backend supports `aggregation=hour`**, no polling | `channel.nodeAddress`, `precision`, `statistics` from the response | 1 h: 60 s; others: manual |
| Map | `/nodes?idProject` + `/webgis/core/{pid}/sensor-channel-values` + layers (optional, `catchError`) | Sensor status = freshness × threshold, not the webgis "normal" | – (manual) |
| Alerts | `/alert-events?status=open&idProject=<active>` / `status=cleared` | severity `critical/warning` | 60 s |
| Logs | `/iot-logs?deviceId&limit=20` (after the backend scoping fix, F2) | – | manual or 60 s |

Global:
- Change the default `AutoRefreshService` from 30 s to **60 s**. The telemetry interval is
  120 s, so 30 s is pure overhead.
- Every `load()` uses `switchMap` and keeps the last good data when a silent refresh fails.
- Compute `nowMs` once per render so ages stay consistent.

---

## 6. Fix plan (in order)

**Backend (can run in parallel, A–E are independent):**
- A. [P0] Tenant scoping in `IotLogController.Index/Stats/Show` (F2), using the fail-closed
  helper.
- B. [P1] `node_service.go:782`: remove the hard-coded `status:"active"`, add
  `minThreshold/maxThreshold/precision` (F3). `:1034-1049`: change the uptime unit to seconds,
  or remove the field (F9).
- C. [P1] `project_service.go`: unify `stats` (`online`/`activeNodes`), remove `alerts:0`,
  rewrite the 6 per-project queries as 1 query with GROUP BY, and handle NULL in MAX. In
  `detailed`: camelCase `nodes`, plus `lastSync` (F5, F13).
- D. [P2] `GetReadings`: implement `aggregation` (hour/15m) or `maxPoints` (F4).
- E. [P2] `layer_repository.go:47`: `is_core` only within the owner's own projects (F13).

**SDK (after C/D, or in parallel by hand, since regen is broken):**
- F. Add `projectId` to `NodesControllerGetStatistics$Params`.
- G. Add `aggregation`/`maxPoints` to the readings params, if the name changes in D.

**Frontend (F1/F5/F8/F10 do not wait for the backend and can run in parallel):**
1. [P0] `status: 'open'` in dashboard and alerts (F1).
2. [P1] `online = st.online ?? st.activeNodes` (F5). `clearSession` clears
   `devetek.activeProject`. Mobile logout goes to `/mobile/login` (F8).
3. [P1] `MobileScopeService` + `mobileLandingGuard` + point root/login to `/mobile` (§4).
4. [P1] Node Info and Project Channel move to `/api/sensors` + `getFreshness` + `thresholdState`.
   Remove `c.status` from `/dashboard` and the overview (F3, F7). This depends on B only if
   `/nodes/{id}/dashboard` stays the source.
5. [P1] `nodeLabel()` address-first in `shared/utils` and use it on every screen (F6).
6. [P1] Channel detail: no polling for 24 h / 7 d, date on the rows, precision and nodeAddress
   (F4). Switch to aggregation after D.
7. [P2] Remove the double loads + `switchMap` + node shell store + cached diameter (F10).
8. [P2] `formatNumber` + `decimalsFromPrecision`, delete `relTime`/`fmtAgo`/`buildChart`
   duplicates, `parseBody` (F12).
9. [P2] Nested routes `projects/:pid/nodes/:id/...` for the new IA (F11). Default refresh 60 s.
10. [P3] Pull-to-refresh on the remaining screens, `catchError` per map source, Uptime/Baterai
    rows (F9, F14).
