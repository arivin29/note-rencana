# 02 — Audit UX Enterprise: Workspace Project

Tanggal: 13 Nov 2026 · Auditor: `enterprise-ux-auditor` · Metode: audit dari kode (tanpa browser).
Standar acuan: skill `ui-coding-style`, `ui-list`, `ui-detail`, `ui-card`, CLAUDE.md (non-negotiables).
Pembanding standar: `pages/sensors-page` (baru dirombak) dan `nodes/nodes-list`.

Semua path relatif ke `src/app/pages/iot/`. `PW` = `projects/project-workspace/`.

---

## 0. Skor ringkas (1–5)

| Halaman | Konsistensi | Hierarki | State | Kejujuran data | Navigasi |
|---|---|---|---|---|---|
| **Detail sensor/channel** (`PW/pages/sensor-page` → `nodes/nodes-detail/sensor-chanel-detail`) | 2 | 1 | 1 | **1** | 2 |
| Overview (`PW/pages/overview-page`) | 2 | 3 | 3 | **1** | 3 |
| Nodes (`nodes-list` embedded) | 4 | 3 | 2 | 4 | 4 |
| Sensors (`PW/pages/sensors-page`) — pembanding | 4 | 4 | 4 | 4 | 4 |
| Node detail (`nodes-detail` embedded) | 2 | 2 | 2 | 3 | 1 |
| Monitor | 3 | 3 | 3 | 4 | 2 |
| Map | 3 | – | – | – | 3 |
| SCADA (`analytics-page`) | 2 | 3 | 4 | 4 | 2 |
| Config | 2 | 2 | – | 4 | **1** |
| Shell workspace | 2 | 2 | 3 | 3 | 2 |

Ringkasan: Sensors tab sudah memenuhi `ui-list`. Halaman lain masing-masing punya header, istilah status, dan bahasa sendiri. Yang paling parah ada di **detail sensor**: data palsu dan model status yang salah. Overview juga menampilkan angka acak sebagai KPI.

---

## 1. Detail Sensor / Channel (UTAMA)

Route: `/iot/projects/:projectId/node/:nodeId/sensor/:sensorId` → `PW/pages/sensor-page/sensor-page.component.html:2-7` → `<app-sensor-chanel-detail [embedded]="true">`.

### 1.1 Gambaran masalah
Halaman ini isinya cuma **tabel log mentah**: tanpa grafik tren, tanpa nilai terkini yang menonjol, tanpa konteks node (alamat), dan tanpa pilihan channel lain. Untuk operator PDAM, pertanyaan pertama ("tekanan sekarang berapa, normal atau tidak, trennya bagaimana") tidak terjawab di layar pertama. Lebih parah lagi, kalau API gagal, halaman diam-diam menampilkan **150 baris data acak**.

### 1.2 Temuan

**D1 [P0] · `nodes/nodes-detail/sensor-chanel-detail/sensor-chanel-detail.ts:234-236, 299-300, 363-364, 414-438, 449-451` · Data dummy ditampilkan sebagai data nyata.**
`generateDummyData()` membuat 150 pembacaan dengan `Math.random()` (nilai, status, kualitas). Fungsi ini dipanggil setiap kali `getReadings`/`findOneDetailed` gagal, dan juga di `applyFilters()` kalau `channelId` kosong. Pengguna tidak diberi tahu apa pun: KPI "Total Records", hitungan tab status, dan Export CSV ikut memakai data palsu ini. Ini melanggar aturan *Data jujur*, dan akibatnya fatal kalau CSV-nya dipakai untuk laporan PDAM.
→ Hapus `generateDummyData()` dan semua pemanggilnya. Saat gagal, set `this.error = '...'` lalu tampilkan `alert alert-danger d-flex` berisi tombol **Coba lagi** (pola `sensors-page.component.html:18-22`). Export CSV di-disable saat `error || !filteredReadings.length`.

**D2 [P0] · `sensor-chanel-detail.ts:186-201, 326-340` + `.html:94-105, 201-206` · Model "status" per bacaan salah konsep.**
Tab status `Online / Warning / Error / Offline` dipakai untuk menilai **satu pembacaan**. Padahal "online/offline" adalah status konektivitas device, bukan status nilai. `offline` juga tidak pernah dihitung, jadi tab-nya selalu 0. Rumus "warning" `value < min*1.1 || value > max*0.9` keliru untuk ambang 0 atau negatif. Contoh: min=0 → `value < 0` → tidak pernah warning di sisi bawah. Contoh lain: max=100 → semua nilai >90 dianggap warning, padahal mungkin tidak ada ambang yang dikonfigurasi.
→ Ganti kosakata menjadi **Normal / Mendekati batas / Di luar batas** (`bg-success-subtle text-success` / `bg-warning-subtle text-warning` / `bg-danger-subtle text-danger`). Hitung "mendekati batas" dari rentang: `margin = (max-min)*0.1`. Kalau ambang tidak dikonfigurasi, status = **"Tanpa ambang"** (`bg-secondary-subtle text-secondary`), bukan "Online".

**D3 [P0] · `sensor-chanel-detail.ts:172-173, 277-278` + `.html:83-84` · Ambang default palsu 0/100.**
`parseFloat(x) || 0` dan `|| 100` membuat channel tanpa ambang tetap tampil "MIN 0 / MAX 100" dan "Auto alert di luar rentang aman" (`.html:86`). Ini klaim fitur yang tidak benar. Ambang 0 yang sah juga ikut tertimpa kalau nilainya `null`.
→ Simpan `minThreshold: number | null`. Di card tampilkan "Ambang belum diatur" plus link **Atur ambang** yang membuka drawer edit channel. Kalimat "Auto alert…" hanya muncul kalau memang ada alert rule.

**D4 [P0] · `sensor-chanel-detail.ts:214` + `.html:207-213` · Kolom "Kualitas %" dikarang.**
`quality === 'good' ? 100 : 70` lalu ditampilkan sebagai persen dengan progress bar. Angka 70% tidak punya arti apa pun.
→ Tampilkan flag kualitas apa adanya: badge `Good`/`Suspect`/`Bad`. Kalau backend tidak mengirim kualitas, hapus kolomnya.

**D5 [P0] · `sensor-chanel-detail.ts:147, 309` · Filter "Sampai tanggal" diabaikan.**
`endTime` selalu `new Date()`. Rentang custom 1–5 Okt tetap mengambil data 1 Okt sampai sekarang, dan "Kemarin" ikut memuat hari ini.
→ Buat `getFilterEndDate()`: today → now; yesterday → awal hari ini; lastMonth → awal bulan ini; custom → `dateTo` 23:59:59. Validasi `dateFrom <= dateTo`.

**D6 [P1] · `sensor-chanel-detail.ts:105-136, 227-231, 245-288` + `project-workspace.component.ts:262-268, 365` · Ambigu sensorId vs channelId; sensor multi-channel hanya menampilkan channel pertama.**
Asset tree mengirim **id sensor**. Komponen mencoba sebagai channel → gagal (400/404) → fallback ke `loadSensorData()` → ambil `channels[0]`. Akibatnya: (a) setiap klik dari tree memakan 1 request gagal, (b) sensor dengan 2+ channel (mis. flow + totalizer) **tidak bisa melihat channel lain**, (c) URL tetap berisi id sensor sehingga link yang dibagikan rancu.
→ Pisahkan route: `node/:nodeId/sensor/:sensorId` (detail sensor + **switcher channel** `nav nav-tabs nav-tabs-v2` dengan badge nilai terkini) dan `.../channel/:channelId` (atau query `?channel=`). Asset tree dan sensors-page cukup mengirim sensorId, lalu halaman memilih channel lewat query param.

**D7 [P1] · `sensor-chanel-detail.html` (seluruh file) · Tidak ada grafik tren.**
Halaman detail telemetri tanpa chart menyimpang dari ekspektasi enterprise/SCADA. `NgApexchartsModule` sudah di-import di `nodes/nodes.module.ts:41` dan endpoint `getReadings` punya param `aggregation`.
→ Tambah card "Tren" di atas tabel: line chart dengan garis ambang min/max (annotations y), mengikuti filter periode, `aggregation` otomatis (>7 hari → per jam). Tabel log dijadikan tab kedua.

**D8 [P1] · `sensor-chanel-detail.html:41-90` · Hierarki KPI terbalik.**
Card pertama "Channel Code" berisi `metricCode` dengan `fs-4`. **Nilai terkini tidak ada sama sekali** di deretan KPI dan hanya bisa dilihat dari baris pertama tabel. "Total Records" (jumlah log) menempati posisi utama padahal tidak penting bagi operator.
→ Urutan KPI: **Nilai terkini + satuan + badge status + "x menit lalu"** · **Min/Rata/Maks periode** · **Ambang** · **Kelengkapan data** (jumlah sampel vs yang diharapkan dari `telemetryIntervalSec`). Pakai `info-card-widget` (config-driven, `ui-card`).

**D9 [P1] · `sensor-chanel-detail.ts:161-163` + `.html:8-10, 58-60` · Judul dan konteks salah; aturan label node dilanggar.**
`h1` = `metricCode` (mis. "pressure"), bukan label sensor. Lokasi = `"Node: " + nodeCode`, tanpa alamat. Selama loading, h1 menampilkan "Loading..." (`ts:35`).
→ h1 = `sensor.label` + ` · ` + `channel.metricCode`. Subjudul = **alamat node** (fallback kode) baris 1 dan kode node baris 2, mengikuti aturan label node. Selama loading pakai skeleton `placeholder-glow`, bukan teks.

**D10 [P1] · `sensor-chanel-detail.html:1-38` (embedded) · Tidak ada breadcrumb atau jalan kembali di workspace.**
Breadcrumb `*ngIf="!embedded"` (`:3`) dan link "View Node Detail" `*ngIf="!embedded"` (`:33`). Di workspace, pengguna tidak tahu sedang berada di node mana dan tidak punya tombol kembali. `SensorPageComponent.goBack()` (`sensor-page.component.ts:41-48`) ada tetapi **tidak pernah dirender**. Bandingkan node-detail-page yang punya tombol "Back to Nodes".
→ Header workspace yang seragam (lihat §3.1) dengan breadcrumb `Project › Nodes › {alamat node} › {sensor}` yang semuanya link relatif di workspace.

**D11 [P1] · `sensor-chanel-detail.ts:654` · Hapus channel melempar pengguna keluar dari workspace.**
`router.navigate(['/iot/nodes', this.nodeId])` dipakai juga dalam mode embedded.
→ Kalau `embedded`, emit `(deleted)` agar `SensorPageComponent` yang bernavigasi ke `['/iot/projects', projectId, 'node', nodeId]`, atau pakai `relativeTo`.

**D12 [P1] · `sensor-chanel-detail.html:13-30, 107-120` · Aksi ganda dan aksi destruktif setara dengan aksi primer.**
"Sync Telemetry" (`:14`) dan "Refresh" (`:112`) memanggil fungsi yang sama. "Export CSV" muncul dua kali (`:26` `btn-theme`, `:116` `btn-outline-theme`). "Delete Channel" `btn-outline-danger` sejajar di header.
→ Header: satu primer (**Export CSV**), satu sekunder (**Edit channel**), lalu dropdown `⋯` berisi *Hapus channel* (`dropdown-item text-danger`), sama dengan pola Actions di `nodes-detail.html:43-67`. Tombol Refresh cukup satu, ikon saja, dengan `title` + `aria-label`, di toolbar tabel.

**D13 [P1] · `sensor-chanel-detail.html` · Loading state tidak ada.**
`loading` di-set di TS tetapi tidak dibaca template. Saat memuat, tabel kosong menampilkan "Tidak ada data sesuai filter." (`:229-231`). Pesan itu menyesatkan.
→ `*ngIf="loading"` spinner (pola `sensors-page.component.html:55-60`). Empty state dibedakan antara "Belum ada data pada periode ini" dan "Tidak ada data sesuai filter status".

**D14 [P2] · `sensor-chanel-detail.ts:625-660` · `confirm()`/`alert()` native berbahasa Inggris.** Tidak konsisten dengan drawer/modal app dan bahasa UI campur.
→ Modal konfirmasi Bootstrap yang menyebut jumlah data yang akan ikut terhapus; toast untuk sukses atau gagal.

**D15 [P2] · `sensor-chanel-detail.ts:581-603` · CSV tidak di-escape** (koma/kutip di `notes` merusak kolom). Timestamp dalam UTC ISO, padahal operator membaca WITA/WIB. Nama file memakai `metricCode` + ISO berisi `:`.
→ Quote setiap field, tambah kolom waktu lokal, nama file `{kodeNode}_{metric}_{dari}_{sampai}.csv`.

**D16 [P2] · `sensor-chanel-detail.html:186-190` · Kolom "Sample #id / Frame ID" palsu.** `id` = indeks mundur (`ts:209`), bukan frame ID dari device. → Hapus kolom, atau tampilkan id log asli bila ada.

**D17 [P2] · `sensor-chanel-detail.html:151-170` · Banner "Window data aktif / Menampilkan / Status filter"** mengulang info yang sudah ada di filter dan footer pagination (`:234-238`). Bahasa juga campur ("Window data aktif", "Showing … records"). → Hapus banner dan cukup footer pagination (pola `ui-list`).

**D18 [P2] · `sensor-chanel-detail.scss:37-61` · Override warna badge hardcode** (`#10B981 !important`, dst.) memakai `bg-*` solid. Ini melanggar status `bg-*-subtle text-*` dan token tema. `:13-34` juga mengubah styling `thead` khusus di halaman ini sehingga tabelnya beda dari list lain. → Hapus override, pakai `badgeClass()` subtle dan styling tabel bawaan.

**D19 [P2] · `sensor-chanel-detail.ts:167` · `channelMeta.sensorId` diisi `idSensorChannel`** lalu dikirim ke drawer sebagai `[sensorId]` (`.html:265`). Ada risiko drawer edit salah konteks. → Isi `idSensor` yang benar.

**D20 [P2] · `sensor-chanel-detail.html:174-225` · Semua bacaan periode dimuat sekaligus lalu dipaginasi di klien.** Untuk 30 hari dengan interval 1 menit, itu ±43 rb baris. → Paginasi server-side atau `aggregation` untuk tampilan tabel, plus export terpisah.

**D21 [P3] · `PW/pages/sensor-page/sensor-page.component.html:9-12` · Kondisi "Loading sensor detail…"** hanya muncul saat `sensorId` kosong, kondisi yang praktis tidak pernah terjadi. Ini kode mati, begitu juga `.page-toolbar` di scss (`:11-15`).

### 1.3 Rekomendasi layout detail sensor (target)

```
[Header workspace]  Project › Nodes › Jl. Mulawarman 12 › Sensor Tekanan        [Panduan] [Export CSV] [Edit] [⋯]
                    Tekanan · pressure (bar)  ·  NODE-TGR-014  ·  ● Fresh, 2 mnt lalu
[Channel tabs]      pressure 2.41 bar | flow 12.3 L/s | totalizer 10.233 m³          (hanya jika >1 channel)
[KPI row x4]        Nilai terkini | Min/Avg/Max periode | Ambang (atau "Belum diatur") | Kelengkapan data %
[Card Tren]         Periode [24 jam ▾] [custom dari–sampai]   — line chart + garis ambang
[Card Log]          nav-tabs-v2: Semua | Normal | Mendekati batas | Di luar batas  · tabel · pagination
```

---

## 2. Tab-tab lain

### 2.1 Overview (`PW/pages/overview-page`)
**O1 [P0] · `overview-page.component.ts:282-285, 301-315` · Uptime dan latency adalah angka acak.** `uptimePercent = 95 + Math.random()*5`, `latencyMs = 50 + Math.random()*200`. "Avg Latency" diturunkan dari `telemetryIntervalSec * 2` (komentarnya sendiri menyebut *simulated*). Nilai ini ditampilkan di "System Health" (`.html:59-80`) dan "Device Status Grid" (`.html:337-381`), dan berubah setiap reload. → Hapus kolom Latency. Uptime diambil dari `dashboard.uptime.percentage` (sudah dipakai di `nodes-detail.ts:321`) atau disembunyikan dengan "—".
**O2 [P0] · `overview-page.component.ts:500-503` + `.html:155-163` · Card "Alerts" tidak di-scope ke project.** `alertEventsControllerFindAll({limit:10})` tanpa filter project/owner: yang tampil adalah 10 alert terbaru di seluruh tenant (admin: seluruh sistem), diberi label "Active alerts", dan maksimal 10. Link ke `/iot/alerts?projectId=` juga diabaikan oleh halaman alerts (`alerts/` tidak membaca queryParam). → Filter per node project (atau tambah param `idProject` di backend), `status: 'open'`, ambil `meta.total`.
**O3 [P1] · `.html:122-124` · "Streaming · MQTT / Retention 30 days" hardcode.** → Tampilkan dari data atau hapus.
**O4 [P1] · `.html:143` · Card Sensors menampilkan `systemHealth.offlineDevices` ("x offline").** Yang ditampilkan jumlah node, bukan sensor. → Pakai hitungan status sensor yang sama dengan sensors-page (`staleCount + offlineCount`).
**O5 [P1] · `.html:16-391` · Hierarki: "System Health" + "Project Snapshot" + "Operations & Team" mengulang Owner/Industry tiga kali** (`:109-114`, `:186-197`). Yang paling dibutuhkan operator (node offline, sensor di luar ambang, alert terbuka) tidak menjadi daftar aksi. → Baris atas: 4 KPI (Node online/total, Sensor fresh/total, Alert terbuka, Data masuk 24 jam). Di bawahnya card "Perlu perhatian" (node offline terlama, sensor stale) dengan link ke detail.
**O6 [P2] · `.html:239-256` · Inline `style="max-height/min-width/max-width"` berulang**, `thead.table-light` (terang di dark mode). Status freshness memakai rumus sendiri (`isDataStale` ≥1 jam, `ts:483-488`), berbeda dari sensors-page. Baris sensor tidak bisa diklik.
**O7 [P2] · `.html:360` · `[class]="getStatusBadgeClass()"` menimpa `class="badge"`** dan memakai `bg-success` solid (`ts:590-595`). → `badgeClass()` subtle.

### 2.2 Nodes (`PW/pages/nodes-page` → `nodes/nodes-list` embedded)
**N1 [P1] · `nodes/nodes-list/nodes-list.html` · Loading dan error tidak dirender.** `loading`/`error` ada di TS (`nodes-list.ts:46-47, 281-283`) tetapi template tidak membacanya. Saat memuat atau gagal, yang tampil "Tidak ada node sesuai filter." (`:275-277`). → Salin pola loading dan alert+Retry dari sensors-page.
**N2 [P2] · `nodes-list.html:172-176` · Checkbox per baris tanpa bulk action** dan tanpa "select all". Ini elemen kosong. → Hapus, atau tambahkan toolbar bulk.
**N3 [P2] · `nodes-list.html:66` + `sensors-page.component.html:11` · `btn-outline-light`** untuk Refresh hampir tidak terlihat di tema terang. Di nodes-list juga tanpa `title`/`aria-label`. → `btn-outline-default` + `title="Muat ulang"` + `aria-label`.
**N4 [P2] · `nodes-list.html:62` vs `sensors-page.component.html:4` · Judul "Nodes / Devices" vs "Sensors";** subjudul nodes tanpa timestamp "updated"/auto-refresh seperti sensors. → Seragamkan lewat header workspace (§3.1).
**N5 [P2] · `nodes-list.html:207` · "{{telemetryIntervalSec}}s interval"** menampilkan "nulls interval" atau "s interval" kalau null. → Format "5 mnt" atau "—".
**N6 [P2] · `nodes-list.ts:243` · `limit: 100` + filter klien** membuat node ke-101 dst. hilang diam-diam. Hal yang sama terjadi di `sensors-page.component.ts:125-126`, overview `ts:210, 449`, dan shell `ts:184`. → Paginasi server-side, atau minimal tampilkan peringatan "menampilkan 100 dari N".
**N7 [P3] · Status:** nodes-list memakai `connectivityStatus` backend (online/degraded/offline), shell dan overview menghitung sendiri (5/30 menit, `project-workspace.component.ts:296-306`, `overview-page.component.ts:521-531`), sensors-page memakai freshness relatif interval. Hasilnya, satu node bisa hijau di tree tapi "Offline" di tabel. Lihat §3.3.

### 2.3 Sensors (`PW/pages/sensors-page`): pembanding, sudah baik
Sudah sesuai `ui-list`: tab status + badge hitung, search debounce 400 ms, sort, pagination, loading/error/empty, badge subtle, auto-refresh senyap, label node alamat→kode.
Sisa catatan: **S1 [P2]** `limit:100` (lihat N6). **S2 [P2]** `.html:92, 114` inline `style="max-width"` → class util `.mw-220`. **S3 [P3]** label status Inggris (Fresh/Stale/No Data) sementara empty state Indonesia (`:160`). Bahasa perlu diputuskan per aplikasi (§3.4). **S4 [P2]** `navigateToSensor` (`ts:330-334`) mengirim channel pertama, jadi tergantung D6.

### 2.4 Node detail (`PW/pages/node-detail-page` → `nodes/nodes-detail` embedded)
**ND1 [P0] · `nodes-detail.html:267` · Link channel keluar workspace.** `['/iot/nodes', nodeUuid, 'sensor', channel.id]` tidak memeriksa `embedded`. Klik dari workspace membuat sidebar project hilang. Ini rute utama ke detail sensor. → Kalau `embedded`: `['/iot/projects', projectId, 'node', nodeUuid, 'sensor', ...]` (tambah `@Input() projectId`, mengikuti pola `nodes-list.ts:88-95`).
**ND2 [P1] · `nodes-detail.html:43` · Menu Actions (Edit node, Update Payload Mapping, Delete) disembunyikan saat embedded.** Di workspace, node tidak bisa diedit atau di-remap. → Tampilkan juga dalam mode embedded; link Edit tetap ke form, lalu kembali ke workspace (`returnUrl`).
**ND3 [P1] · `nodes-detail.html:9` + `nodes-detail.ts:273` · h1 = "Node {kode}".** Ini melanggar aturan label node (utama = alamat). → h1 alamat, baris 2 kode.
**ND4 [P1] · `nodes-detail.html:513, 540` · Label salah:** "Industry: {{ownerPhone}}" dan "Installed: {{lastMaintenance}}". Card "Owner & Project" (`:503`) dan "Device Specifications" mengulang isi "Node Information" (`:107-137`). → Hapus kolom kanan yang duplikat, perbaiki label.
**ND5 [P1] · `nodes-detail.html:183-186, 504-506` · Link mati `href="javascript:;"`** ("View Telemetry Graph", ikon external-link). → Hapus atau arahkan ke tujuan nyata.
**ND6 [P2] · `nodes-detail.html:301-317` · "View Telemetry" `target="_blank"` dan "AI Analytics" ke `/iot/ai/...`** keluar workspace tanpa penanda konsisten. → Ikon `fa-external-link-alt` + `title` untuk semua link keluar, atau sediakan versi di dalam workspace.
**ND7 [P2] · `nodes-detail.html` · Tidak ada loading/error halaman** (grep: tidak ada `*ngIf="loading"`). Card terisi "-" / "N/A" selama memuat.
**ND8 [P2] · `nodes-detail.html:373` · "Live data" statis**, padahal data tidak live. `:10, 14` badge Auto `style="font-size:0.5rem"` inline.
**ND9 [P2] · `PW/pages/node-detail-page/node-detail-page.component.html:2-7` · Toolbar "Back to Nodes"** berdiri sendiri di atas header komponen. Detail sensor tidak punya padanannya. → Diganti breadcrumb header workspace.
**ND10 [P3] · `nodes-detail.ts:438-446` · `generateSampleData()` (Math.random) tidak terpakai.** → Hapus supaya tidak dipakai lagi.

### 2.5 Monitor (`PW/pages/monitor-page`)
**M1 [P1] · `monitor-page.component.ts:73-76` · "Create Dashboard" ke `/iot/widget-builder`** keluar workspace tanpa membawa project. → Kirim `queryParams: { projectId }` + `returnUrl`.
**M2 [P2] · `.ts:28-45` · Race:** `projectId` dari parent bisa belum terisi saat `paramMap` anak jalan, sehingga `loadFirstDashboard()` tidak terpanggil dan halaman berakhir di empty state palsu "No Dashboard Configured". → `combineLatest` parent+child params.
**M3 [P2] · `.ts:65-69` · Error disamakan dengan "belum ada dashboard".** → Pisahkan error state.
**M4 [P3]** · Tidak ada header atau pemilih dashboard di halaman; pilihan hanya lewat submenu sidebar.

### 2.6 Map (`PW/pages/map-page`)
**MP1 [P2]** · Pembungkus tipis. Kontrol layer ada di sidebar workspace (`project-workspace.component.html:59-141`), sehingga sidebar berubah fungsi per halaman. Ini bisa diterima, tetapi ikonnya `bi-*` (Bootstrap Icons) di tengah FontAwesome (`:84-125`). → Seragamkan ke FA6.

### 2.7 SCADA (`PW/pages/analytics-page`, route `analytics`, label "SCADA")
**SC1 [P1] · `analytics-page.component.html:5-15` · Mode iframe tanpa header atau tombol kembali** ("user clicks SCADA menu to go back"), dan state view/edit tidak masuk URL, jadi refresh kembali ke list. → Route `analytics/:diagramId?mode=view|edit` + header workspace dengan breadcrumb `SCADA › {nama diagram}`.
**SC2 [P2] · `.html:59-60, 104-119` · Raw `.card`, modal `bg-dark text-white`** (rusak di tema terang), `btn-info` dipakai sebagai warna primer (`:25, 51, 124`) padahal tema = `btn-theme`. → `<card>`, `btn-theme`, modal tanpa hardcode dark.
**SC3 [P3]** · Path `analytics` dengan label SCADA. → Rename route ke `scada` (dengan redirect dari `analytics`).

### 2.8 Config (`PW/pages/config-page`)
**C1 [P0] · `config-page.component.html:36` · Link "View Sensors" ke `/iot/sensors`.** Route ini tidak ada, sehingga jatuh ke wildcard `app-routing.module.ts:301` → `iot/dashboard`. → Ganti ke `['../sensors']`.
**C2 [P1] · `.html:27, 49` · "View Nodes" / "Manage Alerts" keluar workspace;** `/iot/alerts` tidak membaca `projectId`. → `['../nodes']`. Untuk alert, tunggu filter project (O2).
**C3 [P1] · Halaman ini cuma daftar link**, tidak ada konfigurasi nyata (ambang default, interval stale, notifikasi, PIC). "Delete" disabled permanen tanpa alasan (`:62`). Ini memperkuat kesan "fitur kurang". → Isi dengan setelan project nyata, atau gabungkan ke Overview dan sembunyikan tab.
**C4 [P2] · `.html:9, 22, 31, 44` · `bg-dark` hardcode** → `bg-body-tertiary` / `border rounded-3`.

### 2.9 Shell workspace (`PW/project-workspace.component.*`)
**W1 [P1] · `project-workspace.component.html:238-240` · Tidak ada header workspace.** Setiap tab membuat judul sendiri: Overview tanpa judul, Nodes `h2`, Sensors `h2`, SCADA `h4` + ikon `text-info`, Config judul di card-header, Node detail `h1.page-header` + tombol back terpisah, Sensor detail `h1.page-header`. Nama project hanya ada di sidebar (`:18`) dan hilang saat sidebar collapsed.
**W2 [P1] · `project-workspace.component.ts:385-387` · `isNavActive` memakai `url.includes('/'+path)`.** Di `/node/:id` dan `/node/:id/sensor/:id` tidak ada item nav yang aktif, sehingga pengguna kehilangan orientasi. → Mapping eksplisit: `node/*` → Nodes aktif, sensor detail → Sensors aktif, plus asset tree terpilih.
**W3 [P1] · `.ts:266` · Status sensor di tree = status node.** Dot hijau tidak berarti sensornya mengirim data. → Pakai `getSensorStatus` freshness (sensors-page).
**W4 [P2] · `.ts:213-239` · N+1 request** (1 per node) untuk tree. Sensors-page sudah membuktikan cukup 2 request (`sensors-page.component.ts:123-127`). → Reuse.
**W5 [P2] · `.ts:476-481` · Context menu `preventDefault` tanpa menu**, jadi klik kanan "mati". → Hapus handler sampai fitur ada.
**W6 [P2] · `.html:4, 19, 172` · Tombol ikon-only punya `title` tetapi tidak punya `aria-label`.** Item nav berupa `<a (click)>` tanpa `href`, sehingga tidak bisa difokus dengan keyboard (`:35, 144, 156`). → `routerLink` + `routerLinkActive` (sekaligus menyelesaikan W2).
**W7 [P2] · `project-workspace.component.scss` · ~100 warna hex/rgba hardcode.** → Ganti ke `var(--bs-*)`.
**W8 [P3] · `.ts:205, 272` · `console.log` dump data** di produksi.

---

## 3. Pola lintas halaman (seragamkan sekali jalan)

### 3.1 Satu komponen `workspace-page-header` (+ posisi tombol **Panduan**)
Buat `<workspace-page-header>` (NgModule, `standalone:false`) di `PW/components/`, dipakai di **semua** child page. Mode `embedded` pada komponen reuse (nodes-list, nodes-detail, sensor-chanel-detail) **menyembunyikan header internalnya** dan menyerahkannya ke header ini.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Tenggarong › Nodes › Jl. Mulawarman 12 › Sensor Tekanan                       │  ← breadcrumb (semua link relatif workspace)
│ Sensor Tekanan                                   [?] Panduan  [Sekunder] [Primer] [⋯] │
│ NODE-TGR-014 · ● Fresh · diperbarui 10:42 (auto 60 dtk)  [⟳]                  │  ← subjudul/meta + refresh
└──────────────────────────────────────────────────────────────────────────────┘
```
Input: `breadcrumbs: {label, link}[]`, `title`, `subtitle`, `meta` (lastRefreshed, autoRefresh), `guideKey`; konten aksi via `<ng-content select="[actions]">`.

**Posisi tombol Panduan**: selalu **paling kiri di grup aksi kanan header**, *sebelum* tombol sekunder/primer. Bentuknya `btn btn-sm btn-outline-default` dengan `fa fa-circle-question` + teks "Panduan" (di mobile cukup ikon, `aria-label="Panduan halaman ini"`). Tombol ini membuka **offcanvas kanan** (`offcanvas-end`, pola drawer yang sudah ada di `nodes-detail`) yang isinya dipilih dari `guideKey` (`overview`, `nodes`, `sensors`, `sensor-detail`, `node-detail`, `monitor`, `map`, `scada`, `config`). Alasannya: posisinya tetap di semua halaman, tidak bersaing dengan aksi primer (primer tetap paling kanan, sesuai `ui-list`/`ui-detail`), dan dekat dengan judul yang dijelaskannya. **Jangan** meletakkannya di sidebar (tersembunyi saat collapsed atau di mobile) dan **jangan** sebagai floating button (bertabrakan dengan kontrol map/SCADA). Untuk SCADA (iframe full) dan Map, header tetap dirender dalam varian ringkas satu baris supaya Panduan tetap di tempat yang sama.

### 3.2 State standar
Satu pola untuk semua halaman (sumber: sensors-page): spinner `spinner-border-sm text-theme` + teks; `alert alert-danger d-flex` + **Coba lagi**; empty dua varian ("belum ada" vs "tidak sesuai filter"); silent refresh mempertahankan data lama. Larangan: dummy/`Math.random` sebagai fallback (D1, O1, ND10).

### 3.3 Satu definisi status
Buat `StatusService` / pure functions di `@app/shared`:
- **Konektivitas node**: pakai `connectivityStatus` backend (online/degraded/offline) di semua tempat (tree, overview, nodes-list, node-detail).
- **Freshness sensor/channel**: rumus sensors-page (`getSensorStatus`, interval-relatif) → Fresh/Stale/Offline/No data.
- **Status nilai**: Normal/Mendekati batas/Di luar batas/Tanpa ambang (D2).
- Satu `badgeClass(kind, value)` → `bg-*-subtle text-*`. Hapus override hex di `sensor-chanel-detail.scss:37-61` dan `overview-page.component.ts:566-595`.

### 3.4 Bahasa dan format
Saat ini campur: "Tidak ada data sesuai filter" / "Showing … records" / "Window data aktif" / "Sync Telemetry". Putuskan **Bahasa Indonesia untuk UI PDAM** (istilah teknis seperti Node, Sensor, Channel, SCADA tetap dipakai). Format: tanggal `dd MMM yyyy, HH:mm` + zona lokal; angka `| number:'1.0-2'` dengan locale `id`; relatif "x mnt lalu" dari satu pipe (`timeAgo`). Saat ini ada 3 implementasi `formatTimeAgo`: sensors-page, overview, nodes-detail.

### 3.5 Navigasi tetap di workspace
Semua komponen reuse yang di-embed menerima `@Input() projectId` dan membangun link lewat satu helper `workspaceLink(...)`. Daftar yang bocor: `nodes-detail.html:267`, `sensor-chanel-detail.ts:654`, `config-page.html:27,36,49`, `monitor-page.ts:75`. Link yang memang keluar (Telemetry, AI, Widget Builder) diberi ikon external + `returnUrl`.

### 3.6 Tabel dan aksi
Tabel: `table table-hover text-nowrap align-middle`, `thead text-uppercase text-muted small`, tanpa override scss per halaman, tanpa `thead.table-light`. Aksi: 1 primer `btn-theme`, sekunder `btn-outline-theme`/`btn-outline-default`, destruktif selalu di dropdown `⋯`. Jangan memakai `btn-info` sebagai primer.

---

## 4. Urutan perbaikan

**Gelombang 1 (quick wins, ±1 hari): kejujuran data dan link rusak**
1. D1 hapus dummy data + error state (sensor detail).
2. O1 hapus uptime/latency acak; O3 hapus teks hardcode; O4 perbaiki angka sensor offline.
3. D3 ambang null → "Belum diatur"; D4 hapus kualitas %.
4. C1 perbaiki `/iot/sensors`; C2 + ND1 + D11 link tetap di workspace.
5. ND4 label salah, ND5 link mati, D12 aksi ganda, N1/D13 loading state.

**Gelombang 2 (±2–3 hari): kerangka konsisten**
6. `workspace-page-header` + slot **Panduan** (§3.1) dipasang di 9 halaman; header internal disembunyikan saat `embedded`.
7. W2/W6 nav pakai `routerLinkActive`; W3 status tree.
8. §3.3 satu definisi status + `badgeClass` subtle; hapus override hex.
9. O2 alert scoped ke project (butuh param backend `idProject`; koordinasikan dengan iot-backend-go).

**Gelombang 3 (±3–4 hari): fitur detail sensor setara enterprise**
10. D6 route sensor vs channel + channel switcher.
11. D7 chart tren dengan garis ambang + D8 KPI nilai terkini (`info-card-widget`).
12. D2 model status nilai; D5 rentang tanggal benar; D15 CSV benar; D20 paginasi/agregasi server.

**Gelombang 4: rapikan sisa**
13. ND2 aksi node di workspace, ND3 label h1; SC1 route SCADA + header; M1/M2 monitor.
14. C3 isi Config dengan setelan nyata atau gabungkan; N6 batas 100 → paginasi server.
15. §3.4 bahasa, W7 token warna, W4 N+1, sisa P3.
