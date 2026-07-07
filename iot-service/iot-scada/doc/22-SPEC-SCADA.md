# 22 — SPEC SCADA (Konsolidasi As-Built)

> Document type: Spesifikasi konsolidasi otoritatif
> Status: **Active — mencerminkan kondisi kode nyata per 2026-07-05**
> Scope: Seluruh aplikasi `iot-scada` (frontend React) + module SCADA di `iot-backend-go` + integrasi `iot-angular`
>
> Dokumen ini MENGGANTIKAN doc 01–21 sebagai referensi utama. Doc lama tetap berharga
> sebagai sejarah desain & decision log, tetapi beberapa klaimnya sudah usang
> (lihat §14 Gap). Semua klaim di dokumen ini diverifikasi langsung terhadap kode.

---

## 1. Ringkasan & Tujuan

**SCADA "Helios"** adalah aplikasi web fullscreen untuk membuat dan memonitor
diagram proses air PDAM secara visual (P&ID-style). Operator melihat kondisi
sensor realtime dalam konteks *flow* sistem (intake → WTP → reservoir →
distribusi), bukan sekadar tabel/grafik. Ini mendukung misi DEVETEK menekan NRW:
operator cepat melihat pompa mati, tekanan anomali, atau data telemetry yang stale.

- **Untuk siapa**: engineer/admin PDAM (builder diagram) dan operator/supervisor (viewer monitoring).
- **Posisi produk**: berbeda dari widget/dashboard builder (query-driven). SCADA = topology-driven, asset-driven.
- **Bentuk**: SPA React terpisah penuh dari Angular, di-deploy sendiri (Firebase Hosting), di-embed ke Angular via **iframe + postMessage token bridge**.
- **MVP boundary** (masih berlaku): monitoring only — tidak ada command/control device, tidak ada collaborative editing, tidak ada versioning/template.

---

## 2. Arsitektur

### 2.1 Stack aktual (as-built)

| Layer | Teknologi | Versi aktual | Referensi |
|---|---|---|---|
| Build | Vite | ^6.0.5 | `package.json:31` |
| UI | React + ReactDOM | **^18.3.1** (bukan 19) | `package.json:17-18` |
| Bahasa | TypeScript | ^5.7.2 | `package.json:30` |
| Canvas | `@xyflow/react` (React Flow) | ^12.10.1 | `package.json:16` |
| State | Zustand | ^5.0.3 | `package.json:20` |
| Routing | `react-router-dom` | **^7.1.1** (doc 21 bilang v6 — usang) | `package.json:19` |
| Styling | Tailwind CSS | ^3.4.16, dark industrial theme | `tailwind.config.js`, `src/index.css` |
| SDK | Orval (fetch client) | ^7.13.2 | `orval.config.ts`, `src/sdk/` |
| Backend | **iot-backend-go** (Goravel: Gin+GORM) | module `scada` | `iot-backend-go/routes/api.go:371-378` |
| Telemetry | PostgreSQL `sensor_logs` + **ClickHouse** (preferensi) | — | `scada_service.go:903-1001` |
| Deploy | Firebase Hosting | site `devetek-helios-scada`, project `iot-devetek` | `firebase.json`, `.firebaserc` |

> **PENTING — koreksi doc 19/21**: dokumen lama menyebut backend SCADA hidup di
> `iot-backend` (NestJS). Kenyataannya backend platform sudah migrasi ke
> **`/Users/arivin29macmini/Documents/DEVETEK/iot-backend-go`** (Goravel/Go) dan
> module SCADA sudah di-port ke sana:
> - Controller: `app/http/controllers/scada/scada_controller.go` (201 baris)
> - Service: `app/services/scada/scada_service.go` (1265), `scada_access.go` (71), `scada_mapper.go` (197)
> - Models: `app/models/scada/scada_{diagram,node,edge,node_binding}.go`
> - DTO: `app/dto/scada/scada_dto.go` (242)
> - Routes: `routes/api.go:371-378`

### 2.2 Diagram alur data (as-built)

```
┌─────────────┐  iframe /embed/:projectId/diagrams/:id/:mode
│ iot-angular  │──────────────────────────────────────────────┐
│ (launcher)   │  postMessage {type:'scada-auth', token}      │
│ desktop:     │◄── postMessage {type:'scada-ready'} ─────────┤
│  analytics-  │                                              ▼
│  page tab    │                                     ┌──────────────────┐
│ mobile:      │                                     │ iot-scada (React)│
│  project-    │                                     │ Firebase Hosting │
│  scada tab   │                                     └───────┬──────────┘
└──────┬──────┘                                              │ Bearer JWT
       │  /api/scada/diagrams?projectId=…                    │ (orval SDK / fetch)
       ▼                                                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│ iot-backend-go  (https://iot-backend.helios.vito.devetek.com)        │
│  /api/scada/*  → ScadaController → ScadaService                      │
│    CRUD diagram   → PostgreSQL (scada_* tables, transaksi penuh)     │
│    runtime        → ClickHouse argMax (fallback: PG DISTINCT ON)     │
│    binding-options→ join sensor_channels/sensors/nodes/projects      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.3 Hubungan antar repo

- **iot-scada** (repo ini): builder + viewer + runtime UI. Boleh jalan standalone (punya `/login` sendiri) atau embedded (route `/embed/...`, token dari Angular).
- **iot-backend-go**: satu-satunya backend. Semua endpoint SCADA JWT-protected, scoping owner di service layer.
- **iot-angular**: launcher & list per project. Desktop: tab "Analytics" di project-workspace (`iot-angular/src/app/pages/iot/projects/project-workspace/pages/analytics-page/analytics-page.component.ts`). Mobile Helios: tab SCADA (`iot-angular/src/app/mobile/projects/tabs/project-scada/project-scada.component.ts`). Angular memakai `ScadaService` manual (`iot-angular/src/app/services/scada.service.ts`) — **bukan** SDK ng-openapi-gen.

### 2.4 SDK generation (Orval)

- `npm run sdk:update` = `scripts/fetch-spec.mjs` (download `${BACKEND_URL}/api-json`, filter tag `SCADA`+`Auth`, deep-patch array tanpa `items`) → orval generate ke `src/sdk/services.gen.ts` + `src/sdk/models/` (`orval.config.ts`).
- Custom fetch mutator `src/sdk/client.ts:22-55`: inject `Authorization: Bearer`, prefix `VITE_API_BASE_URL`, wrap `{data, status, headers}`, lempar `{status, data}` saat non-2xx.
- **Catatan penting**: spec sumber historisnya Swagger NestJS. Model SDK (mis. `ScadaDiagramListItemResponseDto`) memakai field `id/ownerId/projectId`, sementara backend Go mengembalikan `idScadaDiagram/idOwner/idProject` untuk beberapa shape. Frontend menjembatani lewat normalizer manual (`src/hooks/useScadaDiagram.ts:17-76`, `src/pages/DiagramListPage.tsx:68-78`). Artinya `sdk:update` terhadap backend Go BELUM tentu menghasilkan model yang sama — perlakukan `src/sdk/` sebagai artefak beku yang dibaca lewat normalizer.

---

## 3. Domain Model

Empat entity inti (tak berubah dari doc 02/13): `scada_diagrams`, `scada_nodes`, `scada_edges`, `scada_node_bindings`. Binding runtime selalu ke `sensor_channels` existing; telemetry tetap source of truth di domain existing.

### 3.1 Tipe kunci frontend — `src/types/scada.ts`

```ts
// Diagram meta (scada.ts:18-30)
interface ScadaDiagramMeta {
  id; ownerId; projectId?; name; description?; diagramCode?;
  status: 'draft' | 'active' | 'archived';
  canvasConfig: CanvasConfig;      // zoom, viewport, grid, snap (scada.ts:32-39)
  runtimeConfig: RuntimeConfig;    // pollingIntervalMs, staleTimeoutMs, ... (scada.ts:41-46)
  createdAt; updatedAt;
}

// Node (scada.ts:166-179)
interface ScadaNodeDto {
  id; type: ScadaNodeType | string; label;
  position: {x,y}; size: {width,height};
  rotationDeg?; zIndex?; relatedNodeId?; relatedSensorId?;
  style?: Record<string,unknown>;   // NodeStyleConfig (scada.ts:297-315)
  config?: Record<string,unknown>;  // a.l. sensorCategory utk node 'sensor'
  bindings: ScadaNodeBinding[];     // nested — sesuai D-038
}

// Binding (scada.ts:153-164)
interface ScadaNodeBinding {
  id?; bindingKey; sensorChannelId; displayLabel?; unitOverride?;
  transform?; priorityOrder?; isPrimary?;
  showTrend?: boolean;   // sparkline trend di node  ← extension baru
  trendHours?: number;   // window trend (default 1 jam)
}

// Edge (scada.ts:187-207)
interface ScadaEdgeDto {
  id; source; target; sourceHandle?; targetHandle?;
  edgeType?; label?;
  pipeType?: 'raw'|'treated'|'waste'|'chemical'|'electrical'|'generic';
  pathMode?: 'smoothstep'|'bezier'|'straight'|'step';
  flowDirection?: 'forward'|'reverse'|'bidirectional'|'none';
  animated?; strokeWidth?; labelFontSize?;
  showBorder?; borderWidth?; lineCap?; borderRadius?;   // efek pipa 3D
  style?; config?;
}

// Runtime (scada.ts:219-257)
type RuntimeStatus = 'ok'|'warn'|'alert'|'off'|'stale'|'offline'|'unknown'
interface ScadaRuntimeResponse {
  diagramId; polledAt;
  bindings: ScadaRuntimeBindingDto[];   // flat per binding — sesuai D-039
  summary: { totalBindings; offlineBindings; staleBindings };
}
```

### 3.2 Node types

- **Union `ScadaNodeType`** mendeklarasikan **±60 tipe** (`scada.ts:64-141`), termasuk kelas future (dma, hydrant, wwtp, pipe fittings, solar_panel, dll.).
- **Yang benar-benar teregistrasi di canvas: 26 key** (`src/nodes/registry.ts:36-64`):
  - 8 inti: `intake, pump, valve, flowmeter, pressure, reservoir, wtp, junction`
  - Tambahan: `sensor` (icon per kategori), `heat_exchanger`, `text_label`, `value_display`
  - 13 PDAM: `aerator, filter, clarifier, chemical_dosing, blower, check_valve, ground_tank, elevated_tank, distribution, meter, prv, sludge, motor`
  - `unknown` = fallback (render sebagai junction, `ScadaNodes.tsx:109`)
- Tipe yang dideklarasi di union tapi tidak di registry akan jatuh ke fallback React Flow — **jangan tampilkan di library** sebelum diregistrasi.
- Node `sensor` membaca `config.sensorCategory` untuk memilih ikon/warna dari **±37 kategori sensor** (`src/nodes/sensorCategories.tsx`, 614 baris: flow, pressure, level, ph, chlorine, turbidity, orp, iron, manganese, ammonia, bod, cod, energy, vibration, totalizer, pump_status, dst.).
- `text_label` (anotasi teks murni, `src/nodes/TextLabelNode.tsx`) dan `value_display` (badge nilai live compact, `src/nodes/ValueDisplayNode.tsx`) adalah node display tanpa/dengan binding.

### 3.3 Render node — `src/nodes/ScadaNodeFrame.tsx` (2030 baris)

Semua node equipment memakai `ScadaNodeFrame` via factory `createScadaNode` (`ScadaNodes.tsx:19-46`). Dua **render mode** per node (`NodeStyleConfig.renderMode`, frame line 1445):

1. **`card`** (default) — kotak dark dengan glyph 24×24 (`NodeGlyph`), label, live value, status ring/dot.
2. **`schematic`** — simbol P&ID SVG 64×64 (`SchematicGlyph`, frame line 67+) full-bleed dengan *connection stubs* sampai tepi viewBox, label/value ditempatkan via `labelPlacement` (center/bottom/top/left/right, frame line 1540-1588).

Fitur frame lain: 12 handle per node (3 per sisi), inline label edit (edit mode), tooltip mini-card view mode via `createPortal` ke body (frame line 1109-1171), tombol delete/duplicate/configure saat selected, custom SVG icon (`iconMode:'custom'`), bgImage, opacity, border config, trend chart overlay (`TrendCard`) bila binding `showTrend` aktif (frame line 1437-1443, 1604-1635).

### 3.4 Edge — `src/edges/PipeEdge.tsx`

Satu edge type `pipe` (registry `PipeEdge.tsx:332-335`). Berlapis 8 layer: hit-area, selection glow, pipe wall (3D), pipe body, flow animation (CSS dash `pipeFlow`/`pipeFlowReverse`), center highlight, label+arah flow, dan action buttons (edit config/delete) saat selected di edit mode (`PipeEdge.tsx:284-326`). Warna per `pipeType` — 6 jenis, 3-tone fill/wall/glow (`PipeEdge.tsx:43-50`). Path mode: smoothstep/bezier/straight/step.

---

## 4. State Management (Zustand)

| Store | File | Isi | Catatan |
|---|---|---|---|
| `useDiagramStore` | `src/stores/useDiagramStore.ts` | `meta`, `nodes`, `edges` (working) + `savedNodes/savedEdges` (snapshot), `isDirty`, `isLoading/isSaving`, `loadError/saveError`; actions add/update/remove node/edge, `commitSave`, `resetToSaved` | Semua mutasi topology men-set `isDirty=true` |
| `useRuntimeStore` | `src/stores/useRuntimeStore.ts` | `runtime` (respons mentah), `nodeRuntimeMap` (nodeId→`NodeRuntimeState`), `isPolling`, `lastSuccessAt`, `pollingError` | `buildNodeRuntimeMap` memilih *primary binding* (lihat §6.2) |
| `useUiStore` | `src/stores/useUiStore.ts` | `mode` view/edit, selection, inspector target+pinned, tool aktif, drawer states (library/nodeConfig/edgeConfig), tooltip aktif (satu node saja), `fitViewTrigger`, discard dialog, runtime banner dismissed, diagram settings open, fullscreen, pan lock | UI murni, tidak pernah ikut disave |
| `useTrendStore` | `src/stores/useTrendStore.ts` | `trends` (channelId→sparkline points) + hook `useTrendPolling` | **Store ke-4, tidak ada di doc lama** |
| toast store | `src/components/Toast.tsx` | antrian toast (`toast.success/error`) | store kecil ke-5, portal ke body |

Pemisahan diagram-persisted / runtime / UI state (D-032) **terpenuhi**. Tambahan nyata: trend state terpisah lagi dari runtime.

Sinkronisasi store ↔ React Flow: `ScadaCanvas` memegang state lokal RF (`rfNodes/rfEdges`) dan menyinkronkan dua arah — store→RF saat load/add/remove/save; RF→store hanya saat drag **selesai** (position drag-end, `ScadaCanvas.tsx:135-159`) dan lewat `onDelete` eksplisit (`ScadaCanvas.tsx:198-216`, dengan guard `isDeleting` anti infinite-loop).

---

## 5. Runtime Data Flow

### 5.1 Polling

- `useRuntimePolling(diagramId)` — interval **hardcoded 5 detik** (`src/hooks/useRuntimePolling.ts:10`), aktif di **kedua mode** (view & edit) (`DiagramPage.tsx:43`).
- Endpoint: `GET /api/scada/diagrams/:diagramId/runtime` (SDK `scadaRuntimeControllerGetRuntime`).
- ⚠ `runtimeConfig.pollingIntervalMs` & `staleTimeoutMs` yang tersimpan di diagram **tidak dipakai** frontend maupun backend (lihat Gap G-3).

### 5.2 Backend runtime — `scada_service.go:486-536`

1. Validasi akses diagram (`assertDiagramAccess`).
2. Ambil semua binding aktif diagram (join `scada_node_bindings` × `scada_nodes`, order by `priority_order`).
3. Kumpulkan channel unik → `getLatestTelemetry` (`scada_service.go:903-915`):
   - **ClickHouse** bila available: `argMax(value_engineered, ts)` group by channel (`scada_service.go:963-1001`);
   - fallback **PostgreSQL**: `DISTINCT ON (id_sensor_channel) … ORDER BY ts DESC` (`scada_service.go:917-961`).
   - Nilai utama = `value_engineered` (D-021 terpenuhi), `value_raw` ikut sebagai `rawValue`.
4. **Status dihitung DI BACKEND** (`resolveRuntimeStatus`, `scada_service.go:1003-1024`):
   - `unknown` — tidak ada data;
   - `offline` — umur data > **15 menit**;
   - `stale` — umur data > **5 menit**;
   - `off` — `value == 0` dan `category` ∈ {status, state, boolean, switch, relay, power} (`isOffState:1066-1076`);
   - `alert` — nilai melewati `sensor_channels.min/max_threshold` (`isAlertState:1053-1064`);
   - `warn` — `quality_flag != 'good'`;
   - selain itu `ok`.
   - `freshnessState` = fresh/stale/offline/unknown; `connectivityState` diturunkan dari freshness (offline↔offline), **bukan** dari `nodes.connectivity_status`.
5. Response flat per binding + `summary {totalBindings, offlineBindings, staleBindings}` (`buildSummary:1040-1051`).

> Ini **deviasi sadar dari D-022** (dulu: "visual state dihitung frontend"). As-built: backend yang menghitung `status` per binding; frontend hanya memilih primary & merender. Prioritas visual di doc 08 (offline>stale>alert>warn>off>ok) **tidak diimplementasikan sebagai agregasi multi-binding** — status node = status primary binding.

### 5.3 Mapping ke node — `useRuntimeStore.buildNodeRuntimeMap` (`useRuntimeStore.ts:26-61`)

Per `nodeId`, semua binding dikumpulkan ke `allBindings`; *primary* dipilih dengan heuristik: binding pertama, atau `bindingKey === 'value'`, atau `isPrimary` (field ini **tidak dikirim** runtime response backend — lihat Gap G-4). Nilai primary (value/unit/precision/status/timestamp) dirender oleh `ScadaNodeFrame`/`ValueDisplayNode`.

### 5.4 Trend / sparkline — `useTrendStore.ts`

- Binding dengan `showTrend=true` di-poll terpisah tiap **60 detik** (`TREND_POLL_INTERVAL_MS:83`), fetch langsung `GET /api/sensor-logs?idSensorChannel=…&startDate=…&limit=120` (**di luar SDK orval**, `useTrendStore.ts:50-79`), dedup per channel, max 6 concurrent, reaksi cepat saat user baru men-toggle showTrend (subscribe store, line 166-176).
- Rendering: `TrendCard` (`src/components/TrendCard.tsx`, area chart + axis ringkas) di atas node, memakai `Sparkline` primitives (`src/components/Sparkline.tsx`).
- Kolom DB pendukung: `scada_node_bindings.show_trend`, `trend_hours` (`scada_node_binding.go:16-17`) — **extension di luar doc 13**.

### 5.5 Error & degradasi

- Runtime error tidak menjatuhkan diagram: `RuntimeBanner` (`src/components/RuntimeBanner.tsx`) menampilkan strip degraded/offline di bawah TopBar; indikator Live/Polling/Runtime error + ringkasan ok/offline/stale di `TopBar` (`TopBar.tsx:16-63`).
- Load error → full-state error + tombol Retry/Back (`DiagramPage.tsx:141-159`).

---

## 6. View vs Edit Mode / UX

Satu engine `DiagramPage` (`src/pages/DiagramPage.tsx`), mode dari route (D-027/D-028 terpenuhi):

- `/diagrams/:diagramId/view` dan `/diagrams/:diagramId/edit` (`App.tsx:59-75`)
- `/embed/:projectId/diagrams/:diagramId/view|edit` — untuk iframe Angular (`App.tsx:77-93`)
- `/login`, `/` (DiagramListPage), fallback `*→/`

**View mode**: canvas read-only (drag/connect/delete dimatikan via props React Flow, `ScadaCanvas.tsx:246-254`), klik node → tooltip mini-card (portal, satu-satunya yang aktif), `ViewNavControls` kanan-bawah (zoom ±, fit, persentase zoom, lock pan, fullscreen, MiniMap — `src/components/ViewNavControls.tsx`), fullscreen menyembunyikan TopBar dan menampilkan overlay jam+exit (`FullscreenOverlay`).

**Edit mode**: `ToolRail` kiri (select, add-node → NodeLibraryDrawer, fit view, delete selection — `src/components/ToolRail.tsx`), `InspectorPanel` kanan context-sensitive (node/edge/diagram, pinned behaviour di `useUiStore:89-136`), drawer besar:

- `NodeLibraryDrawer` (`src/components/NodeLibraryDrawer.tsx`, 445 baris) — n8n-style: search + highlight, 7 kategori collapsible (Sumber Air, Pengolahan Air, Mekanikal, Valve & Kontrol, Instrumen, Distribusi, Display & Label), ±28 item ber-icon SVG, backdrop, Esc.
- `NodeConfigDrawer` (`src/components/NodeConfigDrawer.tsx`, 1718 baris) — 3 tab: **General** (label, type, size, position, zIndex), **Bindings** (lookup channel via `GET /api/scada/binding-options`, displayLabel, unitOverride, precision, isPrimary, showTrend), **Appearance** (renderMode card/schematic, labelPlacement, icon builtin/custom SVG, warna, border, opacity, bgImage).
- `EdgeConfigDrawer` (`src/components/EdgeConfigDrawer.tsx`, 575 baris) — 12 handle ports, pipe type, path mode, flow direction, animasi, border/lineCap/borderRadius, label font size. Bisa dibuka via double-click edge (`ScadaCanvas.tsx:234-238`) atau tombol edit pada edge selected.
- `DiagramSettingsPanel` (`src/components/DiagramSettingsPanel.tsx`) — popover dari nama diagram di TopBar: edit name/description/status.

**Shortcut** (`DiagramPage.tsx:75-109`): `Ctrl/Cmd+S` save, `Shift+F` fit view, `F` fullscreen, `Esc` exit fullscreen, `Delete/Backspace` hapus selection.

**Proteksi perubahan**: dirty indicator, `beforeunload` warning (`DiagramPage.tsx:63-72`), discard confirm dialog (Cancel / Discard / Save & Exit, `DiagramPage.tsx:216-254`).

---

## 7. Persistence / Save Strategy

**Full diagram save** (D-016/D-017 terpenuhi; tanpa autosave):

1. Semua edit menumpuk di working state (`useDiagramStore`).
2. `save()` di `useScadaDiagram.ts:132-183` menyusun `UpdateScadaDiagramDto {diagram, nodes[], edges[]}` — binding nested di node.
   - Field edge "extended" (`sourceHandle, targetHandle, pathMode, strokeWidth, labelFontSize, showBorder, borderWidth, lineCap, borderRadius`) **dilipat ke `config` JSONB** saat save (`useScadaDiagram.ts:149-163`) karena tidak punya kolom DB; saat load di-unfold kembali (`normalizeEdge:54-76`). Ini kontrak internal penting — jangan ubah sepihak.
3. `PUT /api/scada/diagrams/:diagramId` → backend:
   - **Validasi** (`validateUpdatePayload`, `scada_service.go:676-796`): minimal **1 node** (⚠ diagram kosong tidak bisa disave — Gap G-5), name wajib, semua id UUID stabil & unik, label & size > 0 wajib, duplicate binding scope (`bindingKey::channelId`) per node ditolak, edge self-loop ditolak, edge harus refer node dalam payload, seluruh `sensorChannelId` diverifikasi eksis di `sensor_channels`. **Tidak ada validasi enum `nodeType`** (masih open, Phase 9 doc 20).
   - **Transaksi penuh** `BeginTransaction` (`scada_service.go:247` untuk update; `:361` untuk duplicate): update meta → upsert node → sync binding per node → sync edge → hard-delete child yang hilang dari payload.
4. Response = diagram final ternormalisasi → `commitSave` mengganti saved+working snapshot, `isDirty=false`, toast sukses.

Create (`POST`) menghasilkan diagram kosong berstatus `draft`; `DELETE` = archive (soft, `is_active=false`/status archived — `scada_service.go:468+`); `POST :id/duplicate` meng-clone diagram+node+edge+binding dengan id baru dalam transaksi (`scada_service.go:338-466`). `diagram_code` dijaga unik per owner (`ensureDiagramCodeAvailable:661`).

---

## 8. Kontrak API (as-built)

Semua endpoint JWT-protected, prefix `/api`, camelCase JSON. Definisi route: `iot-backend-go/routes/api.go:371-378`.

| Method | Path | Fungsi | Request | Response |
|---|---|---|---|---|
| GET | `/api/scada/diagrams` | list diagram | query `projectId?`, `ownerId?` (admin), `status?` | **array langsung** `ScadaDiagramListItemResponseDTO[]` — lihat catatan envelope |
| POST | `/api/scada/diagrams` | create | `{name, ownerId, projectId?, description?, status?, canvasConfig?, runtimeConfig?}` | 201, detail `{diagram, nodes:[], edges:[]}` |
| GET | `/api/scada/diagrams/:diagramId` | detail lengkap | — | `{diagram, nodes[≥bindings nested], edges}` |
| PUT | `/api/scada/diagrams/:diagramId` | full save | `{diagram, nodes[], edges[]}` | detail final tersimpan |
| POST | `/api/scada/diagrams/:diagramId/duplicate` | clone utuh | `{name, projectId?}` | 201, detail diagram baru |
| DELETE | `/api/scada/diagrams/:diagramId` | archive (soft) | — | pesan sukses |
| GET | `/api/scada/diagrams/:diagramId/runtime` | runtime batch | — | `{diagramId, polledAt, bindings[], summary}` (flat per binding) |
| GET | `/api/scada/binding-options` | lookup channel utk binding picker | query `ownerId?`, `projectId?`, `sensorTypeId?`, `search?` | array `ScadaBindingOptionItemDTO` (channel+sensor+node+project+sensorType+unit/precision/threshold) |

Endpoint existing lain yang dipakai frontend SCADA:

- `POST /api/auth/login`, `GET /api/auth/me` (`src/services/auth.service.ts:60-91`)
- `GET /api/owners/:ownerId/projects` — dropdown project di create modal (`DiagramListPage.tsx:91`)
- `GET /api/sensor-logs?idSensorChannel=…` — trend sparkline (`useTrendStore.ts:50-79`; ini memakai envelope list standar `{data, meta}`)

**Catatan envelope**: list SCADA mengembalikan **bare array** via `BaseController.Success` (`base_controller.go:20-22`), *bukan* envelope `{data, meta}` standar platform. Kedua konsumen defensif terhadap dua bentuk (`DiagramListPage.tsx:64-67`, Angular `scada.service.ts:52-55`). Single item dikembalikan langsung; error mengikuti kontrak platform `{statusCode, message, error}` via `apperr`/`ErrorFromService`.

**Aturan scoping per endpoint** (semua di service layer, `scada_access.go`):
- `resolveOwnerScope` (`scada_access.go:17-34`): **admin wajib kirim `ownerId`** untuk list/binding-options (403 jika tidak); tenant dipaksa ke `user.IDOwner` (mismatch → 403).
- `assertProjectAccess` (`:36-51`): project harus milik owner ybs (admin bebas).
- `assertDiagramAccess` (`:61-71`): admin lihat semua; tenant hanya diagram dengan `id_owner == user.IDOwner`. Berlaku untuk detail/update/duplicate/archive/runtime.

---

## 9. Auth & Multi-tenancy

### 9.1 Mode standalone

- Login form (`src/pages/LoginPage.tsx`) → `POST /api/auth/login` → `access_token` disimpan `localStorage['scada_token']` + fallback in-memory (untuk iframe cross-origin yang memblokir localStorage, `auth.service.ts:12-41`).
- Validasi session saat startup: `GET /api/auth/me` (`AuthGate.tsx:62-72`). Gagal → redirect `/login`.
- Dev fallback: `VITE_SCADA_DEV_BEARER` (env lokal, tidak di-track).

### 9.2 Mode embedded (Angular → iframe)

Handshake dua arah (mengatasi race condition mobile Chrome):

1. SCADA (iframe) load → kirim `postMessage({type:'scada-ready'}, '*')` ke parent (`AuthGate.tsx:53-56`).
2. Angular (parent) mengirim `postMessage({type:'scada-auth', token}, environment.scadaUrl)` — origin-targeted di sisi Angular (`analytics-page.component.ts:103-113`; mobile `project-scada.component.ts:64-72`).
3. SCADA menerima, `setToken` + `getMe` → authenticated (`AuthGate.tsx:30-59`).
4. Route embed tidak redirect ke login; menampilkan "Waiting for authentication…" (`App.tsx:27-34`).

⚠ Sisi SCADA **tidak memvalidasi `event.origin`** saat menerima `scada-auth` (`AuthGate.tsx:44-49`) — lihat Gap G-6.

> Keputusan lama D-008 (launch token exchange) **tidak diimplementasikan**; solusi as-built = share JWT via postMessage ke iframe. Pragmatis dan berjalan, tapi berbeda dari blueprint doc 04.

### 9.3 Multi-tenancy

JWT claims → `RequestUser{IDUser, IDOwner, Role}` (`scada_controller.go:138-144`). Admin lihat semua (list wajib beri `ownerId`); tenant selalu ter-scope ke `idOwner` sendiri. `ownerId` create diagram diambil otomatis dari user login di UI (`DiagramListPage.tsx:57`, Angular `analytics-page.component.ts:144`).

---

## 10. Skema DB (as-built, PostgreSQL)

Ground truth = GORM models `iot-backend-go/app/models/scada/`. Skema diterapkan ke production via **DDL terkontrol langsung** — tidak ada file migration scada di `iot-backend-go/database/` (catatan doc 15 B-006 masih akurat).

| Tabel | PK | Kolom penting | Ref |
|---|---|---|---|
| `scada_diagrams` | `id_scada_diagram` uuid | `id_owner` (NOT NULL, FK owners), `id_project` (nullable), `name`, `description`, `diagram_code` (unik per owner — app-level), `status` ('draft'), `canvas_config` jsonb, `runtime_config` jsonb, `is_active`, `created_by`, `updated_by`, timestamps | `scada_diagram.go:7-22` |
| `scada_nodes` | `id_scada_node` | `id_scada_diagram`, `node_type` varchar(50), `label`, `position_x/y`, `width/height`, `rotation_deg`, `z_index`, `id_related_node`, `id_related_sensor`, `style_json`, `config_json`, `is_active` | `scada_node.go:5-23` |
| `scada_edges` | `id_scada_edge` | `id_scada_diagram`, `source_node_id`, `target_node_id`, `edge_type` ('pipe'), `label`, `pipe_type`, `flow_direction`, `animated`, `style_json`, `config_json` (menampung sourceHandle/pathMode/border dll.), `is_active` | `scada_edge.go:5-20` |
| `scada_node_bindings` | `id_scada_node_binding` | `id_scada_node`, `binding_key`, `id_sensor_channel` (FK sensor_channels), `display_label`, `unit_override`, `transform_json`, `priority_order`, `is_primary`, `is_active`, **`show_trend`**, **`trend_hours`** | `scada_node_binding.go:5-20` |

Runtime live value **tidak pernah** disimpan ke tabel SCADA (D-014 terpenuhi). Telemetry dibaca dari `sensor_logs` (PG) / ClickHouse; metadata unit/precision/category/threshold dari `sensor_channels` + `sensor_types`.

---

## 11. Deployment & Environment

- **Hosting**: Firebase Hosting, site `devetek-helios-scada` (project `iot-devetek`), SPA rewrite `** → /index.html` (`firebase.json`). URL produksi: `https://devetek-helios-scada.web.app` — dirujuk Angular `environment.scadaUrl` (`iot-angular/src/environments/environment.ts:7`, `.prod.ts:4`; dev Go: `http://localhost:4300`).
- **API produksi**: `VITE_API_BASE_URL=https://iot-backend.helios.vito.devetek.com` (`.env.production`).
- **Dev**: `vite dev` port 4300, proxy `/api` → `VITE_PROXY_TARGET || http://localhost:3000` (`vite.config.ts:16-23`). Keys `.env` lokal: `VITE_API_BASE_URL`, `VITE_PROXY_TARGET` (tanpa secret ter-commit).
- **Build**: `npm run build` = `tsc -b && vite build` → `dist/`. Deploy: `firebase deploy` (manual; sudah pernah dilakukan — commit `b17bab8 feat: production deploy - Angular + SCADA to Firebase`).

---

## 12. Status Implementasi

Legenda: ✅ DONE (terverifikasi kode) · 🟡 PARTIAL · ⬜ PLANNED/BELUM.

| # | Fitur | Status | Referensi / catatan |
|---|---|---|---|
| 1 | Backend module SCADA di Go (controller/service/access/mapper/models/DTO) | ✅ | `iot-backend-go/app/{http/controllers,services,models,dto}/scada/` |
| 2 | 4 tabel inti + kolom trend | ✅ | models scada_*.go; DDL manual (tanpa file migration) |
| 3 | CRUD diagram: list/create/detail/update/archive/duplicate | ✅ | `routes/api.go:371-378`, `scada_service.go` |
| 4 | Full save transaksional + validasi payload | ✅ | `scada_service.go:229-336, 676-796` |
| 5 | Runtime endpoint by diagramId + status backend + summary | ✅ | `scada_service.go:486-536, 1003-1076` |
| 6 | Latest telemetry ClickHouse + fallback Postgres | ✅ | `scada_service.go:903-1001` |
| 7 | Binding options lookup | ✅ | `GET /api/scada/binding-options`, `scada_service.go:538+` |
| 8 | Scoping multi-tenant (admin/tenant) | ✅ | `scada_access.go` |
| 9 | React app: routing view/edit/embed, AuthGate, login page | ✅ | `App.tsx`, `AuthGate.tsx`, `LoginPage.tsx` |
| 10 | Diagram list page (grid, create modal, archive) | ✅ | `DiagramListPage.tsx` |
| 11 | Canvas React Flow: drag, connect, delete, selection, fit, zoom | ✅ | `ScadaCanvas.tsx` |
| 12 | 26 node types teregistrasi (8 inti + 13 PDAM + sensor + display) | ✅ | `registry.ts`, `ScadaNodes.tsx` |
| 13 | Dual render mode card/schematic (P&ID SVG 64×64) + 12 handles | ✅ | `ScadaNodeFrame.tsx:1445-1471`, glyph maps |
| 14 | ±37 sensor categories | ✅ | `sensorCategories.tsx` |
| 15 | PipeEdge 3D multi-layer + 6 pipe types + flow animation + path modes | ✅ | `PipeEdge.tsx` |
| 16 | TextLabelNode & ValueDisplayNode | ✅ | `TextLabelNode.tsx`, `ValueDisplayNode.tsx` |
| 17 | 4 store terpisah + toast store | ✅ | `src/stores/*`, `Toast.tsx` |
| 18 | Save UX: dirty state, Ctrl+S, discard confirm, beforeunload, toast | ✅ | `DiagramPage.tsx`, `useScadaDiagram.ts` |
| 19 | Runtime polling 5s + node live value + status ring/dot | ✅ | `useRuntimePolling.ts`, `ScadaNodeFrame.tsx` |
| 20 | RuntimeBanner degraded + TopBar live indicator | ✅ | `RuntimeBanner.tsx`, `TopBar.tsx` |
| 21 | Trend sparkline per binding (showTrend, poll 60s) | ✅ | `useTrendStore.ts`, `TrendCard.tsx`, `Sparkline.tsx` |
| 22 | NodeConfigDrawer 3-tab (General/Bindings/Appearance) | ✅ | `NodeConfigDrawer.tsx:21` |
| 23 | EdgeConfigDrawer (handle ports, border, path, flow) | ✅ | `EdgeConfigDrawer.tsx` |
| 24 | NodeLibraryDrawer n8n-style (7 kategori, search) | ✅ | `NodeLibraryDrawer.tsx` |
| 25 | View tooltip mini-card (portal, single-active) | ✅ | `ScadaNodeFrame.tsx:1109-1171` |
| 26 | ViewNavControls (zoom, minimap, lock pan) + fullscreen + jam | ✅ | `ViewNavControls.tsx` |
| 27 | Integrasi Angular desktop (tab Analytics, iframe + postMessage) | ✅ | `analytics-page.component.ts`, `scada.service.ts` |
| 28 | Integrasi Angular mobile Helios (tab SCADA, view-only) | ✅ | `mobile/projects/tabs/project-scada/` |
| 29 | Deploy Firebase Hosting + env produksi | ✅ | `firebase.json`, `.env.production` |
| 30 | Duplicate diagram — **UI** | 🟡 | endpoint+SDK ada (`services.gen.ts:665-673`); tombol duplicate **tidak ada** di UI (checklist doc 16 §11 klaim done — tidak akurat) |
| 31 | `runtimeConfig` per diagram (interval, stale timeout) dipakai runtime | ⬜ | tersimpan tapi diabaikan; interval FE hardcoded 5s, timeout BE hardcoded 5/15 mnt |
| 32 | Threshold per node SCADA (D-026: config node sebagai sumber utama) | ⬜ | alert memakai `sensor_channels.min/max_threshold`; threshold node-level belum dievaluasi |
| 33 | Agregasi status multi-binding dengan prioritas (doc 08 §8) | ⬜ | status node = primary binding saja |
| 34 | Validasi enum `nodeType` di backend | ⬜ | `validateUpdatePayload` tidak mengecek nodeType (Phase 9 doc 20 open) |
| 35 | Persist canvas viewport/zoom ke `canvasConfig` | ⬜ | tipe tersedia (`scada.ts:32-39`), tidak pernah ditulis dari canvas |
| 36 | Responsive tablet untuk edit mode | ⬜ | Phase 8 doc 20 unchecked; view mode di mobile berjalan via iframe |
| 37 | Launch token exchange (doc 04/D-008) | ⬜ | diganti pola postMessage JWT (as-built berbeda desain) |
| 38 | Command/control, collaboration, versioning, template, websocket, export | ⬜ | tetap out of scope (D-043) |
| 39 | Rotasi node (`rotationDeg`) dirender | ⬜ | kolom & DTO ada, frame tidak menerapkan transform rotate |
| 40 | E2E verification checklist (doc 20 §T-01…T-19) | 🟡 | sebagian tercentang (T-01…T-06); mayoritas belum ditandai |

---

## 13. Ketidaksesuaian Dokumen Lama vs Kode (koreksi resmi)

| Doc lama | Klaim | Kondisi nyata |
|---|---|---|
| 19/21 | Backend SCADA = `iot-backend` (NestJS), port 3000 | Backend aktif = **iot-backend-go** (Goravel). SDK orval dihasilkan dari spec era NestJS; frontend menormalkan field Go secara manual (`useScadaDiagram.ts:17-76`) |
| 21 | React Router v6, Vite proxy default | v7.1.1; proxy configurable `VITE_PROXY_TARGET` |
| 17 D-022 | Visual state dihitung frontend | Status per binding dihitung **backend** (`resolveRuntimeStatus`); frontend memilih primary |
| 17 D-026 | Threshold utama dari config node SCADA | Threshold alert dari `sensor_channels` (backend); node-level threshold belum dievaluasi |
| 04 / D-008 | Launch token exchange | Implementasi = iframe embed + postMessage JWT + handshake `scada-ready` |
| 16 §10 | Angular integration belum dikerjakan | **Sudah** — desktop & mobile (iframe embed) |
| 16 §11 | Duplicate diagram done | Backend done, **UI belum ada** |
| 10/18 | 3 store (diagram/runtime/ui) | 4 store + toast store (tambahan `useTrendStore`) |
| 03/12 | Latest value dari `sensor_logs` PG | ClickHouse jadi jalur utama, PG fallback |
| 11 §13 | Error shape `{statusCode, code, message, details}` | Mengikuti kontrak platform `{statusCode, message, error}` via `apperr` |
| 20 | 25 node types / 37 sensor categories | Registry aktual **26 key** (termasuk `unknown`, `text_label`, `value_display`, `heat_exchanger`, `sensor`); union TS mendeklarasi ±60 tipe (banyak belum teregistrasi) |

---

## 14. Gap, Risiko & Rekomendasi

**G-1 — SDK vs backend Go (risiko tertinggi).** `sdk:update` menunjuk `/api-json` dan spec era NestJS; model SDK tidak lagi 1:1 dengan respons Go, ditambal normalizer manual. Risiko: regen SDK merusak build, atau field baru backend tidak terlihat. *Rekomendasi*: bekukan `src/sdk/` (dokumentasikan "jangan regen tanpa cek"), atau sediakan OpenAPI spec resmi dari iot-backend-go lalu regen + hapus normalizer bertahap.

**G-2 — Envelope list non-standar.** `GET /api/scada/diagrams` mengembalikan bare array, menyimpang dari kontrak platform `{data, meta}`. Konsumen saat ini defensif, tapi konsumen baru bisa salah. *Rekomendasi*: saat menyentuh backend berikutnya, bungkus ke `{data, meta}` (perubahan aman karena kedua klien sudah menangani bentuk itu).

**G-3 — `runtimeConfig` mati.** `pollingIntervalMs`/`staleTimeoutMs` bisa diedit & tersimpan tapi tidak berpengaruh (FE hardcoded 5 dtk `useRuntimePolling.ts:10`; BE hardcoded 5/15 mnt `scada_service.go:1008-1012`). *Rekomendasi*: baca `runtimeConfig` di kedua sisi, atau sembunyikan field-nya agar tidak menyesatkan user.

**G-4 — Primary binding heuristik.** Runtime response tidak membawa `isPrimary`, sehingga `buildNodeRuntimeMap` memakai heuristik `bindingKey==='value'`/binding pertama (`useRuntimeStore.ts:47-57`). Node multi-binding bisa menampilkan nilai yang salah. *Rekomendasi*: tambahkan `isPrimary` (dan `priorityOrder`) ke `ScadaRuntimeBindingResponseDTO` backend — datanya sudah ada di tabel.

**G-5 — Diagram kosong tak bisa disave.** `validateUpdatePayload` mewajibkan ≥1 node (`scada_service.go:677-679`). Konsekuensi: user tidak bisa menyimpan perubahan metadata (rename via DiagramSettingsPanel) pada diagram baru yang masih kosong. *Rekomendasi*: longgarkan menjadi "nodes boleh kosong" atau pisahkan endpoint update meta.

**G-6 — postMessage tanpa cek origin.** `AuthGate.tsx:44-49` menerima `scada-auth` dari origin manapun; halaman jahat yang meng-embed SCADA bisa menyuntik token miliknya (dampak terbatas — token diberikan, bukan dicuri — tapi memungkinkan session fixation), dan `scada-ready` dikirim dengan target `'*'`. *Rekomendasi*: whitelist origin Angular (env `VITE_ALLOWED_PARENT_ORIGINS`) di kedua arah.

**G-7 — Status model belum sesuai spesifikasi doc 08.** Tidak ada agregasi multi-binding berprioritas; `warn` berarti "quality flag jelek", bukan "mendekati threshold"; threshold node-level (D-026) tidak ada. *Rekomendasi*: putuskan ulang secara eksplisit — kalau perilaku sekarang diterima, revisi D-022/D-026 di decision log; kalau tidak, implement agregasi di frontend (data `allBindings` sudah tersedia di store).

**G-8 — Duplikasi & konsistensi kecil**: (a) tombol Duplicate belum ada di UI meski API siap; (b) trend fetch bypass SDK dan menduplikasi logic token (`useTrendStore.ts:44-48`); (c) union `ScadaNodeType` mendeklarasi puluhan tipe yang belum teregistrasi — pangkas atau registrasi; (d) `rotationDeg` tidak dirender; (e) viewport/zoom tidak dipersist ke `canvasConfig`; (f) validasi enum `nodeType` backend belum ada (payload tipe ngawur tetap tersimpan, dirender sebagai `unknown`).

**G-9 — Testing.** Tidak ada automated test di repo `iot-scada`; checklist manual doc 20 §T sebagian besar belum tercentang. *Rekomendasi*: minimal jalankan checklist T-07…T-19 sekali penuh dan tandai hasilnya; pertimbangkan smoke test Playwright untuk flow login→create→add node→save→reload→runtime.

### Prioritas langkah berikutnya (disarankan)

1. **G-4 + G-5** (perubahan backend kecil, dampak UX langsung).
2. **G-6** (perbaikan keamanan murah).
3. **UI Duplicate** (API sudah ada — quick win) + selesaikan checklist E2E (G-9).
4. **G-1** (stabilkan strategi SDK sebelum fitur besar berikutnya).
5. Baru kemudian fitur fase-2 (alarm workflow, node-level threshold, mobile edit).

---

## 15. Peta File Cepat

```
iot-scada/
├── doc/01-21 …            # sejarah desain (baca dgn §13 dokumen ini sbg koreksi)
├── firebase.json, .firebaserc, .env.production
├── orval.config.ts, scripts/fetch-spec.mjs
├── vite.config.ts          # port 4300, proxy /api
└── src/
    ├── App.tsx             # routes: /login, /, /diagrams/:id/{view,edit}, /embed/...
    ├── types/scada.ts      # seluruh kontrak type frontend
    ├── sdk/                # orval generated (client.ts = mutator; JANGAN edit gen)
    ├── services/auth.service.ts
    ├── stores/useDiagramStore|useRuntimeStore|useUiStore|useTrendStore.ts
    ├── hooks/useScadaDiagram.ts (load/save+normalizer) · useRuntimePolling.ts (5s)
    ├── canvas/ScadaCanvas.tsx
    ├── nodes/ScadaNodeFrame.tsx (frame+glyphs) · ScadaNodes.tsx (factory)
    │        registry.ts · sensorCategories.tsx · TextLabelNode · ValueDisplayNode
    ├── edges/PipeEdge.tsx
    ├── components/ TopBar · ToolRail · NodeLibraryDrawer · InspectorPanel
    │        NodeConfigDrawer · EdgeConfigDrawer · DiagramSettingsPanel
    │        RuntimeBanner · Toast · TrendCard · Sparkline · ViewNavControls · AuthGate
    └── pages/ LoginPage · DiagramListPage · DiagramPage

iot-backend-go/ (module scada)
├── routes/api.go:371-378
├── app/http/controllers/scada/scada_controller.go
├── app/services/scada/{scada_service,scada_access,scada_mapper}.go
├── app/models/scada/scada_{diagram,node,edge,node_binding}.go
└── app/dto/scada/scada_dto.go

iot-angular/ (launcher)
├── src/app/services/scada.service.ts
├── src/app/pages/iot/projects/project-workspace/pages/analytics-page/…   (desktop)
└── src/app/mobile/projects/tabs/project-scada/…                          (mobile, view-only)
```
