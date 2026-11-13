---
name: scada-view
description: How to build/modify the iot-scada SCADA diagram view (React 18 + React Flow 12 + zustand v5 + Tailwind). Architecture map, routes & modes, runtime/trend data flow, design tokens, hard-won gotchas (zustand v5 selectors, transform-jsonb persistence, getStyleConfig whitelist, node-type registration, binding uniqueness, undo history), systems already built (symbol variants, line/gauge/inline dial, tank fill, icon override, signal edges, zone blocks), and a prioritized backlog of known UI/perf debt. Read before ANY change to the SCADA visual editor or a SCADA diagram (bagan).
---

# SCADA View (iot-scada)

Repo `pra-project/iot-service/iot-scada` (git root = `pra-project`, shared with siblings). **React 18.3 + Vite 6 + TS 5.7 (strict) + @xyflow/react 12.10 + zustand 5.0.3 + react-router-dom 7 + Tailwind 3.4 + orval 7 SDK.** Firebase hosting site `devetek-helios-scada` (project `iot-devetek`, `dist` + SPA rewrite). **Dark only** (`index.html` hardcodes `class="dark"`), fonts Inter + JetBrains Mono.

Design docs: `iot-scada/doc/01..23` — progress log `20-TASK-PROGRESS.md`, roadmap `23-ROADMAP-PDAM-SCADA.md`, spec `22-SPEC-SCADA.md`. Backlog of UI/perf debt: [references/backlog.md](references/backlog.md).

## Scope (fixed by product owner)
Web-based only — tablet / phone / embedded iframe (desktop Analytics tab + mobile Helios SCADA tab). **NOT HMI control-room, NOT device control/command. Alarm & anomaly detection deferred.** Focus = **view data + visualization**.

## Run & verify
- Dev: `cd iot-scada && npm run dev` → **:4300**, proxies `/api` → `VITE_PROXY_TARGET` or `localhost:3000`.
- Backend (Goravel) lives OUTSIDE pra-project: `/Users/arivin29macmini/Documents/DEVETEK/iot-backend-go` → `go build -o ./tmp/main.exe . && ./tmp/main.exe` (:3000, reads `.env`). Rebuild after any Go change.
- Health: `curl -s -o /dev/null -w '%{http_code}' localhost:4300/` and `localhost:3000/api-json` → 200.
- **Typecheck after every change: `npx tsc --noEmit`.** Full build: `npm run build` (`tsc -b && vite build`).
- No tests. `npm run lint` is BROKEN (eslint not installed, no config) — don't rely on it.
- Dev auth bypass: `VITE_SCADA_DEV_BEARER` (vite-env.d.ts). Seed script: `scripts/seed-pdam-diagram.py` (needs `TOKEN`, targets :3000).
- SDK: `npm run sdk:update` (fetch spec → `/tmp/scada-api-spec.json` → orval). Do NOT hand-edit `src/sdk/`.
- `.firebase/hosting.*.cache` and `tsconfig.tsbuildinfo` are tracked → don't commit their noise with feature work.

## Routes & modes (`App.tsx`)
`/login` · `/` DiagramListPage · `/diagrams/:id/view|edit` · `/embed/:projectId/diagrams/:id/view|edit` (projectId unused; embed only changes the auth-wait screen) · `*`→`/`.
Mode lives in `useUiStore.mode` (initial from route); TopBar toggle switches **without changing the URL** (discard-confirm if dirty).
- **Edit adds**: ToolRail, InspectorPanel (fixed `w-72` right), node toolbar (configure/duplicate/delete), inline label edit, handles, drag/connect/delete, dbl-click edge → EdgeConfigDrawer, Cmd+S/Z/Shift+Z/Y, empty-canvas hint.
- **View adds**: click-to-open node tooltip (one at a time, `activeTooltipNodeId`), handles hidden.
- **No client permission check** — `role` exists in `ScadaAuthUser` but is unused; backend has no edit/view distinction (admin or matching `IDOwner`).

## Key files (under `iot-scada/src`)
| File | Role |
|---|---|
| `nodes/ScadaNodeFrame.tsx` (2400) | Heart. Every equipment node, **card** or **schematic** mode. `SchematicGlyph` (:69) / `NodeGlyph` (:570) maps, `NodeTooltipCard`, `InlineEditLabel`, live symbols `PressureDialLive`/`resolveDialPct`, `PumpGlyphLive`, `TankWaterOverlay`/`resolveTankFillPct` (:1343-1586), `TANK_TYPES/PUMP_TYPES/DIAL_TYPES`, schematic renderer (:1760), card renderer (:2087) |
| `nodes/schematicVariants.tsx` | `SCHEMATIC_VARIANTS[type]` + labels; sensors via `makeInstrumentVariants(tag)`; `stubH/stubV`. viewBox `0 0 64 64`, `stroke="currentColor"` |
| `nodes/sensorCategories.tsx` | ~40 sensor categories (icon, hex color, unit). `SensorNode` reads `config.sensorCategory` |
| `nodes/registry.ts` | `nodeTypes`, `createScadaNode(type)`, `GENERIC_NODE_TYPES` |
| `nodes/ZoneNode.tsx`, `ValueDisplayNode.tsx`, `TextLabelNode.tsx`, `ScadaNodes.tsx` | dedicated node components |
| `edges/PipeEdge.tsx` | only edge type; `PIPE_COLORS`/`PIPE_LABELS` per pipeType (raw/treated/waste/chemical/electrical/generic/**signal**) |
| `canvas/ScadaCanvas.tsx` | `toFlowNode`/`toFlowEdge`, catch-all unknown type → junction, `onConnect` auto-signal, zone move-together in `onNodesChange`, pan lock |
| `components/NodeConfigDrawer.tsx` (2088) | tabs **General** (:237) / Bindings (:459) / Appearance (:970) ; zone → `ZoneTab` (:1864). `getStyleConfig` whitelist |
| `components/EdgeConfigDrawer.tsx`, `DiagramSettingsPanel.tsx` (bulk "Jadikan Sinyal"), `NodeLibraryDrawer.tsx` (`NODE_CATALOG`) | config & palette |
| `components/TopBar.tsx` | RuntimeIndicator (online/total, offline/stale), name → settings, View/Edit toggle, undo/redo. No back-to-list button |
| `components/ToolRail.tsx`, `InspectorPanel.tsx`, `ViewNavControls.tsx` (zoom/fit/pan-lock/minimap/fullscreen + `FullscreenOverlay` clock), `RuntimeBanner.tsx`, `Toast.tsx` (own store) | chrome |
| `components/Gauge.tsx`, `TrendCard.tsx` | floating chart cards above a node (TrendCard always `hideHeader transparent compact`). `Sparkline.tsx` component is unused (only its type) |
| `hooks/useScadaDiagram.ts` | load (`normalizeNode`) + save (fold/unfold `transform`) |
| `hooks/useRuntimePolling.ts` | runtime poll |
| `stores/useDiagramStore` (nodes/edges + undo history), `useRuntimeStore` (primary binding + `nodeRuntimeMap`), `useUiStore` (mode, selection, drawers, inspectorPinned, fullscreen), `useTrendStore` (history) | state |
| `types/scada.ts` | all types |
| `services/auth.service.ts`, `components/AuthGate.tsx` | token store (memory fallback), embed handshake |

## Data flow
- **API used** (SDK `sdk/services.gen.ts`): `GET/POST /api/scada/diagrams`, `GET/PUT/DELETE /api/scada/diagrams/{id}` (PUT replaces whole diagram; DELETE = archive), `GET /api/scada/diagrams/{id}/runtime`, `GET /api/scada/binding-options?ownerId=`. Login & `/auth/me` = manual fetch.
- **Runtime**: `useRuntimePolling` every **5 s** (no backoff, no hidden-tab pause), both modes. Primary binding per node (`useRuntimeStore:31-46`): `isPrimary` (lowest priorityOrder) → `bindingKey==='value'` → lowest priorityOrder.
- **Status (backend `scada_service.go:1019-1040`)**: no reading→`unknown`; >15 min→`offline`; >5 min→`stale`; value 0 on status/state/boolean/switch/relay/power category→`off`; outside channel min/max→`alert`; quality≠good→`warn`; else `ok`. Summary counts offline+stale only.
- **Trend** (`useTrendStore`): every **60 s** + on new `showTrend` channel; dedupe by channel (max trendHours); batches of 6; raw `fetch /api/sensor-logs?idSensorChannel&startDate&limit=120` (see backlog: token bypass, null→0 dips).
- **Access**: `scada_access.go` — admin, or user `IDOwner` == diagram owner.

## Design tokens (use these, don't add new hex)
- CSS vars `index.css :root`: `--canvas-bg #0d1117`, `--surface-bg #1c2128`, `--surface-border #30363d`, `--text-primary/secondary/muted`, `--accent #0ea5e9`, `--status-ok #22c55e / --status-warn #f59e0b / --status-alert #ef4444`.
- Tailwind theme (`tailwind.config.js`): canvas/surface/status(7)/accent/brand `#6366f1`/pipe colors + shadows/animations.
- ⚠️ stale/offline/off have NO CSS var and are inconsistent across files (stale: `#d97706` vs `yellow-600` vs `#eab308`). When touching status color, centralize instead of adding another variant.
- Never concatenate alpha onto a color that may be a `var(...)` (`accentColor + '15'` → invalid CSS). Use `color-mix(in srgb, <color> 15%, transparent)`.

## Non-negotiable gotchas

1. **zustand v5 does NOT memoize selectors.** Selector returning fresh `{}`/`[]` → "Maximum update depth exceeded". Select raw ref, coalesce to a **module-level constant** outside the selector (`EMPTY_STYLE`, `EMPTY_BINDINGS`). Never `useStore(s => s.x ?? {})`. Use `useShallow` for multi-field picks.

2. **New binding display fields persist via `transform` jsonb — no migration.** Fields without a column (chartType, gaugeMin, gaugeMax, chartTransparent, dialShowLabel) are folded into `transform` on save and unfolded in `normalizeNode` (`useScadaDiagram.ts`). Native columns: showTrend, trendHours, isPrimary, priorityOrder, `style_json`, `config_json` (so `NodeStyleConfig` fields and `config.locked/levelMin/levelMax/sensorCategory` persist natively). Recipe: type → unfold → fold → drawer control.

3. **`getStyleConfig` in NodeConfigDrawer is a WHITELIST.** Every new `style` field must be added there or the drawer reads `undefined` (node renders fine, pickers desync). Bit us with glyphKey/glyphVariant/showValue. Zone fields (`zoneColorMode/zoneFill/zoneBorder/zoneBrackets`) are NOT in `NodeStyleConfig` type nor the whitelist — ZoneTab/ZoneNode read them as `Record<string, any>`; add them to the type if you touch zones.

4. **Every node type must be registered** in `nodeTypes` (registry.ts), else blank default + console error. Add union types to `GENERIC_NODE_TYPES`.

5. **Status CSS vars must exist** (`--status-*` in `index.css`); missing once → invisible gauge needle/arc.

6. **Backend binding uniqueness** `(id_scada_node, binding_key, id_sensor_channel)`. `syncBindingsForNode` (iot-backend-go `app/services/scada/scada_service.go`) upserts by id and falls back to natural key. Keep the fallback.

7. **All canvas mutations go through `useDiagramStore` actions** (`withHistory()`): snapshot pre-change into `past`, clear `future`. `HISTORY_LIMIT=60`, `COALESCE_MS=400` sliding window → one drag/resize/slider = one undo step. Canvas commits drag positions on drag-END only. History cleared on load/reset/clear.

8. **Glyph precedence in schematic mode**: `catDef?.icon ?? variantGlyph ?? SchematicGlyph[...]` (`ScadaNodeFrame.tsx:~1766`) — a sensor with a category ignores the Symbol Style picker. Behavior (tank fill, pump anim, dial) always keys on real `type`, never `glyphKey`.

9. **Only zones have `NodeResizer`** (hidden when `config.locked`, in ZoneNode). Equipment size is set via drawer. `toFlowNode` sets `draggable:false` for locked zones.

10. **Keyboard handler (`DiagramPage.tsx:~83`) is global** — guard `e.target` is not an input/textarea/contenteditable before handling Cmd+Z/Delete, or you break text editing in drawers.

## Systems already built (don't reinvent)
- **Render modes** `style.renderMode`: `card` | `schematic`.
- **Symbol variants** `SCHEMATIC_VARIANTS[type]` via `style.glyphVariant`; 36 types.
- **Icon override** `style.glyphKey` (display only). `glyphType = style.glyphKey ?? nodeType`.
- **Chart per binding** `binding.chartType`: `line` (TrendCard) | `gauge` | `inline`; `showTrend` toggles; `chartTransparent`.
- **Inline**: TANK → water fill (`config.levelMin/levelMax`, unit `%` direct). DIAL_TYPES (pressure/flow/ph/turbidity/chlorine/temp/conductivity/do) → `PressureDialLive` 270° dial, scale `gaugeMin/gaugeMax`, bottom label auto-hides unless `dialShowLabel`.
- **Live symbols**: pump impeller (`type==='pump'` + variant 0; keys `status|pump_status`, `rpm|speed`, `head`); tank level binding (category `level` / key `/level/` / explicit inline).
- **Edges**: process pipes vs **signal** (object↔sensor, thin dashed, tap dot). Auto on connect; bulk via "Jadikan Sinyal".
- **Zones** (`type:'zone'`): container behind (zIndex −1), aggregate worst-status from nodes whose CENTER is inside (geometric, no parentId), move-together (store snapshot as reference), lock, ZoneTab style (colorMode status|fixed, accentColor, fill %, border auto/solid/dashed/none, brackets). Not built: KPI aggregation in zone header.
- **Undo/redo** (gotcha 7). **Fullscreen bridge** (below). **Pan lock**, **MiniMap toggle**.

## Recipes
- **New symbol**: add to `SchematicGlyph`/`NodeGlyph` or `SCHEMATIC_VARIANTS` + labels (auto picker). 64×64, currentColor, stubs at edges.
- **New persisted binding display field**: type → `normalizeNode` unfold → `save()` fold → drawer control.
- **New style field**: `NodeStyleConfig` type → `getStyleConfig` whitelist → Appearance control → render.
- **New node type**: `ScadaNodeType` union → `GENERIC_NODE_TYPES` → optional `NODE_CATALOG` entry → optional glyph/variants.
- **Live/aggregate behavior**: key on real `nodeType`; read `useRuntimeStore.nodeRuntimeMap[nodeId]` with a narrow selector.
- **Build/seed a diagram (bagan) from real inventory**: `PUT /api/scada/diagrams/{id}` body `{ diagram:{name,projectId,diagramCode:null,status,canvasConfig:{},runtimeConfig:{}}, nodes:[...], edges:[...] }` (replaces all). Node `{id,type,label,position:{x,y},size:{width,height},zIndex,style,config,bindings}`; binding `{id,bindingKey,sensorChannelId,displayLabel,unitOverride,isPrimary,priorityOrder,showTrend,trendHours,transform:{chartType,gaugeMin,gaugeMax}}`; edge `{id,source,target,edgeType:'pipe',pipeType,flowDirection,animated,style,config:{pathMode,sourceHandle,targetHandle,strokeWidth}}`, handles `t/r/b/l`. Auth `Bearer <JWT>` (ask user). Inventory: `GET /api/nodes?idProject=<pid>` (lat/lng/address), channels `GET /api/scada/binding-options?ownerId=<oid>`. Geo→canvas: x = lng→right, y = lat with NORTH up. Verify: `SELECT node_type,count(*) FROM scada_nodes WHERE id_scada_diagram=... GROUP BY 1;` (DB via tailnet — see memory `helios-tailnet-access`). Node labels follow the address rule (memory `node-display-name-rule`).

## Embed (Angular ⇄ SCADA iframe)
Angular posts `{type:'scada-auth',token}`; SCADA `AuthGate` attaches listener then posts `{type:'scada-ready'}`. **Parent MUST re-send the token on `scada-ready`, forced (bypass `tokenSent` guard), to `event.source`** — else race → stuck "Waiting for authentication…". Embed points: iot-angular `pages/.../analytics-page.component.ts` (desktop, opens edit-capable) and `mobile/projects/tabs/project-scada/project-scada.component.ts` (mobile, opens `/view`). Token store has memory fallback (localStorage blocked in cross-origin mobile iframe).
**Fullscreen**: native API unreliable in iOS iframe → `EmbedFullscreenBridge` (App.tsx) posts `{type:'scada-fullscreen', value}`; mobile parent expands to `.m-scada-embed--full` (fixed inset 0). Desktop parent does not handle it (native FS used). No token refresh — expired JWT shows as Runtime Error banner. Listeners don't check `event.origin` (backlog).

## Related
Memory `scada-roadmap.md`. Backend: iot-backend-go `app/{http/controllers,services,models,dto}/scada/`, `scada_access.go`. Sister skill for Angular dashboards: `widget-builder`.
