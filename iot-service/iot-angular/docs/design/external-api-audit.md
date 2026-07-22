# Audit External API + Portal `/developer`

> Status: **ANALISA & AUDIT** (belum ada perbaikan kode). Dipicu keluhan user PDAM.
> Sumber kebenaran yang dibandingkan:
> - Dokumentasi yang dilihat user → `iot-angular/src/app/pages/developer/developer-portal.component.ts` (array `apiSections`).
> - Implementasi nyata → `iot-backend-go/app/http/controllers/externalapi/external_api_controller.go`.
> - Route terdaftar → `iot-backend-go/routes/api.go` (`/external-api/v1`, middleware `ApiKeyAuth`).

## 0. Akar masalah sebenarnya (framing user)

> "Kasih informasi yang jelas & lengkap di setiap return JSON itu sangat penting — sekarang **pelit informasi**. Mereka butuhnya seperti **versi mobile di frontend Angular kita**, tapi untuk API. Yang sekarang malah simpel banget & dokumentasi tak lengkap."

Masalahnya **bukan** kurang endpoint — tapi **setiap JSON terlalu miskin informasi**. External API mengembalikan **model mentah tipis**, padahal kita **SUDAH punya** endpoint kaya & nested untuk mobile app kita sendiri. Target = External API se-informatif endpoint mobile.

### Bukti: internal (mobile) KAYA vs external (PDAM) MISKIN

Mobile Angular kita memanggil endpoint internal yang penuh (terverifikasi di kode Go):

- **`nodesControllerGetDashboard(id)`** → `node_service.go GetDashboard()` balikin:
  `{ node:{…detail+lokasi+PIC+connectivityStatus+lastSeenAt}, sensorsWithData:[{ idSensor, sensorCode, catalogName, status, channels:[{ idSensorChannel, metricCode, unit, latestValue, timestamp, status }] }], recentActivity, health, uptime{percentage,lastOnline…} }`
- **`sensorChannelsControllerGetReadings(id)`** → `{ channel:{ metricCode, unit, minThreshold, maxThreshold }, dataPoints:[{ timestamp, value }] }`
- **`nodesControllerFindAll`** → `{ data:[{ idNode, code, connectivityStatus, lastSeenAt, address, city, province, latitude, longitude, picName, picPhone, picEmail, … }], meta:{total,page,limit,totalPages} }`

Bandingkan yang PDAM terima dari External API sekarang:

| Resource | Internal (mobile) | External (PDAM) sekarang |
|---|---|---|
| **Node list** | code, status koneksi, lastSeen, alamat+kota+provinsi+lat/lng, PIC nama/telp/email, + `meta` pagination | model node mentah, **array telanjang**, tanpa pagination |
| **Node detail** | node lengkap **+ sensorsWithData nested + channel latestValue + health + uptime** | node mentah saja, **tanpa sensor/channel**, not-found = `{}` 200 |
| **Channel / readings** | `{channel:{unit,threshold}, dataPoints[]}` | ❌ endpoint channel tak ada; readings hanya via `/sensor-data` tanpa filter channel |
| **Latest value** | inline per channel di dashboard | `/sensor-data/latest` terpisah, field beda |

**Kesimpulan:** kekayaan data itu **sudah dibangun** untuk mobile. Pekerjaannya = **mengekspos shape yang sama (nested, denormalized, latest+threshold inline) lewat External API** + envelope seragam + dokumentasi field lengkap. Bukan bikin dari nol.

**Yang PDAM mau, ringkas:**
1. Setiap JSON **lengkap** (denormalized: nama project/node, lokasi, unit, threshold, latest value, status, waktu) — bukan hanya ID mentah.
2. Struktur **nested** seperti dashboard mobile (node ▸ sensors ▸ channels dengan nilai terakhir).
3. Envelope + pagination seragam `{ data, meta:{total,page,limit,totalPages} }`.
4. **Dokumentasi field lengkap** di portal `/developer` (setiap field response dijelaskan, bukan contoh setengah).

Detail mismatch per-endpoint di §3–§4; usulan kontrak kaya (list-channel, nested, node-detail) di §5.

## 1. Ringkasan eksekutif

Portal `/developer` menampilkan kontrak API yang **tidak cocok** dengan perilaku backend. Tiga kelas masalah:

1. **Param gagal / diabaikan** — user ikut docs, request malah error keras atau diam-diam balikin data salah.
2. **Envelope tak konsisten** — docs selalu `{data,total}`, backend mayoritas balikin array telanjang, tak ada `total`/pagination di mana pun.
3. **Gap endpoint** — **list sensor-channel belum ada**, padahal `id_sensor_channel` adalah kunci join utama (wajib untuk `/sensor-data/aggregated`, muncul di MQTT & `latest`). User tak punya cara resmi menemukannya.

Fitur "Try It" di portal memperparah: user tes langsung di halaman itu dan melihat response nyata berbeda dari contoh di sebelahnya.

## 2. Inventarisasi endpoint

| # | Endpoint terdaftar (route) | Terdokumentasi di portal? |
|---|---|---|
| 1 | `GET /external-api/v1/info` | ✅ |
| 2 | `GET /external-api/v1/projects` | ✅ |
| 3 | `GET /external-api/v1/nodes` | ✅ |
| 4 | `GET /external-api/v1/nodes/{id}` | ✅ |
| 5 | `GET /external-api/v1/sensors` | ✅ |
| 6 | `GET /external-api/v1/sensor-data` | ✅ |
| 7 | `GET /external-api/v1/sensor-data/latest` | ✅ |
| 8 | `GET /external-api/v1/sensor-data/aggregated` | ✅ |
| 9 | `GET /external-api/v1/alerts` | ✅ |
| — | **`GET /external-api/v1/sensor-channels`** | ❌ **BELUM ADA** (gap utama, lihat §5) |

## 3. Mismatch per endpoint (docs ⟷ implementasi)

### 3.1 `/sensor-data` — 🔴 KRITIS
- **Docs:** `sensorId` (required) → time-series 1 sensor; response `{data:[{timestamp,value,unit}], total}`.
- **Kenyataan (`:92-131`):** hanya baca `startDate,endDate` (required) + `page,limit`. **`sensorId` tidak dibaca.** Filter cuma `id_owner + rentang tgl` → balikin SEMUA channel milik owner.
- **Dampak:** user tak bisa ambil data per titik; malah dapat data campur. Diam-diam salah (200 OK, data keliru).
- Response nyata: `{data:[{id,timestamp,value,valueRaw,qualityFlag,idSensorChannel,idNode}], page, limit}` — **tanpa `total`, tanpa `unit`**.

### 3.2 `/sensor-data/aggregated` — 🔴 KRITIS
- **Docs:** required `sensorId`; param `interval` (1m/5m/15m/1h/1d); response `{data:[{timestamp,avg,min,max,count}]}`.
- **Kenyataan (`:177-207`):** required **`channelId`** (bukan `sensorId`) → user ikut docs kirim `sensorId` = **400 "channelId, startDate, endDate are required"**. `interval` diabaikan (hardcode `DATE_TRUNC('hour')`). Response array `[{bucket,value}]`.
- **Dampak:** gagal keras + tak bisa pilih granularitas.

### 3.3 `/sensor-data/latest` — 🟠
- **Docs:** required `sensorIds` (comma-separated); response `{data:[{sensorId,value,unit,timestamp}]}`.
- **Kenyataan (`:134-174`):** baca `nodeId` (opsional), bukan `sensorIds`. Array telanjang `[{idSensorChannel,channelName,metricCode,unit,lastValue,lastTimestamp,nodeCode}]`.
- **Dampak:** param dokumen tak berfungsi; nama field beda (`lastValue`/`lastTimestamp`).

### 3.4 `/nodes` — 🟠
- **Docs:** `projectId,status,page,limit`; response `{data,total}`.
- **Kenyataan (`:48-64`):** baca `projectId` ✓, `limit`+**`offset`** (bukan `page`). `status` **diabaikan**. Array telanjang.

### 3.5 `/nodes/{id}` — 🟡
- **Docs:** response menyertakan `sensors:[...]`.
- **Kenyataan (`:67-74`):** balikin node saja, tanpa sensors. Not-found = `{}` **status 200** (mestinya 404). Route param `{id}` (controller baca `nodeId`).

### 3.6 `/projects` — 🟡
- **Docs:** `page,limit`; `{data,total}`.
- **Kenyataan (`:39-45`):** tanpa pagination; array telanjang, semua project.

### 3.7 `/sensors` — 🟡
- **Docs:** `nodeId,page,limit`; `{data,total}`.
- **Kenyataan (`:77-89`):** baca `nodeId` ✓, `Limit(100)` hardcode, tanpa page. Array telanjang.

### 3.8 `/alerts` — 🟡
- **Docs:** filter `nodeId,severity,status,page,limit`; `{data,total}`.
- **Kenyataan (`:210-235`):** **semua filter diabaikan**, `LIMIT 50` hardcode. Array telanjang.

### 3.9 `/info` — 🟢 kosmetik
- **Docs:** `{version,status:"healthy",rateLimits:{...}}`.
- **Kenyataan (`:30-36`):** `{name,version,status:"operational"}` — tanpa `rateLimits`.

## 4. Masalah menyeluruh (cross-cutting)

- **Envelope:** docs selalu `{data,total}`. Backend: `/sensor-data` = `{data,page,limit}` (tanpa total); sisanya **array telanjang**. Parser PDAM yang mengharapkan `.data` akan pecah di 7 dari 9 endpoint.
- **Pagination fiksi:** tidak ada `total`/`totalPages` di mana pun → PDAM tak bisa tahu total data / paginate.
- **Beda dengan kontrak internal:** memo `api-response-contract` menetapkan list = `{data, meta:{total,page,limit,totalPages}}`. External API menyimpang dari standar ini.

## 5. GAP UTAMA — List Sensor-Channel belum ada

**Keluhan eksplisit PDAM.** `id_sensor_channel` adalah kunci join lintas sistem:
- `/sensor-data/aggregated` **mewajibkan** `channelId`.
- Payload MQTT broadcast membawa `idSensorChannel`.
- `/sensor-data` & `/sensor-data/latest` **mengembalikan** `idSensorChannel`.
- TAPI tak ada endpoint untuk **menemukan/enumerasi** channel + metadatanya.

`/sensors` mengembalikan **sensor** (`id_sensor`), bukan channel — dan satu sensor bisa punya banyak channel (satu metric per channel). Jadi user tak punya jalur resmi mendapat `channelId` maupun metadata channel (`metric_code`, `unit`, `min_threshold`, `max_threshold`, `precision`, `aggregation`).

Data tersedia penuh di tabel `sensor_channels` (144 baris saat ini):
`id_sensor_channel, id_sensor→sensors, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value, register_address, precision, aggregation, alert_suppression_window`.

### 5.1 Usulan kontrak (untuk implementasi tahap berikut — belum dieksekusi)

```
GET /external-api/v1/sensor-channels
  ?nodeId=<uuid>       (opsional) filter channel di bawah satu node
  ?sensorId=<uuid>     (opsional) filter channel di bawah satu sensor
  ?page=<n>&limit=<n>  (opsional) pagination
```
Scoping tenant: via `sensor_channels → sensors → nodes → projects.id_owner = <owner dari API key>`.

Response (selaras nama field External API & payload MQTT):
```json
{
  "data": [
    {
      "idSensorChannel": "uuid",   // = channelId untuk /sensor-data/aggregated
      "idSensor": "uuid",
      "idNode": "uuid",
      "nodeCode": "HELIO-…",
      "metricCode": "tekanan",
      "unit": "bar",
      "minThreshold": 0.5,
      "maxThreshold": 6.0,
      "precision": 2,
      "aggregation": "avg"
    }
  ],
  "meta": { "total": 144, "page": 1, "limit": 100, "totalPages": 2 }
}
```

Efek: menutup lingkaran discovery — PDAM list channel → pakai `idSensorChannel` untuk `sensor-data/aggregated` dan join ke data MQTT.

### 5.2 Usulan endpoint NESTED JSON (hierarki)

Satu call untuk memahami seluruh struktur & mengambil semua ID sekaligus — inilah "informasi nested json" yang diminta.

```
GET /external-api/v1/hierarchy
  ?projectId=<uuid>   (opsional) batasi ke satu project
  ?withChannels=true  (default true) sertakan level channel
```
Scoping tenant: `projects.id_owner = <owner dari API key>`.

Response — pohon `project ▸ nodes ▸ sensors ▸ channels`:
```json
{
  "data": [
    {
      "idProject": "uuid",
      "name": "Cabang Tenggarong",
      "status": "active",
      "nodes": [
        {
          "idNode": "uuid",
          "nodeCode": "HELIO-865124070949252",
          "label": "Inlet Monitor",
          "status": "active",
          "lastSeenAt": "2026-07-09T06:36:28Z",
          "sensors": [
            {
              "idSensor": "uuid",
              "sensorCode": "S01",
              "label": "05-Perum Tambak Rel",
              "channels": [
                {
                  "idSensorChannel": "uuid",
                  "metricCode": "tekanan",
                  "unit": "bar",
                  "minThreshold": 0.5,
                  "maxThreshold": 6.0
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "meta": { "projects": 1, "nodes": 12, "sensors": 30, "channels": 48 }
}
```

Catatan implementasi: cukup 1 query flat (join projects→nodes→sensors→sensor_channels di-scope owner) lalu susun jadi pohon di service (skala kecil: 144 channel total). Nama field **identik** dengan list flat & payload MQTT agar PDAM konsisten. Untuk view flat mereka pakai §5.1; untuk gambaran struktur pakai ini.

## 6. Klasifikasi severity & rekomendasi arah

| Sev | Item |
|---|---|
| 🔴 | `/sensor-data` abaikan `sensorId`; `/sensor-data/aggregated` butuh `channelId` bukan `sensorId`; **`/sensor-channels` tak ada** |
| 🟠 | envelope array vs `{data}`; `latest` pakai `nodeId` bukan `sensorIds`; `nodes` pakai `offset` & abaikan `status` |
| 🟡 | tak ada `total`/pagination; `alerts` abaikan semua filter; node-detail tanpa sensors & 200 saat not-found |
| 🟢 | `/info` kosmetik (`rateLimits`, `healthy`) |

**Rekomendasi urutan kerja (saat mulai eksekusi), sesuai yang diminta PDAM:**
1. **Rapikan 4 list + envelope seragam** `{data, meta:{total,page,limit,totalPages}}` untuk `projects/nodes/sensors` **dan tambah `sensor-channels` (§5.1)**. Nama field konsisten lintas endpoint. Ini menjawab "ga jelas".
2. **Tambah endpoint nested `/hierarchy` (§5.2)** — pohon project→node→sensor→channel dalam 1 call.
3. **Betulkan `/sensor-data` & `/aggregated`** agar bisa filter `channelId`/`sensorId` + tambah `unit`/`total` (biar list channel berguna untuk narik data).
4. **Jujurkan docs portal** agar persis implementasi final (param, contoh response, "Try It").

## 7. Target Kontrak v2 (mirror kekayaan mobile) — field-by-field

> Prinsip. Semua field di bawah **sudah ada** di model/service internal (terverifikasi). Target = ekspos shape yang sama lewat External API.
> - **Envelope list seragam:** `{ "data": [...], "meta": { "total", "page", "limit", "totalPages" } }`.
> - **Denormalized:** sertakan nama & konteks (nama project, kode node, unit, threshold, nilai terakhir, waktu) — bukan cuma UUID.
> - **Penamaan konsisten** lintas endpoint & sama dengan payload MQTT (`idSensorChannel`, `idNode`, `metricCode`, `unit`).
> - **Not-found = 404** (bukan `{}` 200).

### 7.1 `GET /projects` — list kaya
Sumber field: `projects` + agregasi node. `{data:[…], meta:{…}}`.
```json
{ "idProject","name","areaType","status",
  "geofence": {…},
  "nodeCount": 12, "onlineNodeCount": 9, "sensorCount": 30, "channelCount": 48,
  "lastActivityAt": "2026-07-09T06:36:28Z" }
```

### 7.2 `GET /nodes` — list kaya (mirror `nodesControllerFindAll`)
```json
{ "idNode","idProject","projectName","code","name","description",
  "status","connectivityStatus","lastSeenAt","telemetryIntervalSec","firmwareVersion",
  "address","city","province","postalCode","country","latitude","longitude","elevationM",
  "picName","picPhone","picEmail","tags","iconUrl",
  "sensorCount": 3, "channelCount": 5 }
```
Filter: `projectId`, `status`, `search`, `page`, `limit`. (Ganti `offset`→`page`; implement `status`.)

### 7.3 `GET /nodes/{id}` — detail nested (mirror `GetDashboard`) 🌟 inti
Ini jantung "seperti mobile". Satu call = semua info node + sensor + channel + nilai terakhir + kesehatan.
```json
{
  "node": { …semua field 7.2… , "serialNumber","devEui","installDate",
            "installationType","enclosureRating","powerSource","batteryType",
            "commissionedAt","lastMaintenanceAt","nextMaintenanceAt","notes" },
  "sensorsWithData": [
    { "idSensor","sensorCode","catalogName","status",
      "channels": [
        { "idSensorChannel","metricCode","unit","latestValue","timestamp","status",
          "minThreshold","maxThreshold" }
      ] }
  ],
  "health": { "totalSensors","activeSensors","uptimePercentage","lastTelemetry" },
  "uptime": { "percentage","lastOnline","lastOffline" },
  "recentActivity": [ … ]
}
```

### 7.4 `GET /sensors` — list kaya
```json
{ "idSensor","idNode","nodeCode","sensorCode","label","catalogName",
  "protocolChannel","status","calibrationDueAt",
  "channelCount": 2 }
```
Filter: `nodeId`, `page`, `limit`.

### 7.5 `GET /sensor-channels` — 🆕 list channel (yang selama ini hilang)
```json
{ "idSensorChannel","idSensor","idNode","nodeCode","sensorCode",
  "metricCode","unit","idSensorType","sensorType",
  "minThreshold","maxThreshold","precision","aggregation",
  "latestValue","latestAt","status" }
```
Filter: `nodeId`, `sensorId`, `page`, `limit`. Scoping: `…→projects.id_owner`.

### 7.6 `GET /sensor-channels/{id}/readings` — 🆕 time-series kaya (mirror `GetReadings`)
```json
{
  "channel": { "idSensorChannel","metricCode","unit","minThreshold","maxThreshold",
               "precision","sensorCode","sensorType","nodeCode" },
  "timeRange": { "start","end" },
  "stats": { "min","max","avg","count","firstValue","lastValue","stdDev" },
  "dataPoints": [ { "timestamp","value","rawValue","quality" } ]
}
```
Query: `startDate`,`endDate` (required), `aggregation`/`interval` (opsional). **Ini pengganti `/sensor-data` yang jelas** — ter-scope 1 channel, lengkap statistik.

### 7.7 `GET /hierarchy` — 🆕 pohon nested (1 call, lihat §5.2)
project ▸ nodes ▸ sensors ▸ channels (+ latestValue). Untuk PDAM yang mau discover seluruh struktur sekali jalan.

### 7.8 `GET /alerts` — implement filter + denormalisasi
```json
{ "idAlertEvent","idAlertRule","idSensorChannel","nodeCode","metricCode",
  "severity","status","message","triggeredAt","resolvedAt","value","threshold" }
```
Filter (yang selama ini diabaikan): `nodeId`,`channelId`,`severity`,`status`,`page`,`limit`.

### 7.9 Dokumentasi portal `/developer`
Setiap endpoint: tabel **field response lengkap** (nama, tipe, arti) — bukan contoh setengah. `responseExample` diganti agar **persis** shape v2 di atas. "Try It" otomatis cocok.

---

## 8. Catatan implementasi (untuk fase eksekusi nanti)
- **Reuse service internal**: `NodeService.GetDashboard`, `SensorChannelService.GetReadings`, `*FindAll` sudah menghasilkan shape ini untuk mobile → controller External API tinggal panggil service yang sama + scoping owner via API key (bukan JWT). Minim kode baru, konsisten otomatis.
- **Scoping**: API key → `id_owner`; semua query di-filter lewat `projects.id_owner` (chain node→sensor→channel).
- **Versi**: bila ubah bentuk `/sensor-data` lama berisiko memutus klien lama → boleh rilis sebagai perilaku baru + tandai lama deprecated di docs, atau naikkan ke `/v2` bila perlu.

---

## 9. STATUS IMPLEMENTASI — ✅ SELESAI (2026-07-11)

Dieksekusi & terverifikasi live (owner Tenggarong/RDWNJ, data nyata):

**Backend `iot-backend-go`** (`external_api_controller.go` ditulis ulang jadi wrapper tipis + `routes/api.go`):
- Controller reuse service internal: `ProjectService.List/GetByIDDetailed`, `NodeService.List/GetDashboard`, `SensorService.List`, `SensorChannelService.List/GetReadings` — dengan `ServiceContext{OwnerID: <API key>, Role:"tenant"}` → scoping owner otomatis (terverifikasi aman, tak bocor lintas-owner).
- Envelope seragam `{data, meta:{total,page,limit,totalPages}}` via `c.Paginated`.
- **Endpoint baru**: `GET /projects/{id}`, `GET /sensor-channels`, `GET /sensor-channels/{id}/readings`, `GET /hierarchy`.
- **Fix**: `/nodes/{id}` sekarang nested dashboard (dulu bug baca `Route("nodeId")` ≠ param `{id}` → selalu `{}`); `/nodes` list kaya + pagination; `/sensor-data` dukung filter `channelId`/`nodeId` + `total`; `/alerts` filter severity/status/nodeId + denormalisasi.
- `go build ./...` OK. 9/9 smoke test live LOLOS (list kaya+meta, node nested latestValue, channels, readings 14k dataPoints, hierarchy tree, sensor-data filter, 401 tanpa key).

**Frontend `iot-angular`** (`developer-portal.component.ts`): `apiSections` ditulis ulang — dokumentasi lengkap semua field, param benar, contoh response persis v2, + seksi baru Hierarchy & Sensor Channels. `npm run build` OK.

**OpenAPI / Swagger** (`iot-backend-go`): spec External API di-serve di `GET /external-api/docs` (Swagger UI) & `/external-api/docs-json` (spec), diturunkan dari `docs/openapi.json` dengan filter path `/external-api/v1*` (lihat `swagger_controller.go loadExternalSpec`). Blok `/external-api/v1*` di `docs/openapi.json` **diregenerasi jadi 13 path v2** (script Python: buang path lama, tulis ulang dgn parameter + contoh response nested + security X-API-Key). Tag ditambah `Hierarchy` & `Sensor Channels` di `loadExternalSpec`. Terverifikasi live: `/external-api/docs-json` = 13 path, JSON strict-valid, contoh nested muncul (mis. `/nodes/{id}` → sensorsWithData.channels[].latestValue). Catatan: spec internal `/api-json` (dari `docs/openapi.json` juga) tak diubah; SDK ng-openapi-gen frontend pakai spec internal, jadi tak terpengaruh.

**Catatan akurasi vs desain**: key statistik di `/readings` bernama `statistics` (bukan `stats`); base path External API = `/external-api/v1` (TIDAK di bawah `/api`). `/sensor-channels` list ikut shape service internal (metadata + nested sensor/sensorType; `latestValue` inline belum di list — tersedia via `/readings`, node dashboard, & `/sensor-data/latest`).

**Iterasi lanjutan (2026-07-11, feedback PDAM live-test)**:
- Nested `sensor` di `/sensor-channels` diperkaya `{idSensor, sensorCode, label, idNode, nodeCode}` (dulu cuma idSensor+label) — enrich `SensorChannelService.toResponse` + query (additive, internal API ikut untung).
- **Filter hierarki opsional di semua endpoint query** (helper `addEq`): `/sensor-data`, `/sensor-data/latest`, `/alerts` menerima `projectId/nodeId/sensorId/channelId`; `/sensors` + `SensorFilter` tambah `projectId`. `/sensor-data/latest` responsnya juga diperkaya jadi chain penuh (idProject/idNode/nodeCode/idSensor/sensorLabel/idSensorChannel/metricCode/unit/lastValue/lastTimestamp). Terverifikasi: latest no-filter 8 → nodeId 1 → sensorId 1 → channelId 1.
- Catatan: `lastValue`/`lastValueAt` di `/sensors` diambil dari ClickHouse; bila CH gagal/timeout `fetchLatestValues` diam-diam balikin kosong → null (transient, bukan bug).
- OpenAPI + portal apiSections disinkronkan untuk param filter baru.

**API Explorer → Swagger UI native (2026-07-11)**: tab "API Explorer" di portal `/developer` yang dulu hand-written (`apiSections` + `executeRequest`/`buildRequestUrl`/`getCurlCommand`) **dihapus**, diganti **swagger-ui-dist native** yang me-render langsung spec `{apiUrl}/external-api/docs-json` (sumber tunggal, nol drift). Import bundle browser `swagger-ui-dist/swagger-ui-bundle.js` (index.js butuh Node `path`), deklarasi di `src/typings.d.ts`, CSS + allowedCommonJsDependencies di `angular.json`. `requestInterceptor` menyuntik `X-API-Key` dari key terpilih (tab Keys) → "Try it out" jalan tanpa Authorize manual. Container pakai `[hidden]` (bukan *ngIf) + mount sekali di `ngAfterViewInit`. `npm run build` OK.

**Sisa untuk produksi**: deploy binary Go baru + rebuild Angular; klien PDAM mint API key via portal. Belum di-commit.

---
*Terkait: [[mqtt-broadcast-pdam]] (payload MQTT bawa `idSensorChannel` — kunci join yang sama). Kontrak: `api-response-contract`.*
