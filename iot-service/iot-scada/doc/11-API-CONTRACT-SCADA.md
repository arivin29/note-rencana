# SCADA API Contract

> Document type: Technical design draft  
> Status: Draft for discussion  
> Scope: Kontrak API minimum untuk SCADA MVP

---

## 1. Tujuan dokumen

Dokumen ini mendefinisikan kontrak API minimum untuk SCADA MVP agar:

- frontend dan backend bekerja dengan model yang sama
- save flow full diagram jelas
- runtime polling by `diagramId` jelas
- integrasi auth dan context project tetap rapi

---

## 2. Prinsip desain API

Prinsip yang dipakai:

- API SCADA dipisah dari widget/report builder
- diagram menjadi resource utama
- save memakai full diagram payload
- runtime memakai endpoint khusus SCADA
- payload harus nyaman dipakai React frontend

---

## 3. Resource utama

Resource minimum yang direkomendasikan:

- `scada-diagrams`
- `scada-runtime`

Lookup tambahan bila perlu:

- `scada-binding-options`

---

## 4. Endpoint minimum MVP

Endpoint minimum yang direkomendasikan:

- `GET /api/scada/diagrams`
- `POST /api/scada/diagrams`
- `GET /api/scada/diagrams/:diagramId`
- `PUT /api/scada/diagrams/:diagramId`
- `POST /api/scada/diagrams/:diagramId/duplicate`
- `DELETE /api/scada/diagrams/:diagramId`
- `GET /api/scada/diagrams/:diagramId/runtime`

Opsional:

- `GET /api/scada/projects/:projectId/diagrams`
- `GET /api/scada/binding-options`

---

## 5. Diagram list API

### 5.1 `GET /api/scada/diagrams`

Tujuan:

- mengambil daftar diagram sesuai akses user

Query yang direkomendasikan:

- `projectId` optional
- `ownerId` optional internal/admin use
- `status` optional

### 5.2 Response minimal

Setiap item list minimal berisi:

- `id`
- `name`
- `description`
- `ownerId`
- `projectId`
- `status`
- `updatedAt`

Opsional:

- `nodeCount`
- `edgeCount`

---

## 6. Create diagram API

### 6.1 `POST /api/scada/diagrams`

Tujuan:

- membuat diagram baru

### 6.2 Request body minimal

- `name`
- `description` optional
- `ownerId`
- `projectId` optional
- `canvasConfig` optional
- `runtimeConfig` optional

### 6.3 Response

Kembalikan diagram baru dalam bentuk detail payload SCADA.

---

## 7. Get diagram detail API

### 7.1 `GET /api/scada/diagrams/:diagramId`

Tujuan:

- mengambil diagram lengkap untuk viewer atau editor

### 7.2 Response shape yang direkomendasikan

```json
{
  "diagram": {
    "id": "uuid",
    "name": "Main WTP Line",
    "description": "Diagram operasional",
    "ownerId": "uuid",
    "projectId": "uuid",
    "status": "active",
    "canvasConfig": {},
    "runtimeConfig": {},
    "createdAt": "2026-03-14T00:00:00Z",
    "updatedAt": "2026-03-14T00:00:00Z"
  },
  "nodes": [],
  "edges": []
}
```

### 7.3 Struktur node yang direkomendasikan

```json
{
  "id": "uuid",
  "type": "pump",
  "label": "Pompa Intake 1",
  "position": { "x": 120, "y": 80 },
  "size": { "width": 120, "height": 80 },
  "rotationDeg": 0,
  "zIndex": 1,
  "relatedNodeId": "uuid",
  "relatedSensorId": "uuid",
  "style": {},
  "config": {},
  "bindings": []
}
```

### 7.4 Struktur binding yang direkomendasikan

```json
{
  "id": "uuid",
  "bindingKey": "rpm",
  "sensorChannelId": "uuid",
  "displayLabel": "RPM",
  "unitOverride": null,
  "transform": null,
  "priorityOrder": 1,
  "isPrimary": true
}
```

### 7.5 Struktur edge yang direkomendasikan

```json
{
  "id": "uuid",
  "source": "node-uuid",
  "target": "node-uuid",
  "edgeType": "pipe",
  "label": null,
  "pipeType": "raw",
  "flowDirection": "forward",
  "animated": true,
  "style": {},
  "config": {}
}
```

---

## 8. Update diagram API

### 8.1 `PUT /api/scada/diagrams/:diagramId`

Ini endpoint paling penting untuk MVP.

Tujuan:

- menyimpan seluruh diagram sebagai satu payload utuh

### 8.2 Request body yang direkomendasikan

```json
{
  "diagram": {
    "name": "Main WTP Line",
    "description": "Diagram operasional",
    "projectId": "uuid",
    "status": "active",
    "canvasConfig": {},
    "runtimeConfig": {}
  },
  "nodes": [],
  "edges": []
}
```

### 8.3 Catatan penting

- `nodes` mengandung binding nested
- backend melakukan sinkronisasi penuh terhadap node, edge, dan binding
- operation harus berjalan dalam satu transaction

### 8.4 Response

Response ideal:

- payload diagram final yang sudah tersimpan

Alasan:

- frontend bisa langsung commit `saved snapshot`

---

## 9. Duplicate diagram API

### 9.1 `POST /api/scada/diagrams/:diagramId/duplicate`

Tujuan:

- membuat salinan utuh diagram beserta node, edge, dan binding

### 9.2 Request body minimal

```json
{
  "name": "Main WTP Line Copy",
  "projectId": "uuid"
}
```

### 9.3 Response

- diagram baru hasil duplicate

---

## 10. Delete diagram API

### 10.1 `DELETE /api/scada/diagrams/:diagramId`

Untuk MVP, implementasi bisa berupa:

- archive / soft deactivate

lebih aman daripada hard delete langsung.

### 10.2 Response minimal

```json
{
  "message": "Diagram archived successfully"
}
```

---

## 11. Runtime API

### 11.1 `GET /api/scada/diagrams/:diagramId/runtime`

Tujuan:

- mengambil runtime value terbaru untuk seluruh binding aktif dalam diagram

### 11.2 Kenapa by `diagramId`

- backend dapat menghitung binding aktif sendiri
- auth dan project validation lebih mudah
- frontend lebih ringan

### 11.3 Response shape yang direkomendasikan

```json
{
  "diagramId": "uuid",
  "polledAt": "2026-03-14T00:00:00Z",
  "bindings": [
    {
      "bindingId": "uuid",
      "nodeId": "uuid",
      "bindingKey": "pressure",
      "sensorChannelId": "uuid",
      "sensorTypeId": "uuid",
      "category": "pressure",
      "unit": "bar",
      "precision": 2,
      "timestamp": "2026-03-14T00:00:00Z",
      "value": 2.45,
      "rawValue": 2.45,
      "qualityFlag": "good",
      "connectivityState": "online",
      "freshnessState": "fresh"
    }
  ],
  "summary": {
    "totalBindings": 16,
    "offlineBindings": 0,
    "staleBindings": 1
  }
}
```

### 11.4 Catatan

Backend belum perlu mengirim visual state final node untuk MVP.

Frontend yang menghitung:

- `ok`
- `warn`
- `alert`
- `off`
- `offline`
- `stale`

Status implementasi backend 2026-03-16:

- endpoint runtime backend sudah tersedia
- payload runtime backend saat ini sudah mengembalikan:
  - `value`
  - `rawValue`
  - `qualityFlag`
  - `connectivityState`
  - `freshnessState`
  - `summary.totalBindings`
  - `summary.offlineBindings`
  - `summary.staleBindings`
- backend juga sudah menghitung status dasar binding untuk membantu frontend:
  - `ok`
  - `warn`
  - `alert`
  - `off`
  - `offline`
  - `stale`
  - `unknown`

---

## 12. Lookup API untuk binding editor

Ini optional, tapi kemungkinan berguna.

### 12.1 Opsi paling sederhana

Frontend memakai API existing:

- projects
- nodes
- sensors
- sensor channels

### 12.2 Opsi yang lebih rapi

Tambahkan endpoint:

- `GET /api/scada/binding-options?projectId=...`

Response bisa berisi data yang sudah siap untuk binding picker.

### 12.3 Rekomendasi MVP

Jika API existing sudah cukup, tidak wajib membuat endpoint baru dulu.

Status implementasi backend 2026-03-16:

- endpoint `GET /api/scada/binding-options` sudah diimplementasikan
- response sudah memuat:
  - channel
  - sensor
  - node
  - project
  - sensorType
  - unit/precision/threshold dasar

---

## 13. Error response shape

Supaya frontend mudah menangani error, response error sebaiknya konsisten.

Format yang direkomendasikan:

```json
{
  "statusCode": 400,
  "code": "SCADA_VALIDATION_ERROR",
  "message": "Invalid diagram payload",
  "details": {
    "field": "nodes[1].bindings[0].sensorChannelId"
  }
}
```

### 13.1 Error yang perlu dibedakan

- access denied
- diagram not found
- validation error
- runtime fetch failure
- duplicate failure

---

## 14. Validation rules minimum

### 14.1 Save diagram

Minimal validasi:

- diagram name wajib
- node ids unik dalam payload
- edge source/target harus mengacu ke node valid
- binding harus mengacu ke node valid
- `sensorChannelId` harus valid jika binding aktif
- `nodeType` harus termasuk tipe yang didukung

### 14.2 Runtime

Minimal validasi:

- diagram ada
- user punya akses
- diagram aktif

---

## 15. Versioning contract

Untuk MVP, versioning belum wajib di API.

Tetapi API jangan menghalangi penambahan nanti.

Ruang yang bisa disiapkan:

- field `status`
- field `updatedAt`

Nanti jika perlu:

- `version`
- `publishedAt`

---

## 16. API contract keputusan penting

Keputusan yang direkomendasikan:

- save payload membawa full diagram
- bindings nested di dalam node payload
- get detail juga mengembalikan bindings nested di node
- runtime response flat per binding

### 16.1 Kenapa nested di save/detail

- lebih natural untuk editor
- lebih dekat dengan model React Flow node-centric

### 16.2 Kenapa flat di runtime

- lebih mudah diproses backend
- lebih mudah dikompres dan dipetakan
- tidak perlu membangun struktur runtime bersarang berulang

---

## 17. Open questions

Masih perlu diputuskan:

- apakah list diagram juga perlu menyertakan `modeAllowed`
- apakah runtime response perlu membawa `nodeConnectivity` terpisah
- apakah duplicate diagram langsung aktif atau draft
- apakah delete diagram berarti `archived`
- apakah create diagram langsung mengembalikan diagram kosong lengkap

---

## 18. Rekomendasi keputusan default

Baseline API contract yang direkomendasikan:

- resource utama adalah `scada-diagrams`
- detail dan save memakai full diagram payload
- bindings nested di dalam node
- runtime memakai endpoint `GET /api/scada/diagrams/:diagramId/runtime`
- runtime response flat per binding
- frontend menghitung visual state final

Jika baseline ini diterima, langkah berikut yang paling tepat adalah:

- `12-BACKEND-ARCHITECTURE-SCADA.md`
- lalu `13-DB-SCHEMA-SCADA.md`
