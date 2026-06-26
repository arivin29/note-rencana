# 06 — Open Items, Keputusan & Backlog

Tracker hal-hal yang belum tertutup di dok 01–05, plus keputusan yang sudah diambil. Update kolom **Status** seiring jalan.

Legend status: ✅ in-scope/disepakati · 🕗 ditunda · ❓ perlu keputusan · 🔎 perlu verifikasi backend · 📋 backlog (nanti)

---

## 1. Keputusan arsitektur (pengaruh ke semua layar)

| # | Item | Keputusan / catatan | Status |
|---|------|---------------------|--------|
| A1 | **Real-time / auto-reload data** | ✅ **FINAL: auto-reload (polling).** Backend **tidak punya WS/SSE** (terverifikasi, REST semua) — jadi polling adalah satu-satunya jalur. `AutoRefreshService`: interval konfigurable + pull-to-refresh + pause saat tab background (lihat catatan di bawah tabel). | ✅ |
| A2 | **Push notification alert** | 🕗 **DITUNDA.** Tidak dikerjakan fase ini. Kandidat masa depan (Web Push/FCM; iOS hanya untuk PWA terinstall ≥16.4). | 🕗 |
| A3 | **Login di mobile** | ✅ **DIPUTUSKAN: halaman login tersendiri** bergaya `.m-app` (bukan reuse desktop). Tetap pakai `AuthService`/`GuestGuard` yang sama; hanya UI baru. Sertakan UX token expire / 401 (interceptor refresh + feedback UI). | ✅ |
| A4 | **Scoping admin** | ❌ **DIPUTUSKAN: SKIP.** Tidak ada alur khusus Owner → Project untuk admin di mobile. Konteks cukup pemilihan **Project** (scoping `idOwner` ditangani backend/service seperti biasa). | ❌ |
| A5 | **Offline UX eksplisit** | DISETUJUI in-scope: banner "tidak ada koneksi", non-aktifkan tombol aksi, tampilkan data cache terakhir. (Offline-data sync tetap out.) | ✅ |

> **Catatan A1 — `AutoRefreshService` (shared):** sumber timer terpusat (`interval` RxJS) yang:
> - punya interval default (mis. 15–30s) + override per-layar (detail node lebih cepat dari list),
> - **pause saat tab/app background** (`document.visibilitychange`) & **resume** saat aktif — hemat baterai/kuota,
> - mendukung **pull-to-refresh** manual (trigger paksa),
> - tiap layar tinggal `subscribe` dan re-`load()` data via service existing (bukan polling sendiri-sendiri).
> Bila V7 (channel WS/SSE) tersedia, service ini diganti/ditambah jalur push tanpa mengubah komponen.

## 2. Kelengkapan layar/UX

| # | Item | Catatan | Status |
|---|------|---------|--------|
| B1 | **Katalog state** | Standardkan empty / error+retry / skeleton untuk tiap layar (primitive `m-empty`, `m-skel`). | ✅ |
| B2 | **Kedalaman Alert** | Alert tetap ada (lihat node/alert), tapi: detail alert, **riwayat** (bukan hanya aktif), filter severity, **snooze/mute**, beda *acknowledge* vs *resolve*. Push-nya ditunda (A2). | ✅ (depth) |
| B3 | **Search global** | Quick-find node/project di mobile (reuse modul `search` existing bila memungkinkan). | ✅ |
| B4 | **Layar Settings/Preferensi** | Satuan unit, bahasa, tema, preferensi (notif nanti), **ganti password**. | ✅ |
| B5 | **Pagination / virtual-scroll** | Pola standar untuk list besar — wajib untuk `sensor_logs` (~685k). Limit + "muat lebih" / infinite scroll. | ✅ |

## 3. Peluang mobile-native (disukai — masuk scope)

| # | Item | Catatan + kendala teknis | Status |
|---|------|--------------------------|--------|
| C1 | **Scan QR → buka node** | Teknisi scan QR perangkat → langsung detail node. Butuh kamera (`getUserMedia`) — **didukung iOS Safari & Android**. Lib QR ringan. | ✅ |
| C2 | **Pairing perangkat via BLE/QR di lokasi** | 🕗 **DITAHAN (HOLD).** Tidak dikerjakan sekarang. (Catatan kendala bila kelak dibuka: Web Bluetooth tidak didukung iOS Safari → BLE via PWA hanya Android.) | 🕗 |
| C3 | **"Action comment" = command device** | ✅ **TERKLARIFIKASI: ini command device (SMS/MQTT), bukan catatan.** Sudah tercakup di **Q6 Kontrol** (03-TECHNICAL-SPEC / diskusi). Tidak ada fitur logbook/notes terpisah. | ✅ |

## 4. Proses & rilis (backlog)

| # | Item | Catatan | Status |
|---|------|---------|--------|
| D1 | **PWA polish** | Install prompt (Add to Home Screen), manifest **shortcuts** ke `/mobile/*`, ikon/splash, flow update service worker ("versi baru tersedia"). | 📋 |
| D2 | **Test matrix** | iOS Safari + Android Chrome; breakpoint 360–430px; QA device nyata. | 📋 |
| D3 | **Feature-flag rollout** | Gulirkan bertahap + analytics pemakaian mobile. | 📋 |
| D4 | **i18n strings** | Manajemen string Bahasa Indonesia. | 📋 |

## 5. Verifikasi backend — ✅ SELESAI (diverifikasi di iot-backend-go)

**Hasil: semua kebutuhan read fase 1 SUDAH ADA.** Endpoint pasti per layar:

| # | Untuk | Endpoint terkonfirmasi | Bentuk response (ringkas) | Status |
|---|-------|------------------------|---------------------------|--------|
| V1 | Latest value per channel (Node detail) | `GET /nodes/{id}/dashboard` | `data.sensorsWithData[].channels[]{idSensorChannel,metricCode,unit,latestValue,timestamp,status}` + `data.node`, `health`, `uptime` | ✅ |
| V2a | Chart telemetry (Channel detail) | `GET /sensor-logs/telemetry/chart` | params `idSensorChannel,hours,maxPoints(≤500)` → `data.series[]{metricCode,unit,data[]{ts,v}}` | ✅ |
| V2b | Rows telemetry (Channel detail) | `GET /sensor-channels/{id}/readings` | params `startTime,endTime,aggregation` → `data.dataPoints[]{timestamp,value,quality,rawValue}` + `channel{...thresholds}` + `statistics` | ✅ |
| V4a | Node lat/long utk Peta | `GET /webgis/core/{projectId}/nodes` | GeoJSON `FeatureCollection` `features[]{geometry.coordinates[lon,lat], properties{code,connectivityStatus,lastSeenAt,...}}` | ✅ |
| V4b | Project + geofence | `GET /projects/{id}/detailed` | `data{idProject,name,areaType,geofence,status,nodes[],stats{totalNodes,activeNodes,...}}` | ✅ |
| V5 | Summary/count (Dashboard) | `GET /nodes/statistics/overview?projectId=` | `data{totalNodes,onlineNodes,offlineNodes,degradedNodes,...}` + `GET /alert-events/statistics/{summary,offline-nodes}` | ✅ |
| V10 | Latest semua channel se-project (tab Channel) | `GET /sensor-channels/overview?idProject=` | `data[]{idSensorChannel,metricCode,unit,min/maxThreshold,status(ok\|stale\|offline\|out_of_range),node{...},latest{ts,value,qualityFlag,ageSeconds}}` + `total,limit(≤2000)` | ✅ |
| V11 | SCADA view + nilai live (tab SCADA) | `GET /scada/diagrams?projectId=` + `GET /scada/diagrams/{id}/runtime` | runtime: `data.bindings[]{idSensorChannel,metricCode,unit,latestValue,latestTimestamp,connectivityState,freshnessState}` + `summary{healthy/warning/critical/offline Count}` | ✅ |
| V-node | Node detail (lat/long, sensors) | `GET /nodes/{id}/detailed` | `data{...,latitude,longitude,connectivityStatus,lastSeenAt,sensors[]{channels[]},stats}` | ✅ |
| V-list | Node list per project | `GET /nodes?idProject=&search=&page=&limit=` | `{data, meta}` | ✅ |
| V-alert | Alert list (view) | `GET /alert-events?status=&page=&limit=` (+ `/{id}/detailed`) | `data{data[]{idAlertEvent,severity,status,message,value,triggeredAt,node{},channel{}}, total,page,limit}` | ✅ |
| V7 | Realtime (WS/SSE) | **TIDAK ADA** di codebase (REST semua) → **A1 final: auto-reload polling** | — | ✅ (resolved) |
| V3 | (fase lanjut) command device | `POST /nodes/{id}/commands/send`, `GET /nodes/{id}/command-log`, `POST /device-commands/relay`, `GET /node-model-commands/by-node-model/{idNodeModel}` | — | ✅ ada (utk nanti) |
| V6 | (fase lanjut) ack/clear alert | `PATCH /alert-events/{id}/acknowledge`, `/clear` | — | ✅ ada (utk nanti) |

### ⚠️ Catatan & gap kecil dari hasil verifikasi
1. **Variasi wrapper response** — tidak semua `{data, meta}` standar:
   - `/alert-events` → **`{data:{data[],total,page,limit}}`** (nested ganda `data.data`).
   - `/sensor-channels/overview` → **`{data[], total, limit}`** (bukan `meta`).
   - Detail endpoint → `{data:{...}}`.
   - Komponen mobile harus parse sesuai bentuk masing-masing (bungkus di service, jangan di komponen).
2. **Filter alert by project — ✅ DIPUTUSKAN** (`/alert-events` belum punya param `idProject`):
   - **Alert Aktif** → **client-side filter** by project aktif (fetch `status=active&limit=100`, saring `idProject` di service). Aman karena alert aktif sedikit. **Nol backend.**
   - **Alert Riwayat** → fase 1 **owner-wide** (tidak di-scope project, beri label) karena filter client-side di data paginasi besar = lossy.
   - **Fast-follow (opsional):** tambah param `idProject` ke `/alert-events` (perubahan kecil ikut pola backend-module) bila perlu riwayat per-project.
3. **`sensor-channels/overview` sudah hitung `status`** (offline/stale/out_of_range/ok) + `latest.ageSeconds` → warna pill bisa langsung dari sini, tak perlu hitung threshold di FE. 👍
4. **`scada/.../runtime` sudah sediakan `connectivityState`+`freshnessState`+summary** → SCADA view tinggal render. 👍
5. **`/nodes/{id}/dashboard`** sudah bundel node + channels+latest + health + uptime → 1 call cukup untuk Node detail (efisien di mobile). 👍

---

## 6. Status keputusan

Semua keputusan arsitektur utama **sudah diambil** (A1 ✅, A2 🕗, A3 ✅, A4 ❌, A5 ✅; C2 🕗, C3 ✅). Tidak ada lagi yang menggantung dari sisi produk.

Sisa yang menentukan detail spec = **verifikasi backend (§5)** — bukan keputusan produk.

## 7. Rangkuman scope final

### FASE 1 — READ / VIEW-ONLY (yang dikerjakan sekarang)
Login mobile (view), project context switcher, dashboard ringkas, **list node**, **detail node** (channels + latest value), **channel detail** (chart 1-seri + rows), **alert — lihat saja** (aktif + riwayat, **tanpa** ack/snooze), **project detail ber-tab** (Detail · Peta[Leaflet lazy] · Node · Channel-last · **SCADA view read-only**), search global, **scan QR → node** (buka/lihat), **auto-reload data** (`AutoRefreshService`), offline UX, state catalog (loading/empty/error), pagination. Settings = lihat preferensi (tema/unit/interval; perubahan ringan lokal saja).

### FASE LANJUT — AKSI TULIS (non-CRUD, BUKAN sekarang)
**Kontrol device SMS/MQTT** (relay/restart/minta baca), **acknowledge/snooze alert**, **ganti password**. Disain sudah ada (05 §9, §6) tapi **ditunda** sampai read-only solid.

### DESKTOP ONLY — selamanya (mobile TIDAK menyentuh)
Semua **create/update/delete entitas** (node, project, sensor, channel, owner, user, dll), widget builder, IoT config/mapping Modbus, **editor SCADA penuh** (mobile hanya view read-only), WebGIS penuh, ML dashboard, report/export, manajemen users/owners, audit logs.

**DITUNDA/HOLD:** push notification alert (A2), pairing BLE (C2).

**TIDAK JADI:** catatan/logbook node (C3 ternyata = command device).
</content>
