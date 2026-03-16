# SCADA Master Context

> Document type: Master context  
> Status: Active baseline  
> Scope: Ringkasan tunggal untuk memulai implementasi SCADA MVP

---

## 1. Tujuan dokumen

Dokumen ini adalah ringkasan utama seluruh keputusan SCADA MVP.

Gunanya:

- menjadi context utama sebelum coding
- mempermudah handoff
- mencegah keputusan penting tercecer di banyak dokumen
- menjadi baseline implementasi frontend, backend, dan database

Dokumen ini tidak menggantikan dokumen detail, tetapi menjadi pintu masuk utamanya.

---

## 2. Ringkasan produk

SCADA yang akan dibangun adalah modul web terpisah untuk:

- membuat diagram proses operasional PDAM secara visual
- menampilkan kondisi sensor realtime dalam konteks flow sistem
- membantu operator memahami kondisi sistem lewat topology, bukan hanya tabel atau grafik

SCADA ini berbeda dari widget builder existing:

- widget builder = report/chart/query-driven
- SCADA = topology-driven, asset-driven, realtime monitoring

---

## 3. Boundary produk MVP

### 3.1 Yang masuk MVP

- builder dan viewer sama-sama tersedia
- monitoring realtime
- save/load diagram
- binding node ke `sensor_channel`
- status visual dasar
- fullscreen operational UI

### 3.2 Yang tidak masuk MVP

- command/control device
- collaborative editing
- template engine
- versioning penuh
- alarm workflow lengkap
- websocket runtime
- export/reporting kompleks

### 3.3 Prinsip MVP

- sederhana dulu
- topology adalah pusat model
- runtime dipisah dari persisted diagram
- tidak mengganggu Angular existing

---

## 4. Integrasi dengan sistem existing

### 4.1 Frontend

- Angular existing tetap dipakai untuk admin/business flow
- SCADA dibuat sebagai app terpisah penuh
- Angular menampilkan list SCADA dari context detail project
- user membuka viewer/edit SCADA dari Angular

### 4.2 Backend

- backend SCADA dibuat sebagai module baru di backend existing
- tidak memakai domain `widget-builder`
- tetap reuse auth, project access, dan telemetry domain existing

### 4.3 Auth

- source of truth auth tetap terpusat
- fase awal buka SCADA dari link Angular
- jika shared cookie belum siap, pola yang direkomendasikan adalah launch token exchange

---

## 5. Domain model inti

Empat entity inti SCADA:

- `scada_diagrams`
- `scada_nodes`
- `scada_edges`
- `scada_node_bindings`

### 5.1 `scada_diagrams`

Menyimpan:

- metadata diagram
- owner/project context
- canvas config
- runtime config

### 5.2 `scada_nodes`

Menyimpan:

- tipe node
- posisi dan ukuran
- label
- relasi context ke node/sensor existing bila perlu
- style dan config visual

### 5.3 `scada_edges`

Menyimpan:

- source-target topology
- pipe type
- arah flow
- style dan config edge

### 5.4 `scada_node_bindings`

Menyimpan:

- binding key per node
- relasi ke `sensor_channel`
- label/unit override
- transform ringan

---

## 6. Relasi ke domain existing

SCADA tetap memakai source of truth existing:

- `owners`
- `projects`
- `nodes`
- `sensors`
- `sensor_channels`
- `sensor_types`
- `sensor_logs`

Prinsipnya:

- SCADA tidak menggandakan telemetry
- binding utama ke `sensor_channel`
- `sensor_types` dipakai sebagai metadata untuk category, unit, precision, dan presentasi

---

## 7. Database strategy

### 7.1 Pendekatan

Gunakan hybrid:

- relational untuk topology
- `jsonb` untuk config fleksibel

### 7.2 Yang relational

- diagram
- node
- edge
- binding
- foreign key ke owner/project/sensor_channel

### 7.3 Yang `jsonb`

- canvas config
- runtime config
- style node
- config node
- style edge
- config edge
- transform ringan binding

### 7.4 Yang tidak disimpan di DB SCADA

- runtime live value
- animation state runtime
- telemetry cache per polling

---

## 8. Save strategy

### 8.1 Keputusan utama

- MVP memakai full diagram save

### 8.2 Artinya

Saat user save:

- frontend mengirim snapshot diagram utuh
- backend sync diagram, node, edge, dan binding dalam satu transaction

### 8.3 Mengapa dipilih

- paling sederhana untuk MVP
- paling cocok untuk canvas editor
- lebih aman dibanding granular save pada fase awal

### 8.4 Autosave

- tidak dipakai di MVP

---

## 9. Runtime strategy

### 9.1 Keputusan utama

- runtime memakai batch polling by `diagramId`

### 9.2 Alur

1. frontend load diagram
2. frontend start polling
3. frontend request runtime by `diagramId`
4. backend hitung binding aktif dari diagram
5. backend query latest telemetry batch
6. backend return runtime payload flat per binding
7. frontend hitung visual state node

### 9.3 Nilai yang ditampilkan

- gunakan `value_engineered` sebagai nilai utama

### 9.4 Mengapa

- tidak perlu hitung ulang formula di frontend
- konsisten dengan pipeline telemetry existing

---

## 10. Status runtime

Status visual yang dibedakan:

- `ok`
- `warn`
- `alert`
- `off`
- `offline`
- `stale`
- `unknown`

### 10.1 Perbedaan penting

- `off` = non-running normal
- `offline` = koneksi/data tidak dapat dipercaya

### 10.2 Model internal yang direkomendasikan

- `connectivityState`
- `freshnessState`
- `operationalState`
- `visualState`

### 10.3 Keputusan MVP

- visual state dihitung di frontend
- threshold utama dibaca dari config node SCADA
- threshold sensor existing dipakai sebagai default/helper

---

## 11. UX mode view/edit

### 11.1 Prinsip utama

- satu engine halaman fullscreen
- route `view` dan `edit` tetap dipisah

### 11.2 View mode

- default mode
- bersih
- fokus monitoring
- tool edit tersembunyi

### 11.3 Edit mode

- tool rail kecil di kiri
- drawer/property panel on-demand
- save button manual
- dirty state terlihat

### 11.4 Mobile

- MVP fokus mobile view mode
- mobile edit tidak diprioritaskan

---

## 12. Frontend architecture

### 12.1 Stack

- React
- TypeScript
- React Flow
- Zustand
- Tailwind CSS

### 12.2 State separation

Pisahkan menjadi:

- `diagram persisted state`
- `runtime state`
- `UI state`

### 12.3 Store minimum

- `useDiagramStore`
- `useRuntimeStore`
- `useUiStore`

### 12.4 Prinsip penting

- runtime tidak boleh mengganggu topology editing
- save flow tidak boleh bercampur dengan polling state

---

## 13. Backend architecture

### 13.1 Module structure

Module minimum:

- `ScadaDiagramsController`
- `ScadaRuntimeController`
- `ScadaDiagramsService`
- `ScadaRuntimeService`
- `ScadaAccessService`
- `ScadaMapperService`

### 13.2 Prinsip penting

- diagram CRUD dipisah dari runtime
- full save harus transactional
- telemetry existing tetap source of truth

---

## 14. API contract minimum

Endpoint minimum:

- `GET /api/scada/diagrams`
- `POST /api/scada/diagrams`
- `GET /api/scada/diagrams/:diagramId`
- `PUT /api/scada/diagrams/:diagramId`
- `POST /api/scada/diagrams/:diagramId/duplicate`
- `DELETE /api/scada/diagrams/:diagramId`
- `GET /api/scada/diagrams/:diagramId/runtime`

### 14.1 Payload detail/save

- full diagram payload
- node membawa bindings nested

### 14.2 Payload runtime

- flat per binding
- frontend menghitung visual state akhir

---

## 15. Widget/node dasar MVP

Widget yang harus tersedia:

- Intake
- Pump
- Valve
- Flow Meter
- Pressure
- Reservoir
- WTP
- Junction

Visual edge utama:

- `PipeEdge`

Warna:

- `raw`: biru
- `treated`: hijau

---

## 16. Urutan implementasi yang direkomendasikan

Urutan aman:

1. backend schema dan CRUD
2. frontend canvas dan save/load
3. runtime polling
4. widget visual dasar
5. property editor
6. Angular launch integration
7. duplicate dan hardening

### 16.1 Yang jangan dibalik

- jangan mulai dari widget visual rumit
- jangan mulai dari auth integration detail
- jangan masuk alarm kompleks terlalu awal

---

## 17. Milestone implementasi

### Milestone 1

- DB schema selesai
- CRUD diagram selesai
- canvas save/load selesai

### Milestone 2

- runtime polling selesai
- live value tampil
- status dasar tampil

### Milestone 3

- widget visual dasar selesai
- property panel usable
- UX edit/view usable

### Milestone 4

- Angular integration selesai
- duplicate selesai
- hardening dasar selesai

---

## 18. Risiko utama

Risiko yang harus dijaga:

- full diagram sync salah
- runtime polling memicu rerender berat
- frontend mencampur runtime dan saved state
- backend SCADA meniru arsitektur widget-builder
- Angular integration menjadi blocker fondasi produk

---

## 19. Scope guard

Hal yang harus ditahan dari MVP:

- command/control
- collaborative editing
- template system
- versioning penuh
- websocket runtime
- alarm workflow penuh
- export kompleks

---

## 20. Dokumen referensi detail

Jika butuh detail lebih dalam, lihat:

- [01-MVP-BOUNDARY-CHECKLIST.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/01-MVP-BOUNDARY-CHECKLIST.md)
- [02-DOMAIN-MODEL-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/02-DOMAIN-MODEL-SCADA.md)
- [03-RUNTIME-DATA-FLOW-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/03-RUNTIME-DATA-FLOW-SCADA.md)
- [04-AUTH-INTEGRATION-BLUEPRINT.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/04-AUTH-INTEGRATION-BLUEPRINT.md)
- [05-DATABASE-STRATEGY-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/05-DATABASE-STRATEGY-SCADA.md)
- [06-TECHNICAL-DESIGN-OUTLINE.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/06-TECHNICAL-DESIGN-OUTLINE.md)
- [07-SAVE-STRATEGY-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/07-SAVE-STRATEGY-SCADA.md)
- [08-RUNTIME-STATUS-MODEL-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/08-RUNTIME-STATUS-MODEL-SCADA.md)
- [09-UX-VIEW-EDIT-MODE-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/09-UX-VIEW-EDIT-MODE-SCADA.md)
- [10-FRONTEND-ARCHITECTURE-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/10-FRONTEND-ARCHITECTURE-SCADA.md)
- [11-API-CONTRACT-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/11-API-CONTRACT-SCADA.md)
- [12-BACKEND-ARCHITECTURE-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/12-BACKEND-ARCHITECTURE-SCADA.md)
- [13-DB-SCHEMA-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/13-DB-SCHEMA-SCADA.md)
- [14-IMPLEMENTATION-PLAN-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/14-IMPLEMENTATION-PLAN-SCADA.md)
- [15-TASK-BREAKDOWN-SCADA-MVP.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/15-TASK-BREAKDOWN-SCADA-MVP.md)
- [16-EXECUTION-CHECKLIST-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/16-EXECUTION-CHECKLIST-SCADA.md)
- [17-DECISION-LOG-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/17-DECISION-LOG-SCADA.md)

---

## 21. Baseline implementasi

Saat mulai coding nanti, anggap baseline ini berlaku kecuali ada revisi eksplisit:

- monitoring only
- app terpisah dari Angular
- full diagram save
- batch runtime polling by `diagramId`
- binding utama ke `sensor_channel`
- React Flow + Zustand
- backend module baru di backend existing
- empat tabel inti SCADA

Dokumen ini adalah entry point utama untuk memulai implementasi.
