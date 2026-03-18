# SCADA Frontend Architecture

> Document type: Technical design draft  
> Status: Draft for discussion  
> Scope: Arsitektur frontend SCADA React untuk MVP

---

## 1. Tujuan dokumen

Dokumen ini mendefinisikan arsitektur frontend SCADA agar implementasi React:

- konsisten dengan keputusan UX dan domain model
- mudah dikembangkan
- tidak mencampur saved state dan runtime state
- tetap ringan untuk MVP

---

## 2. Baseline keputusan

Arsitektur frontend ini mengacu pada baseline berikut:

- SCADA app terpisah penuh dari Angular
- React + TypeScript
- React Flow sebagai canvas engine
- fullscreen operational app
- satu engine halaman untuk `view` dan `edit`
- route `view` dan `edit` tetap dipisah
- save strategy memakai full diagram save
- runtime memakai batch polling
- binding utama ke `sensor_channel`

---

## 3. Stack frontend yang direkomendasikan

- React
- TypeScript
- React Flow
- Zustand
- Tailwind CSS

Status implementasi 2026-03-16:

- app frontend baru sudah dibootstrap di repo `iot-scada`
- foundation saat ini memakai:
  - Vite
  - React
  - TypeScript
  - React Router
  - React Flow
  - Zustand
- styling foundation saat ini masih CSS app-level ringan, belum Tailwind penuh
- visual runtime baseline sekarang sudah langsung dirender di custom node/edge component
- auth sementara juga sudah ada di app SCADA sebelum integrasi launcher Angular

### 3.1 Peran tiap stack

React:

- UI composition
- node/edge rendering
- screen mode orchestration

TypeScript:

- kontrak type diagram
- kontrak payload API
- keamanan refactor

React Flow:

- node-edge canvas
- viewport
- selection
- interaction dasar

Zustand:

- editor state
- runtime state
- UI panel state

Tailwind CSS:

- styling cepat
- utility-based layout
- theme token SCADA

---

## 4. Prinsip arsitektur frontend

Prinsip yang direkomendasikan:

- canvas adalah pusat UI
- state dipisah berdasarkan concern
- node/edge visual tetap sederhana
- runtime update tidak boleh mengganggu edit state
- API layer jangan menyebar ke semua komponen

---

## 5. Struktur modul yang direkomendasikan

Struktur awal yang sehat:

```text
src/
├── app/
├── pages/
├── modules/
│   ├── scada-shell/
│   ├── canvas/
│   ├── diagram/
│   ├── nodes/
│   ├── edges/
│   ├── toolbar/
│   ├── properties/
│   ├── runtime/
│   ├── bindings/
│   └── alarms/
├── services/
├── stores/
├── hooks/
├── types/
├── utils/
└── styles/
```

Status implementasi 2026-03-16:

- struktur awal yang sudah dibuat:
  - `src/app`
  - `src/pages`
  - `src/modules/canvas`
  - `src/modules/diagram`
  - `src/modules/properties`
  - `src/modules/runtime`
  - `src/modules/scada-shell`
  - `src/modules/toolbar`
  - `src/services`
  - `src/stores`
  - `src/types`
  - `src/styles`

---

## 6. Tanggung jawab per modul

### 6.1 `pages`

Berisi route-level page:

- `ScadaViewerPage`
- `ScadaEditorPage`

Atau satu page engine dengan mode berbeda:

- `ScadaDiagramPage`

### 6.2 `modules/scada-shell`

Tanggung jawab:

- top bar
- mode indicator
- toggle edit
- save button
- layout fullscreen

### 6.3 `modules/canvas`

Tanggung jawab:

- React Flow wrapper
- viewport control
- zoom/pan
- selection handling
- keyboard shortcuts

### 6.4 `modules/diagram`

Tanggung jawab:

- diagram loading
- diagram save flow
- transform payload API ke state internal
- dirty state orchestration

### 6.5 `modules/nodes`

Tanggung jawab:

- semua SCADA node component
- node registry
- shared node frame behavior

### 6.6 `modules/edges`

Tanggung jawab:

- custom pipe edge
- pipe color
- direction indicator
- animation behavior

### 6.7 `modules/toolbar`

Tanggung jawab:

- floating tool rail kiri
- add node actions
- fit view
- delete/duplicate helper

Status implementasi 2026-03-16:

- tool rail dasar sudah aktif di mode edit
- action yang sudah ada:
  - add node
  - delete selection
  - mode toggle via top bar
  - fit view
- add node sekarang langsung diikuti auto-select ke node baru
- shortcut dasar editor sekarang juga ada: `Ctrl/Cmd+S`, `Shift+F`, `Delete/Backspace`, `Escape`

Status implementasi 2026-03-16 untuk `modules/nodes`:

- `modules/nodes/scada-node.tsx` sudah menjadi shared node frame awal
- node frame menampilkan glyph type, runtime badge, live value, dan freshness summary
- baseline visual yang sudah dicakup: `intake`, `pump`, `valve`, `flowmeter`, `pressure`, `reservoir`, `wtp`, `junction`

Status implementasi 2026-03-16 untuk `modules/edges`:

- `modules/edges/pipe-edge.tsx` sudah aktif sebagai custom edge utama
- warna pipa sudah dibedakan untuk `raw` dan `treated`
- arah flow sekarang ikut tampil di edge label
- animasi flow dasar sekarang aktif saat edge `animated = true`

### 6.8 `modules/properties`

Tanggung jawab:

- context-sensitive inspector
- node property form
- edge property form
- diagram settings panel

Status implementasi 2026-03-16:

- inspector panel dasar sudah context-sensitive terhadap selection
- panel diagram sudah bisa edit metadata dasar
- panel node sudah bisa edit label/type/size
- panel edge sudah bisa edit label/pipe type/flow direction
- binding editor dasar sudah tersambung ke lookup backend
- binding editor sekarang juga bisa mengubah display label, unit override, priority, dan primary flag
- threshold baseline channel sekarang ditampilkan di inspector sebagai referensi editor
- panel edge sekarang juga bisa toggle `animated` untuk flow visualization dasar

### 6.9 `modules/runtime`

Tanggung jawab:

- runtime polling
- runtime store
- status evaluation
- mapping binding ke node presentation state

Status implementasi 2026-03-16:

- polling runtime by `diagramId` sudah aktif
- snapshot runtime dipetakan ke node data sebelum render React Flow
- node membaca binding runtime primer untuk badge status dan live reading
- runtime error sekarang dipisah dari diagram load error agar UX failover lebih jelas

### 6.10 `modules/bindings`

Tanggung jawab:

- binding editor UI
- binding option resolver
- sensor channel lookup data

Status implementasi 2026-03-16:

- hook binding options dasar sudah dibuat
- lookup memakai `GET /api/scada/binding-options`
- picker saat ini masih sederhana, tetapi sudah cukup untuk foundation editor

### 6.11 `modules/alarms`

Untuk MVP tetap ringan:

- visual badge
- alarm strip ringan

Bukan full alarm engine.

---

## 7. Route architecture

Route yang direkomendasikan:

- `/scada/diagrams/:diagramId/view`
- `/scada/diagrams/:diagramId/edit`

### 7.1 Implementasi yang disarankan

Boleh memakai satu page component inti:

- `ScadaDiagramPage`

Dengan parameter mode:

- `view`
- `edit`

Ini konsisten dengan keputusan satu engine, dua mode.

Status implementasi 2026-03-16:

- route frontend sudah tersedia:
  - `/scada/diagrams/:diagramId/view`
  - `/scada/diagrams/:diagramId/edit`
- page engine yang dipakai saat ini adalah `ScadaDiagramPage`
- route ini sekarang dibungkus auth gate sementara di level app router
- root app dan alias `/scada/diagrams/demo/:mode` sekarang resolve ke diagram valid pertama dari `GET /api/scada/diagrams`
- jika list diagram kosong, launcher bisa membuat draft diagram pertama lalu redirect ke editor

---

## 8. State architecture

Ini bagian paling penting.

State frontend sebaiknya dipisah menjadi tiga lapisan:

- `diagram persisted state`
- `runtime state`
- `UI state`

### 8.1 Diagram persisted state

Berisi:

- diagram metadata
- nodes
- edges
- bindings
- selected saved snapshot
- working snapshot
- dirty state

### 8.2 Runtime state

Berisi:

- latest value per binding
- freshness info
- connectivity info
- visual state per node
- polling status
- last poll time

### 8.3 UI state

Berisi:

- selected node
- selected edge
- drawer open state
- inspector mode
- current tool
- zoom helper state

### 8.4 Kenapa harus dipisah

Kalau semua dicampur:

- save flow susah dipisah dari runtime
- rerender membesar
- debugging lebih sulit

---

## 9. Store design yang direkomendasikan

Zustand store minimal:

- `useDiagramStore`
- `useRuntimeStore`
- `useUiStore`

### 9.1 `useDiagramStore`

Tanggung jawab:

- set initial diagram
- update node
- update edge
- add/delete node
- add/delete edge
- update bindings
- mark dirty
- reset to saved

Status implementasi 2026-03-16:

- `useDiagramStore`, `useRuntimeStore`, dan `useUiStore` sudah dibuat
- diagram load hook dan runtime polling hook dasar juga sudah dibuat
- store diagram sekarang juga menangani:
  - add node
  - add edge
  - update node position
  - remove node
  - remove edge
  - commit hasil save ke snapshot saved
- commit saved snapshot
- stage canvas juga sudah menangani loading overlay dan empty diagram overlay

### 9.2 `useRuntimeStore`

Tanggung jawab:

- set runtime payload
- set binding values
- compute node status
- set polling state
- clear runtime

Status implementasi 2026-03-16:

- store runtime saat ini menyimpan snapshot hasil polling, status polling, dan error banner dasar
- store runtime sekarang juga memisahkan `diagramError`, `runtimeError`, dan `lastSuccessAt`

### 9.3 `useUiStore`

Tanggung jawab:

- current mode
- current selection
- drawer/panel visibility
- active tool
- dialog visibility

Status implementasi 2026-03-16:

- UI store saat ini juga memegang trigger `fitView` agar viewport action tidak mencampur diagram state

---

## 10. Node architecture

### 10.1 Node registry

Setiap node type sebaiknya diregister secara eksplisit:

- `intake`
- `pump`
- `valve`
- `flowmeter`
- `pressure`
- `reservoir`
- `wtp`
- `junction`

### 10.2 Shared node contract

Semua node component sebaiknya menerima:

- node config
- runtime snapshot node
- selection state
- mode

### 10.3 Kenapa ini penting

- konsisten antar node
- memudahkan status rendering
- memudahkan registry dan typing

---

## 11. Edge architecture

Untuk MVP, satu edge custom utama sudah cukup:

- `PipeEdge`

Edge menerima:

- pipe type
- animated
- flow direction
- visual status dasar

Rekomendasi:

- jangan terlalu banyak variasi edge di fase awal

---

## 12. Diagram data flow di frontend

### 12.1 Load flow

1. page mount
2. auth/context valid
3. fetch diagram detail
4. normalize payload
5. set `saved diagram state`
6. clone ke `working diagram state`
7. start runtime polling

### 12.2 Save flow

1. user edit working diagram
2. `isDirty = true`
3. user klik save
4. build full diagram payload
5. call save API
6. response sukses
7. replace `saved` and `working` snapshot
8. `isDirty = false`

Status implementasi 2026-03-16:

- sebelum reload tab atau pindah mode dari editor, user sekarang diperingatkan jika masih ada perubahan lokal

### 12.3 Runtime flow

1. runtime timer tick
2. request runtime by `diagramId`
3. update runtime store
4. compute visual state
5. nodes rerender seperlunya

---

## 13. Component rendering strategy

Agar render tetap sehat:

- React Flow memegang nodes dan edges visual
- runtime snapshot dipetakan ke data node yang dibutuhkan untuk render
- hindari memaksa seluruh page rerender tiap polling

Status implementasi 2026-03-16:

- canvas wrapper saat ini memang masih memetakan runtime ke nodes di page-level memo
- ini cukup untuk baseline MVP, tetapi masih perlu dicek lagi jika jumlah node sudah besar
- registry `nodeTypes` dan `edgeTypes` sekarang sudah distabilkan di module scope untuk mengurangi rerender noise

### 13.1 Prinsip render

- node hanya baca runtime yang relevan
- panel kanan hanya rerender saat selection berubah
- toolbar tidak ikut rerender karena polling

---

## 14. Inspector / property architecture

Inspector sebaiknya context-based.

### 14.1 Jika node dipilih

Tampilkan:

- basic info
- bindings
- thresholds
- visual config

Status implementasi 2026-03-16:

- inspector node saat ini sudah menampilkan editor bindings dan threshold baseline per channel

### 14.2 Jika edge dipilih

Tampilkan:

- pipe type
- direction
- animated
- style dasar

### 14.3 Jika tidak ada selection

Tampilkan:

- diagram settings
- atau panel kosong

---

## 15. Add component UX architecture

Untuk MVP, add component sebaiknya melalui:

- floating action di tool rail
- drawer/library panel on-demand

### 15.1 Library item contract

Setiap item library minimal punya:

- `type`
- `label`
- `icon`
- `defaultSize`
- `defaultConfig`

### 15.2 Action setelah add

Saat node ditambahkan:

- node muncul di canvas
- node otomatis terseleksi
- inspector langsung membuka property node

---

## 16. Frontend service layer

Service layer sebaiknya tipis dan terpusat.

Minimal service:

- `scadaDiagramApi`
- `scadaRuntimeApi`
- `scadaBindingApi` bila perlu lookup terpisah

Status implementasi 2026-03-16:

- service auth sementara juga sudah ditambahkan:
  - login ke `/api/auth/login`
  - profile check ke `/api/auth/me`
  - bearer token disimpan lokal untuk request SCADA frontend
  - fallback token dev juga bisa dibaca dari `VITE_SCADA_DEV_BEARER`
- launcher juga sudah memakai `GET /api/scada/diagrams` dan `POST /api/scada/diagrams` untuk bootstrap diagram pertama tenant

Jangan biarkan komponen UI memanggil fetch langsung secara acak.

---

## 17. Types yang harus didefinisikan

Type minimum yang perlu ada:

- `ScadaDiagramDto`
- `ScadaNodeDto`
- `ScadaEdgeDto`
- `ScadaNodeBindingDto`
- `ScadaRuntimeResponseDto`
- `ScadaNodeRuntimeState`
- `ScadaVisualState`
- `WidgetType` atau `ScadaNodeType`

---

## 18. Error and loading UX

Frontend harus menangani minimal:

- gagal load diagram
- gagal save diagram
- gagal polling runtime
- partial runtime issue

### 18.1 Rekomendasi perilaku

- diagram load gagal: tampil state error penuh
- save gagal: tampil notification dan pertahankan working state
- runtime gagal: tampil indicator runtime issue, jangan hilangkan diagram

Status implementasi 2026-03-16:

- jika load awal gagal, stage sekarang menampilkan full-state error
- save/runtime error saat diagram sudah ada tetap ditampilkan sebagai banner non-blocking
- load failure sekarang juga menyediakan action retry eksplisit dari stage overlay

---

## 19. Mobile approach

Untuk MVP:

- view mode tetap harus bisa dibuka di mobile
- edit mode tidak perlu jadi pengalaman utama di mobile

Frontend architecture harus memberi ruang:

- responsive shell
- inspector dapat berubah menjadi bottom sheet

Catatan UX implementasi 2026-03-16:

- mode `view` dan `edit` sekarang sudah terasa lebih tegas karena interaksi destructive tersimpan di mode edit
- viewer tetap bisa dipakai untuk inspect tanpa menampilkan tool rail editor

---

## 20. Hal yang masih perlu diputuskan di technical design final

- apakah satu page component atau dua page wrapper terpisah
- apakah React Query perlu dipakai untuk load/save diagram atau cukup service + Zustand
- apakah binding lookup dimuat sekaligus atau lazy
- bagaimana keyboard shortcut level MVP
- apakah undo/redo masuk fase awal atau sesudahnya

---

## 21. Rekomendasi keputusan default

Baseline frontend architecture yang direkomendasikan:

- React Flow menjadi pusat canvas
- satu engine page dengan mode `view/edit`
- route tetap dipisah
- state dipisah menjadi diagram, runtime, dan UI
- save memakai full diagram save
- runtime polling terpusat di module runtime
- inspector context-sensitive
- tool rail kiri kecil saat edit
- drawer/property panel on-demand

Catatan sementara 2026-03-16:

- sebelum Angular launcher diintegrasikan, auth bridge lokal di `iot-scada` dianggap solusi sementara yang aman untuk development dan demo internal
- `.env.example` dan `.gitignore` lokal juga sudah disiapkan agar bearer dev tidak masuk file tracked

Jika baseline ini diterima, langkah berikut yang paling logis adalah:

- `11-API-CONTRACT-SCADA.md`
- lalu `12-BACKEND-ARCHITECTURE-SCADA.md`
