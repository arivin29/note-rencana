# SCADA MVP — Task Checklist

## ✅ SELESAI — Foundation

### Phase 0: Backend Validation
- [x] Verifikasi backend build (port 3000, Swagger OK)
- [x] Analisa semua module SCADA (controller, service, entity, migration, DTO)
- [x] Identifikasi gap minor (nodeType validation, @ApiResponse)
- [x] Konfirmasi backend siap diintegrasikan

### Phase 1: Project Setup
- [x] Init Vite + React + TypeScript di `iot-scada/`
- [x] Setup Tailwind CSS v3 + PostCSS (`.cjs` fix untuk ESM compat)
- [x] Setup React Router v6
- [x] `vite.config.ts` — proxy ke backend port 3000, dev server port 4300
- [x] `tsconfig.json` + `tsconfig.node.json` — path alias `@/`
- [x] `index.html` — dark theme, Google Fonts (Inter + JetBrains Mono)
- [x] `tailwind.config.js` — custom SCADA industrial dark theme tokens
- [x] `src/index.css` — CSS vars, Tailwind directives, React Flow overrides

### Phase 2: Types & Stores
- [x] `src/types/scada.ts` — semua TypeScript types (Auth, Diagram, Node, Edge, Runtime, Binding)
- [x] `src/stores/useDiagramStore.ts` — meta, nodes, edges, dirty state, CRUD actions
- [x] `src/stores/useRuntimeStore.ts` — runtime data, polling status, nodeRuntimeMap
- [x] `src/stores/useUiStore.ts` — mode (view/edit), selection, inspector, tool, dialogs

### Phase 3: SDK Generation (Orval)
- [x] Install `orval` sebagai SDK generator
- [x] `scripts/fetch-spec.mjs` — download + filter (SCADA+Auth only) + deep-patch spec
- [x] `orval.config.ts` — generate ke `src/sdk/services.gen.ts` + `src/sdk/models/`
- [x] `src/sdk/client.ts` — custom fetch mutator (inject Authorization header)
- [x] `package.json` scripts: `sdk:fetch`, `sdk:generate`, `sdk:update`
- [x] Hapus manual API services (`scada-diagram.api.ts`, `scada-runtime.api.ts`, `scada-binding-options.api.ts`)
- [x] `src/services/auth.service.ts` — hanya token management (getToken, setToken, login, getMe)

### Phase 4: Hooks & Auth
- [x] `src/hooks/useScadaDiagram.ts` — load + save via generated SDK
- [x] `src/hooks/useRuntimePolling.ts` — polling 5s via generated SDK
- [x] `src/components/AuthGate.tsx` — AuthProvider + useAuth context

### Phase 5: Node Types, Edge, Canvas
- [x] `src/nodes/ScadaNodeFrame.tsx` — shared frame (SVG glyph, label, status ring, runtime value)
- [x] `src/nodes/ScadaNodes.tsx` — 8 node components (factory pattern)
- [x] `src/nodes/registry.ts` — nodeTypes map + NODE_LIBRARY metadata
- [x] `src/edges/PipeEdge.tsx` — custom pipe edge (raw=biru, treated=hijau, animated CSS)
- [x] `src/canvas/ScadaCanvas.tsx` — React Flow wrapper (store sync, drag, connect, fitView trigger)

### Phase 6: UI Components & Pages
- [x] `src/components/TopBar.tsx` — logo, diagram name, runtime indicator, save, mode toggle
- [x] `src/components/ToolRail.tsx` — floating tool panel kiri (select, add, fit, delete)
- [x] `src/components/ToolRail.tsx` > `NodeLibraryDrawer` — drawer pilih 8 tipe komponen
- [x] `src/components/InspectorPanel.tsx` — NodeInspector + EdgeInspector (edit mode)
- [x] `src/pages/LoginPage.tsx` — form login dark industrial
- [x] `src/pages/DiagramListPage.tsx` — grid card diagram, create modal, archive (via SDK)
- [x] `src/pages/DiagramPage.tsx` — engine view+edit, shortcuts, discard confirm, empty overlay
- [x] `src/App.tsx` — BrowserRouter + AuthProvider + RequireAuth + routes

---

## 🔲 BELUM SELESAI — Next Steps

### Phase 7: BindingEditor
- [ ] Buat `BindingEditor` component di InspectorPanel
  - [ ] Lookup binding options via `scadaBindingOptionsControllerFindAll` (SDK)
  - [ ] Form: pilih channel, set displayLabel, unitOverride, precision, isPrimary
  - [ ] Add / Remove binding ke node yang dipilih
  - [ ] Mark binding sebagai primary

### Phase 8: UX Polish
- [ ] Save error toast (non-blocking notification)
- [ ] Node tooltip ringan di view mode (klik node = mini card info + live value)
- [ ] `RuntimeBanner` — banner degraded/offline saat polling error
- [ ] Responsive: minimal usable di tablet (view mode only)
- [ ] Diagram settings panel (name, description, status di TopBar)

### Phase 9: Backend Minor Fix
- [ ] Tambah validasi `nodeType` enum di `ScadaDiagramsService.validateUpdatePayload`
- [ ] Tambah `@ApiResponse` di `ScadaRuntimeController`

### Phase 10: Verifikasi End-to-End
- [ ] Login → list → buat diagram baru
- [ ] Tambah node Pump + Valve → connect pipe → save
- [ ] Reload halaman → pastikan tersimpan
- [ ] Runtime polling tampil live value dari sensor
- [ ] Toggle view/edit → dirty state confirm bekerja
- [ ] Test sdk:update (fetch + generate ulang SDK)
