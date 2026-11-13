# SCADA backlog — known UI / perf / correctness debt (audit 2026-11-13)

Prioritized. When you fix one, delete it here and note it in `iot-scada/doc/20-TASK-PROGRESS.md`.
Line numbers are approximate (as of commit cad3e7a).

## P0 — visible bugs
- **Invalid color concat**: `accentColor + '15'` (`ScadaNodeFrame.tsx:~1855`) and `${accentColor}55` drop-shadow (`:~1997`) → when accentColor is `var(--status-*)` the CSS is invalid, badge bg / glow vanish. Fix with `color-mix()`.
- **ViewNavControls overlaps InspectorPanel** in edit mode (both `absolute ... right-4` in same container, `DiagramPage.tsx:186-205`) → zoom bar & minimap cover inspector footer. Offset by inspector width when open.
- **Trend token bypass**: `useTrendStore.ts:~46` reads `localStorage('scada_token')` directly → mobile iframe (localStorage blocked) gets 401, trends silently empty. Use `auth.service` getter.
- **Trend null→0**: `?? 0` before `!= null` filter (`useTrendStore.ts:72-75`) → false dips to zero.
- **Global keyboard handler** eats Cmd+Z / Delete inside inputs (`DiagramPage.tsx:~83`); Delete also double-handled with React Flow `deleteKeyCode`.
- **Stored XSS**: `customSvg` via `dangerouslySetInnerHTML` (`ScadaNodeFrame.tsx:2001,2232,2310`). Sanitize (strip script/on*/foreignObject/href=javascript).
- **DiagramListPage project dropdown empty in prod**: raw `fetch('/api/owners/${ownerId}/projects')` (`:91`) ignores `VITE_API_BASE_URL`.
- **Mobile "view-only" embed can toggle to Edit** — hide toggle when embedded in view mode (or role-gate).

## P1 — polish / consistency
- `accentColor` mengalahkan warna status alarm di dial/pompa (`ScadaNodeFrame.tsx` ~1793: `styleConfig.accentColor || catDef.color || pumpAccent || status…`) → alert/warn harus menang atas accent/kategori (QA monitor-tv-merangin 2026-11-13 P1-6b).
- Kiosk text boost (`--kiosk-text-boost`) only covers schematic info block, value_display, zone pill. **Card render mode** values/labels and the dial/tank value drawn inside the glyph are NOT boosted. Boosted info blocks can overlap neighbouring chips on tight layouts (e.g. FT label vs value chips below it in Merangin) → TV-variant diagram or collision-aware placement.
- Status badge `backgroundColor: accentColor + '15'` in schematic info block is invalid CSS when accent is `var(...)` → `color-mix()`.
- Status colors stale/offline/off inconsistent across tailwind / ScadaNodeFrame / ZoneNode → add `--status-stale/offline/off/unknown` vars and one `statusColor()` helper.
- `PIPE_COLORS` duplicated (PipeEdge vs InspectorPanel w/o `signal`); `SIGNAL_ENDPOINT_TYPES` duplicated (ScadaCanvas vs DiagramSettingsPanel) → single module.
- Handle CSS hex in `index.css` (`#30363d`, `#0ea5e9`, React Flow controls) → use tokens.
- 83 arbitrary `text-[Npx]` in NodeConfigDrawer, many 7–8px texts → define a type scale (10/11/12/13) in tailwind.
- `--text-muted` contrast ~4:1 on canvas, below 4.5:1.
- Handle hover `transform: scale(1.3)` overrides RF translate → handles jump. Use `scale` property or `translate(-50%,-50%) scale(1.3)`.
- Tooltip doesn't follow pan/zoom and isn't viewport-clamped (`ScadaNodeFrame.tsx:~1141`); closes on mousedown only (touch).
- Selection lost after store edits (`toFlowNode` rebuild w/o `selected`, `ScadaCanvas.tsx:~124`).
- Empty-canvas hint uses `getState()` in render (non-reactive).
- `F` key toggles CSS fullscreen flag while button uses native API → desync.
- ToolRail tooltips advertise V/A, nav +/- shortcuts that don't exist.
- No back-to-list button in TopBar.
- Save/load toasts always generic: `customFetch` throws `{status,data}` not Error.
- Touch: handles only on hover; drawers fixed width (NodeLibraryDrawer `w-[340px]` no max-w).
- No `prefers-reduced-motion` for pulse / pipe flow animation. Only 3 aria attrs in app.

## P2 — performance (matters at 100+ nodes)
- Each node runs 3–5 `s.nodes.find()` selectors → O(N²) per store change. Pass data through RF `data` or a `Map` by id.
- No `memo` on node components.
- `nodeRuntimeMap` rebuilt every 5 s → all nodes re-render. Keep identity for unchanged entries.
- ZoneNode subscribes to whole `nodes` + runtime map.
- `useScadaDiagram` destructures whole store → DiagramPage re-renders on every mutation.
- `ViewNavControls` `useViewport` re-renders every pan frame (isolate zoom label).
- Runtime poll: no backoff, no `visibilitychange` pause.
- Trend: switch to lighter `/api/sensor-logs/telemetry/chart` endpoint.

## P3 — structure (do opportunistically, before big features in that file)
- Split `ScadaNodeFrame.tsx`: `glyphs/SchematicGlyph.tsx`, `glyphs/NodeGlyph.tsx`, `live/` (dial/pump/tank + resolvers), `NodeTooltipCard.tsx`, `InlineEditLabel.tsx`, `SchematicNode.tsx` vs `CardNode.tsx`, shared `NodeHandles` + `NodeToolbar` (12-handle block & toolbar duplicated). Dead local `glyph` at `:~1604`.
- Split `NodeConfigDrawer.tsx` by tab (`GeneralTab`, `BindingsTab` ~510 lines, `AppearanceTab` ~890 lines, `ZoneTab`) + shared `controls/` (SectionTitle, ToggleSwitch also duplicated in Inspector & EdgeConfigDrawer).
- Remove unused `Sparkline` component; fix or remove `npm run lint`.
- Angular listeners don't check `event.origin`; desktop doesn't handle `scada-fullscreen`; no token refresh.
