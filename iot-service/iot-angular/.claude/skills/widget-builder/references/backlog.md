# Widget Builder backlog — known bugs / debt (audit 2026-11-13)

Prioritized. Delete an item when fixed. Paths: WB = `iot-angular/src/app/pages/iot/widget-builder`, BE = `iot-backend-go`.

## P0 — security (backend, `widget_builder_controller.go`)
- **Arbitrary SQL by any tenant.** `validateQueryString` (:463-484) = SELECT/WITH prefix + keyword blocklist. No read-only txn/role, no `statement_timeout`, no row limit, `context.Background()`. CH has only `max_execution_time`, no `readonly=1`. Nothing stops `SELECT * FROM users`; holes: `SELECT … INTO`, `pg_sleep/pg_read_file/set_config/dblink`, CH `url()/file()/s3()`. Variables substituted unescaped → injection. Raw DB error text returned.
  Direction: run PG in `BEGIN READ ONLY` + `SET LOCAL statement_timeout` under a restricted DB role limited to telemetry views; CH `readonly=1` + table-function deny; tenants limited to template SQL (or a whitelist of views filtered by owner) while free SQL is admin-only; quote variables.
- **Scoping holes**: `findDashboard` (:428-437) skips the check when a non-admin token has empty owner_id; `GetTemplate/{id}` no owner check; admin `CreateDashboard` sets IDOwner "" into NOT NULL uuid (likely fails); legacy `/user-dashboards` filter by client-supplied `idUser`.

## P0 — functional bugs (frontend)
- **Expert-mode ClickHouse widgets execute on PostgreSQL**: create/update bodies (`widget-wizard.component.ts:3410-3439`) omit top-level `dataSource` → column defaults `postgresql`, and `dashboard-view.component.ts:244-247` overwrites `config.dataSource` with it. (Template wizard sends it, :719.)
- **Auto-refresh / per-widget refresh are stubs**: `refreshAllWidgets()` only logs (`dashboard-view.component.ts:507-511`), `refreshWidget` "mockup" (:365). Interval never moves `timeFrom/timeTo`. `setupAutoRefresh` reuses `destroy$` to cancel the timer.
- **Saved dashboard `time_range`/`refresh_interval` ignored** — view starts 24h / off (:69-77). Widget `config.timeRange/refreshInterval` never read.
- `copyTimeRangeUrl` writes `?from=&to=` but nothing reads them on init.
- Wizard preview sends `variables: {}` (:2089) → dashboard-variable SQL fails in preview only.
- `${fromTime}/${toTime}` left unreplaced when only `timeRange` is sent (BE).
- `heatmap` selectable but no renderer.
- **Embedded Monitor shows Edit/Delete/Duplicate** — `editMode` input not used in container template.
- PG columns alphabetized → table column order ≠ SELECT.

## P1 — visual / UX
- Hardcoded Grafana-dark palette; widgets don't follow `data-bs-theme` (light mode broken); ECharts no theme. **Done for line chart + table** (`utils/chart-theme.ts`); bar/gauge/pie/stat-card, panel chrome and wizard CSS still hex.
- CSS mixes hex & `var(--bs-*)` (dashboard-view 32 hex, wizard 22).
- `alert()/confirm()` + console logging everywhere.
- Icons mix Material names and FontAwesome.
- SQL editor is a `<textarea>` with fake line numbers; `CodemirrorModule` imported but unused.

## P2 — structure
- Wizard component 3693 ts + 1739 html; Grafana time-picker + calendar copy-pasted in `dashboard-view.component.ts:541-878` → extract a `TimeRangePickerComponent` (one exists, unused!).
- Chart option builders duplicated 3× (renderer, expert preview, template preview) — **line chart done** (`utils/line-chart-options.ts`); bar, gauge (and template gauge/stat previews) remain. Bar chart still uses a category axis for timestamps (gaps compressed).
- Templates defined twice (template.models.ts + wizard `sqlTemplates` :367); BE `widget_query_templates` + `GET /templates` unused.
- `TimeRangePickerComponent`, `FieldMappingComponent` declared but unused. `toPromise()` usage.
- Demo `components/widgets` + `WidgetsModule` imported by 4 modules without use; showcase route has no AuthGuard.
- dashboard-kedua `forChild('')` route shadowed (module eagerly imported in app.module:118).
