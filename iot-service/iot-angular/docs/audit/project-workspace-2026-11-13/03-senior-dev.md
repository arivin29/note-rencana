# Audit Senior Dev — Project Workspace (fokus: detail sensor/channel)

Tanggal: 2026-11-13 · Auditor: agen `senior-dev-auditor` · Mode: baca-saja (tanpa edit kode, tanpa restart backend)
Bukti runtime: API lokal `http://localhost:3000/api` dengan token admin 5 menit (HS256 dari `JWT_SECRET`).

Project: `1414bdba-000b-4e17-b877-557136f8ef2a` (12 node, 12 sensor, 1 channel/sensor).
Route yang diaudit: `/iot/projects/1414bdba…/node/ec58fab7-6d81-4860-bffc-d95b49ec1dd2/sensor/9135f0d6-0e4a-4666-aea5-2841e04591d7`

---

## 0. Jawaban cepat: `9135f0d6-…` itu SENSOR, bukan channel

| Panggilan | Hasil |
|---|---|
| `GET /api/sensor-channels/9135f0d6-…` | **404** `Sensor channel with ID … not found` |
| `GET /api/sensors/9135f0d6-…` | **200** sensor "Bungkal", node `HELIO-354002391462296`, `channels:[{idSensorChannel:"70fa19ac-0dd7-40f8-8227-1341146a4ed4", metricCode:"tekanan", unit:"bar"}]` |
| `GET /api/sensor-channels/70fa19ac-…` | **200** `minThreshold:null, maxThreshold:null, precision:2, unit:"bar"`, sensorType "Tekanan 0.5v-5V 0-10 bar" |

Asal URL ini: **pohon aset di shell workspace** (`project-workspace.component.ts:263`, anak node = `sensor.idSensor`, lalu `:365` navigate `['node', parent, 'sensor', node.id]`). Tab Sensors justru mengirim channel id (`sensors-page.component.ts:332`). Jadi rute yang sama menerima dua jenis ID tergantung asal klik.

---

## 1. Peta request

### 1a. Detail sensor — deep link / klik pohon (sensor id)

Saat halaman dibuka langsung (shell + tab sekaligus):

| # | Endpoint | Param | Jumlah | Masalah |
|---|---|---|---|---|
| 1 | `GET /projects/{id}/detailed` | – | 1 (shell) | `nodes[]` di respons **snake_case** (`id_node`, `last_seen_at`, …), tidak dipakai shell |
| 2 | `GET /nodes` | `idProject, limit=100` | 1 (shell) | ok (backend baca `idProject` / `projectId`) |
| 3 | `GET /nodes/{id}/sensors` | – | **12 (N+1)** | bisa diganti 1× `GET /sensors?idProject=` (sudah jalan, 0,2 s) |
| 4 | `GET /widget-builder/projects/{id}/dashboards` | – | 1 (shell) | diulang lagi oleh tab Monitor |
| 5 | `GET /sensor-channels/{SENSOR_ID}/readings` | `startTime,endTime` | **2** → 404 | ID salah jenis; dobel karena `ngOnChanges` + `ngOnInit` |
| 6 | `GET /sensors/{id}/detailed` | – | **2** | fallback "coba sebagai sensor", dobel |
| 7 | `GET /sensor-channels/70fa19ac…/readings` | `startTime,endTime` (7 hari) | **2** | tiap respons **5.400 baris / 530 KB / 0,63 s**, `aggregation` diabaikan backend |

Total ≈ **21 request**, ±1,1 MB hanya untuk satu sensor. Dua 404 muncul di console tiap kali buka sensor dari pohon.

Interaksi lanjutan:

| Aksi | Request | Catatan |
|---|---|---|
| Klik tab status (Online/Warning/Error/Offline) | `readings` penuh lagi | `applyFilters()` (html:98) memuat ulang dari backend, padahal filter status murni klien |
| Ganti periode "30 Hari Terakhir" | `readings` | 20.347 baris / **1,95 MB / 1,7 s** |
| "Bulan Lalu" (tgl 13) | `readings` | 29.326 baris / **2,8 MB / 1,9 s**; di tanggal 31 bisa ~60 hari |
| Sync Telemetry / Refresh | `readings` | sama |
| Edit Channel | `GET /sensor-types?limit=100` + `GET /sensor-channels/{channelId}` | bila diklik sebelum fallback selesai → `channelId` masih sensor id → 404 + `alert()` |
| Delete Channel | `DELETE /sensor-channels/{id}` | lalu `navigate(['/iot/nodes', nodeId])` → keluar workspace |

### 1b. Tab lain di workspace (selain request shell #1–#4 yang selalu jalan sekali per masuk project)

| Tab | Request milik tab | Duplikat dengan shell | Masalah |
|---|---|---|---|
| Overview | `projects/{id}/detailed`, `nodes?idProject&limit=100`, `sensors?idProject&limit=100`, `alert-events?limit=10`, **12× `sensor-logs/telemetry/trends/{nodeId}?hours=24`** (masing-masing ~55 KB) | detailed + nodes **dobel** | N+1 trends, forkJoin tanpa `catchError` per item; alerts global (sudah diketahui) |
| Nodes (`nodes-list` embedded) | **2×** `nodes/statistics/overview` (tanpa project), **2×** `nodes?idProject&limit=100` | nodes dobel (total 3×) | `ngOnChanges`+`ngOnInit` dua-duanya memuat; statistik **global** |
| Sensors | `nodes?idProject&limit=100` + `sensors?idProject&limit=100` (+ refresh timer) | nodes dobel | sudah diperbaiki hari ini, ok |
| Node detail (`nodes-detail` embedded) | **3×** rantai `nodes/{id}/dashboard` → trends(48h) → iot-logs(limit 5) → node-model-commands → command-log = **±15 request** | – | konstruktor + `ngOnChanges` + `ngOnInit` |
| Monitor | `widget-builder/projects/{id}/dashboards` | **dobel** dgn shell | – |
| Map (`webgis-map` embedded) | core-geojson sensor types, layers, nodes/alerts/sensor-channels geojson, sensor-channel values | – | default `_projectId` di-hardcode ke project ini (lihat P2-19) |
| SCADA (analytics) | `scada diagrams by project` | – | ok |
| Config | – | – | hanya navigasi ke `/iot/projects/:id/edit` |

---

## 2. Temuan

### A. Halaman detail sensor/channel (`sensor-chanel-detail`)

**[P0-1] Data palsu tampil sebagai telemetri asli, juga di mode embedded**
- `src/app/pages/iot/nodes/nodes-detail/sensor-chanel-detail/sensor-chanel-detail.ts:235, :299, :363, :450`
- Bukti: `generateDummyData()` membuat 150 baris `Math.random()` dengan timestamp "sekarang − i×10 menit", status acak, kualitas 70–100 %. Dipanggil saat:
  1. readings error di mode **non-embedded** (`:235`) — rute `/iot/nodes/:nodeId/sensor/:id`, yang dituju link channel di `nodes-detail.html:267`;
  2. **embedded**: readings 404 → `loadSensorData` → bila `/sensors/{id}/detailed` gagal (`:299`) → dummy;
  3. **embedded**: fallback berhasil tetapi readings channel gagal (`:363`) → dummy;
  4. `applyFilters()` tanpa `channelId` (`:450`).
- Error apa pun (500, timeout, jaringan, token kedaluwarsa), bukan cuma 404, memicu jalur ini (`:224` tidak memeriksa `err.status`).
- Jalur nyata yang bisa terjadi: `findChannelRow` mengecualikan channel dari sensor `status='inactive'` (`iot-backend-go/app/services/sensorchannel/sensor_channel_service.go:545`), jadi channel histori dari sensor yang sudah diganti → 404 → dicoba sebagai sensor → 404 → **150 baris acak**.
- `generateDummyData` melakukan `push` tanpa mengosongkan `allReadings` (`:427`), jadi tiap Refresh menambah 150 baris lagi dan "Total Records" terus naik.
- Dampak: operator PDAM bisa melihat tekanan "5,2 bar ± 1" yang dikarang dan mengekspornya ke CSV sebagai data resmi.
- Perbaikan: hapus `generateDummyData()` dan semua pemanggilnya. Ganti dengan state `error` dan `empty` yang eksplisit ("Gagal memuat data — coba lagi" / "Tidak ada data di periode ini"). Fallback sensor hanya boleh jalan bila `err.status === 404`.

**[P0-2] Rute bernama `sensorId` menerima 2 jenis ID; pohon aset selalu kirim sensor id → 2× 404 + fallback setiap kali**
- `project-workspace.component.ts:263,365`, `sensor-page.component.html` (`[inputChannelId]="sensorId"`), `sensor-chanel-detail.ts:224-231`
- Bukti: lihat §0. Fallback hanya mengambil `channels[0]` (`:265`). Sensor multi-channel (flow + totalizer, dsb.) hanya menampilkan channel pertama tanpa pemilih. Di project ini semua sensor 1 channel, tapi di project lain tidak.
- Perbaikan: tentukan satu kontrak. Saran: rute tetap `node/:nodeId/sensor/:sensorId` dengan **sensor id** + query param `?channel=<idSensorChannel>`. Komponen memuat `GET /sensors/{id}` sekali, menampilkan pemilih channel, lalu memuat readings untuk channel terpilih. Alternatif minimal: pohon dan tab Sensors sama-sama mengirim `channels[0].idSensorChannel`, fallback dihapus.

**[P1-3] Tabel & "Last sample" menampilkan data TERTUA, bukan terbaru**
- Backend `sensor_channel_service.go:213` `ORDER BY ts ASC`. Frontend tidak mengurutkan, `id: dataPoints.length - index` (`:209`), dan "Last sample" = `displayedReadings[0]` (html:49).
- Bukti (7 hari): baris pertama `2026-11-05T16:00:27Z 6.69`, terakhir `2026-11-13T12:35:24Z 1.8966`. Halaman 1 menampilkan 5 Nov. "Last sample" menampilkan waktu sampel 2026-11-05T16:00Z (≈ 05 Nov 23:00 WIB / 06 Nov 00:00 WITA, tergantung zona browser), padahal data terbaru 2026-11-13T12:35Z.
- Dampak: operator harus ke halaman terakhir (540 halaman × 10) untuk melihat kondisi sekarang.
- Perbaikan: tambah param `order=desc` di backend (default tetap ASC untuk kompatibilitas mobile/chart), atau `reverse()` di klien. "Last sample" ambil dari `statistics.lastValue` / `dataPoints[last]`, bukan dari baris halaman.

**[P1-4] Ambang null dijadikan 0/100 → ratusan baris "Error" palsu + kartu ambang menyesatkan**
- `sensor-chanel-detail.ts:172-173, :277-278`: `parseFloat(channel.minThreshold) || 0` dan `|| 100`.
- Bukti: channel `70fa19ac` memiliki `minThreshold:null, maxThreshold:null`. Dalam 7 hari ada **282 baris nilai negatif** (min −1,371 bar, data dari sensor yang sebenarnya bermasalah) yang semuanya diberi label `error` "Nilai di bawah batas minimum (0)". Kartu "Satuan & Ambang" menulis `MIN 0 BAR / MAX 100 BAR — Auto alert di luar rentang aman`, padahal tidak ada alert.
- Pita warning `value < min*1.1 || value > max*0.9` (`:197`) tidak sama dengan logika alert engine Go (perlu verifikasi terhadap `alert-engine`) dan rusak untuk min negatif.
- Perbaikan: simpan ambang sebagai `number | null`. Status hanya dihitung bila ambang ada; selain itu tampilkan "—". Kartu menulis "Ambang belum diatur" + tautan Edit Channel. Lebih baik lagi status per baris dihitung di backend dengan aturan yang sama dengan alert engine.

**[P1-5] Agregasi diabaikan & tanpa limit → payload MB, ribuan objek di klien, dan diulang di tiap klik**
- Backend `sensor_channel_controller.go:111` membaca `aggregation`, tetapi `GetReadings` (`sensor_channel_service.go:179-280`) tidak memakainya. Query `sensor_logs` Postgres tanpa `LIMIT` dan tanpa batas rentang.
- Bukti: `?aggregation=1h` untuk 7 hari tetap mengembalikan 5.400 baris mentah. 30 hari 1,95 MB / 1,7 s. "Bulan Lalu" 2,8 MB / 1,9 s. Semua dikirim dobel (P1-6) dan diulang tiap klik tab status (P2-10).
- Perbaikan backend: implementasikan `raw|5m|15m|1h|1d` (`date_bin` di PG atau `toStartOfInterval` di ClickHouse), paginasi server (`page/limit` + `meta`) untuk mode tabel, dan tolak rentang raw > N hari (400) atau paksa agregasi otomatis. Frontend: tabel memakai paginasi server; ringkasan memakai `statistics` yang sudah dikirim backend (saat ini tidak dipakai sama sekali).

**[P1-6] Muat ganda: `ngOnChanges` + `ngOnInit` sama-sama memanggil `loadChannelData()`; tidak ada pembatalan request lama**
- `sensor-chanel-detail.ts:105-123`. Pada render pertama Angular memanggil `ngOnChanges` (dengan `embedded` sudah `true`), lalu `ngOnInit` → dua rantai paralel (readings → detailed → readings).
- Tidak ada `switchMap`/`takeUntil`. Saat pindah sensor lewat pohon (komponen dipakai ulang, input berubah), respons sensor sebelumnya bisa datang belakangan dan **menimpa** data sensor baru (race).
- Perbaikan: pakai satu `Subject<{channelId,nodeId,range}>` + `switchMap`, hapus pemanggilan di `ngOnInit` untuk mode embedded, tambah `destroy$`. Subscription `route.paramMap` di `:126` juga tanpa cleanup.

**[P1-7] Periode "Kemarin", "Bulan Lalu", dan Custom salah rentang**
- `sensor-chanel-detail.ts:147-148, :372-409`: `endDate` selalu `new Date()`.
  - "Kemarin" = kemarin 00:00 → **sekarang** (ikut hari ini).
  - "Bulan Lalu" = tgl 1 bulan lalu → **sekarang** (ikut bulan ini; label "Bulan Lalu" salah).
  - Custom: `dateTo` diabaikan total (input "Sampai Tanggal" tidak berfungsi). `new Date('YYYY-MM-DD')` diparse sebagai **UTC** tengah malam = 07:00 WIB / 08:00 WITA, sehingga data 00:00–07:59 lokal hilang.
- "Hari Ini" memakai zona browser, bukan zona project (Tenggarong = WITA); operator ber-browser WIB mendapat batas hari bergeser 1 jam (P3).
- Perbaikan: `getFilterRange(): {start,end}` dengan akhir eksklusif (kemarin → hari ini 00:00; bulan lalu → tgl 1 bulan ini; custom → `dateTo` + 1 hari), parse tanggal lokal (`new Date(y, m-1, d)`), validasi `start < end`.

**[P1-8] Delete Channel salah sasaran dan keluar workspace**
- `sensor-chanel-detail.ts:625-662`, `html:22`.
- Pada jalur sensor id: sebelum fallback selesai `channelId` = sensor id → `DELETE /sensor-channels/{sensorId}` → 404. Setelah fallback, yang terhapus hanya `channels[0]`, sementara dialog menyebut nama **sensor** ("Bungkal") → pengguna mengira menghapus sensor.
- Dialog menjanjikan "All telemetry data" dihapus. Service Go hanya `repo.Delete(id)`; apakah `sensor_logs` ikut cascade = **perlu verifikasi** FK.
- Sesudah hapus: `router.navigate(['/iot/nodes', this.nodeId])` → pengguna terlempar keluar workspace. Link "View Node Detail" (html:34) juga ke `/iot/nodes` (hanya non-embedded).
- Perbaikan: Output `(deleted)` ke parent; `SensorPageComponent` yang menavigasi `../../` (relatif workspace). Nonaktifkan tombol sampai channel ter-resolve. Teks konfirmasi menyebut metric + sensor.

**[P2-9] Header & meta berubah-ubah tergantung jalur; `channelMeta.sensorId` berisi channel id**
- Jalur fallback: `sensorName = sensor.label` ("Bungkal"), `sensorType = sensorCatalog.name||code` → **"Unknown"** (catalog hanya punya `modelName/vendor`). Setelah klik Refresh/periode → `loadChannelData` sukses dengan channel id → nama menjadi "tekanan", tipe menjadi "Tekanan 0.5v-5V 0-10 bar". Judul halaman berubah sendiri.
- `:167` `sensorId: channel.idSensorChannel` (channel id dimasukkan ke field sensorId) → di-bind ke drawer `[sensorId]` (html:265). Drawer edit memuat ulang dari backend (aman), tetapi mode add akan salah parent.
- Jalur fallback tidak menyalin ambang/precision asli karena `/sensors/{id}/detailed` → `channels[]` hanya berisi `idSensorChannel,lastValue,lastValueAt,metricCode,unit`, dan readings di `loadChannelReadings` (`:318`) tidak membaca `data.channel`.
- Perbaikan: satu mapper `applyChannelMeta(data.channel)` dipanggil di kedua jalur. Backend `readings.channel` ditambah `idSensor`, `sensorLabel`, `nodeAddress`.

**[P2-10] Klik tab status memicu fetch ulang penuh**
- `html:98` `(click)="selectedStatus = …; applyFilters()"` → `loadChannelData()`. Filter status murni klien (`applyClientSideFilters`).
- Perbaikan: panggil `applyClientSideFilters()`.

**[P2-11] Kolom "Kualitas" dan "Sample #" palsu**
- `:214` `quality: dp.quality === 'good' ? 100 : 70`. Bukti: 100 % dari 29.326 titik ber-`quality:'good'` → semuanya "100 %". `id` = indeks terbalik, bukan `id_sensor_log`, tetapi diberi label "Frame ID".
- Status `offline` di tab tidak pernah dihasilkan (selalu 0). Celah data (4 celah > 10 menit dalam 7 hari, terpanjang 5 jam pada 10 Nov) tidak ditandai.
- Perbaikan: tampilkan `quality_flag` apa adanya (badge good/suspect/bad), hapus persen. Tampilkan `rawValue` (sudah dikirim backend) sebagai pengganti "Frame". Tandai celah > 3× interval node sebagai baris "gap".

**[P2-12] Ekspor CSV**
- `:581-603`: tanpa escaping (koma/kutip di notes/nama rusak); `timestamp` diekspor ISO UTC sementara tabel menampilkan waktu lokal; nilai float mentah (`6.6899999999999995`); kolom Quality/ID palsu; nama file berisi `:` dari ISO dan label sensor tanpa disanitasi. Hanya mengekspor jendela yang sudah dimuat (OK, tapi tidak dijelaskan).
- Perbaikan: escape RFC4180, kolom `timestamp_local` (zona project) + `timestamp_utc`, nilai dibulatkan sesuai `precision` channel, tambah `raw_value`, nama file `sensor-<label>-<metric>-<from>_<to>.csv`. Untuk rentang besar sebaiknya ekspor dilakukan di server (endpoint CSV streaming).

**[P3-13] Presisi & satuan**
- Nilai selalu `number:'1.2-2'` (html:197) mengabaikan `channel.precision` (=2 di sini, kebetulan cocok). Frontend menganggap `precision` = langkah (`|| 0.01`, `:171`), backend/sensor-types menyimpan `2` (jumlah desimal?). Semantik tidak konsisten (perlu verifikasi kolom `sensor_types.precision`).
- `sensorUnit | uppercase` → "M3/H", "BAR".

### B. Shell workspace & tab lain

**[P1-14] Shell: N+1 `GET /nodes/{id}/sensors` untuk pohon**
- `project-workspace.component.ts:213-241` — 12 request (proyek 100 node = 100 request). `GET /sensors?idProject=&limit=100` sudah berfungsi (1 request, 0,2 s, berisi `node` + `channels`).
- Status sensor di pohon = status node (`:266`). Status "expanded" disimpan ke localStorage (`:340`) tetapi tidak pernah dipulihkan (`expanded:false` di `:260`).
- Perbaikan: 1 request sensors + kelompokkan per `idNode`; anak pohon menyimpan `channels[0].idSensorChannel` (lihat P0-2).

**[P1-15] Data dimuat dobel antara shell dan tab — tidak ada state bersama**
- Shell memuat `projects/{id}/detailed`, `nodes?idProject`, dan dashboards. Overview memuat detailed + nodes lagi; Sensors memuat nodes lagi; nodes-list memuat nodes 2× lagi; Monitor memuat dashboards lagi.
- Perbaikan: `ProjectWorkspaceStore` (service di-provide di `ProjectWorkspaceComponent`, `BehaviorSubject` `project$`, `nodes$`, `sensors$`, `dashboards$`, `refresh()`), tab membaca dari store. Turun dari ±20 menjadi ±5 request untuk Overview.

**[P1-16] Tab Nodes: header "78 total nodes" padahal project punya 12**
- `nodes-list.ts:141` `nodesControllerGetStatistics$Response()` tanpa filter; html:63 menampilkan `totalNodes`.
- Bukti: `GET /nodes/statistics/overview` → `totalNodes:78`; `?projectId=1414…` → `12` (online 11, degraded 1). Controller Go sudah membaca `projectId` (`node_controller.go:174`), tetapi SDK `nodes-controller-get-statistics.ts` tidak punya param tersebut.
- Selain itu `ngOnChanges` + `ngOnInit` (`nodes-list.ts:98-120`) → statistik 2× & nodes 2×.
- Perbaikan: tambah `projectId?` manual di SDK fn, kirim di mode embedded; hapus pemanggilan dobel.

**[P1-17] Tab Node detail: rantai dashboard dimuat 3×**
- `nodes-detail.ts:220-243`: subscription `route.paramMap` di **konstruktor** (saat itu `@Input embedded` masih `false`, dan route workspace `node/:nodeId` punya param `nodeId`) → load #1; `ngOnChanges` → #2; `ngOnInit` → #3. Tiap load memicu dashboard → telemetry trends (48h) → iot-logs → node-model-commands → command-log, jadi ±15 request.
- Link di embedded keluar workspace: `nodes-detail.html:267` (`/iot/nodes/:id/sensor/:channelId`, masuk ke mode non-embedded dengan dummy-data P0-1), `nodes-detail.ts:820` (setelah delete node → `/iot/nodes`), `nodes-detail.html:5` breadcrumb.
- Perbaikan: pindahkan subscription route ke `ngOnInit` dengan guard `!embedded`, satu jalur load + `switchMap`; tambah `@Output() openChannel` / `linkBase` agar link tetap di `/iot/projects/:pid/node/:nid/sensor/:id`.

**[P2-18] Overview: N+1 telemetry trends & agregasi lintas node yang tidak bermakna**
- `overview-page.component.ts:329-336`: 12× `GET /sensor-logs/telemetry/trends/{nodeId}?hours=24` (±55 KB/node). `forkJoin` tanpa `catchError` per request → satu node gagal = semua kartu Key Metrics kosong ("No Data" palsu).
- Pengelompokan memakai `channel.sensorTypeLabel` yang tidak ada di respons (backend kirim `sensorTypeCategory`), lalu fallback ke `metricCode`. "Nilai" = rata-rata `lastValue` semua node (tekanan rata-rata 12 DMA → tidak bermakna operasional). Sparkline = `values.slice(-30)` dari array gabungan, sehingga hanya berisi node terakhir. `parseFloat(dp.value) || 0` menjadikan null = 0; `lastValue || …` menganggap 0 sebagai kosong.
- Uptime/latency palsu (`:303-315`, `:272-285`) dan alert global — **sudah diketahui**, masuk rencana.
- Status node dihitung di klien (5/30 menit dari `lastSeenAt`, `:520-529`, sama dengan shell `:296`) dan berbeda dengan `connectivityStatus` backend; `unknown` dihitung sebagai offline.
- Perbaikan: endpoint backend `GET /projects/{id}/telemetry/summary?hours=24` (per sensor type: min/max/avg/last + sparkline bucket 1h); sementara itu `catchError(() => of(null))` per request.

**[P2-19] `webgis-map` default project di-hardcode**
- `src/app/pages/iot/webgis/webgis-map/webgis-map.ts:93` `_projectId = '1414bdba-000b-4e17-b877-557136f8ef2a'` (project PDAM yang sedang diaudit). Di `/iot/webgis` tanpa param, semua pengguna diarahkan ke project ini. Untuk tenant lain, backend seharusnya memblokir (scoping), tetapi admin/demo melihat data PDAM sungguhan. Dalam workspace aman karena `@Input projectId` terisi sinkron.
- Perbaikan: default `''` + empty state "pilih project".

**[P2-20] Kontrak respons menyimpang**
- `GET /sensors?…` → `{data,total,page,limit}` (flat, **tanpa `meta`**). Bukti runtime: kunci `['data','limit','page','total']`.
- `GET /projects/{id}/detailed` → `nodes[]` **snake_case** (`id_node`, `last_seen_at`, `connectivity_status`).
- Frontend bertahan karena hanya membaca `.data` / `stats`, tetapi melanggar kontrak bersama di CLAUDE.md.

**[P3-21] Lain-lain**
- Shell `layerStateService.getLoading().subscribe` (`project-workspace.component.ts:113`) tanpa unsubscribe → bocor tiap kali masuk workspace (service root).
- `updateSelectedAsset` (`:308`) memakai segmen URL `sensor/<id>`; bila datang dari tab Sensors (channel id), node di pohon tidak tersorot.
- Batas `limit: 100` di shell/overview/sensors tidak membaca `total`; project > 100 node/sensor terpotong tanpa tanda.
- SCADA `messageListener` tidak memeriksa `event.origin` (token tetap aman karena `postMessage(…, environment.scadaUrl)`).

---

## 3. Yang sudah terverifikasi BENAR (jangan diperbaiki ulang)

- SDK `sensorChannelsControllerGetReadings` → `clone({body: undefined})` **tidak** menghapus body (Angular `HttpResponse.clone` mempertahankan body bila `undefined`); `JSON.parse(response)` bekerja.
- `GET /sensor-channels/{id}/readings` di-scope tenant: `findChannelRow` memfilter `p.id_owner` untuk non-admin sebelum query `sensor_logs`.
- `parseISOTime` menerima `toISOString()` (ms + Z); rentang dikirim UTC dengan benar.
- `GET /sensors?idProject=` (perbaikan hari ini) → 12 sensor, 1 request; tab Sensors memakai 2 request + `loadSub` dibatalkan + timer dibersihkan.
- `GET /nodes` membaca `idProject` maupun `projectId` (`node_controller.go:37-39`).
- `nodes-list.navigateToNode` di mode embedded tetap di workspace.
- `sensor-types?limit=100` mengembalikan array (drawer benar).
- Data readings untuk channel ini lengkap dari Postgres (5.400 titik/7 hari ≈ interval 2 menit); nilai terbaru PG (12:35:24Z) lebih baru 2 menit dari `lastValueAt` ClickHouse di `/sensors` (12:33:24Z) — normal.

---

## 4. Rencana perbaikan berurutan

**Fase 0 — hentikan data palsu (frontend, kecil, bisa hari ini)**
1. `sensor-chanel-detail.ts`: hapus `generateDummyData` + 4 pemanggil; tambah `error`/`empty` state; fallback sensor hanya bila `err.status === 404`. (P0-1)
2. Ambang `null` tetap `null`; status hanya bila ambang ada; kartu "Ambang belum diatur". (P1-4)
3. Tab status → `applyClientSideFilters()`. (P2-10)
4. Urutkan readings DESC di klien; "Last sample" dari data terbaru. (P1-3)
5. Rentang periode benar + `dateTo`. (P1-7)

**Fase 1 — backend (paralel dengan Fase 2)**
- B1. `GetReadings`: implementasi `aggregation` (5m/15m/1h/1d), `order=asc|desc`, paginasi `page/limit` + `meta`, batas rentang raw; `channel` ditambah `idSensor`, `sensorLabel`. (P1-5, P2-9)
- B2. Filter `idProject` di `alert-events` (sudah diketahui).
- B3. Endpoint ringkasan telemetri per project untuk Overview + uptime/latency nyata dari `sensor_logs.ingestion_latency_ms` / riwayat `last_seen_at` (sudah diketahui + P2-18).
- B4. Rapikan kontrak: `/sensors` → `meta`; `/projects/{id}/detailed.nodes` → camelCase. (P2-20) — koordinasikan dengan mobile/external API sebelum mengubah.
- B5. Verifikasi FK `sensor_logs → sensor_channels` (cascade atau tidak) dan sesuaikan teks konfirmasi delete. (P1-8)

**Fase 2 — SDK (manual, karena regen rusak)**
- S1. `nodes-controller-get-statistics.ts`: param `projectId?`. (P1-16)
- S2. `sensor-channels-controller-get-readings.ts`: param `order`, `page`, `limit` (setelah B1).
- S3. `alert-events-controller-find-all.ts`: `idProject` (setelah B2).

**Fase 3 — frontend struktural (setelah Fase 0; sebagian butuh B1/S1)**
- F1. Kontrak rute sensor: sensor id + `?channel=`; pemilih channel; pohon & tab Sensors konsisten; hapus fallback. (P0-2)
- F2. `switchMap` + `destroy$` dan hapus muat-ganda di `sensor-chanel-detail`, `nodes-detail` (pindahkan subscription konstruktor), `nodes-list`. (P1-6, P1-16, P1-17) — *paralel dengan F1*
- F3. `ProjectWorkspaceStore` bersama; shell memakai `/sensors?idProject` (hapus N+1); Overview/Sensors/Nodes/Monitor membaca store. (P1-14, P1-15)
- F4. Link & navigasi tetap di workspace: delete channel/node, link channel di `nodes-detail.html:267`. (P1-8, P1-17) — *paralel*
- F5. Tabel readings pakai paginasi server + `statistics` backend; CSV diperbaiki (atau ekspor server). (P1-5, P2-11, P2-12) — butuh B1/S2
- F6. Overview: ganti 12× trends dengan B3; `catchError` per item sebagai langkah sementara. (P2-18)
- F7. `webgis-map` default project kosong; kebocoran subscription shell; highlight pohon. (P2-19, P3-21) — *paralel*
