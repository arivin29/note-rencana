# SCADA Backend Architecture

> Document type: Technical design draft  
> Status: Draft for discussion  
> Scope: Arsitektur backend SCADA MVP di dalam backend existing

---

## 1. Tujuan dokumen

Dokumen ini mendefinisikan arsitektur backend untuk SCADA MVP agar:

- terpisah jelas dari widget/report builder
- tetap memanfaatkan domain telemetry existing
- mendukung full diagram save
- mendukung runtime polling by `diagramId`
- tidak mengganggu module existing

---

## 2. Prinsip arsitektur backend

Prinsip yang direkomendasikan:

- SCADA adalah bounded context baru
- module SCADA hidup terpisah dari widget builder
- telemetry existing tetap jadi source of truth runtime
- diagram persistence dan runtime service dipisah concern-nya
- save diagram berjalan dalam transaction

---

## 3. Posisi SCADA di backend existing

Rekomendasi:

- SCADA dibuat sebagai module/domain baru di backend existing

Bukan:

- memaksa logic SCADA masuk ke `widget-builder`
- atau langsung memecah jadi service terpisah dari hari pertama

### 3.1 Kenapa ini tepat untuk MVP

- reuse auth existing
- reuse access control existing
- reuse entity `owner`, `project`, `node`, `sensor`, `sensor_channel`, `sensor_log`
- deployment tidak bertambah rumit

### 3.2 Kenapa tetap dipisah dari widget-builder

Karena:

- model datanya berbeda
- flow save berbeda
- runtime flow berbeda
- purpose produk berbeda

---

## 4. Modul backend yang direkomendasikan

Untuk MVP, struktur minimal yang sehat:

- `scada.module`
- `scada-diagrams.controller`
- `scada-runtime.controller`
- `scada-diagrams.service`
- `scada-runtime.service`
- `scada-access.service`
- `scada-mapper.service`

Opsional:

- `scada-binding-options.service`

Status implementasi 2026-03-16:

- seluruh struktur minimum di atas sudah dibuat
- `scada-binding-options.service` dan controller lookup juga sudah dibuat

---

## 5. Tanggung jawab tiap service

### 5.1 `ScadaDiagramsService`

Tanggung jawab:

- list diagram
- create diagram
- get detail diagram
- update full diagram
- duplicate diagram
- archive diagram

### 5.2 `ScadaRuntimeService`

Tanggung jawab:

- load binding aktif berdasarkan `diagramId`
- query latest value untuk semua binding
- gabungkan metadata `sensor_channel` dan `sensor_type`
- bentuk response runtime

### 5.3 `ScadaAccessService`

Tanggung jawab:

- validasi akses user ke diagram/project
- validasi edit permission
- menjaga agar controller tidak penuh logic permission

### 5.4 `ScadaMapperService`

Tanggung jawab:

- map entity relational ke payload diagram JSON
- map payload diagram JSON ke operasi sync DB

Ini penting supaya controller dan service utama tidak terlalu gemuk.

---

## 6. Controller structure

### 6.1 `ScadaDiagramsController`

Endpoint yang dipegang:

- `GET /api/scada/diagrams`
- `POST /api/scada/diagrams`
- `GET /api/scada/diagrams/:diagramId`
- `PUT /api/scada/diagrams/:diagramId`
- `POST /api/scada/diagrams/:diagramId/duplicate`
- `DELETE /api/scada/diagrams/:diagramId`

### 6.2 `ScadaRuntimeController`

Endpoint yang dipegang:

- `GET /api/scada/diagrams/:diagramId/runtime`

### 6.2.1 `ScadaBindingOptionsController`

Endpoint yang dipegang:

- `GET /api/scada/binding-options`

### 6.3 Kenapa runtime dipisah controller

- concern berbeda
- lebih mudah berkembang nanti
- runtime query logic cenderung berbeda dari CRUD diagram

---

## 7. Diagram CRUD flow

### 7.1 Create diagram

Alur:

1. validate auth
2. validate owner/project access
3. create `scada_diagram`
4. return diagram kosong

### 7.2 Get detail

Alur:

1. validate auth
2. validate access
3. load diagram
4. load nodes
5. load edges
6. load bindings
7. map ke payload diagram JSON
8. return response

### 7.3 Update full diagram

Alur:

1. validate auth
2. validate edit access
3. validate payload
4. begin transaction
5. update diagram metadata
6. sync nodes
7. sync edges
8. sync bindings
9. commit transaction
10. reload final diagram
11. return normalized payload

### 7.4 Duplicate

Alur:

1. validate auth
2. validate access
3. load source diagram lengkap
4. create diagram baru
5. clone nodes
6. clone edges dengan node id mapping baru
7. clone bindings
8. return diagram baru

---

## 8. Runtime flow di backend

### 8.1 `GET /api/scada/diagrams/:diagramId/runtime`

Alur yang direkomendasikan:

1. validate auth
2. validate diagram access
3. load diagram runtime config
4. load binding aktif untuk diagram
5. kumpulkan semua `sensor_channel_id`
6. query latest telemetry batch
7. join metadata `sensor_channel` dan `sensor_type`
8. bentuk response runtime flat per binding
9. return response

Status implementasi 2026-03-16:

- query latest telemetry batch sudah berjalan
- response runtime sudah mengembalikan status dasar dan enrichment threshold sederhana
- response runtime juga sudah mengembalikan `rawValue`, `connectivityState`, `freshnessState`, dan summary binding
- status yang saat ini dihitung backend:
  - `ok`
  - `warn`
  - `alert`
  - `off`
  - `offline`
  - `stale`
  - `unknown`

### 8.2 Kenapa backend yang menghitung binding aktif

- lebih aman
- lebih konsisten
- frontend lebih tipis
- lebih mudah tambah permission dan filtering nanti

### 8.3 Lookup binding options

Status implementasi 2026-03-16:

- backend sudah menyediakan `GET /api/scada/binding-options`
- endpoint ini dipakai untuk binding picker editor dan sudah terfilter by owner/project access

---

## 9. Query strategy runtime

Untuk MVP, runtime service boleh mengambil latest value langsung dari `sensor_logs`.

### 9.1 Prinsip query

- batch query
- gunakan index existing `id_sensor_channel, ts`
- hanya ambil latest value per channel

### 9.2 Evolusi nanti

Jika beban meningkat:

- latest table khusus
- cache runtime
- materialized layer

Tetapi belum perlu untuk MVP.

---

## 10. Transaction strategy untuk save

Full diagram save harus berjalan dalam satu transaction.

### 10.1 Operasi dalam transaction

- update row diagram
- sync node create/update/delete
- sync edge create/update/delete
- sync binding create/update/delete

### 10.2 Kenapa wajib

Tanpa transaction, payload diagram bisa tersimpan setengah jalan.

---

## 11. Sync strategy untuk update diagram

Backend perlu melakukan diff antara:

- state existing database
- payload diagram baru

### 11.1 Sync nodes

- create node baru
- update node existing
- delete/hide node yang hilang dari payload

### 11.2 Sync edges

- create edge baru
- update edge existing
- delete/hide edge yang hilang

### 11.3 Sync bindings

- create binding baru
- update binding existing
- delete binding yang hilang

### 11.4 Rekomendasi implementasi

Pisahkan helper sync per jenis entity.

Jangan menaruh semua logic diff di satu method besar.

---

## 12. Validation layer

Backend harus punya validasi sebelum save.

### 12.1 Validasi diagram payload

- name wajib
- node id unik
- edge source/target valid
- binding mengacu ke node valid
- `sensorChannelId` valid
- `nodeType` valid

Status implementasi 2026-03-16:

- validasi dasar di backend sudah ada untuk full save
- node dan edge harus membawa id stabil
- edge self-loop ditolak
- duplicate binding scope pada node ditolak
- ukuran node harus valid
- `diagramCode` sekarang dijaga unik per owner di backend
- diagram yang tidak ditemukan sekarang mengembalikan `404`, bukan `400`

### 12.2 Validasi akses

- user punya akses project
- user punya edit access untuk update
- diagram bukan milik project lain tanpa izin

---

## 13. Mapper layer

Mapper layer penting agar payload frontend tetap nyaman dan entity backend tetap bersih.

### 13.1 Tanggung jawab mapper

- entity -> DTO response
- DTO request -> internal normalized structure
- flatten binding saat runtime response

### 13.2 Kenapa ini penting

- mengurangi coupling entity langsung ke API
- memudahkan perubahan schema internal nanti

---

## 14. DTO strategy

Disarankan punya DTO terpisah untuk:

- create diagram
- update diagram full payload
- list response
- detail response
- runtime response
- duplicate request

Jangan langsung expose entity sebagai response.

---

## 15. Error handling

Error minimum yang perlu dibedakan:

- unauthorized
- forbidden
- diagram not found
- validation error
- runtime fetch error
- duplicate error

### 15.1 Rekomendasi

Gunakan error code konsisten untuk frontend:

- `SCADA_DIAGRAM_NOT_FOUND`
- `SCADA_ACCESS_DENIED`
- `SCADA_VALIDATION_ERROR`
- `SCADA_RUNTIME_ERROR`

---

## 16. Permission architecture

Untuk MVP, permission cukup mengikuti akses existing.

### 16.1 Read access

User boleh melihat diagram jika punya akses ke project/owner terkait.

### 16.2 Edit access

User boleh edit jika punya role/hak edit project yang sesuai.

### 16.3 Kenapa tidak buat permission system baru

- terlalu berat untuk MVP
- existing access model sudah ada

---

## 17. Integrasi dengan auth existing

SCADA controller tetap memakai auth guard existing.

### 17.1 Yang dibutuhkan

- user identity dari token/session existing
- owner/project context validation

### 17.2 Launch dari Angular

Jika nanti launch token exchange dipakai:

- validasi exchange tetap di layer auth existing
- SCADA controller cukup menerima user context yang sudah sah

---

## 18. Logging dan observability

Minimal yang perlu dicatat:

- create/update/delete diagram
- duplicate diagram
- runtime request failure

Tidak perlu:

- log semua polling sukses secara verbose

Untuk MVP, cukup gunakan logger module existing.

---

## 19. Struktur folder backend yang direkomendasikan

Contoh struktur:

```text
src/modules/scada/
├── scada.module.ts
├── controllers/
│   ├── scada-diagrams.controller.ts
│   └── scada-runtime.controller.ts
├── services/
│   ├── scada-diagrams.service.ts
│   ├── scada-runtime.service.ts
│   ├── scada-access.service.ts
│   └── scada-mapper.service.ts
├── dto/
├── entities/
└── types/
```

---

## 20. Hal yang belum perlu di backend MVP

Belum perlu:

- websocket runtime khusus
- collaborative editing engine
- versioning service
- template service
- alarm engine SCADA khusus

Backend MVP harus tetap ramping.

---

## 21. Open questions

Masih perlu diputuskan di technical design final:

- apakah duplicate diagram langsung `draft` atau ikut status sumber
- apakah delete diagram berarti `archived` atau `is_active=false`
- apakah save sync memakai hard delete untuk child entities
- apakah runtime response perlu bawa node summary langsung dari backend

---

## 22. Rekomendasi keputusan default

Baseline backend architecture yang direkomendasikan:

- buat module SCADA baru di backend existing
- pisahkan diagram controller dan runtime controller
- gunakan service terpisah untuk diagrams, runtime, access, mapper
- save full diagram dilakukan dalam satu transaction
- runtime diambil batch by `diagramId`
- telemetry existing tetap jadi source of truth

Jika baseline ini diterima, langkah berikut yang paling tepat adalah:

- `13-DB-SCHEMA-SCADA.md`
