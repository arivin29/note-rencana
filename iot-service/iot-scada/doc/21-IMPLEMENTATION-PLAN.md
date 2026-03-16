# SCADA MVP — Rencana Implementasi (Updated 16 Mar 2026)

## Konteks Proyek

SCADA adalah **aplikasi terpisah** dari main Angular IoT platform. Dibangun dengan React + React Flow untuk fleksibilitas modifikasi diagram canvas. Backend SCADA sudah fully implemented dan divalidasi.

---

## Arsitektur Final (Sudah Diimplementasikan)

### Stack

| Layer | Teknologi | Keterangan |
|-------|-----------|------------|
| Build | Vite 6 + React 18 + TypeScript | Dev server port 4300 |
| Canvas | `@xyflow/react` (React Flow) | Custom nodes + edges |
| State | Zustand (3 stores) | Diagram, Runtime, UI |
| Routing | React Router v6 | View/Edit routes |
| Styling | Tailwind CSS v3 | Dark industrial theme |
| SDK | **Orval** (generated dari Swagger) | `npm run sdk:update` |
| Auth | JWT Bearer — localStorage | `src/services/auth.service.ts` |

### Struktur File Aktual

```
iot-scada/
├── package.json              # scripts: dev, sdk:fetch, sdk:generate, sdk:update
├── vite.config.ts            # proxy /api → localhost:3000, dev port 4300
├── tailwind.config.js        # SCADA dark theme tokens
├── postcss.config.cjs        # (CJS explicit agar kompatibel ESM package.json)
├── orval.config.ts           # SDK gen config → src/sdk/
├── scripts/
│   └── fetch-spec.mjs        # Download + filter + patch Swagger spec
└── src/
    ├── main.tsx              # Entry point
    ├── App.tsx               # Router + AuthProvider
    ├── index.css             # CSS vars + Tailwind + React Flow overrides
    │
    ├── types/scada.ts        # TypeScript types (manual, melengkapi SDK models)
    │
    ├── sdk/
    │   ├── client.ts         # Custom fetch mutator (inject Bearer token)
    │   ├── services.gen.ts   # Generated API functions (JANGAN diedit manual)
    │   └── models/           # Generated TypeScript types dari Swagger
    │
    ├── services/
    │   └── auth.service.ts   # Token management + login/getMe (tidak di-SDK)
    │
    ├── stores/
    │   ├── useDiagramStore.ts
    │   ├── useRuntimeStore.ts
    │   └── useUiStore.ts
    │
    ├── hooks/
    │   ├── useScadaDiagram.ts    # Load/save via SDK
    │   └── useRuntimePolling.ts  # Poll 5s via SDK
    │
    ├── components/
    │   ├── AuthGate.tsx          # AuthProvider + useAuth
    │   ├── TopBar.tsx            # Header app
    │   ├── ToolRail.tsx          # Tool panel kiri + NodeLibraryDrawer
    │   └── InspectorPanel.tsx    # Props panel kanan (node + edge)
    │
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── DiagramListPage.tsx
    │   └── DiagramPage.tsx       # Engine view+edit
    │
    ├── canvas/
    │   └── ScadaCanvas.tsx       # React Flow wrapper
    │
    ├── nodes/
    │   ├── ScadaNodeFrame.tsx    # Shared frame (glyph, status ring, value)
    │   ├── ScadaNodes.tsx        # 8 node components via factory
    │   └── registry.ts          # nodeTypes map + NODE_LIBRARY
    │
    └── edges/
        └── PipeEdge.tsx          # Custom pipe (raw=biru, treated=hijau)
```

---

## SDK Generation Workflow

```bash
# Satu perintah untuk update SDK setelah backend berubah:
npm run sdk:update

# Isi:
# 1. sdk:fetch  → download dari http://localhost:3000/api-json
#                 filter hanya SCADA + Auth endpoints
#                 deep-patch array tanpa items (bug Swagger NestJS generic DTO)
# 2. sdk:generate → orval baca /tmp/scada-api-spec.json → generate src/sdk/
```

> [!NOTE]
> SDK hanya di-generate untuk endpoint SCADA dan Auth. Module lain (owners, devices, dsb) **tidak disertakan** untuk menghindari schema bermasalah dari generic DTO.

---

## Next Steps — Yang Belum Selesai

### 1. BindingEditor (High Priority)
Tambah ke `InspectorPanel` saat node dipilih di edit mode:
- Lookup channel via `scadaBindingOptionsControllerFindAll` (SDK sudah tersedia)
- Form: channel selector, displayLabel, unitOverride, precision, isPrimary toggle
- Add/remove binding ke node

### 2. UX Polish (Medium)
- Save error toast (non-blocking)
- Node tooltip di view mode (klik = show live value card)
- `RuntimeBanner` degraded/error indicator
- Diagram settings panel (rename, ubah status)

### 3. Backend Minor Fix
- Validasi `nodeType` enum di `ScadaDiagramsService`
- Tambah `@ApiResponse` di `ScadaRuntimeController`

### 4. Verifikasi End-to-End
```bash
# Flow lengkap yang harus ditest:
# Login → List → Create → Add Nodes → Connect → Save → Reload → Runtime Live
```

---

## Backend SCADA — Status

| Komponen | Status |
|----------|--------|
| ScadaModule + semua entities | ✅ OK |
| Migration + 4 tabel | ✅ OK |
| 6 endpoint diagram + runtime + binding options | ✅ OK |
| Swagger spec (`/api-json`) | ✅ OK (minor schema issue di generic DTO, tidak blocking) |
| Backend port | `3000` (dikonfigurasi di `.env`) |

> [!IMPORTANT]
> Backend **tidak perlu diubah** untuk melanjutkan implementasi frontend. Fix minor (nodeType validation, @ApiResponse) bisa dilakukan belakangan.
