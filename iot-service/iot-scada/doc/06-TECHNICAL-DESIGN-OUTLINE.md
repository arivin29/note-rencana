# SCADA Technical Design Outline

> Document type: Technical design outline  
> Status: Draft skeleton  
> Scope: Kerangka dokumen teknis implementatif untuk SCADA MVP

---

## 1. Tujuan dokumen

Dokumen ini adalah kerangka untuk technical design document SCADA MVP.

Fungsinya:

- mengubah hasil diskusi analisis menjadi struktur implementasi
- memastikan frontend, backend, dan database diturunkan dari baseline yang sama
- mempermudah penyusunan dokumen teknis detail berikutnya

Dokumen ini belum menjadi technical design final. Ini adalah outline kerja.

---

## 2. Referensi dokumen analisis

Dokumen teknis SCADA nanti harus merujuk ke:

- [01-MVP-BOUNDARY-CHECKLIST.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/01-MVP-BOUNDARY-CHECKLIST.md)
- [02-DOMAIN-MODEL-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/02-DOMAIN-MODEL-SCADA.md)
- [03-RUNTIME-DATA-FLOW-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/03-RUNTIME-DATA-FLOW-SCADA.md)
- [04-AUTH-INTEGRATION-BLUEPRINT.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/04-AUTH-INTEGRATION-BLUEPRINT.md)
- [05-DATABASE-STRATEGY-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/05-DATABASE-STRATEGY-SCADA.md)

---

## 3. Baseline keputusan yang sudah dianggap final

Technical design harus menganggap hal berikut sebagai baseline:

- SCADA adalah app terpisah penuh dari Angular
- Angular menjadi launcher dari detail project
- MVP fokus monitoring only
- builder dan viewer sama-sama masuk fase pertama
- viewer fullscreen
- binding utama berada di level `sensor_channel`
- `sensor_types` dipakai sebagai metadata unit, precision, dan category
- runtime memakai batch polling
- topology diagram dipisah dari runtime state
- persistence memakai hybrid relational + `jsonb`

---

## 4. Struktur technical design final yang direkomendasikan

Technical design final sebaiknya dibagi ke bagian berikut.

### 4.1 Overview

Isi:

- objective implementasi
- scope MVP
- non-goals
- dependency terhadap sistem existing

### 4.2 System context

Isi:

- posisi Angular existing
- posisi SCADA frontend
- posisi backend module SCADA
- relasi ke auth, project, node, sensor, telemetry

### 4.3 Frontend architecture

Isi:

- stack final
- route structure
- state management split
- canvas architecture
- node/edge rendering
- editor/viewer mode behavior

### 4.4 Backend architecture

Isi:

- module structure
- service responsibilities
- diagram CRUD flow
- runtime endpoint flow
- auth and access validation

### 4.5 Database design

Isi:

- tabel final
- field final
- indexes
- foreign keys
- migration strategy

### 4.6 Runtime flow

Isi:

- polling lifecycle
- diagram runtime loading
- latest value retrieval
- stale/offline handling
- frontend runtime mapping

### 4.7 API contract

Isi:

- diagram CRUD endpoints
- runtime endpoint
- request/response payload
- error response shape

### 4.8 UX flow

Isi:

- open viewer
- open editor
- toggle edit mode
- save flow
- property panel flow
- add node / connect edge flow

### 4.9 Security and permission

Isi:

- auth flow
- project access validation
- edit permission
- launch flow dari Angular

### 4.10 Delivery plan

Isi:

- implementation phase
- testing plan
- rollout strategy

---

## 5. Frontend technical design yang harus ditulis nanti

Bagian frontend nanti minimal harus menjawab:

- apakah React Flow dipakai langsung atau dibungkus adapter internal
- struktur folder final
- bagaimana register node types dan edge types
- bagaimana store dipisah antara diagram state dan runtime state
- bagaimana mode view dan mode edit berjalan di satu page
- bagaimana property panel bekerja
- bagaimana drawer add-widget bekerja
- bagaimana performa rerender dijaga

### 5.1 Modul frontend yang direkomendasikan

- `app-shell`
- `diagram-editor`
- `diagram-viewer`
- `canvas`
- `nodes`
- `edges`
- `bindings`
- `properties`
- `toolbar`
- `runtime`
- `api`
- `types`

---

## 6. Backend technical design yang harus ditulis nanti

Bagian backend nanti minimal harus menjawab:

- apakah SCADA dibuat sebagai module baru dalam backend existing
- controller apa saja yang dibutuhkan
- service apa saja yang dibutuhkan
- bagaimana diagram payload dibangun dari tabel relational
- bagaimana runtime batch endpoint bekerja
- bagaimana permission project/user dicek
- apakah runtime query mengambil latest langsung dari `sensor_logs`

### 6.1 Modul backend yang direkomendasikan

- `scada-diagrams`
- `scada-runtime`
- `scada-access`

Opsional setelah MVP:

- `scada-templates`
- `scada-alarms`
- `scada-versions`

---

## 7. Database technical design yang harus ditulis nanti

Bagian database nanti minimal harus menjawab:

- definisi final 4 tabel inti
- tipe kolom final
- foreign key final
- unique/index final
- soft delete/archive strategy
- migration naming dan urutan deploy

### 7.1 Tabel inti

- `scada_diagrams`
- `scada_nodes`
- `scada_edges`
- `scada_node_bindings`

---

## 8. API design yang harus ditulis nanti

API contract minimum yang perlu didefinisikan:

### 8.1 Diagram management

- create diagram
- get diagram list
- get diagram detail
- update diagram
- delete/archive diagram
- duplicate diagram

### 8.2 Editor payload

- save node changes
- save edge changes
- save binding changes

MVP bisa memilih:

- endpoint save full diagram
- atau endpoint granular

Technical design harus memutuskan salah satunya.

### 8.3 Runtime

- get runtime by diagram
- response shape untuk latest values
- stale/offline metadata

---

## 9. Hal yang masih perlu dikunci sebelum technical design final

Walau fondasi sudah kuat, masih ada beberapa hal yang harus diputuskan tegas di technical design:

- definisi final status `offline`, `warn`, `alert`, `off`
- bentuk route final editor dan viewer
- save strategy: full diagram vs granular
- duplicate diagram behavior final
- latest value query strategy final
- apakah page editor dan viewer benar-benar satu route engine atau dibedakan lebih keras
- apakah mobile hanya responsive read-only atau full edit support

---

## 10. Urutan penyusunan technical design final

Supaya tidak loncat-loncat, saya sarankan urutannya begini:

1. finalkan API style dan save strategy
2. finalkan database schema detail
3. finalkan frontend module structure
4. finalkan runtime endpoint dan query strategy
5. finalkan auth launch flow
6. finalkan delivery plan

---

## 11. Output dokumen teknis berikutnya yang paling masuk akal

Setelah outline ini, dokumen implementatif yang paling cocok dibuat adalah:

1. `07-FRONTEND-ARCHITECTURE-SCADA.md`
2. `08-BACKEND-ARCHITECTURE-SCADA.md`
3. `09-API-CONTRACT-SCADA.md`
4. `10-DB-SCHEMA-SCADA.md`

Urutan di atas cukup aman karena frontend dan backend akan merujuk API dan schema yang sama.

---

## 12. Rekomendasi langkah diskusi berikutnya

Kalau ingin terus bergerak tanpa terlalu cepat masuk coding, urutan diskusi paling efektif adalah:

1. finalkan save strategy
2. finalkan status model runtime
3. finalkan route dan UX mode edit/view
4. baru tulis frontend architecture detail

Ini akan mengurangi revisi silang antar dokumen.
