# SCADA Execution Checklist

> Document type: Execution checklist  
> Status: Draft for execution readiness  
> Scope: Checklist ringkas untuk memulai dan mengawal implementasi SCADA MVP

---

## 1. Tujuan dokumen

Dokumen ini adalah versi ringkas dari seluruh paket perencanaan SCADA.

Gunanya:

- memastikan implementasi dimulai dari fondasi yang benar
- mempermudah tracking progres
- mencegah loncat ke pekerjaan yang belum waktunya

---

## 2. Checklist pra-eksekusi

Sebelum mulai implementasi, pastikan ini sudah dianggap final:

- [ ] SCADA adalah app terpisah penuh dari Angular
- [ ] MVP fokus monitoring only
- [ ] builder dan viewer sama-sama masuk fase pertama
- [ ] binding utama berada di level `sensor_channel`
- [ ] runtime memakai batch polling by `diagramId`
- [ ] save strategy memakai full diagram save
- [ ] route `view` dan `edit` dipisah
- [ ] state frontend dipisah menjadi diagram, runtime, dan UI
- [ ] schema inti memakai 4 tabel:
  - `scada_diagrams`
  - `scada_nodes`
  - `scada_edges`
  - `scada_node_bindings`

---

## 3. Checklist backend foundation

- [x] buat module SCADA baru di backend existing
- [x] buat entity `scada_diagrams`
- [x] buat entity `scada_nodes`
- [x] buat entity `scada_edges`
- [x] buat entity `scada_node_bindings`
- [x] buat migration tabel dan index
- [x] buat DTO create/list/detail/update/duplicate
- [x] buat `ScadaAccessService`
- [x] buat `ScadaMapperService`

Catatan implementasi 2026-03-16:

- module backend SCADA sudah ada di `iot-backend/src/modules/scada`
- schema 4 tabel inti sudah dibuat dan sudah diterapkan langsung ke production DB via DDL terpisah
- endpoint lookup `GET /api/scada/binding-options` juga sudah ditambahkan untuk kebutuhan editor

Selesai jika:

- diagram bisa disimpan dan dibaca dari DB dengan shape yang benar

---

## 4. Checklist diagram CRUD

- [x] implement `POST /api/scada/diagrams`
- [x] implement `GET /api/scada/diagrams`
- [x] implement `GET /api/scada/diagrams/:diagramId`
- [x] implement `PUT /api/scada/diagrams/:diagramId`
- [x] implement `DELETE /api/scada/diagrams/:diagramId`
- [x] pastikan full diagram save transactional
- [x] pastikan detail diagram mengembalikan node + edge + bindings
- [x] pastikan validasi payload dasar berjalan

Catatan implementasi 2026-03-16:

- duplicate endpoint `POST /api/scada/diagrams/:diagramId/duplicate` juga sudah tersedia
- validasi payload full save sudah mencakup id stabil, self-loop edge, ukuran node, dan duplicate binding scope
- `diagramCode` dijaga unik per owner
- not-found diagram pada backend sekarang sudah mengembalikan `404`

Selesai jika:

- create, load, update, archive diagram berjalan end-to-end

---

## 5. Checklist frontend foundation

- [x] setup app shell fullscreen
- [x] setup routing `view` dan `edit`
- [x] setup React Flow canvas
- [x] buat `useDiagramStore`
- [x] buat `useRuntimeStore`
- [x] buat `useUiStore`
- [x] render diagram payload ke canvas
- [x] implement zoom, pan, fit view

Catatan implementasi 2026-03-16:

- app frontend React baru sudah dibootstrap di repo `iot-scada`
- shell fullscreen, route view/edit, dan canvas foundation sudah ada
- runtime polling hook dasar sudah ada
- build frontend awal sudah lulus
- viewport sekarang sudah punya control zoom/pan bawaan React Flow dan action `Fit View` dari tool rail
- root app dan alias route `demo` sekarang sudah resolve ke diagram valid pertama milik tenant, bukan hardcoded UUID palsu
- jika tenant belum punya diagram, launcher sekarang bisa membuat diagram draft pertama langsung dari frontend

Selesai jika:

- diagram dari backend bisa tampil di canvas fullscreen

---

## 6. Checklist editor foundation

- [x] implement toggle mode view/edit
- [x] implement node selection
- [x] implement edge selection
- [x] implement add node
- [x] implement connect edge
- [x] implement move node
- [x] implement delete node/edge
- [x] implement dirty state
- [x] implement save button
- [x] implement discard confirm
- [x] integrasikan full save/load

Catatan implementasi 2026-03-16:

- route view/edit sekarang sudah punya toggle via top bar
- editor foundation sudah mendukung selection, add node, connect edge, delete selection, drag node, dan save penuh ke backend
- dirty state dasar sudah berjalan untuk perubahan topology
- add node sekarang otomatis menseleksi node baru agar inspector langsung relevan
- reset dan pindah mode dari editor sekarang sudah dilindungi confirm saat ada perubahan lokal
- shortcut dasar editor sudah ada: `Ctrl/Cmd+S`, `Shift+F`, `Delete/Backspace`, `Escape`

Selesai jika:

- user bisa membuat dan menyimpan diagram secara manual

---

## 7. Checklist runtime foundation

- [x] implement `ScadaRuntimeService`
- [x] implement latest telemetry batch query
- [x] implement `GET /api/scada/diagrams/:diagramId/runtime`
- [x] buat polling loop frontend
- [x] map runtime response ke binding runtime state
- [x] tampilkan latest value ke node
- [x] tampilkan status dasar:
  - `ok`
  - `off`
  - `offline`
  - `stale`
  - `unknown`

Catatan implementasi 2026-03-16:

- endpoint runtime backend sudah tersedia di `GET /api/scada/diagrams/:diagramId/runtime`
- status backend saat ini sudah mengembalikan `ok`, `warn`, `alert`, `off`, `stale`, `offline`, `unknown`
- backend runtime sudah memanfaatkan `value_engineered`, quality flag, dan threshold channel
- payload runtime backend juga sudah mengembalikan `rawValue`, `connectivityState`, `freshnessState`, dan `summary`
- runtime frontend sekarang sudah polling per `diagramId`, memetakan binding runtime ke node, dan menampilkan live value/status di canvas

Selesai jika:

- diagram live dapat menampilkan data sensor realtime

---

## 8. Checklist widget visual

- [x] buat shared node frame
- [x] implement `pump`
- [x] implement `valve`
- [x] implement `flowmeter`
- [x] implement `pressure`
- [x] implement `reservoir`
- [x] implement `junction`
- [x] implement `intake`
- [x] implement `wtp`
- [x] implement `PipeEdge`
- [x] implement warna `raw` dan `treated`
- [x] implement animasi flow sederhana
- [x] implement schematic render mode (P&ID SVGs 64×64)
- [x] implement 3D pipe effect (7 layers: highlight, main, shade, inner glow, specular, caps, flow)
- [x] implement 12 handles per node (top×3, right×3, bottom×3, left×3)
- [x] implement 13 PDAM equipment types: aerator, filter, clarifier, chemical_dosing, blower, check_valve, ground_tank, elevated_tank, distribution, meter, prv, sludge, motor
- [x] implement 17 PDAM sensor categories: orp, color_ptco, iron, manganese, ammonia, hardness, alkalinity, bod, cod, residual_chlorine, run_hours, energy, vibration, head_loss, ssi, totalizer, valve_position, pump_status
- [x] total: 25 node types, 37 sensor categories

Catatan implementasi 2026-03-17:

- 13 equipment node types ditambahkan beserta SchematicGlyph (64×64) dan NodeGlyph (24×24) per type
- 17 sensor categories baru fokus kebutuhan PDAM (kualitas air, energi, mekanik, distribusi)
- semua terdaftar di registry.ts, ScadaNodes.tsx (factory pattern), sensorCategories.tsx
- canvas sekarang support dual render mode: card (default) dan schematic (P&ID symbol style)

Selesai jika:

- diagram terlihat seperti SCADA operasional, bukan graph editor generik

---

## 9. Checklist property panel

- [x] buat inspector context-sensitive
- [x] implement form property node dasar
- [x] implement form property edge
- [x] implement binding editor
- [x] implement threshold form dasar
- [x] implement diagram settings panel
- [x] implement NodeConfigDrawer (3-tab: General, Bindings, Appearance)
- [x] implement EdgeConfigDrawer (12 handle ports, border, pipe type, path mode, flow, animation)
- [x] implement NodeLibraryDrawer n8n-style (search, 7 category groups, SVG icons, backdrop)
- [x] implement Toast notification system (save success/error, non-blocking portal)
- [x] implement RuntimeBanner (polling error + degraded bindings strip)
- [x] implement DiagramSettingsPanel (edit name/description/status from TopBar)

Catatan implementasi 2026-03-17:

- NodeConfigDrawer sekarang punya 3 tab lengkap: General (label, type, size, position), Bindings (lookup channel, unit override, precision, isPrimary), Appearance (render mode card/schematic, label/value placement, icon, colors, border, opacity)
- EdgeConfigDrawer mendukung 12 handle port selection, border toggle/width/lineCap/borderRadius, pipe type, path mode, flow direction, animation
- NodeLibraryDrawer di-redesign menjadi n8n-style left drawer dengan search input (auto-focus, highlight match), 7 collapsible category accordion, actual SVG node icons per item, color-coded category badges, backdrop overlay, slide-in animation, Esc to close
- tooltip di view mode sekarang menggunakan createPortal ke document.body (z-index 99999) dengan explicit close button
- edge delete button sekarang muncul saat edge di-select di edit mode

Selesai jika:

- user bisa mengedit properti dasar tanpa menyentuh JSON mentah

---

## 10. Checklist Angular integration

- [ ] tampilkan list SCADA di detail project Angular
- [ ] buat action open viewer
- [ ] buat action open editor
- [ ] validasi auth/session flow lintas frontend
- [ ] validasi access by project berjalan

Catatan implementasi 2026-03-16:

- integrasi Angular tetap belum dikerjakan
- tetapi `iot-scada` sekarang sudah punya auth gate sementara:
  - login langsung ke endpoint existing `POST /api/auth/login`
  - fallback bearer token manual
  - fallback auto token via `VITE_SCADA_DEV_BEARER` di `.env.local`
  - validasi session via `GET /api/auth/me`
  - inject `Authorization: Bearer <token>` ke request SCADA frontend

Selesai jika:

- user bisa membuka SCADA dari Angular project detail

---

## 11. Checklist hardening

- [x] implement duplicate diagram
- [x] rapikan error state load/save/runtime
- [x] rapikan empty state
- [x] cek rerender/runtime performance dasar
- [x] cek UX saat network gagal
- [x] cek UX saat diagram kosong

Catatan implementasi 2026-03-16:

- stage sekarang sudah punya floating banner untuk load/save/runtime issue
- loading state dan empty diagram state dasar sudah ditampilkan sebagai overlay di canvas stage
- jika load diagram gagal sebelum snapshot awal didapat, stage sekarang menampilkan full-state error
- load diagram gagal sekarang punya tombol retry eksplisit
- runtime poll error sekarang tidak menimpa diagram load state dan ditandai sebagai `runtime degraded`
- registry custom node/edge sekarang tidak dibuat ulang tiap render untuk mengurangi churn render yang tidak perlu

Selesai jika:

- sistem cukup stabil untuk demo internal

---

## 12. Checklist scope guard

Pastikan ini tidak ikut masuk diam-diam ke MVP:

- [ ] command/control device
- [ ] collaborative editing
- [ ] template system
- [ ] versioning penuh
- [ ] alarm workflow lengkap
- [ ] websocket runtime
- [ ] export PNG/PDF kompleks
- [ ] mobile edit penuh

---

## 13. Definition of done per milestone

### Milestone 1

- [x] DB schema selesai
- [x] diagram CRUD selesai
- [x] canvas foundation selesai
- [x] save/load selesai

### Milestone 2

- [x] runtime endpoint selesai
- [x] polling frontend selesai
- [x] node live value tampil
- [x] status dasar tampil

### Milestone 3

- [x] widget visual dasar selesai
- [x] widget visual PDAM (13 equipment + 17 sensor categories) selesai
- [x] property panel usable
- [x] NodeConfigDrawer + EdgeConfigDrawer selesai
- [x] NodeLibraryDrawer n8n-style selesai
- [x] edit/view UX usable
- [x] tooltip + edge delete UX selesai

### Milestone 4

- [ ] Angular integration selesai
- [ ] duplicate selesai
- [x] error handling dasar rapi
- [ ] siap demo internal

---

## 14. Red flags saat eksekusi

Jika ini mulai terjadi, berarti implementasi mulai keluar jalur:

- [ ] frontend mulai memanggil telemetry per node
- [ ] runtime state dicampur ke saved diagram state
- [ ] backend SCADA mulai meniru widget-builder
- [ ] save tidak lagi full diagram tetapi granular setengah jadi
- [ ] styling detail dikerjakan sebelum save/runtime stabil
- [ ] Angular integration menghambat fondasi SCADA app

---

## 15. Checklist review sebelum mulai coding

- [ ] nama tabel dan entity final sudah diterima

---

## 16. Snapshot progres backend per 2026-03-16

- `npm run build` di `iot-backend` lulus
- suite test backend SCADA terisolasi lulus
- global test suite backend existing masih banyak yang gagal karena spec lama di module lain belum sehat
- frontend React SCADA foundation, editor dasar, runtime polling, dan visual baseline sudah dikerjakan di thread ini
- [ ] route final sudah diterima
- [ ] API shape final sudah diterima
- [ ] status runtime baseline sudah diterima
- [ ] urutan implementasi sudah diterima

Jika lima poin ini sudah benar-benar disetujui, implementasi bisa dimulai tanpa risiko salah arah besar.
