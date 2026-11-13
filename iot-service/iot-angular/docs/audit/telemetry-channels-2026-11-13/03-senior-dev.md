# Audit `/iot/telemetry-channels` — Senior Dev / Staff Engineer (2026-11-13)

Scope: end-to-end, read-only (no edits, no restarts). Frontend
`src/app/pages/iot/telemetry-channels/` + SDK `src/sdk/core/fn/sensor-channels/` +
backend `iot-backend-go` (`:3000`, live). Target standard = project **Sensors tab**
(`projects/project-workspace/pages/sensors-page/`).

Runtime evidence was collected with 5-minute JWTs minted from `JWT_SECRET` (admin, tenant
with `idOwner`, tenant WITHOUT `idOwner`, role `user`). Data = current backend DB
(238 active channels, 77 nodes, 17 projects, 27 owners). Clock at test: 2026-11-13 15:39 UTC.

> Ownership note: `app/http/controllers/sensorchannel/*` and `app/services/sensorchannel/*`
> belong to session **iot-angular-d4**. Findings there are written as precise hand-off items,
> not as edits we will make.

---

## 1. Request map

The page is ONE component, `TelemetryChannelsListPage`
(`telemetry-channels-list/telemetry-channels-list.ts`). Its `embedded`/`nodeId` inputs are
**dead code**: nobody uses `<telemetry-channels-list>` (grep over `src/app/**/*.html` = 0 hits).

| # | When | Endpoint | Params sent | Backend reads it? | Calls | Payload / latency (measured) | Problem |
|---|------|----------|-------------|-------------------|-------|------------------------------|---------|
| 1 | init, admin only | `GET /api/owners` | `page=1, limit=500` | yes, but caps `limit` at **100** (`meta.limit=100`) | 1 | 10.9 KB | latent truncation once owners > 100 (now 27). Not using `fetchAll`. |
| 2 | init + Refresh button + every owner change | `GET /api/sensor-channels/overview` | `limit=2000`, `ownerId` (admin), `idNode` (dead path) | `limit` yes (cap 2000), `ownerId` yes (admin only; tenant forced), `idNode` yes | 1 per action | **233 KB, 0.19 s** for 238 rows, not gzipped locally | no auto-refresh; `total = len(data)` so truncation at 2000 is invisible; status rule differs from the shared rule (F1); latest from Postgres with 3-month retention (F2) |
| – | never | `/api/sensors`, `/api/sensors/trends` | – | – | 0 | – | no 24 h trend, no `precision`, no `latestAvailable` |

- No N+1, no double-load, no interval leaks (there is no interval at all). The only timer is the
  search debounce, cleared in `ngOnDestroy` (`:85-87`).
- Every filter except Owner is client-side over the loaded set (`:197-224`). The `idProject`,
  `idNodeModel`, `idSensorType` and `search` params that the overview controller DOES read
  (`sensor_channel_controller.go:67-75`) go unused.
- Mobile `project-channels.component.ts:47` uses the same endpoint with `idProject`, which the
  overview controller reads (`:71`). Verified: `?idProject=8c72…` returns 36 rows, not 238.
- The earlier-reported mismatch is real but on a DIFFERENT endpoint. `GET /api/sensor-channels`
  (`Index`, `sensor_channel_controller.go:32-40`) never reads `idProject`. Proof: with
  `?idProject=8c72…&limit=100` it returns 100 rows and `total` 238. This page does not call
  `Index`.

---

## 2. Findings

### [P0] none
Nothing found that shows wrong data as truth to every user, or that breaks tenant isolation for
users who exist today. The P1s below come close.

### F1 [P1] Status definition differs from the shared freshness rule: 209 of 238 channels get a different label than the Sensors tab shows
- **Where**: backend `app/services/sensorchannel/sensor_channel_service.go:764-796`
  (`computeChannelStatus`, d4-owned). Frontend just renders `c.status`
  (`telemetry-channels-list.ts:20, 212-221, 282-299`).
- **Bug**:
  1. `offline` comes from `nodes.connectivity_status == 'offline'` (`:766`), not from data age.
     The connectivity flag is not maintained. Of the 77 nodes, **6 are `degraded` with
     last_seen ≥ 30 days** and 25 are `degraded` with last_seen < 30 days. Example: node
     `DEMO1-00D42390A994`, `connectivityStatus: "degraded"`, `lastSeenAt: 2026-06-29`.
  2. `stale` = "no reading ever" OR "older than max(3×interval, 10 min)" (`:770-780`). There is
     no upper bound, so a channel dead for 4 months stays `stale` forever. "Never reported"
     shares the same label.
  3. The shared rule `shared/utils/telemetry-freshness.ts:21-34` has
     fresh < max(3 iv, 10 min) / stale < max(12 iv, 60 min) / offline / **nodata**.
- **Evidence** (live, admin, 238 channels; backend status vs `getFreshness(latest.ts, interval)`):

  | backend `status` | shared rule | node connectivity | channels |
  |---|---|---|---|
  | offline | **nodata** | offline | 113 |
  | stale | **offline** | degraded | 61 |
  | stale | **nodata** | degraded | 35 |
  | ok | fresh | online | 24 |
  | out_of_range | fresh | online | 5 |

  So 209/238 (88 %) carry a different label than the same channel on the Sensors tab. The
  `fresh` boundary and "no threshold verdict when not fresh" do match, so ok/out_of_range agree.
- **Impact**: the operator sees "Stale" (yellow, "late") on loggers that have been dead for
  months. These pages and mobile (same endpoint) contradict the Sensors tab and the workspace
  tree. Dead-logger triage ("which ones need a field visit") is not possible from this page.
- **Fix** (pick one, both keep a single rule):
  - (a) **Frontend, no backend dependency (recommended now)**: ignore `c.status`. Compute
    `freshness = getFreshness(c.latest?.ts, c.node.telemetryIntervalSec, nowMs)` and
    `threshold = thresholdState(c.latest?.value, c.minThreshold, c.maxThreshold)`, with
    `outOfRange = fresh && (below|above)`. This is the same as `SensorsPageComponent.isChannelOut`
    (`sensors-page.component.ts:425-439`). Status tabs become All / Fresh / Stale / Offline /
    No Data / Di luar ambang, using `FRESHNESS_LABEL/BADGE`.
  - (b) **d4 hand-off**: rewrite `computeChannelStatus` to the shared rule
    (fresh/stale/offline/nodata from `latest_ts` + `telemetry_interval_sec`, `offline` NOT from
    `connectivity_status`). Add `freshness` + `thresholdState` as separate fields and keep
    `status` for mobile compatibility, or migrate mobile at the same time.

### F2 [P1] Latest value read from Postgres `sensor_logs` (3-month retention): 19 channels show "Never / no data" though ClickHouse has their last value
- **Where**: `sensor_channel_service.go:731-737` (LATERAL `FROM sensor_logs … ORDER BY ts DESC LIMIT 1`, d4-owned).
- **Evidence**: `sensor_logs` contains `min(ts)=2026-08-13 02:00Z` and `max(ts)=2026-11-13 15:39Z`
  (1.34 M rows), so only ~3 months are kept. The retention mechanism needs verification. In
  the cross-check against `/api/sensors` (ClickHouse `sensor_channel_latest`), PG has a latest
  value for 90 channels and CH for 109. **19 channels** have `latest=null` in the overview while
  CH has data, e.g. Demo-project `Debit` 2026-03-25 = 10.24 and `Volume` 2026-06-23 = 13771.47.
  There are 0 cases of "PG has it, CH doesn't" and 0 value mismatches where both have one.
- **Impact**: the page claims "Never" / "no data" for a sensor that did report (installed but
  "never sent" vs "died in June" are different field actions). It also disagrees with the
  Sensors tab and the sensor detail page.
- **Fix**: take the latest value from CH `sensor_channel_latest` (same source as `/api/sensors`
  → `fetchLatestValues`, `sensor_service.go:1010-1096`). Return `latestAvailable:false` when CH
  is off or unreachable instead of falling back silently. If PG must remain the fallback, mark
  it `latestSource:"postgres"` so the UI can say "riwayat > 3 bln tidak tersedia".
  Note: the LATERAL itself is fast (index `idx_sensor_logs_channel_ts (id_sensor_channel, ts DESC)`
  exists; 0.19 s total), so the problem is correctness, not performance.

### F3 [P1] Tenant scoping fails open when the JWT has no `idOwner` (latent: no such user exists today)
- **Where**: `sensor_channel_controller.go:27,62,127` and `sensor_controller.go:31,137`
  (`if sc.Role != "admin" && sc.OwnerID != "" {…} else { ownerID = query("ownerId") }`).
  Also `resolveOwnerFilter` `sensor_channel_service.go:879-889`, `SensorService.List`
  `sensor_service.go:162`, `Trends` `sensor_trends.go:89`.
- **Evidence** (live):
  - tenant with `idOwner`=Tebo → 12 rows; adding `ownerId=<other>` still gives 12. **Correct.**
  - tenant **without** `idOwner` → **238 rows, all owners**; with `ownerId=<Demo owner>` → 36
    rows of another tenant.
  - role `user` (no owner) → 238 rows.
  - `/api/sensors` tenant-no-owner → total 140 (all); `/api/sensors/trends?idProject=<other>`
    tenant-no-owner → 39 channels of another tenant's project.
  - DB today: `users` has `admin` 3 (no owner) and `tenant` 12 (all with owner), so it is not
    exploitable now.
- **Impact**: one tenant user created without `id_owner` (bad import, owner deleted, new role)
  would see every PDAM's data. This is class 10 in the bug list.
- **Fix**: fail closed in one helper, e.g. `services.ResolveOwnerScope(sc, requested) (*string, error)`:
  admin → requested or nil; any other role → `sc.OwnerID`, or `403` if empty. Use it in all the
  call sites above (sensorchannel part = d4 hand-off).

### F4 [P2] Numbers ignore locale and channel precision
- **Where**: `telemetry-channels-list.ts:308-313` (`toFixed(1)`/`toFixed(3)`), `:322-327`
  (`thresholdLabel` prints raw JS numbers), `.html:168` (`valueRaw` printed raw).
- **Evidence**: `LOCALE_ID = 'id-ID'` (`app.module.ts:149`). Live values such as
  `-0.028409090909090936` render as `-0.028` (dot) while the rest of the app shows `-0,03`.
  The overview response has no `precision` field (`toOverviewResponse`,
  `sensor_channel_service.go:798-859`), but `/api/sensors` does (`sensor_service.go:739`).
- **Fix**: `formatNumber(v, locale, '1.d-d')` with `d = decimalsFromPrecision(precision)`, the
  same as `SensorsPageComponent.formatValue` (`sensors-page.component.ts:406-417`). d4: add
  `sc.precision` to the overview SELECT and response.

### F5 [P2] No auto-refresh and ages frozen at fetch time
- **Where**: `telemetry-channels-list.ts:77-111` (load only on init/button), `:314-321`
  (`ageLabel` uses server-computed `latest.ageSeconds`).
- **Impact**: a page left open for 30 min still shows "35s ago" and status "OK" for a logger
  that died. This is a monitoring page.
- **Fix**: the Sensors-tab pattern (`sensors-page.component.ts:105-161`): a silent 60 s refresh
  only when `document.visibilityState==='visible'`, `loadSub?.unsubscribe()` before each load,
  keep last good data on a failed silent refresh, a single `nowMs` per load, and age via
  `timeAgo(latest.ts, nowMs)` instead of `ageSeconds`. Trends refresh every 5 min.

### F6 [P2] No 24 h trend, no Excel, no threshold KPIs (gap vs Sensors tab standard)
- No `/api/sensors/trends` call, no sparkline / 24 h min-max, no Excel export, no "di luar
  ambang" tab or count of channels with thresholds configured. See §5 for the data plan.

### F7 [P2] Links leave the project workspace and drop the channel
- **Where**: `.html:130, 145` → `/iot/nodes/:idNode`; `.html:149` →
  `/iot/nodes/:idNode/sensor/:idSensor` **without `?channel=`**; `.html:153` → `/iot/projects/:id`.
- **Evidence**: canonical route `projects-routing.module.ts:32` is
  `/iot/projects/:projectId/node/:nodeId/sensor/:sensorId`. The detail page reads
  `queryParamMap.get('channel')` (`sensor-chanel-detail.ts:212-213, 254`). Without it the detail
  page opens on its default channel, not the row that was clicked (e.g. clicking `Voltage L2`
  opens `Current L1`).
- **Fix**: `[routerLink]="['/iot/projects', c.project.idProject, 'node', c.node.idNode, 'sensor', c.sensor.idSensor]" [queryParams]="{ channel: c.idSensorChannel }"`.
  Node link → `['/iot/projects', pid, 'node', nid]`. Keep the `/iot/nodes/...` form only as a
  fallback when `project.idProject` is null.

### F8 [P2] Silent truncation at 2000 rows
- **Where**: `telemetry-channels-list.ts:93` (`limit: 2000`). Backend caps at 2000
  (`sensor_channel_service.go:685-687`) and returns `total: len(data)` (`:757-761`), so
  `total` can never reveal the cut. `ORDER BY n.code` means the alphabetically last nodes are
  dropped. The envelope is `{data,total,limit}`, not the contract `{data, meta}`.
- **Impact**: none today (238). It will fail without any error at around 8× growth, and the tab
  counts will be wrong (bug class 1).
- **Fix** (d4): real `COUNT(*)` with `meta:{total,page,limit,totalPages}` and page/offset. The
  frontend then uses `fetchAll` (or the plan in §5 uses `/api/sensors` + `fetchAll`).

### F9 [P2] `/api/sensors` and the overview disagree on which sensors exist (inactive sensors)
- The overview excludes `sn.status='inactive'` (`sensor_channel_service.go:598`).
  `/api/sensors` and `/api/sensors/trends` do not filter status (`sensor_service.go:603-631`,
  `sensor_trends.go:81-87`).
- **Evidence**: `/api/sensors` returns 241 channels against 238 in the overview. The 3 extra are
  sensor `TUF` (Demo-project) `status=inactive`: debit/volume/velocity, last data 2026-09-01.
  Trends for Demo-project = 39 channels against 36.
- **Impact**: the Sensors tab lists replaced/removed sensors as "Offline", and counts differ
  between pages. This matters if the new page switches to `/api/sensors`.
- **Fix**: add `AND COALESCE(s.status,'active') <> 'inactive'` (or an `includeInactive` param,
  default false) to `buildSensorListFilters` and the trends channel query.

### F10 [P2] Change-detection cost: every getter is re-run on every CD cycle
- **Where**: `projectOptions/nodeModelOptions/sensorTypeGroupOptions/sensorTypeOptions`
  (`:124-158`, each referenced 3× in the template), `statusCount` (`:212`, 5× per CD, each a
  full filter), `filteredChannels` (`:217-224`, ~7 references through `totalEntries`,
  `paginatedChannels`, `paginationEnd`, `totalPages`, empty-state; each one a fresh filter +
  sort with `sortValue`/`toLowerCase` per comparison).
- **Impact**: about 12 filter passes and 7 sorts per click or keypress. Unnoticeable at 238
  rows, tens of ms per keypress at 2000, and worse once a 60 s refresh is added.
- **Fix**: the Sensors-tab pattern. Compute `filtered`, `counts` and the option lists once in
  `applyFilters()` / after load, and store them in fields.

### F11 [P2] No in-app Panduan (guide)
- `telemetry-channels-routing.module.ts:7` has `data: { title }` but no `data.guide`, and
  `src/assets/guides/` has no telemetry-channels guide. Project rule (skill `page-guide`): every
  page must have one.

### F12 [P3] Minor
- `app-routing.module.ts:166-169`: `iot/telemetry-channels` is the only lazy IoT route without
  `canActivate: [AuthGuard]`. The API still returns 401 and the interceptor handles it, but an
  anonymous user briefly sees the shell.
- `.html:83` + `:204`: on error, both the warning and "No telemetry channels match the filter."
  are shown. `err.message` is Angular's English technical string ("Http failure response…").
  Use the Sensors-tab style Indonesian message.
- `.html:186` renders `—s` when the interval is null. `.html:177` shows `1 / 0` as if
  configured when multiplier/offset are null.
- `ageLabel`/labels are English while the Sensors tab is Indonesian; there is no WIB label on
  the date column (`| date:'short'` uses browser TZ, which is correct for WIB browsers).
- `loadOwners` swallows errors (`:119`), so the owner dropdown is silently empty.
- Data observation (needs verification with the owner): 116 channels (demo projects) have the
  threshold **0–100** for pH, °C, m³/h, A, V, which is probably a seeded placeholder, not a real
  limit. The Sensors-tab rule ("unset" only when null) correctly counts them as configured, but
  they produce misleading "Normal".

---

## 3. Verified correct (do not "fix")
- **Threshold null vs 0**: backend uses pointers (`MinThreshold *float64`, `:764-796`), and 0 is
  a real limit. Frontend `thresholdLabel` uses `!= null`. Live: 117 channels with a 0 bound, 0
  wrong verdicts. The 5 `out_of_range` rows are genuine (pressure 0.436/0.164/−0.72/−0.028/0.49
  bar against a min of 0.5, all fresh).
- **Stale → no threshold verdict**: backend checks freshness before thresholds, the same as
  Sensors tab `isChannelOut`.
- **Value semantics**: overview `value` = engineered with raw fallback. It matches CH
  `sensor_channel_latest` exactly for all 90 overlapping channels (0 mismatches, 0 ts diff > 5 min).
- **Tenant with `idOwner`**: forced to its owner; `ownerId` override ignored (verified 12/12).
- **Single request, no N+1, no request loop**. The SDK `clone({ body: undefined })` keeps the
  original body (Angular `HttpResponse.clone` treats `undefined` as "unchanged") and
  `parseBody` handles the text response. This works; do not "fix" it.
- **No fake data**: no `Math.random`, dummy generators or simulated metrics in the module.
- **No hard-coded host**: the old public IP is not in `.env`/`app`/`config`. Today's log has
  `ClickHouse latest values unavailable … 109.105.194.174:8123` at 12:24, from BEFORE the tailnet
  refactor (`5c34858`). Current calls succeed (`latestAvailable:true`).
- **Overview performance**: 0.19 s / 233 KB for 238 channels. The LATERAL is backed by
  `idx_sensor_logs_channel_ts`.
- `/api/sensors/trends` honesty: null buckets, raw min/max, 503 on CH failure, the UTC
  wall-clock quirk handled (`sensor_trends.go:29-31, 121-158`).

---

## 4. Can `/api/sensors` + `/api/sensors/trends` serve a CROSS-PROJECT channel list?

| Need | `/api/sensors` (no idProject) | `/api/sensors/trends` | `/api/sensor-channels/overview` |
|---|---|---|---|
| All channels, scoped | yes, `fetchAll` → 2 pages × 100 sensors (140 sensors / 241 ch), 0.37 + 0.18 s, ~300 KB | **no: `idProject` mandatory** (`sensor_trends.go:70` → 400 without it, verified) | yes, 1 call, 0.19 s, 233 KB |
| Thresholds (null-safe) + `precision` | yes / yes | – | yes / **no precision** |
| Latest from CH + `latestAvailable` | yes | – | **no (PG, 3-month gap, F2)** |
| Sensor type group/category per channel (Kelompok / Channel Type filters) | **no**, the channel response lacks `idSensorType` (`sensor_service.go:723-738`) | – | yes |
| Node model, project name, interval | yes (`node.nodeModel`, `node.project`, interval `COALESCE(…,300)`) | – | yes (interval may be null) |
| Excludes inactive sensors | **no (F9)** | **no** | yes |
| qualityFlag / valueRaw / register / mult / offset (expanded row) | no (getSensorChannels selects mult/offset/register but does not emit them in the list) | – | yes |

**ClickHouse cost of an all-projects trends query (measured, read-only):** the trends SQL with
`channel_id IN (all 238)` over 24 h scans **19,522 raw rows → 665 (channel, hour) groups in
0.12 s**. With no channel filter at all: 0.08 s. `sensor_telemetry` is
`MergeTree ORDER BY (owner_code, project_id, node_id, sensor_id, channel_id, event_time)`
partitioned by month, so an owner/project-scoped query also uses the primary key prefix.
Response size ≈ 0.55 KB/channel (24 buckets): the sum of 17 per-project calls was **128.6 KB**.
The alternative, 17 per-project trend calls, costs 17 requests at 0.08-0.26 s each (an N+1
pattern) and is rejected.

**Conclusion:** neither endpoint alone serves the page, but **both need only small, additive
backend changes, and `/api/sensors/trends` must get an owner/all-projects scope.**

---

## 5. Recommended data plan (cheapest correct)

**Target: 2 requests per load and no N+1, whatever the number of projects.**

1. **List = `GET /api/sensors` (no idProject) via `fetchAll`**. This is the Sensors-tab path:
   CH latest + `latestAvailable`, thresholds, `precision`, standard `meta`. Flatten
   `sensor.channels[]` into channel rows client-side. Backend additions (our `sensor` module,
   additive, no contract break):
   - per channel: `idSensorType`, `sensorType:{category, groupName}` (one `LEFT JOIN sensor_types`
     in `getSensorChannels`, `sensor_service.go:661-695`);
   - default-exclude inactive sensors (F9), with `includeInactive=true` as escape hatch;
   - fail-closed owner scope (F3).
   Do not bump the `limit` cap to fit everything in one call. `fetchAll` at 100 is ~2-3
   requests at today's scale.
   *Alternative if d4 prefers:* keep `/api/sensor-channels/overview` as the single list call,
   but d4 must (i) take latest from CH `sensor_channel_latest` + `latestAvailable`, (ii) add
   `precision`, (iii) add real `meta.total`/paging, (iv) fail-closed scope, and optionally
   (v) align `computeChannelStatus` to the shared rule. This is one flat call and smaller than
   option 1, but it depends on another session's files. Both options are fine as long as the
   frontend computes status with `getFreshness` + `thresholdState`.
2. **Trends = `GET /api/sensors/trends?hours=24` with an owner/all-projects scope** (our
   `sensor` module, `sensor_trends.go`):
   - `idProject` optional. If empty: tenant → `p.id_owner = sc.OwnerID` (403 if empty); admin →
     optional `ownerId`, else all projects.
   - Channel query: drop `WHERE p.id_project = ?` when absent, add the inactive filter, and cap
     channels (e.g. 3000 → 400 "persempit filter").
   - The CH query is unchanged (IN list). Optionally replace it with
     `project_id IN (…)`/`owner_code = …` for the key prefix. Measured cost is negligible
     (0.12 s, ~130 KB for every channel).
   - Refresh every 5 min (hourly buckets), separate from the 60 s list refresh, as on the
     Sensors tab.
3. **Frontend**: status = `getFreshness` + Sensors-tab `isChannelOut`; values via
   `formatNumber` + `decimalsFromPrecision`; sparkline/`rangeText`/Excel copied from
   `SensorsPageComponent` (or better, extracted into a shared helper so the two pages cannot
   drift); canonical workspace links with `?channel=`; memoised filtering; Panduan.

---

## 6. Ordered fix plan

**Backend (our `sensor` module): can run in parallel with B-d4.**
1. B1 `sensor_trends.go`: optional `idProject` → owner/all scope, inactive filter, channel cap. *(enables trends)*
2. B2 `sensor_service.go` `getSensorChannels`/`toSensorResponse`: add `idSensorType` + `sensorType{category,groupName}`; `buildSensorListFilters` excludes inactive by default (F9).
3. B3 fail-closed owner-scope helper applied in `sensor_controller.go:31,137`, `sensor_service.go:162,236,635,820`, `sensor_trends.go:89` (F3).

**Backend hand-off to d4 (sensorchannel): parallel, not blocking if the plan uses `/api/sensors`.**
- D1 fail-closed scope in `sensor_channel_controller.go:27,62,127` + `resolveOwnerFilter:879` (F3). **Do this regardless.**
- D2 overview: CH latest + `latestAvailable` (F2), `precision` (F4), real `meta` paging (F8).
- D3 `computeChannelStatus` → shared rule, or expose `freshness`/`thresholdState` (F1); coordinate with mobile `project-channels`.
- D4 `Index` should read `idProject` (`:32-40`) (pre-existing, not used by this page).

**SDK**: add `idProject` optional / `ownerId` to `sensorsControllerTrends$Params`, plus
`includeInactive` to sensors find-all params. Add by hand (full regen is broken, see memory
"SDK Regen Gotcha").

**Frontend (after B1/B2; F5, F7, F10, F11, F12 can start immediately):**
1. F1/F4 status + formatting via the shared utils (no backend needed).
2. F7 canonical links; F12 AuthGuard + error copy.
3. F5 auto-refresh/visibility/`nowMs`; F10 memoised filtering.
4. Switch data source to `/api/sensors` `fetchAll` + trends (after B1/B2 + SDK). Sparkline,
   24 h min/max, "Di luar ambang" tab, Excel export (shared helper with Sensors tab),
   `latestAvailable` banner.
5. F11 Panduan `src/assets/guides/telemetry-channels.md` + `data.guide`.
6. Remove the dead `embedded`/`nodeId` inputs, or keep them only if a consumer is planned.
