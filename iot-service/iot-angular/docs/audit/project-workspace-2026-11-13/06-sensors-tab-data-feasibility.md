# 06 — Tab Sensors workspace: data apa yang sudah bisa diberikan backend (studi kelayakan)

Tanggal: 2026-11-13 · Penulis: Staff Engineer (audit, **tanpa mengubah kode**) ·
Halaman: `/iot/projects/1414bdba-000b-4e17-b877-557136f8ef2a/sensors` (project "Cabang Tebo", 12 node / 12 sensor / 12 channel `tekanan`)

Semua angka runtime di bawah diambil dari backend lokal `:3000` (token admin 5 menit) dan
dibaca langsung dari Postgres/ClickHouse produksi lewat tailnet (**read-only**:
`default_transaction_read_only=on`, CH `readonly=1`). Tidak ada restart, tidak ada tulis.

> Catatan: `sensors-page.component.ts` sedang diubah agen lain selama audit ini berjalan
> (awalnya 377 baris, sekarang 521 baris + export Excel + "offline since"). Nomor baris
> frontend mengacu pada versi **521 baris** kecuali disebut lain.

---

## 1. Peta request halaman (keadaan sekarang)

| # | Endpoint | Param yang dikirim | Dibaca backend? | Panggilan | Masalah |
|---|---|---|---|---|---|
| 1 | `GET /api/nodes` | `idProject`, `page`, `limit=100` | Ya (total 12 vs 78 tanpa filter — terbukti) | `ceil(N/100)` per muat + **tiap 60 dtk** | Redundan: setiap sensor sudah membawa objek `node` lengkap (40 field). Hanya dipakai untuk teks "across N nodes" |
| 2 | `GET /api/sensors` | `idProject`, `page`, `limit=100` | Ya (`sensor_controller.go:39` membaca `idProject` **atau** `projectId`) | `ceil(S/100)` per muat + **tiap 60 dtk** | Envelope datar `{data,total,page,limit,latestAvailable}`, bukan `meta` (`sensor_service.go:184-191`); channel tidak membawa threshold/precision |
| 3 | `GET /api/sensors` (lagi) + `GET /api/nodes` (lagi) | sama | — | 1× dari shell `project-workspace.component.ts:193-195` (tree) | Data yang sama dimuat 2× (shell + tab), sudah tercatat di 00-ringkasan §2.4 |

Biaya terukur (12 sensor): `/sensors` **0,29 s / 24.259 B** (≈ 2 KB per sensor), `/nodes` 0,19 s / 16.866 B.
Ekstrapolasi 300 sensor: 3 halaman paralel × (COUNT + JOIN PG + `IN` channels + 1 query CH) ≈ **600 KB per refresh**,
± **36 MB/jam per tab terbuka** hanya dari auto-refresh 60 dtk (plus nodes ≈ 420 KB per refresh). Masih jalan, tapi boros.

---

## 2. Jawaban per pertanyaan

### Q1 — Apa isi `GET /api/sensors?idProject=` per sensor/channel?

**Bukti runtime** (`/api/sensors?idProject=1414…&limit=100`):

- Field sensor: `idSensor, idNode, idSensorCatalog, sensorCode, label, location, status, protocolChannel,
  calibrationFactor, samplingRate, installDate, calibrationDueAt, createdAt, updatedAt, node, sensorCatalog,
  channels, lastValue, lastValueAt`.
- Field `node` (40): termasuk `telemetryIntervalSec` (120), `lastSeenAt` (timestamptz PG, ISO `Z`), `address`,
  `city`, `province`, `latitude/longitude`, `connectivityStatus`, `tags`, `picName/picPhone/picEmail`,
  `installationType`, `powerSource`, `nodeModel{…}`, `project{idProject,name}`.
- Field per **channel hanya 5**: `idSensorChannel, metricCode, unit, lastValue, lastValueAt`.

**`minThreshold`/`maxThreshold`/`precision` per channel TIDAK dikirim**, padahal **sudah di-SELECT** pada query yang sama:

- `app/services/sensor/sensor_service.go:661-678` (`getSensorChannels`) memilih `min_threshold, max_threshold, …, precision, aggregation`
  dan men-scan ke `sensorChannelRow` (`sensor_service.go:107-123`).
- `app/services/sensor/sensor_service.go:716-723` (`toSensorResponse`) hanya memetakan 5 field:
  ```go
  "idSensorChannel": channel.IDSensorChannel,
  "metricCode":      channel.MetricCode,
  "unit":            channel.Unit,
  "lastValue":       latestValueOrNil(latest),
  "lastValueAt":     latestTimeOrNil(latest),
  ```

**Biaya menambah: nol query tambahan** — cukup 3–5 baris di map `toSensorResponse`
(`minThreshold`, `maxThreshold`, `precision`, opsional `idSensorType`, `aggregation`). Karena `toSensorResponse`
juga dipakai `GetByID`/`GetByIDDetailed`/`GetDashboard` (`sensor_service.go:205,219,332`), perubahan ini aditif ke semua
konsumen (aman: hanya menambah key).

Data threshold nyata di project ini (`/api/sensor-channels/overview?idProject=…`): **7 dari 12 channel** punya threshold
(`0.5–5` bar, satu `1–3` bar), 5 channel kosong. Jadi UI harus menangani "ambang belum diisi".

**Precision — hati-hati**: `sensor_channels.precision` dipakai dengan dua arti di data produksi (langkah `0.01/0.001`
vs jumlah desimal `1/2`, dan `0`). Terlihat di `/api/sensor-channels` (nilai `0.001, 0.01, 1, 2, 0, null` bercampur).
Aturan tafsirnya sudah ada di `src/app/pages/iot/nodes/nodes-detail/sensor-chanel-detail/sensor-chanel-detail.ts:1370-1394`
(`decimalsFromPrecision`) — harus diekstrak ke util bersama, jangan ditulis ulang.

**Node interval/alamat/lastSeen**: sudah ada (lihat di atas). Tidak perlu request `/nodes` untuk itu.

Alternatif yang sudah ada: `GET /api/sensor-channels/overview?idProject=` (`sensor_channel_service.go:680-762`)
mengembalikan **per channel** threshold + node (interval, lastSeenAt, address) + latest + `status`
(`offline|stale|out_of_range|ok`) dalam **1 query** (12 channel: 0,17 s / 12,5 KB). **Tetapi** jangan dijadikan sumber
kedua untuk halaman ini:
- latest-nya dari **Postgres `sensor_logs` (LATERAL per channel)**, sedangkan `/sensors` dari **ClickHouse `sensor_channel_latest`** → dua sumber bisa beda;
- aturan status-nya beda dari `shared/utils/telemetry-freshness.ts` (stale = 3× interval, tidak ada tingkat 12× interval) dan
  "offline" bergantung kolom `connectivity_status` yang basi (node "Cadangan" diam sejak 25 Jul masih `degraded` → overview bilang `stale`);
- envelope `{data,total,limit}` tanpa `meta`, limit default 500 maks 2000 tanpa paging.

### Q2 — Endpoint mini-series 24 jam / min-max-avg harian untuk BANYAK channel sekaligus?

Yang ada, dan kenapa **tidak** layak untuk daftar:

| Endpoint | Sumber | Multi-channel? | Bukti | Vonis |
|---|---|---|---|---|
| `GET /api/sensor-logs/telemetry/chart?idProject=&hours=24&maxPoints=24` (`sensor_log_service.go:543-673`) | PG `sensor_logs` | Ya | `ORDER BY log.ts ASC LIMIT maxPoints*10` (`:595-598`) memotong **total** baris semua channel. Runtime: `totalPoints 240`, tiap series hanya **13:57→14:45 kemarin** (47 menit pertama dari 24 jam), 10 dari 11 channel | **Rusak untuk >1 channel** (bug kelas 1) |
| `GET /api/sensor-logs/telemetry/trends/{nodeId}` (`:392-541`) | PG raw | Per node | Mengembalikan semua titik mentah (720/channel/24 jam), stat min/max/avg dihitung di Go | **N+1** (1 request per node) + payload besar |
| `POST /api/reports/preview` `aggregation:"1h"` (`report_controller.go:47-438`) | CH `sensor_telemetry` | Ya | 11 channel: 0,21 s / 18 KB, **tapi hanya 18 baris (03:00–20:00 WIB) untuk jendela 24 jam** — kuirk timezone (lihat §3 #4). `summary.min/max` = min/max dari **rata-rata per jam** dan membuang nilai 0 (`:401`), `skipZero` default **true** (`:148`) | Salah jendela + salah min/max + tanpa scoping tenant (§3 #5) |
| `GET /api/sensor-channels/{id}/readings` | PG raw | 1 channel | — | N+1 |
| `GET /external-api/v1/sensor-data/aggregated` | PG | 1 channel | `external_api_controller.go:482-515` | API key eksternal, bukan untuk UI |

**Yang belum dipakai siapa pun dan paling murah:** ClickHouse sudah punya rollup terisi dan sinkron:

```
sensor_telemetry          MergeTree              ORDER BY owner_code, project_id, node_id, sensor_id, channel_id, event_time   1,317,254 rows
sensor_telemetry_10min    AggregatingMergeTree   (… , channel_id, time_bucket)                                                    373,199 rows
sensor_telemetry_1hour    AggregatingMergeTree   (… , channel_id, time_bucket)                                                     68,896 rows
sensor_telemetry_daily    AggregatingMergeTree   (… , channel_id, event_date)                                                       3,597 rows
```
Verifikasi sinkron (project ini, 10–13 Nov): `count raw = 25,820 = countMerge(1hour) = 25,820`; daily `21,775 = 21,775`.
`grep` di `iot-backend-go/app` → **tidak ada kode yang membaca `_1hour`/`_10min`/`_daily`**.

**Biaya terukur (CH, server produksi):**

| Query | Channel | rows_read | elapsed | Baris hasil |
|---|---|---|---|---|
| 1hour rollup, 24 bucket, GROUP BY channel,bucket | 11 (project) | 62.502 | **8 ms** | ~264 |
| 1hour rollup, semua channel yang punya data | 29 (seluruh CH) | 69.041 | **8 ms** | 495 |
| raw `sensor_telemetry` + `event_date` prefilter, 24 bucket | 11 | 130.612 | **10 ms** | 246 |

Ekstrapolasi **300 channel** @ interval 120 s: raw ≈ 300 × 720 = 216k baris dibaca → masih orde puluhan ms;
hasil 300 × 24 = 7.200 sel. Payload bila dikirim rapat (array sejajar, lihat kontrak) ≈ 50 KB (avg saja) – 150 KB (avg+min+max).
Kesimpulan: **1 query ClickHouse per halaman, bukan per channel**, murah untuk 12 maupun 300.

**Sketsa endpoint baru (kontrak-compliant):**

`GET /api/sensor-channels/trends?idProject={uuid}&hours=24&bucket=1h[&idNode=][&fields=avg,min,max]`

1. Resolve channel dari **Postgres** (otoritas + scoping tenant), pakai filter yang sama dengan `/sensors`:
   `sensor_channels sc JOIN sensors s JOIN nodes n JOIN projects p WHERE p.id_project=? [AND p.id_owner=? untuk tenant]`.
   Jangan memfilter CH dengan `project_id` saja (kolom CH denormalisasi, basi bila node dipindah project).
2. Satu query CH (raw untuk ≤ 48 jam — avg-nya benar; rollup `_1hour` untuk 7/30 hari):
   ```sql
   SELECT toString(channel_id) AS id_sensor_channel,
          formatDateTime(toStartOfHour(event_time), '%Y-%m-%dT%H:%i:%SZ') AS ts,  -- isi kolom = jam dinding UTC
          avg(eng_value) AS avg, min(eng_value) AS min, max(eng_value) AS max, count() AS n
   FROM iot.sensor_telemetry
   WHERE channel_id IN (...uuid dari langkah 1...)
     AND event_date >= toDate(toDateTime(toString(now('UTC')))) - 1
     AND event_time >= toStartOfHour(toDateTime(toString(now('UTC')))) - INTERVAL 23 HOUR
   GROUP BY channel_id, ts ORDER BY channel_id, ts
   ```
   (Varian rollup: `FROM iot.sensor_telemetry_1hour`, `avgMerge(eng_avg_state)`, `minMerge(eng_min_state)`,
   `maxMerge(eng_max_state)`, `countMerge(sample_count_state)`, `GROUP BY channel_id, time_bucket` — **wajib** GROUP BY
   ulang karena key rollup juga memuat `sensor_label/min_threshold/max_threshold`; di project ini daily 13 Nov ada 19 baris untuk 11 channel.)
   Catatan: `eng_avg_state` = `avgStateIf(eng_value, eng_value != 0)` → rata-rata rollup **membuang angka 0**
   (tekanan 0 = air mati = justru penting). Untuk 24 jam pakai raw.
3. Respons (list = `{ data, meta }`):
   ```json
   { "data": [ { "idSensorChannel": "…", "bucketSec": 3600, "from": "2026-11-12T14:00:00Z",
                 "avg": [0.97, …24], "min": [...], "max": [...], "count": [30, …],
                 "stats": { "min": 0.858, "max": 1.605, "avg": 1.31, "count": 538, "lastBucketAt": "2026-11-13T13:00:00Z" } } ],
     "meta": { "total": 12, "page": 1, "limit": 12, "totalPages": 1 } }
   ```
   Bucket kosong = `null` (bukan 0, bukan diisi). `stats.min/max` dari **min/max mentah**, bukan dari rata-rata per jam.
   CH gagal → **error 503/500**, bukan `data: []` (bug kelas 4); atau ikuti pola `/sensors`: kirim flag eksplisit.
4. Frontend memanggilnya **1×** saat muat + tiap 5–10 menit (bukan 60 dtk); data bucket per jam tidak berubah tiap menit.

### Q3 — "Offline sejak" cukup dari `lastSeenAt` / nilai terakhir channel?

**Ya, frontend saja.** Data yang ada per baris: `channels[].lastValueAt` (CH, per channel), `lastValueAt` sensor
(= channel terbaru), `node.lastSeenAt` (PG, heartbeat node apa pun isinya), `node.telemetryIntervalSec`.

Dua jebakan nyata:
- Sensor "tekanan" di node **Cadangan** (`HELIO-865124070949369`): channel **tidak pernah** punya nilai
  (`sensor_logs` 0 baris, tidak ada di `sensor_channel_latest`), tapi `node.lastSeenAt = 2026-07-25T04:20:59Z`.
  Kode sekarang (`sensors-page.component.ts:200` `getFreshness(sensor.lastValueAt, …)` dan `:407-410` `deadSinceText`)
  menampilkan "No Data / Belum pernah kirim data" — benar untuk channel, tapi menyembunyikan fakta penting "node terakhir
  terlihat 111 hari lalu". Tampilkan keduanya.
- `node.connectivityStatus` **jangan dipakai** (node diam sejak Juli masih `degraded`). Hitung dari timestamp.
- Sensor multi-channel: `lastValueAt` sensor = channel terbaru → satu channel mati tidak terlihat. Hitung status per channel bila >1 channel.

### Q4 — Out-of-range SEKARANG bisa dihitung di klien?

**Ya**, setelah Q1 (threshold di list). Aturan harus identik dengan backend `computeChannelStatus`
(`sensor_channel_service.go:764-796`): pakai nilai engineered, `min != null && v < min` / `max != null && v > max`.
Ambang **0 adalah nilai sah** (ada channel diameter `0..1000`, debit `0..100`) → cek `!= null`, jangan truthy.
Out-of-range hanya bermakna bila status `fresh` (nilai basi tidak "sekarang"). Bukti data hari ini dari overview:
Mangun Jayo Ujung `-0.72` (min 0.5) dan Perkantoran `0.043` (min 0.5) → `out_of_range`.
Buat util bersama `shared/utils/channel-range.ts` (`isOutOfRange(value, min, max)`), jangan inline di template.

### Q5 — Export Excel daftar: frontend saja?

**Ya, frontend saja** — datanya sudah ada di memori (`filteredSensors`). Agen lain sudah menulisnya
(`sensors-page.component.ts:457-519`). Hasil periksa:
- Pola timezone **benar**: `toExcelLocal = new Date(d.getTime() - d.getTimezoneOffset()*60_000)` (`:463`), sama dengan
  `sensor-chanel-detail.ts:1219-1230`. Excel menyimpan komponen UTC; tanpa geser, 20.45 WIB tampil 13.45. Judul kolom
  memuat label zona (`localTzLabel()` `:438-442`). Sebaiknya ekstrak ke `shared/utils/excel-time.ts` (dua salinan sekarang).
- `import { Workbook } from 'exceljs'` statis (`:5`): **tidak menambah chunk** — `ProjectsModule` sudah mengimpor `NodesModule`
  (`projects.module.ts:15,62`) yang sudah membawa exceljs lewat `sensor-chanel-detail.ts:5`. OK.
- Risiko kecil: `numFmt = '0.00'` tetap (`:503`) mengabaikan precision; kolom Status per baris channel memakai status
  **sensor** (`:497`) sementara nilai/waktu per **channel** → bisa tidak konsisten untuk sensor multi-channel.
- Setelah Q1/Q2: tambahkan kolom Ambang Min/Max, "Di luar ambang", Min/Maks 24 jam — tetap frontend.

### Q6 — Filter node / area / DMA: field apa yang ada?

Kolom nyata (`information_schema`, produksi):
- `projects`: `id_project, id_owner, name, area_type, geofence, status` — **tidak ada** `type`/`parent_id`
  (rancangan pohon project di `docs/design/project-hierarchy-impact-audit.md` **belum dimigrasi**). Sebagian PDAM memakai
  *project* sebagai DMA, sebagian sebagai Cabang. Project ini: "Cabang Tebo", `area_type='plant'`, `geofence` null.
- `nodes`: `address, city, province, postal_code, latitude, longitude, installation_type, power_source, tags[]` — **tidak ada kolom DMA/zona**.
- Isi di project ini: `city/province` kosong 12/12, `tags` kosong 12/12, `installation_type` 2/12 (`outdoor`), lat/lon 12/12.
- Global: `tags` dipakai 20 node, nilainya `demo-sim` dan `dma-1..dma-5` (tenant demo) → **konvensi de-facto DMA = tag `dma-*`**.
- WebGIS `map_layer` milik owner ini hanya layer core Point + "Jaringan Pipa" (0 fitur); tidak ada poligon DMA di mana pun
  → point-in-polygon tidak mungkin sekarang.

Jadi: **filter per node** = data tersedia (frontend). **Filter area/DMA** = belum ada data untuk project ini; opsi murah:
filter berdasarkan `node.tags` (sudah ikut di respons) + isi tag `dma-*` saat pairing; solusi benar = pohon project (`type='dma'`).

### Q7 — Risiko di kode sensors-page sekarang

Lihat temuan §3 #6–#9.

---

## 3. Temuan

1. **[P1]** · `iot-backend-go/app/services/sensor/sensor_service.go:716-723` · Threshold & precision per channel di-SELECT
   (`:668-673`) tapi dibuang di respons list · bukti: respons runtime channel hanya 5 key · dampak: UI tidak bisa menandai
   "di luar ambang" atau memformat desimal tanpa request kedua (N+1 atau overview dengan sumber latest berbeda) ·
   perbaikan: tambah `"minThreshold": channel.MinThreshold, "maxThreshold": channel.MaxThreshold, "precision": channel.Precision`
   (opsional `"idSensorType"`, `"aggregation"`) di map channel `toSensorResponse`.

2. **[P1]** · `iot-backend-go/app/services/sensorlog/sensor_log_service.go:595-598` · `/sensor-logs/telemetry/chart` membatasi
   `maxPoints*10` baris **total** yang diurut ASC · bukti: `idProject`, `hours=24` → setiap series hanya 13:57–14:45 kemarin, 10/11 channel ·
   dampak: siapa pun yang memakai ini untuk >1 channel melihat grafik 47 menit yang tampak seperti 24 jam ·
   perbaikan: agregasi per bucket di DB (CH) per channel, atau batasi per channel (`ROW_NUMBER() OVER (PARTITION BY id_sensor_channel …)`). Jangan dipakai untuk sparkline.

3. **[P2]** · tidak ada endpoint tren multi-channel yang benar · dampak: sparkline/min-max 24 jam tidak bisa dibuat tanpa N+1 ·
   perbaikan: endpoint baru `GET /api/sensor-channels/trends` (sketsa Q2).

4. **[P1]** · `iot-backend-go/app/http/controllers/report/report_controller.go:192-193,200` · jendela waktu report salah 7 jam:
   `parseDateTimeBestEffort('…Z')` = epoch UTC benar, sedangkan `event_time` berisi jam dinding UTC yang ditafsir Asia/Jakarta
   (kuirk gtw, `.claude/skills/clickhouse-backfill/SKILL.md:81-86`) · bukti: preview 24 jam (13:59Z kemarin → 13:59Z) hanya
   18 baris `03:00…20:00` WIB (seharusnya mulai 21:00 WIB kemarin); query langsung CH `time_bucket >= now('UTC') - 24h` juga
   hanya 17–18 bucket, sedangkan `toDateTime(toString(now('UTC')))` memberi 24 bucket · dampak: Report & export kehilangan 7 jam
   pertama setiap rentang · perbaikan: bandingkan dengan `toDateTime(toString(<ts UTC>))` (atau `toTimeZone`-reinterpret) — jangan
   menyalin pola ini ke endpoint baru. **Turunan:** `sensor_telemetry_daily.event_date` = hari **UTC** (07:00–06:59 WIB) —
   terbukti `event_date='2026-11-12'` berisi `00:00:24…23:59:39` jam-dinding-UTC. Untuk "min/maks hari ini (WIB)" pakai `_1hour`
   dari `toDateTime(toString(toTimeZone(toStartOfDay(now('Asia/Jakarta')),'UTC')))` (terverifikasi = `2026-11-12 17:00:00`).

5. **[P1]** · `report_controller.go:47-438` + `routes/api.go:90,366` · `/reports/preview` hanya `JwtAuth`, tidak membaca owner;
   `startDate/endDate/channelIds` di-`Sprintf` ke SQL (`:192-193`, `toUUID('%s')`) · dampak: tenant bisa membaca channel owner lain
   dan injeksi SQL ClickHouse · perbaikan: resolve channel lewat PG dengan `p.id_owner = sc.OwnerID` untuk tenant; parse tanggal di Go
   (`time.Parse`) dan validasi UUID sebelum dirakit. (Di luar tab Sensors, tapi jangan dipakai ulang sebagai sumber sparkline.)

6. **[P2]** · `sensors-page.component.ts:113-117,134-140` · auto-refresh 60 dtk memuat ulang **nodes + sensors** lengkap ·
   bukti: 2 KB/sensor, `/nodes` 1,4 KB/node · dampak: ~600 KB + ~420 KB per menit pada 300 sensor; ~2–4 query PG + 1–3 query CH per menit per tab ·
   perbaikan: refresh berkala hanya `/sensors` (nodes cukup saat muat/klik manual; node sudah tertanam di sensor), dan/atau parameter
   ringan `fields=list` di backend yang menghilangkan 30+ field node yang tidak dipakai tabel.

7. **[P2]** · `sensors-page.component.ts:200` & `:407-410` · status/“sejak kapan” hanya dari `sensor.lastValueAt` · bukti: node Cadangan
   terlihat 2026-07-25, channel tanpa data → "Belum pernah kirim data" · dampak: operator tidak tahu node pernah hidup dan kapan mati ·
   perbaikan: tampilkan "Node terakhir terlihat {timeAgo(node.lastSeenAt)}" bila `lastValueAt` null; status per channel untuk sensor >1 channel.

8. **[P3]** · `sensors-page.component.ts:354` (`toFixed(2)`) & `:503` (`'0.00'`) · presisi tetap 2 desimal · perbaikan: setelah #1, pakai
   `decimalsFromPrecision` yang diekstrak dari `sensor-chanel-detail.ts:1382-1394` ke `shared/utils`.

9. **[P3]** · `sensor_service.go:180,184-191` · paging `ORDER BY s.created_at DESC LIMIT/OFFSET` + envelope datar · dampak: bila sensor
   ditambah di antara halaman 1 dan 2 dari `fetchAll`, satu baris bisa dobel/hilang (hanya >100 sensor); `meta` tidak sesuai kontrak ·
   perbaikan: `ORDER BY s.created_at DESC, s.id_sensor` + `meta:{total,page,limit,totalPages}` (frontend `totalOf()` sudah mendukung keduanya,
   `shared/utils/fetch-all.ts:22-25`).

10. **[P3, sampingan]** · `iot-backend-go/app/http/controllers/sensorchannel/sensor_channel_controller.go:32-40` · `GET /api/sensor-channels`
    **tidak membaca `idProject`** · bukti: `?idProject=1414…` → `total 238` (project hanya punya 12) · dampak: konsumen yang mengandalkannya
    (`report-page.ts:264`, `telemetry-list.ts:507`, widget wizard) diam-diam menerima channel semua project (bug kelas 2) · perbaikan: tambah
    `IDProject` di filter `Index` (filter `n.id_project` sudah ada di `buildChannelWhere`, dipakai `Overview` `:71`). `List` memakai `buildChannelWhere` yang sama (`sensor_channel_service.go:98`) — cukup isi `IDProject` di controller.

---

## 4. Terverifikasi BENAR (jangan diperbaiki ulang)

- `/sensors` dan `/nodes` memang memfilter `idProject` (12 vs 78 node; 12 sensor). Tidak ada N+1 di tab Sensors; `fetchAll` memuat semua halaman (`fetch-all.ts:33-51`).
- Host ClickHouse `/sensors` dari config `.env` (`sensor_service.go:24-44`); `grep 109.105.194.174` di `app/` & `config/` kosong.
  160 error "ClickHouse latest values unavailable … 109.105.194.174" di `goravel-2026-11-13.log` semuanya ≤ 12:26 — dari binary lama;
  proses sekarang mulai 20:49 dan `latestAvailable: true`.
- Error CH tidak ditelan di `/sensors`: `latestAvailable=false` + banner (`sensor_service.go:997-1085`, template alert).
- `sensor_channel_latest` tanpa `FINAL` aman: diurut `last_update DESC`, ambil pertama per channel (`:1067-1076`).
- `lastValueAt` dari CH (string jam dinding UTC, di-parse sebagai UTC oleh `parseFlexibleTime`) cocok dengan `node.lastSeenAt` PG (selisih detik) → tidak ada geser 7 jam di tab ini.
- Rollup `_1hour`/`_daily` lengkap dan sinkron dengan raw (25.820 = 25.820).
- Export Excel: geser offset lokal benar; exceljs statis tidak menambah ukuran chunk.
- Cleanup interval/subscription ada (`ngOnDestroy` `:120-125`); refresh dilewati saat tab tersembunyi.

---

## 5. Rencana perbaikan berurutan

**Backend (A dan B paralel; C sesudah A diputuskan kontraknya):**
- A. `app/services/sensor/sensor_service.go` `toSensorResponse` (`:716-723`): + `minThreshold`, `maxThreshold`, `precision`. ±5 baris, tanpa query baru.
  Sekalian (opsional, sama file) `List` → `meta` + tie-breaker `ORDER BY s.created_at DESC, s.id_sensor`.
- B. `app/http/controllers/sensorchannel/sensor_channel_controller.go:32-40`: baca `idProject` di `Index`.
- C. Endpoint `GET /api/sensor-channels/trends`:
  `app/dto/sensorchannel/…` (filter `IDProject, IDNode, Hours≤168, Bucket∈{10m,1h}`),
  `app/services/sensorchannel/sensor_channel_service.go` (method `Trends`: resolve channel PG dengan scoping tenant → 1 query CH via
  `chService.Instance().ExecuteQuery`, raw ≤48 jam / `_1hour` lebih panjang, jendela pakai `toDateTime(toString(now('UTC')))`, CH gagal → error),
  `app/http/controllers/sensorchannel/sensor_channel_controller.go` (handler `Trends`),
  `routes/api.go` didaftarkan **sebelum** `/sensor-channels/{id}` (pola `/overview` di `:198`).
- D. (terpisah, P1) perbaiki jendela waktu & scoping `report_controller.go` — jangan blokir tab Sensors.

**SDK (sesudah A/C):** regen rusak (memori "SDK Regen Gotcha") → tambah manual: field `minThreshold/maxThreshold/precision` pada model
channel di `src/sdk/core/models/…` yang dipakai respons `/sensors` (atau biarkan `any`, sesuai pola sekarang), dan fungsi
`src/sdk/core/fn/sensor-channels/sensor-channels-controller-trends.ts` + method di `sensor-channels.service.ts`.

**Frontend (paralel satu sama lain setelah SDK):**
- F1. `shared/utils/channel-range.ts` (`isOutOfRange`) + `shared/utils/precision.ts` (ekstrak `decimalsFromPrecision`) + `shared/utils/excel-time.ts`.
- F2. sensors-page: kolom/badge "di luar ambang" (hanya bila fresh), format desimal, "node terakhir terlihat", status per channel.
- F3. sensors-page: sparkline 24 jam + min/maks dari `/sensor-channels/trends` (1 request, refresh 5–10 menit, bucket null = celah).
- F4. Auto-refresh 60 dtk hanya `/sensors`; `/nodes` saat muat/manual. Ambil data dari shell (`project-workspace.component.ts:193-195`) bila store bersama jadi dibuat.
- F5. Filter node (sekarang) dan filter `tags` `dma-*` (sementara); filter DMA sungguhan menunggu migrasi pohon project.
