# Codex App Context For SCADA

> Document type: Codex working context  
> Status: Active  
> Scope: Context utama untuk thread implementasi SCADA di Codex app

---

## 1. Tujuan dokumen

Dokumen ini dipakai sebagai context awal saat memulai thread implementasi SCADA di Codex app.

Tujuannya:

- memberi boundary folder yang jelas
- menjelaskan relasi frontend SCADA, backend existing, dan Angular existing
- mencegah agent salah asumsi arsitektur
- mempercepat onboarding agent ke project

---

## 2. Struktur project yang relevan

### 2.1 Frontend SCADA

Frontend SCADA berada di:

`/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada`

Ini adalah aplikasi baru/terpisah untuk:

- SCADA builder
- SCADA viewer
- runtime UI
- fullscreen operational app

### 2.2 Backend existing

Backend existing berada di:

`/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-backend`

SCADA backend akan dibuat sebagai module baru di backend existing ini.

Backend existing juga merupakan source of truth untuk:

- owner
- project
- node
- sensor
- sensor_channel
- sensor_type
- sensor_logs
- auth existing

### 2.3 Angular existing

Angular existing berada di repo/workspace terpisah yang sudah berjalan.

Angular dipakai untuk:

- admin/business app
- detail project
- launcher menuju SCADA

Angular tidak menjadi shell UI SCADA.

### 2.4 Integrasi Angular dengan backend

Angular existing menggunakan SDK yang di-generate dari Swagger/OpenAPI backend.

Implikasi penting:

- perubahan API SCADA di backend nantinya idealnya ikut muncul di Swagger
- Angular dapat mengonsumsi API SCADA lewat SDK generated
- kontrak endpoint harus cukup stabil dan bersih

---

## 3. Posisi SCADA dalam arsitektur

SCADA adalah module eksternal tambahan, bukan pengganti sistem existing.

### 3.1 Prinsip

- SCADA frontend terpisah penuh dari Angular
- SCADA backend hidup sebagai module baru dalam `iot-backend`
- Angular hanya menjadi entry point bisnis
- telemetry existing tetap menjadi source of truth

### 3.2 Bukan tujuan project ini

- bukan menggabungkan SCADA ke layout Angular
- bukan mengubah widget builder menjadi SCADA
- bukan mengganti domain telemetry existing

---

## 4. Boundary implementasi

Saat bekerja di Codex app, boundary implementasi harus dianggap seperti ini:

### 4.1 Repo yang boleh diubah untuk SCADA

- `iot-scada`
- `iot-backend`

### 4.2 Repo yang jangan diubah tanpa instruksi eksplisit

- Angular existing

Angular boleh dibaca untuk referensi integrasi, tetapi jangan diubah kecuali user meminta jelas.

### 4.3 Rule penting

- jangan merusak domain existing di backend
- jangan mengubah widget-builder untuk memaksa jadi SCADA
- jangan mengubah Angular sebagai shell SCADA

---

## 5. Baseline keputusan produk

Keputusan inti yang sudah dikunci:

- SCADA MVP fokus monitoring only
- builder dan viewer sama-sama masuk fase pertama
- viewer fullscreen
- app SCADA terpisah dari Angular
- Angular menjadi launcher dari detail project
- binding utama di level `sensor_channel`
- runtime memakai batch polling by `diagramId`
- save strategy memakai full diagram save

---

## 6. Domain model inti

Entity inti SCADA:

- `scada_diagrams`
- `scada_nodes`
- `scada_edges`
- `scada_node_bindings`

Relasi ke existing:

- `scada_diagrams -> owners/projects`
- `scada_nodes -> nodes/sensors` optional context
- `scada_node_bindings -> sensor_channels`

Catatan:

- `sensor_types` dipakai sebagai metadata penting untuk category, unit, precision, dan presentasi

---

## 7. Runtime baseline

Runtime SCADA:

- polling batch
- endpoint by `diagramId`
- backend menghitung binding aktif
- frontend menghitung visual state node
- nilai utama yang ditampilkan adalah `value_engineered`

Status visual yang dibedakan:

- `ok`
- `warn`
- `alert`
- `off`
- `offline`
- `stale`
- `unknown`

---

## 8. Frontend baseline

Stack frontend SCADA:

- React
- TypeScript
- React Flow
- Zustand
- Tailwind CSS

State dipisah menjadi:

- persisted diagram state
- runtime state
- UI state

UX utama:

- satu engine halaman
- route `view` dan `edit` tetap dipisah
- mode edit memakai tool rail kiri kecil
- add/edit memakai drawer/property panel on-demand

Status implementasi frontend per 2026-03-16:

- frontend SCADA sudah mulai dibootstrap sebagai app React terpisah
- route `view` dan `edit` sudah ada
- canvas React Flow foundation sudah ada
- diagram store, runtime store, dan UI store sudah ada
- build frontend awal sudah berhasil
- editor foundation dasar juga sudah ada:
  - selection node/edge
  - add node
  - connect edge
  - delete selection
  - drag node
  - save penuh ke backend

---

## 9. Backend baseline

SCADA backend dibuat sebagai module baru di `iot-backend`.

Struktur minimum yang direkomendasikan:

- diagrams controller
- runtime controller
- diagrams service
- runtime service
- access service
- mapper service

Save diagram:

- full diagram save
- transactional

Runtime:

- latest telemetry batch dari domain existing

Status implementasi backend per 2026-03-16:

- module SCADA sudah dibuat di `iot-backend`
- diagrams CRUD backend sudah tersedia
- runtime endpoint backend sudah tersedia
- binding options lookup backend sudah tersedia
- test backend SCADA terisolasi sudah lulus

---

## 10. Database baseline

Strategi DB:

- relational untuk topology
- `jsonb` untuk config visual/fleksibel

Runtime live value tidak disimpan ke tabel SCADA.

Tabel inti:

- `scada_diagrams`
- `scada_nodes`
- `scada_edges`
- `scada_node_bindings`

---

## 11. API baseline

Endpoint minimum:

- `GET /api/scada/diagrams`
- `POST /api/scada/diagrams`
- `GET /api/scada/diagrams/:diagramId`
- `PUT /api/scada/diagrams/:diagramId`
- `POST /api/scada/diagrams/:diagramId/duplicate`
- `DELETE /api/scada/diagrams/:diagramId`
- `GET /api/scada/diagrams/:diagramId/runtime`

Lookup tambahan yang sudah tersedia:

- `GET /api/scada/binding-options`

Catatan penting:

- backend foundation sudah berjalan tanpa mengubah Angular existing
- schema inti sudah terpasang di database target

- detail/save memakai full diagram payload
- bindings nested di node untuk payload detail/save
- runtime response flat per binding
- endpoint harus cocok untuk Swagger/OpenAPI agar SDK Angular nanti bisa mengonsumsinya dengan rapi

---

## 12. Dokumen utama yang harus dibaca agent

Sebelum mulai implementasi, baca minimal:

- [18-MASTER-CONTEXT-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/18-MASTER-CONTEXT-SCADA.md)
- [17-DECISION-LOG-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/17-DECISION-LOG-SCADA.md)
- [16-EXECUTION-CHECKLIST-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/16-EXECUTION-CHECKLIST-SCADA.md)
- [15-TASK-BREAKDOWN-SCADA-MVP.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/15-TASK-BREAKDOWN-SCADA-MVP.md)

Jika pekerjaan spesifik:

- backend: baca [12-BACKEND-ARCHITECTURE-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/12-BACKEND-ARCHITECTURE-SCADA.md) dan [13-DB-SCHEMA-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/13-DB-SCHEMA-SCADA.md)
- frontend: baca [10-FRONTEND-ARCHITECTURE-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/10-FRONTEND-ARCHITECTURE-SCADA.md) dan [09-UX-VIEW-EDIT-MODE-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/09-UX-VIEW-EDIT-MODE-SCADA.md)
- API: baca [11-API-CONTRACT-SCADA.md](/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/11-API-CONTRACT-SCADA.md)

---

## 13. Rule kerja untuk Codex app

Saat agent mulai bekerja:

- baca context dulu, jangan langsung coding
- cek struktur repo yang relevan
- pastikan perubahan hanya di repo yang diizinkan
- jaga boundary SCADA tetap terpisah dari widget builder
- jika menyentuh backend API, perhatikan efek ke Swagger/OpenAPI
- jika menyentuh Angular nanti, pastikan via SDK generated, bukan coupling manual

---

## 14. Prompt template untuk memulai thread

Contoh prompt yang aman:

```text
Context:
- Frontend SCADA: /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada
- Backend existing untuk module SCADA: /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-backend
- Angular existing memakai SDK Swagger dari backend, jangan diubah dulu kecuali diminta
- Baca dulu /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/19-CODEX-APP-CONTEXT-SCADA.md
- Setelah itu baca /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/18-MASTER-CONTEXT-SCADA.md

Task:
Mulai dari milestone 1.
Fokus hanya backend foundation SCADA.
Jangan coding frontend dulu.
Jangan ubah Angular.
```

---

## 15. Prompt template backend-only

```text
Context:
- Repo backend: /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-backend
- Repo frontend SCADA: /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada
- Baca /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/19-CODEX-APP-CONTEXT-SCADA.md
- Baca /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/12-BACKEND-ARCHITECTURE-SCADA.md
- Baca /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/13-DB-SCHEMA-SCADA.md

Task:
Implementasikan entity dan migration SCADA sesuai dokumen.
Jangan sentuh frontend.
Jangan sentuh Angular.
```

---

## 16. Prompt template frontend-only

```text
Context:
- Repo frontend SCADA: /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada
- Backend existing hanya sebagai referensi API
- Angular jangan diubah
- Baca /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/19-CODEX-APP-CONTEXT-SCADA.md
- Baca /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/10-FRONTEND-ARCHITECTURE-SCADA.md
- Baca /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-scada/doc/09-UX-VIEW-EDIT-MODE-SCADA.md

Task:
Mulai implementasi frontend canvas foundation SCADA.
Jangan coding backend.
Jangan ubah Angular.
```

---

## 17. Final reminder

Saat mulai coding, anggap baseline ini berlaku kecuali ada revisi eksplisit:

- SCADA adalah module tambahan eksternal
- frontend SCADA terpisah
- backend SCADA module baru di `iot-backend`
- Angular existing memakai SDK Swagger/OpenAPI dari backend
- perubahan API backend harus tetap rapi untuk consumability SDK
- jangan memaksa integrasi rapat ke Angular sejak awal
