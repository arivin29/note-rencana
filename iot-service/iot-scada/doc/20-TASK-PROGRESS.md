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
- [x] `src/components/NodeLibraryDrawer.tsx` — n8n-style drawer dengan search, grouping, SVG icons
- [x] `src/components/InspectorPanel.tsx` — NodeInspector + EdgeInspector (edit mode)
- [x] `src/pages/LoginPage.tsx` — form login dark industrial
- [x] `src/pages/DiagramListPage.tsx` — grid card diagram, create modal, archive (via SDK)
- [x] `src/pages/DiagramPage.tsx` — engine view+edit, shortcuts, discard confirm, empty overlay
- [x] `src/App.tsx` — BrowserRouter + AuthProvider + RequireAuth + routes

### Phase 6b: Node Config & Edge Config Drawers
- [x] `src/components/NodeConfigDrawer.tsx` — full node config drawer (General | Bindings | Appearance tabs)
  - [x] General: label, type, size, position, zIndex
  - [x] Bindings: channel lookup, display label, unit override, precision, isPrimary
  - [x] Appearance: render mode (card/schematic), label/value placement, icon, colors, border, opacity
- [x] `src/components/EdgeConfigDrawer.tsx` — edge config slide-over (12 handle ports, border, pipe type, path mode, flow, animation)

### Phase 6c: Visual Enhancement — Schematic Mode & 3D Pipe
- [x] `ScadaNodeFrame.tsx` — dual render mode (card + schematic P&ID SVGs 64×64)
- [x] `ScadaNodeFrame.tsx` — 12 handles per node (top×3, right×3, bottom×3, left×3)
- [x] `PipeEdge.tsx` — 7-layer 3D pipe effect (highlight, main, shade, inner glow, specular, end caps, flow)
- [x] `PipeEdge.tsx` — edge border/stroke config, label/value position, flow animation
- [x] Edge action buttons (delete + edit config) on selected edge in edit mode

### Phase 6d: PDAM Equipment & Sensor Expansion
- [x] 13 PDAM equipment node types: aerator, filter, clarifier, chemical_dosing, blower, check_valve, ground_tank, elevated_tank, distribution, meter, prv, sludge, motor
- [x] 13 SchematicGlyph SVGs (64×64 P&ID style) + 13 NodeGlyph SVGs (24×24 card mode)
- [x] 17 PDAM sensor categories: orp, color_ptco, iron, manganese, ammonia, hardness, alkalinity, bod, cod, residual_chlorine, run_hours, energy, vibration, head_loss, ssi, totalizer, valve_position, pump_status
- [x] All registered in registry.ts + ScadaNodes.tsx factory + sensorCategories.tsx
- [x] Total: 25 node types, 37 sensor categories

### Phase 6e: UX Bug Fixes & Polish
- [x] Tooltip z-index fix — portal to `document.body` with `position: fixed`, z-index 99999
- [x] Tooltip close button fix — race condition resolved, explicit × close, anchor exclusion
- [x] Render mode Card/Schematic button fix — `getStyleConfig()` was missing renderMode + labelPlacement fields
- [x] NodeLibraryDrawer redesign — n8n-style full-height drawer with:
  - [x] Search input with auto-focus, highlight matching, clear button
  - [x] 7 collapsible category groups (Sumber Air, Pengolahan Air, Mekanikal, Valve & Kontrol, Instrumen, Distribusi, Display & Label)
  - [x] Actual SVG node icons per item (from NodeGlyph + ExtraGlyph)
  - [x] Color-coded category badges with custom SVG category icons
  - [x] Backdrop overlay, slide-in animation, Esc to close
  - [x] Empty state with search feedback

---

## 🔲 BELUM SELESAI — Next Steps

### Phase 7: BindingEditor
- [x] Buat `BindingEditor` component di NodeConfigDrawer
  - [x] Lookup binding options via `scadaBindingOptionsControllerFindAll` (SDK)
  - [x] Form: pilih channel, set displayLabel, unitOverride, precision, isPrimary
  - [x] Add / Remove binding ke node yang dipilih
  - [x] Mark binding sebagai primary

### Phase 8: UX Polish
- [x] Node tooltip ringan di view mode (klik node = mini card info + live value via portal)
- [x] Edge delete UI (action buttons on selected edge in edit mode)
- [x] NodeConfigDrawer — full 3-tab config (General, Bindings, Appearance)
- [x] EdgeConfigDrawer — 12 handle config, border, pipe type, path mode
- [x] NodeLibraryDrawer — n8n-style grouped drawer with search + SVG icons
- [x] Save toast notification — non-blocking success/error via portal (Toast.tsx + Zustand store)
- [x] `RuntimeBanner` — banner strip di bawah TopBar saat polling error / bindings degraded (offline/stale)
- [x] Diagram settings panel — popover dari TopBar name click (edit name, description, status)
- [ ] Responsive: minimal usable di tablet (view mode only)

### Phase 9: Backend Minor Fix
- [ ] Tambah validasi `nodeType` enum di `ScadaDiagramsService.validateUpdatePayload`
- [ ] Tambah `@ApiResponse` di `ScadaRuntimeController`

### Phase 10: Verifikasi End-to-End
- [ ] Login → list → buat diagram baru
- [ ] Tambah node Pump + Valve → connect pipe → save
- [ ] Reload halaman → pastikan tersimpan
- [ ] Runtime polling tampil live value dari sensor
- [ ] Toggle view/edit → dirty state confirm bekerja

---

## 🧪 TEST CHECKLIST — Manual Testing

> Credential: `tebo@iot.local` / `Admin123!`
> Frontend: `http://localhost:4001` (atau port aktif)
> Backend: `http://localhost:3000`

### T-01: Auth Flow ✅❌
- [v ] Buka app → redirect ke `/login`
- [v ] Login dengan credential di atas → redirect ke `/` (diagram list)
- [v ] Refresh halaman → tetap login (token tersimpan)
- [ ] Klik area user/logout → session clear, redirect ke login

### T-02: Diagram List Page ✅❌
- [v ] Halaman list tampil tanpa error
- [v ] Diagram yang sudah ada tampil di grid card
- [v ] Setiap card tampilkan: nama, status badge, node/edge count, updated date
- [ ] Tombol "View" navigasi ke `/diagrams/:id/view`
- [ v] Tombol "Edit" navigasi ke `/diagrams/:id/edit`

### T-03: Create Diagram ✅❌
- [v ] Klik "New Diagram" → modal muncul
- [ v] Owner ID otomatis terisi dari user yang login
- [v ] Dropdown Project tampil dari API `/api/owners/:ownerId/projects`
- [v ] Pilih project → value yang dikirim adalah UUID (bukan nama)
- [ v] Isi nama, klik Create → berhasil buat diagram baru
- [ v] Langsung navigate ke halaman edit diagram tersebut
- [ v] Test juga tanpa project (field kosong) → tetap berhasil

### T-04: Archive Diagram ✅❌
- [ v] Di list page, hover card → tombol archive (trash) muncul
- [ ] Klik archive → confirm dialog → diagram hilang dari list

### T-05: Canvas Edit Mode ✅❌
- [ v] Halaman edit (`/diagrams/:id/edit`) tampil canvas + tool rail (kiri) + top bar
- [ v] Canvas bisa pan (drag background) dan zoom (scroll)
- [ v] Tombol Fit View (Shift+F) membuat canvas fit ke semua nodes

### T-06: Add Node ✅❌
- [v] Klik tombol "+" di tool rail → Node Library drawer terbuka (n8n-style)
- [v] 25 tipe komponen tampil dalam 7 kategori (Sumber Air, Pengolahan Air, Mekanikal, Valve, Instrumen, Distribusi, Display)
- [v] Search filter berfungsi (highlight match text)
- [v] Setiap item tampil SVG icon (bukan teks abbreviation)
- [v] Klik salah satu → node muncul di canvas
- [v] Node baru otomatis terpilih (selected state visible)
- [v] Test tambah beberapa node dari tipe berbeda

### T-07: Move & Resize Node ✅❌
- [ ] Drag node → posisi berubah
- [ ] Node punya handle (titik konektor) di 4 sisi: atas, bawah, kiri, kanan

### T-08: Connect Nodes (Pipe Edge) ✅❌
- [ ] Drag dari handle satu node ke handle node lain → pipe edge terbentuk
- [ ] Pipe default berwarna (raw=biru atau treated=hijau)
- [ ] Edge bisa di-select (klik)

### T-09: Delete Node / Edge ✅❌
- [ ] Select node → tekan Delete atau klik delete di tool rail → node hilang
- [ ] Select edge → tekan Delete → edge hilang
- [ ] Delete node yang punya edges → edges juga ikut hilang

### T-10: Inspector Panel (Node) ✅❌
- [ ] Select node di edit mode → Inspector panel kanan muncul
- [ ] Inspector tampilkan: label (editable), width, height, position
- [ ] Edit label → blur → label berubah di canvas
- [ ] Tampilkan list bindings (jika ada)
- [ ] Tampilkan runtime values (jika ada dari polling)

### T-11: Inspector Panel (Edge) ✅❌
- [ ] Select edge di edit mode → Edge Inspector muncul
- [ ] Bisa ubah: pipe type (raw/treated), flow direction, animated toggle
- [ ] Ubah pipe type → warna edge berubah
- [ ] Toggle animated → animasi flow muncul/hilang

### T-12: Save & Dirty State ✅❌
- [ ] Tambah/edit node → "•" dirty indicator muncul di TopBar
- [ ] Klik Save (atau Ctrl/Cmd+S) → diagram tersimpan ke backend
- [ ] Dirty indicator hilang setelah save berhasil
- [ ] Save button disabled saat tidak dirty

### T-13: Reload Persistence ✅❌
- [ ] Save diagram → refresh halaman (F5)
- [ ] Semua nodes, edges, posisi, label → tetap sama seperti sebelum refresh
- [ ] Label yang diedit tetap tersimpan

### T-14: View Mode ✅❌
- [ ] Navigasi ke `/diagrams/:id/view` → canvas fullscreen, tanpa tool rail
- [ ] Tidak bisa drag/add/delete node (read-only)
- [ ] Pan & zoom masih berfungsi
- [ ] Top bar tampilkan nama diagram + runtime indicator

### T-15: Mode Toggle ✅❌
- [ ] Dari view mode → klik "Edit" → pindah ke edit mode
- [ ] Dari edit mode tanpa perubahan → klik "View" → langsung pindah
- [ ] Dari edit mode DENGAN perubahan → klik "View" → discard confirm dialog muncul
- [ ] Pilih "Discard" → perubahan hilang, pindah ke view
- [ ] Pilih "Cancel" → tetap di edit mode
- [ ] Pilih "Save & Exit" → save lalu pindah ke view

### T-16: Runtime Polling ✅❌
- [ ] Di view/edit mode → cek TopBar, indikator runtime: "Live" / "Polling..." / "No data"
- [ ] Jika ada sensor binding → value tampil di node
- [ ] Jika tidak ada binding → node tetap tampil tanpa error
- [ ] Jika backend mati → indicator berubah ke "Runtime error"
- [ ] Console: tidak ada infinite loop / error spam

### T-17: Keyboard Shortcuts ✅❌
- [ ] `Ctrl/Cmd + S` → trigger save (edit mode)
- [ ] `Shift + F` → fit view
- [ ] `Delete/Backspace` → hapus selected items (edit mode)
- [ ] `V` → select tool
- [ ] `A` → toggle add component drawer

### T-18: Empty & Error States ✅❌
- [ ] Buka diagram yang tidak ada ID-nya → error state tampil dengan retry
- [ ] Diagram baru tanpa nodes → "Canvas kosong" overlay tampil
- [ ] Backend mati saat load → error banner + retry button
- [ ] Backend mati saat save → save error message tampil

### T-19: Browser Warning ✅❌
- [ ] Edit diagram (dirty state) → coba close tab / navigasi away
- [ ] Browser menampilkan "Leave site?" / "Changes you made may not be saved" warning
- [ ] Test sdk:update (fetch + generate ulang SDK)
