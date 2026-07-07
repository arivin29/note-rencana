---
name: scada-view
description: How to build/modify the iot-scada SCADA diagram view (React + React Flow + zustand v5). Architecture map, the hard-won gotchas (zustand v5 selectors, transform-jsonb persistence, getStyleConfig whitelist, node-type registration, backend binding uniqueness), and the systems already built (symbol variants, chart types line/gauge/inline dial, tank fill, icon override, signal edges, zone blocks). Read this before any change to the SCADA visual editor.
---

# SCADA View (iot-scada)

Separate repo at `../iot-scada` (sibling of iot-angular). **React 18 + Vite 6 + TypeScript + @xyflow/react (React Flow) 12 + zustand v5.0.3 + react-router-dom 7 + Tailwind + orval SDK.** Deploys to Firebase (devetek-helios-scada.web.app). Dark canvas (`--canvas-bg #0d1117`).

## Scope (fixed by product owner)
Web-based only — target tablet / phone / embedded iframe (desktop Analytics tab + mobile Helios SCADA tab). **NOT HMI control-room, NOT device control/command. Alarm & anomaly detection deferred to backlog.** Current focus = **view data + visualization**.

## Run
- SCADA dev: `cd ../iot-scada && npm run dev` → port **4300**.
- Backend (Goravel): `cd ../../iot-backend-go && go build -o ./tmp/main.exe . && ./tmp/main.exe` → port **3000** (process reads `.env`). Rebuild after any Go change.
- Health: `curl -s -o /dev/null -w '%{http_code}' localhost:4300/` and `localhost:3000/api-json` → 200.
- Typecheck: `cd ../iot-scada && npx tsc --noEmit`. Run after every change.

## Key files (all under ../iot-scada/src)
- `nodes/ScadaNodeFrame.tsx` (~2000 lines) — the heart. Renders every equipment node in **card** OR **schematic** mode. Holds live-symbol helpers: `PumpGlyphLive` (spinning impeller), `TankWaterOverlay`+`resolveTankFillPct` (tank level fill), `PressureDialLive`+`resolveDialPct` (live analog dial), glyph maps `SchematicGlyph`/`NodeGlyph`, `TANK_TYPES`/`PUMP_TYPES`/`DIAL_TYPES` sets, `TANK_BODY` geometry.
- `nodes/schematicVariants.tsx` — `SCHEMATIC_VARIANTS: Record<type, ReactNode[]>` + `SCHEMATIC_VARIANT_LABELS`. Multiple P&ID glyph styles per type. Sensors use `makeInstrumentVariants(tag)` factory. Shared `stubH`/`stubV` connection-stub fragments. All SVGs viewBox `0 0 64 64`, `stroke="currentColor"`.
- `nodes/registry.ts` — `nodeTypes` map (React Flow). `createScadaNode(type)` generic component (reads glyph from `data.nodeType`). `GENERIC_NODE_TYPES` array auto-registers every union type.
- `nodes/ZoneNode.tsx` — labeled container/group block (IPA, DMA) with **aggregate status** from nodes geometrically inside it. Renders behind (zIndex −1 via toFlowNode).
- `nodes/{ValueDisplayNode,TextLabelNode}.tsx` — dedicated non-equipment nodes.
- `edges/PipeEdge.tsx` — the only edge type. `PIPE_COLORS`/`PIPE_LABELS` per `pipeType` (raw/treated/waste/chemical/electrical/generic/**signal**). `signal` = thin dashed muted "sensor link" (no flow/wall/glow, tap dot at source).
- `canvas/ScadaCanvas.tsx` — `toFlowNode`/`toFlowEdge` (store↔React Flow). Catch-all: unknown node type → renders via `junction` component but keeps `data.nodeType`. `onConnect` auto-defaults a sensor-touching link to `pipeType:'signal'`.
- `components/NodeConfigDrawer.tsx` — per-node config (Info / Bindings / Appearance tabs). **`getStyleConfig` whitelist — see gotcha #3.**
- `components/EdgeConfigDrawer.tsx`, `components/DiagramSettingsPanel.tsx` (has bulk "Jadikan Sinyal" tool), `components/NodeLibraryDrawer.tsx` (`NODE_CATALOG` palette).
- `hooks/useScadaDiagram.ts` — load (`normalizeNode`) + save. **Folds/unfolds extra binding fields into `transform` jsonb — see gotcha #2.**
- `stores/{useDiagramStore,useRuntimeStore,useUiStore,useTrendStore}.ts`. `useDiagramStore` owns **undo/redo history** (`past`/`future`, `withHistory` coalescing — gotcha #7). `types/scada.ts` — all types.
- `components/TopBar.tsx` — undo/redo buttons; `pages/DiagramPage.tsx` — keyboard shortcuts (Cmd+S save, Cmd+Z/Cmd+Shift+Z undo/redo, F fullscreen, Del delete).
- `components/Gauge.tsx` — standalone radial gauge (chartType `gauge`, floats above node).

## Non-negotiable gotchas (these cost real debugging time)

1. **zustand v5 does NOT memoize selectors.** A selector returning a fresh `{}`/`[]`/object each render → "Maximum update depth exceeded" infinite loop. Fix: select the raw ref and coalesce to a **module-level stable constant** OUTSIDE the selector (`EMPTY_STYLE`, `EMPTY_BINDINGS`, etc.). Never `useStore(s => s.x ?? {})`.

2. **Persist new binding fields via `transform` jsonb — no DB migration.** New `ScadaNodeBinding` fields that lack a real column (chartType, gaugeMin, gaugeMax, chartTransparent, dialShowLabel) are **folded into `transform`** on save and **unfolded** on load, both in `hooks/useScadaDiagram.ts`. Real columns that persist natively: showTrend, trendHours, isPrimary, priorityOrder, and `style_json`/`config_json` (so `NodeStyleConfig` fields like glyphVariant/glyphKey/showValue/zone* and `config.locked`/`levelMin`/`levelMax` persist natively). To add a new binding display field: add to type → unfold in `normalizeNode` → fold in `save()` → done.

3. **`getStyleConfig` in NodeConfigDrawer is a WHITELIST.** It rebuilds `NodeStyleConfig` field-by-field. Any new `style` field you add MUST be added here too, or the drawer reads it as `undefined` (the node renders fine because it reads the store directly, but drawer pickers/toggles desync). This bit us with `glyphKey`/`glyphVariant`/`showValue`.

4. **Every node type must be registered** in `nodeTypes` (registry.ts) or React Flow logs "type X not found" + renders a blank default. `GENERIC_NODE_TYPES` covers the whole `ScadaNodeType` union; `toFlowNode` has a catch-all for anything still unknown. When adding a union type, add it to `GENERIC_NODE_TYPES` (or a dedicated component).

5. **CSS status vars** `--status-ok/warn/alert` are defined in `src/index.css :root` (#22c55e / #f59e0b / #ef4444). Use them for status coloring. (They were missing once → gauge needle/arc rendered invisible.)

6. **Backend binding save uniqueness.** `scada_node_bindings` has a unique constraint `(id_scada_node, binding_key, id_sensor_channel)`. `syncBindingsForNode` (iot-backend-go `app/services/scada/scada_service.go`) upserts by binding-id AND falls back to this natural key, so a client-regenerated binding id doesn't 500 with duplicate-key. Keep that fallback if touching save.

7. **All canvas mutations go through `useDiagramStore` actions, which wrap undo/redo history.** `addNode/updateNode/removeNode/setNodes/addEdge/updateEdge/removeEdge/setEdges` each call `withHistory()` — it snapshots the PRE-change `{nodes,edges}` into `past` and clears `future`. Rapid successive mutations (drag/resize/slider) coalesce into ONE undo step via a 400ms sliding window (`lastPushAt`). If you add a new mutation path, route it through these actions (or wrap with `withHistory`) so it stays undoable. `undo()`/`redo()` restore snapshots; the canvas store→local sync effect repaints. History is cleared on `loadDiagram`/`resetToSaved`/`clearDiagram`. Note the canvas only commits drag positions to the store on drag-END (`dragging:false`), so a drag = one history entry.

## API contract (shared, fixed, camelCase)
List = `{ data, meta:{total,page,limit,totalPages} }`; single item returned directly; error `{ statusCode, message, error }`. Do NOT hand-edit `src/sdk/`. Runtime status per binding computed by backend: `ok|warn|alert|off|stale|offline|unknown`.

## Systems already built (don't reinvent)
- **Render modes**: `style.renderMode` = `card` (box+icon+border) | `schematic` (P&ID symbol only).
- **Symbol variants**: `SCHEMATIC_VARIANTS[type]`, chosen by `style.glyphVariant` (index). Picker in Appearance tab. 36 types covered.
- **Icon override (decoupled from type)**: `style.glyphKey` overrides the *displayed symbol* without changing the node's `type`. **Behavior (tank fill, pump anim, category) follows `type`, never glyphKey.** `glyphType = style.glyphKey ?? nodeType`.
- **Chart types per binding** (`binding.chartType`): `line` (TrendCard above node, needs history) | `gauge` (radial Gauge card above node) | `inline`. `showTrend` toggles it on. `chartTransparent` = no card box.
- **Inline (the SCADA-modern bit)**: for TANK types → tank body water-fill (`resolveTankFillPct`, scale from `config.levelMin/levelMax`, unit `%` used directly). For DIAL types (`DIAL_TYPES`: pressure/flow/ph/turbidity/chlorine/temp/conductivity/do) → `PressureDialLive` 270° live analog dial: bright neutral needle (contrasts the status-colored arc), soft glow, tick marks, layered hub, and the numeric value printed inside. Scale from binding `gaugeMin/gaugeMax`. When the dial is active the bottom value label auto-hides (dial already shows the number); `dialShowLabel` re-enables it. Config lives in the Bindings tab inline section.
- **Live symbols**: pump → animated impeller when `type==='pump'` and variant 0; conventions bindingKey `status`/`pump_status`, `rpm`/`speed`, `head`. Tank → level binding (category `level` or bindingKey matching `/level/`, or explicit `chartType:'inline'`).
- **Edges**: process pipes (raw/treated/…) vs **signal** links (object↔sensor). Auto-detect on connect; bulk-convert via DiagramSettingsPanel → "Jadikan Sinyal".
- **Zone/group blocks** (`type:'zone'`, `nodes/ZoneNode.tsx`): labeled container, renders behind (zIndex −1 in `toFlowNode`), **aggregate worst-status** from nodes whose CENTER is inside its rect (geometric containment — no parentId/relative-coords). **Move-together**: dragging a zone moves its contained nodes by the same delta — implemented in `ScadaCanvas.onNodesChange` using the store snapshot (drag-start positions) as a stable reference (never grabs bystanders; skips nodes already carrying their own change). **Lock** (`config.locked`): `toFlowNode` sets `draggable:false` + hides NodeResizer; children still movable. **Config drawer** (`ZoneTab` in NodeConfigDrawer, opened via the gear button; drawer branches on `node.type==='zone'` to a single tab): style fields on `node.style` — `zoneColorMode` (`status`|`fixed`), `accentColor`, `zoneFill` (%), `zoneBorder` (auto/solid/dashed/none), `zoneBrackets`. Frame uses fixed color when set but the status dot + alert halo always show real status. Not built yet: KPI aggregation in header (flow/pressure/MNF for DMA).
- **Undo/redo** (see gotcha #7): store history + TopBar buttons + Cmd+Z / Cmd+Shift+Z. Coalesced so one drag/resize = one step.

## How to add things (recipes)
- **New symbol for a type**: add to `SchematicGlyph`/`NodeGlyph` in ScadaNodeFrame, or add variants to `SCHEMATIC_VARIANTS` + labels (auto-gives a Symbol Style picker). viewBox 64×64, currentColor, connection stubs to edges.
- **New persisted binding display field**: type → `useScadaDiagram` unfold+fold → drawer control. No migration.
- **New node type**: `ScadaNodeType` union → `GENERIC_NODE_TYPES` (registry) → optional NODE_CATALOG palette entry → optional glyph/variants.
- **Aggregate/live behavior**: key it on the real `nodeType`, read runtime from `useRuntimeStore.nodeRuntimeMap[nodeId]`.
- **Build/seed a diagram programmatically (from real inventory)**: `PUT /api/scada/diagrams/{id}` with body `{ diagram:{name,projectId,diagramCode:null,status,canvasConfig:{},runtimeConfig:{}}, nodes:[...], edges:[...] }` (replaces all). Node = `{id,type,label,position:{x,y},size:{width,height},zIndex,style,config,bindings}`; binding = `{id,bindingKey,sensorChannelId,displayLabel,unitOverride,isPrimary,priorityOrder,showTrend,trendHours,transform:{chartType,gaugeMin,gaugeMax}}` (fold display fields into `transform`). Edge = `{id,source,target,edgeType:'pipe',pipeType,flowDirection,animated,style,config:{pathMode,sourceHandle,targetHandle,strokeWidth}}` — handles are `t/r/b/l`. Auth: `Authorization: Bearer <JWT>` (ask the user for a token; API is 401 without it). Data sources: nodes+GPS via `GET /api/nodes?idProject=<pid>` (`latitude`/`longitude`/`address`), channels via `GET /api/scada/binding-options?ownerId=<oid>` (`idSensorChannel`/`metricCode`/node). Map geo→canvas: `x = lng→right`, `y = lat with NORTH at top` (higher/less-negative lat → smaller y). Verify by DB (creds in iot-backend-go `.env`, Postgres): `SELECT node_type,count(*) FROM scada_nodes WHERE id_scada_diagram=... GROUP BY node_type;`. Note: `crypto.randomUUID()`/`Math.random()` are fine in the app; only workflow-script sandboxes block them.

## Embed auth handshake (Angular ⇄ SCADA iframe)
The Angular app embeds SCADA in an iframe and passes the JWT via `postMessage({type:'scada-auth',token}, scadaUrl)`. SCADA's `AuthGate` attaches a `message` listener then posts `{type:'scada-ready'}` to the parent. **The parent MUST respond to `scada-ready` by (re)sending the token with force (bypassing any `tokenSent` guard) and target `event.source`** — otherwise the initial on-iframe-load send races ahead of the child listener, is lost, and SCADA hangs on "Waiting for authentication…" until reload. Both embed points fixed: `iot-angular` `pages/.../analytics-page.component.ts` (desktop) and `mobile/projects/tabs/project-scada/project-scada.component.ts` (mobile). SCADA token store (`services/auth.service.ts`) has a memory fallback when localStorage is blocked (cross-origin iframe on mobile Chrome).

**Fullscreen inside the iframe**: the native Fullscreen API (`documentElement.requestFullscreen()` in `ViewNavControls`) is unreliable on mobile/iOS inside an iframe — a CSS "fullscreen" only fills the iframe's box, not the device screen. Fix: SCADA's `EmbedFullscreenBridge` (App.tsx) posts `{type:'scada-fullscreen', value}` to the parent on every `isFullscreen` change; the Angular parent expands the iframe container to `position:fixed; inset:0` over the mobile chrome (`.m-scada-embed--full`, mobile component handles the message). Native FS is kept for desktop.

## Related
Memory: `scada-roadmap.md` (progress log, PDAM domain). Backend SCADA module: iot-backend-go `app/{http/controllers,services,models,dto}/scada/`.
