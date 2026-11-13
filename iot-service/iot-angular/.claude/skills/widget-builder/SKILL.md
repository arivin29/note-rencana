---
name: widget-builder
description: How the Angular dynamic-widget system ("Widget Builder" — custom dashboards with SQL-driven ECharts widgets on a gridster grid, also embedded as project workspace Monitor) works, and how to add/modify widget types, templates, renderers and dashboard view. Covers which of the 3 widget systems is live, data model (custom_dashboards/custom_widgets), query execution (/api/widget-builder/query/execute, ${fromTime} placeholders, PG vs ClickHouse), rendering dispatch, theming rules, known bugs and SQL-safety risks. Read before ANY dashboard/widget work in iot-angular.
---

# Widget Builder (widget dinamis) — iot-angular

Read `ui-coding-style` + `ui-card` first. Known bugs/debt: [references/backlog.md](references/backlog.md).

Paths: FE = `iot-angular/src`, WB = `FE/app/pages/iot/widget-builder`, BE = `/Users/arivin29macmini/Documents/DEVETEK/iot-backend-go`.

## Which system is live (don't build on the wrong one)
| System | Where | Status |
|---|---|---|
| **Widget Builder** | `WB/**` + BE `/api/widget-builder/*`, tables `custom_dashboards`, `custom_widgets` | **LIVE** — menu + project workspace Monitor. **All new widget work goes here.** |
| Catalog/Factory | `FE/app/components/widgets/**` (`WidgetsModule`, `WidgetFactoryService`, `WidgetCatalogService`), `FE/app/models/widgets/*` | Demo only (`/iot/widgets-showcase`, static props, ApexCharts). Don't extend. |
| dashboard-kedua | `FE/app/pages/iot/dashboard-kedua/**` (route `iot/dashboard-admin`, admin) | Live but hand-coded `dk-*` cards over `/api/dashboard/*` — not part of widget system; follow `ui-card` |
| Legacy APIs | BE `/api/dashboard-widgets`, `/api/user-dashboards` | No FE callers. Don't use. |

Two different classes are both called `WidgetContainerComponent` (`widget-container` in components/widgets vs `app-widget-container` in WB). Use the WB one.

Design docs in `iot-service/desain_widget_dinamis/` (07, 13, 15, 19) and root `WIDGET-*.md` describe a planned registry/WebSocket architecture that **was never built** — trust code over docs.

## Routes & flow (`WB/widget-builder.module.ts:54-61`, lazy at `iot/widget-builder`, AuthGuard)
`''` DashboardList → `:id` DashboardView (gridster, time picker, kiosk, edit layout) → `:id/widget/new` WidgetCreate (choose mode) → `:id/widget/template` **Template wizard** (no-code: category → template → node/sensor/channel → options → preview) or `:id/add-widget` / `:id/edit-widget/:widgetId` **Expert wizard** (SQL, multi-query, mapping, Grafana-style option panels). **Editing always opens Expert**, even for template widgets.
Embedded: project workspace `monitor` / `monitor/:dashboardId` → `<app-dashboard-view [dashboardId] [embeddedMode]="true">` (`monitor-page.component.html:25`); `ProjectsModule` imports `WidgetBuilderModule`. Sidebar list from `GetDashboardsByProject`.

## Data model
- FE types `WB/models/widget.models.ts`: `Dashboard`, `Widget`, `WidgetPosition{x,y,cols,rows}`, `WidgetConfig` (title, dataSource, refreshInterval, mapping, series[], xAxis, yAxis, thresholds[], display, creationMode `template|expert`, templateId, templateConfig{nodeId,sensorId,channelId(s),settings}, variables, `queries: WidgetQueryDef[]`), `WidgetType` = `line-chart|multi-line-chart(deprecated)|bar-chart|pie-chart|gauge|stat-card|table|map|scada|heatmap`, `TIME_RANGE_PRESETS`, `REFRESH_INTERVALS`.
- The saved config is built in `widget-wizard.component.ts:~3368-3400`; full form shape (incl. `display.tableOptions/statCardOptions/smoothing`, which are NOT in the typed interface) at `:56-185`. If you add display options, **type them** in `WidgetDisplayConfig`.
- Templates hardcoded in `WB/models/template.models.ts` (4 categories, 12 templates) with `sqlTemplate.{postgresql,clickhouse}` using `${channelId}`, `${channelIds}`, `${fromTime}`, `${toTime}`, options with `autoFrom:'channel.unit'`.
- BE (inline structs in `BE/app/http/controllers/widgetbuilder/widget_builder_controller.go`):
  - `custom_dashboards`: id_dashboard, id_owner NOT NULL, id_project, name, description, `layout_config` jsonb (only `.variables` used), time_range ('6h'), refresh_interval (60), is_default, is_active, created_by.
  - `custom_widgets`: id_widget, id_dashboard, name, `widget_type` varchar free text, position_x/y, cols(6), rows(4), `sql_query` NOT NULL, `data_source` ('postgresql', CHECK), `config` jsonb, is_active.
  - No Go migrations — DDL from legacy NestJS entities (`iot-service/iot-backend/src/entities/custom-*.entity.ts`).
- Layout: `angular-gridster2` ^20.2 (`dashboard-view.component.ts:160-195`): 12 cols, ScrollVertical, pushItems, margin 4, item 2–12 × 2–10, default 6×4, drag handle `.panel-head`. Save via `PATCH .../widgets/positions`.
- SDK `FE/sdk/core/services/widget-builder.service.ts` (17 methods). Regen is broken → edit DTO unions by hand (`create-widget-dto.ts:51`, `custom-widget-response-dto.ts:71`, `update-widget-dto.ts`).

## Data path — every widget is raw SQL
`app-widget-container.loadWidgetData` (`WB/components/widget-container/widget-container.component.ts:99-160`) → `POST /api/widget-builder/query/execute {sql, dataSource, variables, from, to}` (epoch ms) or `{timeRange}`. Variables = dashboard-level then widget-level. `config.queries.length > 1` → parallel, rows concatenated with `_source` column (:163-227).
BE `prepareSQL` (:486-529) string-replaces `${fromTime}/${toTime}` (UTC `YYYY-MM-DD HH:MM:SS`), `${timeRange}`, `${ownerId}`, `${ownerCode}`, and variable keys → ClickHouse `ExecuteQuery` or PG `Raw().Scan()`. **PG result columns come back alphabetized** (:398-403) — never rely on SELECT order; map by name.
Common tables: PG `sensor_logs`, `nodes`; CH `iot.sensor_telemetry*`, `iot.sensor_channel_latest`, `iot.node_latest`.
**Tenant isolation depends on the SQL containing `${ownerId}` / channel ids** — every template/default SQL you write MUST scope by owner or by explicit channel ids the user is allowed to see.

## Rendering
- Dispatch: hardcoded `*ngIf` chain in `widget-container.component.html` (no factory): line/bar/gauge/pie/stat/map/scada/table. `heatmap` has no branch (renders blank).
- Renderers `WB/components/widgets/{line-chart,bar-chart,gauge,pie-chart,stat-card,table}`: `@Input widget, data, columns, containerWidth, containerHeight` (pie/stat/table lack size inputs) → `ngOnChanges` builds ECharts options → `<div echarts [options] (chartInit)>` + ResizeObserver + `instance.resize()`.
- Chart lib: **ECharts 5.6 + ngx-echarts 20** (global `provideEchartsCore`, app.module:155). ApexCharts/chart.js also installed but used only by demo/dashboard-kedua — **new widgets use ECharts**.
- **Line chart = ONE pure builder** `utils/line-chart-options.ts` `buildLineChartOptions(config, data, {width,height,fontScale,theme,queries})` (+ test), used by the renderer AND both wizard previews (Expert `buildLineChartOptions` / Template `buildTimeseriesOptions` pass the exact config they save). Timestamps on xField → `type:'time'` + `[ms,value]` points (sorted; holes > 5× median step get a null point, `connectNulls:false`) so data gaps keep real width; non-time x → category. Y `splitNumber` from measured plot height (`yAxisSplitNumber`), ticks via `formatAxisTick` (no "120,00"). Renderer measures its own host (ResizeObserver) and rebuilds on size/theme change. Colours: `utils/chart-theme.ts` (`CHART_SERIES_PALETTE`, `readChartTheme()` from `--bs-*`, `observeThemeChange`). Bar/gauge/pie previews are still duplicated — extract the same way when touching them.
- Chart CSS: never give the echart div a `min-height` larger than the smallest widget body (old 150px clipped the x-axis on a 1366 TV, body 135px).

## Text scale (fontScale)
`dashboard-view.widgetFontScale` = (TV ? screen-fit `wbScale` : 1) × `layout_config.fontScale` ("Ukuran huruf", `utils/font-scale.ts`, options 0.85–2). Passed as `[fontScale]` to every renderer and exposed as CSS var `--wb-scale` on the dashboard-view host (panel titles, immersive header). New renderers MUST take `@Input() fontScale` (charts: `scaleChartFonts`; HTML: `calc(Npx * scale)`).
- `scaleChartFonts` only scales `fontSize/lineHeight/symbolSize/lineStyle.width` — **grid margins, legend `textStyle.width`/`itemWidth`, axis-label `width` and label-interval px estimates must be multiplied by fontScale by hand** (else 4K/TV: clipped axis labels, "Teren…" legends). Every axis label/markLine needs an explicit `fontSize` or it stays ECharts' default 12. Line chart uses `grid.containLabel:true`; threshold labels `position:'insideEndTop'`. Chart renderers fill the widget body via CSS (100%) + ResizeObserver — **never** size the echart div as `containerHeight - <fixed px>` (the panel header scales with `--wb-scale`; at 4K the x-axis got clipped). Line-chart axis text base = 12, ×1.2 when fontScale > 1 (`axisFontBase()`).
- Numbers/times in widgets: `utils/format-id.ts` (`formatIdNumber` comma decimal, `formatHm/Hms` — never `toLocaleTimeString('id-ID')`, it gives "22.20"). Table `statusMap.color` may be a hex → `badgeColorStyle()` inline style, never `bg-${color}`.
- Stat-card fits its cell via `container-type:size` on the host + `--sv-reserve/--sv-chars` computed in TS (em of host font = 16px × fontScale); add any new line under the value to `computeFit()` or it gets clipped. Card padding is `0.3em 0.75em` and `computeFit` base reserve = 0.7em — keep them in sync; extra reserve = empty space under the value (TV KPI shrank to 44 dp that way).
- **NG0100 trap:** a widget can emit `(loadResult)` synchronously during the parent's change detection (scada short-circuits in the container's ngOnInit). `DashboardView.onWidgetLoad` therefore applies it in a microtask — don't make it synchronous again (`lastSuccessAt && !dataDelayed` flips null→true → NG0100 on every load/fullscreen).
- Table: the first auto-width text column is `flexField` (`.cell-flex`, `max-width:0` ellipsis + title); other auto columns are `.cell-fit` (nowrap, width 1%) so numbers/units never clip ("ba", "m/"). Header colour = `--wb-table-head-bg` (option) else `--bs-tertiary-bg`; legacy `#1a1a2e` = theme default.
- TV stage height learns page padding below it (`tvBottomSlack`, measured from document overflow) — don't hard-code bottom offsets in `measureStage`.

## Map widget (`map`, OpenLayers 9)
`components/widgets/map/` + pure `utils/map-rows.ts`. Options `config.display.mapOptions` (typed `MapWidgetOptions`); **`source`**: `webgis` (default; configs without `source` = webgis) | `sql` | `both` — helpers `mapDrawsWebgis/mapDrawsSql/mapDrawsSupportLayers`.
- **`webgis`** = the project's WebGIS map, looking identical to `/iot/webgis`: every sensor-type layer (all, not only the first like the WebGIS page default) + `<sensor-labels>` value cards, Alerts, and **every** non-core `map_layer` (operational first, then custom, by `display_order`, `is_visible_default` ignored). Core "Nodes" layer is NOT drawn. SQL result is not drawn (query still runs → `SELECT 1` is fine). No `projectId` → "Dashboard belum terhubung ke proyek".
- **`sql`**: column contract lat/lon/label/value/unit/status/time (lenient names, numeric strings) → status circles + legend; project layers only when `showProjectLayers`.
- Data = same endpoints as WebGIS (all scoped by `ensureProjectAccess`): `coreGeoJsonControllerGetSensorTypes` (`id`,`name`), `GetSensorChannelsGeoJson({projectId,sensorTypeId})`, `GetSensorChannelValues`, `GetAlertsGeoJson`, `layersControllerFindAll` (via `fetchAll`) + `layersControllerGetGeoJson`. Geometry loads once per (project, source) key; **each dashboard tick (`[refreshNonce]` from the container) reloads only sensor values + alerts**; the OL map is never rebuilt. Stacking: support layers < alerts < sensor types < SQL points.
- **Styles are shared, never copied**: `pages/iot/webgis/shared/webgis-layer-config.ts` (pure: core layer defs, sensor-type colours, `resolveWebgisLayerStyle` incl. nested legacy `styleJson`, `webgisLayerColor`, `webgisSupportLayers`, `filterSensorDataByTypes`, tests next to it) + `webgis-styles.ts` (OL: `createStyleFromLayerStyle` data-driven/zoom-gated, `createStyleFromConfig`, `createWebgisLayerStyle`). `webgis-map.ts` uses the same functions. Their `scale` arg (default 1 = WebGIS) is the widget's fontScale; `<sensor-labels [scale]>` scales the cards via CSS var `--sl-scale`. Cards are centred ABOVE the point (bottom-center, offset −15·scale, ≈148×45 px·scale): `fit()` pads left/right by half the measured card width and top by card height + 28·scale (+44·scale right for interactive zoom buttons) — measured from `.sensor-label-card` after render. Card values use `formatIdNumber(v,2)`, missing = "—". Card title / group-row name = `nodeAddress` (from `GetSensorChannelValues`, BE added it 2026-11-13; fallback node code) — never `sensorLabel`/`node.name`. Group rows get a dot in the sensor-type layer colour via `[typeColors]` (`webgisSensorTypeColorMap`, same index rule as the layers). `--sl-boost` (+2px text) is set only when `scale !== 1`. Cards that would overlap at the current zoom are merged into ONE group card at the alarm-first lead node (pure `webgis/shared/label-clusters.ts` + tests; re-clustered on `moveend`, debounced outside the zone; overlays keyed by sorted member ids, sizes measured from rendered single cards) — applies to the WebGIS page too. Don't add per-node overlays back. `SensorLabelsComponent` is declared in `WebgisSharedModule` (imported by both `WebgisModule` and `WidgetBuilderModule`) — don't redeclare it.
- OL 9.2 generics: `VectorLayer<Feature>` (feature type, NOT source type). Pass the OL map to child components a tick after creation (`setTimeout`) to avoid NG0100. The wizard preview reuses the same component (no option-builder duplication); with `source=webgis` it renders without running the query.

## Bagan SCADA widget (`scada`, embedded iot-scada)
`components/widgets/scada/` + pure `utils/scada-options.ts` (+ test). Options `config.display.scadaOptions` (typed `ScadaWidgetOptions`): `diagramId` (required), `interactive` (default true), `theme` `auto|dark|light` (auto → `data-bs-theme`, app default dark). Embed URL = `ScadaService.getEmbedUrl(projectId, diagramId, 'view')` + `kiosk=1&interactive=1|0&theme=dark|light` (`scadaEmbedParams`).
- **Iframe + auth handshake live ONLY in `<app-scada-embed>`** (`src/app/shared/scada-embed/`, `ScadaEmbedModule`, pure URL/origin helpers in `scada-embed-url.ts`). Used by the project SCADA tab (`analytics-page`), the mobile SCADA tab and this widget — never copy the iframe/postMessage code again. It posts `{type:'scada-auth',token}` on iframe load and re-sends on the child's `scada-ready`; accepts messages only from `environment.scadaUrl`'s origin AND its own iframe's `contentWindow` (several embeds per dashboard); other child messages come out as `(childMessage)` (mobile `scada-fullscreen`). The iframe reloads only when the computed URL string changes.
- No SQL: the container short-circuits `loadWidgetData` for `scada` (`finishOk([])`, no request, still emits `loadResult`); wizard saves `sql_query = 'SELECT 1'` (NOT NULL) and hides the Query + Field-mapping cards. SCADA polls its own runtime (5 s) → **don't pass `refreshNonce`/data to it**; theme `auto` reloads the iframe on theme toggle (URL param changes).
- Edit layout: container passes `[blockPointer]="editMode"` → transparent shield over the iframe so gridster resize isn't swallowed. fontScale not used (SCADA fits itself).
- No `projectId` → "Dashboard belum terhubung ke proyek"; no diagram → "Pilih bagan SCADA di pengaturan widget". Wizard lists diagrams via `ScadaService.getDiagramsByProject(dashboard.idProject)` (`ensureDashboardProject()` shared with the map preview).
- Wizard gotcha: the save body's `name` used `form.name`, which only edit-load ever set → new Expert widgets were sent with `name:''` (BE 422) and title edits were not saved. Now `name = form.title.trim() || form.name`.

## Theming rules (enforce on every touch)
- App supports light/dark via `data-bs-theme`; widgets currently hardcode Grafana-dark hex (`#73bf69`, `#5794f2`, stat-card value `#ffffff`, table header `#1a1a2e`) → invisible/ugly in light mode. New/changed code: read colors from CSS vars (`getComputedStyle(document.documentElement).getPropertyValue('--bs-body-color')`, `--bs-border-color`, `--bs-primary`…) and rebuild options on theme change; series palette from one shared constant.
- Status colors: green/amber/red semantics only for thresholds, consistent with `shared/utils/telemetry-freshness.ts`.
- Follow project rules: **no fake data** (error/empty state + "Coba lagi", never random/dummy), node label = **address** (fallback node code), Bahasa Indonesia UI text, `<card>` wrappers, FontAwesome icons (not Material names) in new UI. Replace `alert()/confirm()` with app toasts/modals when touching that code.

## Recipe — add a new widget type (e.g. `heatmap`)
BE: nothing (widget_type free text, config jsonb). New *data source* would need DB CHECK `chk_data_source` + `ExecuteQuery` branch (:386).
1. `widget.models.ts` union (:200) + `WIDGET_TYPES` (:210); type any new `display.<x>Options`.
2. SDK DTO unions don't list new types — don't edit `src/sdk`; send `toApiWidgetType(type)` (`widget.models.ts`, a widening cast; BE widget_type is free text).
3. Renderer `WB/components/widgets/<type>/<type>-widget.component.{ts,html,css}` (`standalone:false`), copy line-chart pattern; export a pure options builder.
4. Declare+export in `widget-builder.module.ts`.
5. `*ngIf` branch in `widget-container.component.html`.
6. Expert wizard: `widgetTypes` (:341), `selectWidgetType` category (:1318), `needsXYMapping/needsValueMapping/needsLabelValueMapping` (:3457), `isMappingValid/canSave` (:3191), `autoMapFields` (:2118), preview `buildChartOptions` (:2231), defaults (:115-184), `loadWidget` hydration (:1564-1800), `expandedSections` key (:38) + options panel in html.
7. Optional Template mode: template + category in `template.models.ts`, template-wizard preview, `getDefaultCols/Rows` (:765), category switch (:849).
8. Verify: `npx ng build` (or `npx tsc -p tsconfig.app.json --noEmit`), open `http://localhost:4200/iot/widget-builder/<id>` in both light & dark theme, check embedded Monitor page too.

## Recipe — add a template (most common user ask)
Add to `template.models.ts` with BOTH `postgresql` and `clickhouse` SQL, scoped by `${channelId(s)}`, using `${fromTime}/${toTime}` (the template wizard substitutes them client-side for preview, :540-547). Prefer CH for time-series over long ranges. Set sensible default size.

## Backend endpoints (`BE/routes/api.go:437-459`, all JWT)
Dashboards: `GET|POST /api/widget-builder/dashboards[?projectId=]`, `GET|PUT|DELETE /dashboards/{id}` (GET includes widgets[] + projectName), `GET /projects/{projectId}/dashboards`. Widgets: `GET|POST /dashboards/{id}/widgets`, `GET|PUT|DELETE /dashboards/{id}/widgets/{widgetId}`, `PATCH /dashboards/{id}/widgets/positions` `{positions:[{idWidget,positionX,positionY,cols,rows}]}`. Query: `GET /datasources`, `POST /query/validate` (unused), `POST /query/execute`. Templates `GET /templates[/{id}]` (unused by FE).
Bodies are `map[string]interface{}` (no DTO). Scoping in `findDashboard` (:428-437) — admin sees all; see backlog for holes.

## Related
Skills `ui-card`, `ui-coding-style`, `backend-module`, sister `scada-view`. Memories `no-fake-data-rule`, `node-display-name-rule`, `api-response-contract`, `sdk-regen-gotcha`.
