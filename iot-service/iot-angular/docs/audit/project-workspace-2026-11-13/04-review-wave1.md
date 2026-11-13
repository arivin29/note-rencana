# 04 — Review Wave 1 (perubahan belum di-commit, 13 Nov 2026)

Reviewer: Staff Engineer (review only, tidak ada file kode yang diubah).
Lingkup: diff frontend `iot-angular` + backend `iot-backend-go` sesuai daftar tugas.
Aturan owner: **tidak boleh ada data dummy/acak/simulasi yang ditampilkan sebagai data nyata, di mana pun.**

## Verdict

**FIX FIRST** (perbaiki dulu) — tidak ada regresi build dan sebagian besar perubahan benar, tetapi
masih ada **6 temuan P1** di file yang direview yang menampilkan informasi palsu/menyesatkan
(Last sample salah, Alerts lintas project, "Last sync Never", ambang hilang di jalur tree,
status tree beda aturan, error ClickHouse ditelan → "No Data" palsu). Semuanya perbaikan kecil.

## Bukti runtime yang dikumpulkan

- `npx ng build --output-path=/tmp/claude-501/ngbuild-review` → **exit 0, 0 warning** (tidak ada
  template yang masih mereferensikan `quality`, `uptimePercent`, `latencyMs`, `avgUptime`,
  `avgLatency`; `reading.id` sudah tidak ada di template — grep juga bersih).
- Backend lokal (PID start 19:26:44, setelah mtime `sensor_service.go` 19:26:35 → kode baru aktif).
  Token admin 5 menit dibuat dari `.env` (secret tidak dicetak, file token dihapus).
- Project uji: Cabang Tenggarong `5deae217-…` (8 node, 8 sensor).

| Panggilan | Hasil |
|---|---|
| `GET /sensors?idProject=P&limit=100` | 200, `{data,total:8,page,limit}` (flat, **bukan** `meta`), n=8, 0.20s |
| `GET /sensors?idProject=P&limit=5&page=2` | total 8, n=3 → paging & filter jalan |
| `GET /sensors?projectId=P&limit=1` | total 8 → alias `projectId` jalan |
| `GET /sensors?limit=1` | total 140 → tanpa filter = semua |
| `GET /nodes?idProject=P&limit=500` | `meta.limit` = **100** (cap backend dikonfirmasi) |
| `GET /nodes?idProject=P&limit=5&page=99` | n=0, `meta.total` 8 → halaman kosong aman |
| `lastValueAt` sensor vs `date -u` | `12:48:40Z` vs `12:49:53Z` → **zona waktu benar** (kuirk +7 jam CH saling meniadakan) |
| `GET /sensor-channels/{ch}/readings` (1 jam) | 29 titik, **urut naik** (11:52 → 12:48), channel `minThreshold 0.5 / maxThreshold 5` |
| `GET /sensor-channels/{idSensor}/readings` | 404 (jalur fallback embedded memang terpicu dari tree) |
| `GET /sensors/{id}/detailed` | `channels[0]` = `{idSensorChannel,metricCode,unit,lastValue,lastValueAt}` **tanpa threshold**; `sensorChannels[0]` punya `minThreshold/maxThreshold` |
| `GET /alert-events?limit=10` | total 494, **0 dari 10** milik project Tenggarong (WAYRL, DEMO1, HELIO-0000…) |
| `GET /projects/P/detailed` | tidak ada `lastSync`/`lastDataAt` |
| `GET /sensor-logs/telemetry/trends/{node}?hours=24` | 0.26s, 56 KB per node |
| Log `goravel-2026-11-13.log` | 160× `ClickHouse latest values unavailable … 109.105.194.174 … Client.Timeout` (terakhir 12:26, sebelum fix) — sejak restart tidak ada lagi |

## 1. Peta request (setelah perubahan)

| Halaman | Endpoint | Param | Panggilan | Masalah |
|---|---|---|---|---|
| Workspace shell | `/projects/{id}/detailed` | – | 1 | duplikat dgn Overview (P3) |
| Workspace shell | `/nodes` | `idProject, limit=100` | 1 | tanpa paging >100 (P2); duplikat dgn Overview & Sensors (P3) |
| Workspace shell | `/nodes/{id}/sensors` | – | **N (per node)** | N+1 (P2, F-10) |
| Sensors tab | `/nodes` | `idProject, page, limit=100` | ceil(total/100) | redundan — `sensor.node` sudah lengkap (P3) |
| Sensors tab | `/sensors` | `idProject, page, limit=100` | ceil(total/100) | OK; refresh 60 s |
| Overview | `/projects/{id}/detailed` | – | 1 | `lastSync` tidak ada (F-3) |
| Overview | `/nodes` | `idProject, limit=100` | 1 | tanpa paging; error ditelan (F-12) |
| Overview | `/sensor-logs/telemetry/trends/{nodeId}` | `hours=24` | **N (per node)** | hasil `keyMetrics` **tidak dirender** sama sekali (F-7) |
| Overview | `/sensors` | `idProject, limit=100` | 1 | tanpa paging (F-13) |
| Overview | `/alert-events` | `limit=10` | 1 | **tidak difilter project** (F-2) |
| Channel detail (embedded) | `/sensor-channels/{id}/readings` | `startTime,endTime` | **2×** (ngOnChanges + ngOnInit) | duplikat + race (F-9) |
| Channel detail via tree | + `/sensors/{id}/detailed` + readings | – | 2×(404+detailed+readings) = 6 | ambang hilang (F-4) |

## 2. Temuan

### P1

**F-1 [P1] · `sensor-chanel-detail.html:47-49` · "Last sample" menampilkan sampel TERTUA, bukan terbaru**
- Bukti: template `displayedReadings[0]?.timestamp`; API readings terbukti urut naik (`11:52:40` … `12:48:40`).
  Default periode 7 hari → kartu menampilkan waktu ~7 hari lalu; ikut berubah saat ganti halaman/filter status.
- Dampak: operator mengira channel berhenti kirim seminggu lalu padahal data masuk 1 menit lalu.
- Perbaikan: tambah getter di TS
  `get lastSampleAt(): Date | null { return this.allReadings.reduce((m, r) => !m || r.timestamp > m ? r.timestamp : m, null as Date | null); }`
  dan pakai `lastSampleAt` di template. Sekalian urutkan `allReadings` turun
  (`.sort((a,b)=>b.timestamp.getTime()-a.timestamp.getTime())`) agar tabel menampilkan terbaru dulu.

**F-2 [P1] · `overview-page.component.ts:486-488` + `.html:156-161` · Kartu "Alerts" menghitung alert project LAIN**
- Bukti: `alertEventsControllerFindAll$Response({ limit: 10 })` tanpa filter; backend
  `alert_event_controller.go:30-41` tidak membaca `idProject`/`idNode`. Runtime: 0/10 alert milik Tenggarong; angka "10" = batas limit (total 494).
  Label "Active alerts" padahal tidak difilter `status`.
- Dampak: project sehat tampil "10 Active alerts" merah; data tenant lain (WAYRL/DEMO1) terlihat di project ini (admin).
- Perbaikan: backend — tambah `IDProject` di `AlertEventFilter` (join `nodes n ON n.id_node = ae.id_node WHERE n.id_project = ?`), baca `idProject` di controller; SDK — tambah `idProject?: string` manual di `alert-events-controller-find-all.ts`; frontend — panggil `{ idProject: this.projectId, status: 'open', limit: 1 }` dan tampilkan `meta.total`/`total`, bukan `alerts.length`. Sampai backend siap: sembunyikan angka (tampilkan "—").

**F-3 [P1] · `overview-page.component.ts:191, 517-529` + `.html:101` · Badge "Last sync Never" palsu**
- Bukti: `lastSync: data.lastSync || data.lastDataAt`; respons `/projects/P/detailed` tidak punya kedua field → "Last sync Never", sementara kartu System Health di halaman yang sama menulis "Last Data Received 1m ago".
- Perbaikan: `get lastSyncFormatted()` → `return this.systemHealth.lastDataAt ? timeAgo(this.systemHealth.lastDataAt) : 'Never';` (atau hapus badge).

**F-4 [P1] · `sensor-chanel-detail.ts:241, 257-260` · Jalur tree (ID sensor) menghilangkan ambang → "Ambang belum diatur" + bacaan tidak ditandai**
- Bukti: tree navigasi `['node', parentNode.id, 'sensor', node.id]` dengan `idSensor` (`project-workspace.component.ts:365`) → readings 404 → `loadSensorData` → `sensor.channels[0]` dari `/sensors/{id}/detailed` **tidak punya** `minThreshold/maxThreshold` (runtime) → `toThreshold(undefined)` = null. Channel sebenarnya 0.5 / 5 bar.
  Ini regresi semantik dari perubahan hari ini: dulu tampil 0/100 palsu, sekarang tampil "belum diatur" yang juga salah, dan nilai di luar ambang tidak ditandai.
- Perbaikan (pilih salah satu, A lebih sederhana):
  A. Di `loadSensorData` setelah dapat `channelId`: `this.channelId = channelId; this.loadChannelData();` (respons readings sudah membawa `channel.minThreshold/maxThreshold/sensorType`), hapus `loadChannelReadings`.
  B. `const channels = sensor.sensorChannels?.length ? sensor.sensorChannels : (sensor.channels || []);`
  Lebih baik lagi: tree mengirim channel id (`sensor.channels?.[0]?.idSensorChannel`) seperti Sensors tab, sehingga fallback 404 tidak diperlukan.

**F-5 [P1] · `project-workspace.component.ts:296-306` · Tree memakai aturan status lokal 5/30 menit, bertentangan dengan util bersama**
- Bukti: `if (diffMinutes < 5) 'online'; if (< 30) 'warning'`. Util: fresh < max(10, 3×interval). Node interval 120 s, lastSeen 7 menit lalu → Tree kuning "warning", Sensors tab "Fresh", Overview "online" — di layar yang sama. Header util sendiri menulis "Use this everywhere … (… workspace tree …). Do NOT invent local thresholds."
  Anak sensor juga diberi status node (`status: this.getNodeStatus(node)`, baris 267) — bukan status sensor.
- Perbaikan: ganti isi `getNodeStatus` dengan mapping `getFreshness(node.lastSeenAt, node.telemetryIntervalSec)` persis seperti `overview-page.component.ts:507-514` (lebih baik: ekspor helper `freshnessToNodeStatus()` dari util dan pakai di kedua tempat). Untuk anak: `getFreshness(sensor.lastValueAt, node.telemetryIntervalSec)`.

**F-6 [P1] · backend `app/services/sensor/sensor_service.go:1011-1040` (`fetchLatestValues`) · Error ClickHouse ditelan → semua sensor "No Data"**
- Bukti: setiap kegagalan (`client.Do` error, status non-2xx, parse error) → `return byChannel, bySensor` kosong, respons tetap 200. Log hari ini: 160× timeout sebelum fix host. Sensors tab lalu menghitung semua sensor sebagai `nodata` (`getFreshness(null)`), Overview menampilkan "-"/"Never".
- Dampak: "No Data" palsu untuk seluruh project saat CH lambat — persis kelas bug #4.
- Perbaikan: ubah signature menjadi `fetchLatestValues(ids) (byChannel, bySensor, ok bool)`; di `List` tambahkan field `"latestAvailable": ok` ke map respons (tetap kompatibel). Frontend Sensors/Overview: jika `latestAvailable === false` tampilkan banner "Nilai terakhir tidak tersedia (ClickHouse)" dan status "—" alih-alih "No Data". Juga hormati `clickhouse.enabled` (lihat F-11).

**F-7 [P1] · `overview-page.component.ts:245, 305-401` · N+1 request trend yang hasilnya tidak pernah dirender**
- Bukti: `loadKeyMetricsTrends()` memanggil `/sensor-logs/telemetry/trends/{nodeId}` per node via `forkJoin`; `keyMetrics`/`loadingTrends` tidak ada di template (grep). Runtime 0.26 s / 56 KB per node → project 100 node = 100 request, ~5.6 MB dibuang setiap buka Overview. Kode itu juga mengarang nol: `parseFloat(dp.value) || 0`, `lastValue || … || 0`, ambang tren absolut `0.5` tanpa memandang satuan.
- Perbaikan: hapus pemanggilan `this.loadKeyMetricsTrends()` (baris 245) beserta method, `keyMetrics`, `buildSparklineChart`, dan import `SensorLogsService`/`EChartsOption` bila tak dipakai. Jika kelak diperlukan: endpoint agregat per project, dan nilai null tetap null.

### P2

**F-8 [P2] · `sensor-chanel-detail.ts:189-190, 303-304` · Timestamp dikarang = "sekarang"**
- `rawTs ? new Date(rawTs) : new Date()` dan `isNaN(...) ? new Date()`. Bacaan tanpa/invalid timestamp tampil sebagai data terbaru. API saat ini selalu mengirim `timestamp`, jadi laten, tetapi melanggar aturan owner.
- Perbaikan: `.filter(dp => { const t = new Date(dp.timestamp || dp.ts); return !isNaN(t.getTime()); })` sebelum `map`, dan hapus fallback `new Date()`. Hapus juga field `id` yang kini tak terpakai di `SensorReading` (baris 8, 193, 307).

**F-9 [P2] · `sensor-chanel-detail.ts:106-124` · Load ganda di mode embedded + tanpa pembatalan**
- `ngOnChanges` (input pertama) memanggil `loadChannelData()`, lalu `ngOnInit` memanggil lagi → 2 request identik (6 request lewat jalur tree). Tidak ada `Subscription` yang dibatalkan, sehingga respons lambat dari periode lama bisa menimpa periode baru.
- Perbaikan: di `ngOnInit` cabang embedded cukup `return;` (biarkan `ngOnChanges` yang memuat); simpan `private readingsSub?: Subscription` dan `this.readingsSub?.unsubscribe()` di awal `loadChannelData/loadChannelReadings`; tambah `ngOnDestroy`.

**F-10 [P2] · `project-workspace.component.ts:213-241` · Tree: N+1 `/nodes/{id}/sensors` dan error per node ditelan**
- Sekarang `/sensors?idProject=` sudah bekerja (terverifikasi). Ganti dengan satu panggilan (pakai pola `fetchAll` dari Sensors tab) lalu kelompokkan per `idNode`. `catchError(() => of({sensors: []}))` membuat node tampak tanpa sensor saat gagal.

**F-11 [P2] · `sensor_service.go:24-44` · `clickHouseHTTPConfig` mengabaikan `CLICKHOUSE_ENABLED` dan menduplikasi `services/clickhouse`**
- `services/clickhouse/clickhouse_service.go:46` memeriksa `clickhouse.enabled`; fungsi baru tidak. On-prem dengan `CLICKHOUSE_ENABLED=false` → setiap `/sensors` mencoba `localhost:8123` dengan timeout 5 s.
- Perbaikan: `if !facades.Config().GetBool("clickhouse.enabled") { return …, false }` di awal `fetchLatestValues` (gabung dengan F-6), idealnya pakai client `services/clickhouse` yang sudah ada.
- Catatan: kredensial yang kini dipakai = `iot_ingest` (user tulis). Pertimbangkan user read-only (`grafana`) lewat env terpisah, mis. `CLICKHOUSE_READ_USERNAME` — perlu verifikasi hak SELECT.

**F-12 [P2] · `overview-page.component.html:28-33` + `.ts:250-253` · Badge header salah & error node ditelan**
- Semua node "stale" (online=0, offline=0) → badge merah **"System Offline"** (syarat hanya `onlineDevices === 0`). Seharusnya:
  `All Systems Operational` jika `online === total`; `System Offline` jika `offlineDevices === totalDevices`; selain itu `N Issues Detected` (hapus syarat `onlineDevices > 0`).
- 0 device: tidak ada badge yang muncul — OK, tetapi bila `loadNodes` error, halaman menampilkan 0/0/—/0 tanpa pesan. Tambah `nodesError` dan tampilkan alert + Retry di kartu System Health dan Device Grid.

**F-13 [P2] · `overview-page.component.ts:209, 434` · Limit 100 tanpa paging di Overview (dan shell `project-workspace.component.ts:184`)**
- Project >100 node/sensor → kartu Devices/Sensors dan hitungan health terpotong diam-diam (kelas bug #1). Pindahkan `fetchAll` dari `sensors-page.component.ts:174-201` ke util/service bersama (mis. `shared/utils/fetch-all.ts`) dan pakai di ketiga tempat; atau ambil angka dari `project.stats.totalNodes/totalSensors` (sudah ada di `/detailed`).

**F-14 [P2] · `overview-page.component.html:143` · Kartu "Sensors" menampilkan jumlah DEVICE offline**
- `{{ systemHealth.offlineDevices }} offline` di bawah jumlah sensor. Ganti dengan hitungan sensor berbasis `getFreshness(s.lastValueAt, s.node?.telemetryIntervalSec) === 'offline'` atau hapus baris itu.

**F-15 [P2] · `overview-page.component.html:122-124` · Teks statis tampil sebagai fakta**
- "Streaming · MQTT" dan "Retention 30 days" di-hardcode. Node Tenggarong ber-`nodeModel.protocol = "TCP"` (runtime). Retensi tidak bersumber dari data mana pun (perlu verifikasi TTL CH). Hapus blok "Data Window" atau isi dari data nyata (protokol dari `nodes[].nodeModel.protocol` unik).

**F-16 [P2] · `overview-page.component.ts:452-473` + `.html:276-283` · Tabel Sensor Overview memakai aturan basi lokal 1 jam**
- `isDataStale` (≥1 jam = merah) dan `formatLastValueAt` duplikat. Ganti dengan `getFreshness`/`FRESHNESS_BADGE`/`timeAgo` dari util agar konsisten dengan Sensors tab.

**F-17 [P2] · `sensor-chanel-detail.ts:329-365` · Rentang periode salah (pre-existing, di file yang direview)**
- `endDate` selalu `new Date()`: "Kemarin" ikut memuat hari ini, "Bulan Lalu" ikut memuat bulan ini, `dateTo` custom diabaikan. Label kartu "Dalam periode Kemarin" jadi tidak benar.
- Perbaikan: `getFilterRange(): {start, end}` — yesterday → end = today 00:00; lastMonth → end = 1st of this month; custom → end = `dateTo` + 1 hari.

**F-18 [P2] · `node-detail-add-channel-drawer.component.ts:127-128, 150-151` · Ambang tidak bisa dikosongkan**
- `minThreshold: this.formModel.minThreshold ?? undefined` → field dihilangkan dari body saat input dikosongkan → backend mempertahankan nilai lama. Sekarang UI menganggap null = "belum diatur", tetapi user tidak bisa mencapai keadaan itu. Kirim `null` eksplisit dan pastikan DTO update Go membedakan "absent" vs `null` (perlu verifikasi di `sensorchannel` DTO).
- Tipe: `AddChannelFormValue.minThreshold: number | null` sudah ada; `channelMeta` hanya dipakai untuk tampilan dan drawer memuat ulang dari backend (`loadChannelData` drawer baris 191-192) → **tidak ada masalah tipe**; build lulus.

**F-19 [P2] · `nodes-list` vs util · Definisi status ketiga**
- Nodes list memakai `node.connectivityStatus` (kolom tersimpan, `node_service.go:830`), bukan util. Perlu verifikasi siapa yang memperbaruinya (gtw?) dan dengan ambang apa; jika berbeda, tampilkan status dari `getFreshness` agar satu node tidak "online" di satu tab dan "Stale" di tab lain.

### P3 (ringkas)

- `sensors-page.component.ts:129` — request `/nodes` redundan: `sensor.node` sudah membawa `lastSeenAt`, `telemetryIntervalSec`, `pic*` (runtime). Hanya dipakai untuk "across N nodes"; bisa diganti `new Set(sensors.map(s=>s.idNode)).size`.
- `sensors-page.component.html:6` — "across {{nodes.length}} nodes" menghitung node tanpa sensor juga.
- `sensor-chanel-detail.ts:73-79` — tab status `warning`/`offline` tidak pernah dihasilkan `evaluateReading` → selalu 0; dan klik tab memanggil `applyFilters()` (reload backend) alih-alih `applyClientSideFilters()`. Label "Online" untuk bacaan normal sebaiknya "Normal"; jika ambang null, tampilkan "—".
- CSV (`sensor-chanel-detail.ts:518-543`): escaping RFC 4180 **benar** (koma, kutip ganda di-double, CR/LF di-quote). Saran: prefiks BOM `'﻿'` untuk Excel, nama file disanitasi (`sensorName.replace(/[^\w.-]+/g,'_')`, timestamp tanpa `:`), `type: 'text/csv;charset=utf-8'`.
- `sensor_service.go:173` — `ORDER BY s.created_at DESC` tanpa tiebreaker; paging OFFSET bisa dobel/hilang bila `created_at` sama. Tambah `, s.id_sensor`.
- `/sensors` list masih envelope flat `{data,total,page,limit}` — melanggar kontrak `{data, meta}`; `fetchAll` sudah menoleransi keduanya.
- Duplikasi load shell + Overview (`/projects/{id}/detailed`, `/nodes`).
- Overview: tidak ada `ngOnDestroy`/unsubscribe (route param + forkJoin trend).
- Tree highlight: dari Sensors tab URL berisi channel id, tree mencari `idSensor` → tidak ada yang tersorot.
- `sensor_controller.go:30` — tenant dengan `OwnerID` kosong bisa memberi `ownerId` sendiri (sama di controller lain; perlu verifikasi apakah JWT tenant bisa tanpa ownerId).

## 3. Terverifikasi BENAR (jangan dikerjakan ulang)

- `telemetry-freshness.ts`: rumus fresh < max(10, 3×interval), stale < max(60, 12×interval); `null`/invalid → `nodata`; interval string/null aman (`Number(x)||0`); `timeAgo` clamp ≥0.
- `fetchAll` (sensors tab): total 0 → `pages=0` → `of(first)`; total hilang → pakai `first.length`; total string → `Number`; cap backend nodes **dan** sensors = 100 (runtime) sehingga `limit=100` cocok dengan page math; error di halaman berikut → `forkJoin` error → state error (load biasa) atau data lama dipertahankan (refresh senyap); halaman di luar jangkauan aman (n=0). Switch project membatalkan load lama (`loadSub`). Interval dibersihkan di `ngOnDestroy`, refresh hanya saat tab terlihat.
- Backend `idProject` (dan alias `projectId`) dibaca dan difilter `p.id_project = ?`; tenant tetap dipaksa `OwnerID` di controller dan service (`List`).
- SDK `sensors-controller-find-all.ts` mengirim `idProject` — cocok dengan controller.
- ClickHouse host/kredensial kini dari `.env` (`CLICKHOUSE_HOST=10-0-15-67-via-4`); tidak ada lagi `109.105.194.174` di kode; zona waktu `lastValueAt` benar (UTC, selisih <2 menit dengan `date -u`).
- `.env.example` tidak lagi memuat kata sandi asli DB.
- Channel detail: `generateDummyData`, kolom Kualitas, "Frame ID", dan `getQualityClass` sudah hilang; ambang null → tidak menandai bacaan; state error + Coba lagi; tombol Export dinonaktifkan saat loading/error/kosong.
- Overview: random uptime/latency dihapus; "Last Data Received" dari `lastSeenAt` nyata; grid semua node diurutkan masalah-dulu; badge tidak muncul saat 0 device; link kartu kini ke route workspace yang ada (`nodes`, `sensors`, `map` — terdaftar di `projects-routing.module.ts:29-35`).
- `nodes-detail.ts`: `generateSampleData` (Math.random) dihapus, tidak ada pemanggil tersisa.
- Grep `Math.random|generateDummy|generateSample|simulat|dummy` di `project-workspace/`, `nodes/nodes-detail/`, `nodes/nodes-list/`, `shared/` → bersih (kecuali komentar).
- Build produksi lulus tanpa warning.

## 4. Rencana perbaikan berurutan

**Backend** (bisa paralel dengan frontend langkah F-1/F-3/F-5/F-7/F-8/F-12/F-14/F-15/F-16):
1. F-6 + F-11: `fetchLatestValues` mengembalikan `ok`, hormati `clickhouse.enabled`, tambah `latestAvailable` di respons list/detail sensor.
2. F-2: filter `idProject` (+ `status`) di alert-events (controller + service, join `nodes`).
3. F-18: DTO update sensor-channel menerima `null` eksplisit untuk menghapus ambang (perlu verifikasi dulu).
4. P3: tiebreaker `ORDER BY s.created_at DESC, s.id_sensor`.

**SDK** (setelah backend 2): tambah manual `idProject?: string` + `rb.query('idProject', …)` di `alert-events-controller-find-all.ts` (regen rusak, lihat memori sdk-regen-gotcha).

**Frontend** (urut prioritas; kelompok A paralel, B setelah backend):
- A1 F-1 `lastSampleAt` + urut terbaru dulu · A2 F-3 `lastSyncFormatted` dari `lastDataAt` · A3 F-4 fallback → `loadChannelData()` / tree kirim channel id · A4 F-5 tree pakai util · A5 F-7 hapus trend N+1 · A6 F-8 buang fallback `new Date()` · A7 F-9 load tunggal + unsubscribe · A8 F-12 badge + error state · A9 F-14/F-15/F-16 teks/aturan Overview · A10 F-17 rentang periode.
- B1 F-2 kartu Alerts pakai `idProject`+`status=open`+`total` · B2 F-6 banner `latestAvailable === false` di Sensors tab/Overview · B3 F-10/F-13 util `fetchAll` bersama dipakai di shell tree, Overview, Sensors tab · B4 F-18 kirim `null` di drawer.
- Terakhir: `ng build` + uji manual Tenggarong (Overview, Sensors tab, klik sensor dari tree **dan** dari tabel).

---
## Status perbaikan (13 Nov 2026, ~20:05)
| Item | Status | Oleh |
|---|---|---|
| P1-1 Last sample terbaru | ✅ `ingestReadings` sortir sendiri | sesi iot-angular-d4 (pemilik sensor-chanel-detail) |
| P1-2 Alerts per project | ✅ backend `idProject` (p.id_project) + SDK; kartu = jumlah **open** + acknowledged (meta.total). Terverifikasi: 494 global → 265 project → 0 open | sesi ini |
| P1-3 "Last sync Never" | ✅ diturunkan dari lastSeenAt node terbaru | sesi ini |
| P1-4 Ambang hilang via fallback | ✅ `applyChannelMeta` dari respons readings | iot-angular-d4 |
| P1-5 Tree aturan 5/30 mnt | ✅ `getFreshness`; status sensor dari lastValueAt sendiri | sesi ini |
| P1-6 Error ClickHouse ditelan | ✅ `latestAvailable` di `/sensors`; banner di tab Sensors | sesi ini |
| P1-7 Trends per node tak dirender | ✅ dihapus (`loadKeyMetricsTrends`, sparkline, SensorLogsService) | sesi ini |
| P2 timestamp palsu / rentang periode | ✅ | iot-angular-d4 |
| P2 tree N+1 | ✅ 2 request (`fetchAll` nodes + sensors?idProject) | sesi ini |
| P2 CLICKHOUSE_ENABLED diabaikan | ✅ cek flag, tanpa tunggu timeout 5 dtk | sesi ini |
| P2 badge "System Offline" | ✅ hanya bila semua offline | sesi ini |
| P2 paging >100 | ✅ `shared/utils/fetch-all.ts` (overview, sensors, tree) | sesi ini |
| P2 kartu Sensors "x offline" (=device) | ✅ "N tidak update" dari freshness sensor | sesi ini |
| P2 "Streaming · MQTT / Retention 30 days" | ✅ diganti "Data Terakhir" (nyata) | sesi ini |
| P2 tabel sensor overview aturan 1 jam | ✅ `FRESHNESS_BADGE` | sesi ini |
| P2 ambang tak bisa dikosongkan (drawer) | ⏳ belum | — |
| P2 connectivityStatus nodes-list (definisi ke-3) | ⏳ perlu cek siapa yang mengisi kolom | — |
| Kontrak rute sensor id + ?channel= | ⏳ menunggu dukungan di sensor-chanel-detail (iot-angular-d4) | bersama |
