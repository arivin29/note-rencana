# 23 — ROADMAP & KATALOG FITUR: SCADA "Helios" untuk PDAM

> Document type: Roadmap produk + katalog fitur (educational)
> Status: Draft untuk review product owner — 2026-07-05
> Ground truth teknis: **doc 22 (SPEC SCADA as-built)**. Semua klaim "sudah ada / belum"
> diverifikasi terhadap doc 22 dan kode `iot-scada/src`.
> Batas produk: doc 01 + doc 17 (D-002 monitoring-only, D-043 out-of-scope list).

**Scope yang dikunci user (2026-07-05):**
- Helios SCADA adalah produk **web-based murni** — target tampilan: **desktop web,
  tablet, mobile phone**, termasuk pengalaman **embedded iframe** di Angular
  (desktop tab Analytics, mobile Helios tab SCADA).
- **Bukan** HMI control-room dan **bukan** sistem control/command device.
  Control/command dinyatakan **out-of-scope produk** (bukan fase mendatang).
- **Alarm management & anomaly detection ditunda atas permintaan user** —
  masuk backlog akhir, bukan fokus roadmap ini.
- Fokus sekarang: **view data + kualitas tampilan/visualisasi.**

Dokumen ini sengaja **mendidik**: tiap tema dibuka dengan "apa ini & kenapa PDAM
membutuhkannya", karena domain PDAM/SCADA bukan latar belakang tim. Referensi di §7.

---

## 1. Ringkasan Eksekutif

### 1.1 Di mana kita sekarang

Helios hari ini adalah **layer visualisasi proses air yang fondasinya kuat**:

- Builder + viewer diagram P&ID-style lengkap (React Flow, 26 node type
  teregistrasi, dual render mode card/schematic, pipe 3D beranimasi 6 jenis,
  ±37 kategori sensor).
- Runtime polling 5 detik, status per binding dihitung backend, latest value
  dari ClickHouse (fallback Postgres), trend sparkline per binding.
- Backend Go transaksional, multi-tenant benar, sudah production (Firebase
  Hosting) dan ter-embed di Angular desktop & mobile.

Kelemahannya bukan arah, tapi **kedalaman tampilan**: simbol belum "hidup"
(pompa tidak menunjukkan berputar/berhenti, tangki tidak menggambarkan level),
grafik masih sparkline tunggal per node, ada bug builder (delete node), dan
9 gap teknis terdokumentasi (G-1…G-9, doc 22 §14).

### 1.2 Tesis nilai — 4 outcome PDAM

Setiap fitur diikat ke minimal satu outcome yang benar-benar dibayar PDAM.
Untuk produk **view-only**, cara fitur menyumbang outcome = membuat kondisi
**terlihat, terbaca, dan bisa diceritakan** — keputusan & tindakan tetap di
manusia PDAM:

| Kode | Outcome | Kontribusi produk view-only |
|---|---|---|
| **(a) NRW** | Turunkan Non-Revenue Water | Tampilan night-flow DMA & mass-balance membuat kebocoran *terlihat* — operator tahu ke zona mana harus turun. |
| **(b) Uptime** | Kontinuitas suplai | Pompa mati / tangki hampir kosong terlihat dalam 1 detik dari layar mana pun (HP sekalipun). |
| **(c) Energi** | Hemat listrik & biaya | Panel kWh/m³ menunjukkan pompa mana yang boros — bahan keputusan maintenance. |
| **(d) Kualitas** | Kepatuhan kualitas air | Nilai sisa klor/kekeruhan/pH tampil dengan band batas regulasi — status kepatuhan terbaca sekilas. |

### 1.3 Arah besar (bobot sesuai scope baru)

1. **Fase 0** — bereskan bug & gap fondasi (delete node, Duplicate, G-4/G-5/G-6)
   supaya builder/viewer bisa dipercaya.
2. **Fase 1** — **simbol yang hidup**: pompa dengan head/RPM/status run,
   reservoir dengan animasi level %, arah aliran pipa mengikuti data, upload
   SVG custom, disiplin warna tampilan.
3. **Fase 2** — **multi-chart panel** + kualitas mode VIEW: keterbacaan,
   layout, responsif tablet & mobile phone, pengalaman embedded iframe.
4. **Fase 3** — **analytics sebagai tampilan**: view night-flow DMA, panel
   mass-balance NRW, view specific energy pompa, band kualitas air.
5. **Fase 4** — reporting/export & multi-site view.
6. **Backlog (ditunda atas permintaan user)** — alarm management, anomaly,
   notifikasi. Control/command: out-of-scope produk.

---

## 2. Model Kematangan — versi produk visualisasi

Tangga kematangan SCADA klasik berakhir di "alarm workflow" lalu "control &
optimasi". **Helios secara sadar tidak menaiki tangga sampai puncak** — kita
memaksimalkan level-level visualisasi dan berhenti sebelum alarm workflow &
control:

| Level | Nama | Isi | Posisi/keputusan Helios |
|---|---|---|---|
| **V1** | Visualisasi statis | Diagram proses, nilai live per titik, status visual dasar, sparkline. | ✅ **Sudah — kondisi hari ini** (dengan gap G-1…G-9) |
| **V2** | Diagram hidup & terbaca di mana saja | Simbol data-driven (pompa berputar, tangki terisi, aliran mengikuti data), disiplin warna, multi-pen chart, nyaman di tablet/HP/iframe. | 🟡 **FOKUS ROADMAP INI** |
| **V3** | Analytics-view operasional | Data diolah jadi tampilan insight: night-flow DMA, mass-balance NRW%, kWh/m³ pompa, band kualitas air. Tetap view — tanpa alerting engine. | ⬜ Fase 3 |
| **V4** | Reporting & multi-site view | Laporan produksi/ekspor, overview banyak site untuk manajemen. | ⬜ Fase 4 |
| — | Alarm workflow (ack/notify/shelving) | Kejadian sebagai objek ter-audit yang mengejar operator. | ⏸ **Backlog — ditunda atas permintaan user** |
| — | Control/command | Perintah ke device (setpoint, start/stop). | ⛔ **Out-of-scope produk** (mempertegas D-002) |

---

## 3. Katalog Fitur

Legenda status: **Sudah ada** (as-built, tinggal poles) · **Extend** (fondasi ada,
diperluas) · **Baru**. Effort: **S** (≤ beberapa hari) · **M** (1–2 minggu) ·
**L** (3+ minggu / lintas repo). Asumsi: tim kecil 1–2 dev yang kenal codebase.

### 3.A Fondasi & Perbaikan (bahan Fase 0)

Konteks: item G-x merujuk doc 22 §14. Semua ini murah dan menaikkan kepercayaan
pada builder/viewer sebelum fitur tampilan ditumpuk di atasnya.

| ID | Fitur | Deskripsi | Outcome | Status | Effort | Dependensi |
|---|---|---|---|---|---|---|
| A-1 | **Fix delete node** | Bug penghapusan node. Jalur yang terlibat: `onDelete` di `ScadaCanvas.tsx:198-216` (dengan guard `isDeleting`), tombol delete di `ScadaNodeFrame`, ToolRail delete-selection, `deleteKeyCode`. Reproduksi, perbaiki, masukkan ke checklist E2E. | kepercayaan builder | Sudah ada (buggy) | **S** | — |
| A-2 | **Tombol Duplicate diagram** | API + SDK sudah lengkap (`POST :id/duplicate`, transaksi clone penuh `scada_service.go:338-466`; SDK `services.gen.ts:665-673`). Tinggal tombol di `DiagramListPage` + dialog nama. Doc 16 §11 keliru mengklaim done (doc 22 #30). | efisiensi engineer | Extend (UI saja) | **S** | — |
| A-3 | **Fix G-4: `isPrimary` di runtime response** | Backend kirim `isPrimary` + `priorityOrder` di runtime binding DTO (datanya sudah ada di tabel); hapus heuristik `buildNodeRuntimeMap`. **Prasyarat semua simbol multi-binding** (pompa head+RPM+status). | nilai tampil benar | Extend | **S** | Backend Go kecil |
| A-4 | **Fix G-5: save diagram kosong** | Longgarkan `validateUpdatePayload` (nodes boleh 0) agar rename/metadata diagram baru bisa disimpan. | UX builder | Extend | **S** | Backend Go kecil |
| A-5 | **Fix G-6: origin check postMessage** | Whitelist origin parent (`VITE_ALLOWED_PARENT_ORIGINS`) di `AuthGate`, target origin eksplisit untuk `scada-ready`. Penting karena iframe embed adalah jalur utama produk. | keamanan embed | Extend | **S** | — |
| A-6 | **Aktifkan `runtimeConfig` (G-3)** | `pollingIntervalMs` dipakai `useRuntimePolling`; `staleTimeoutMs` dipakai backend — atau sembunyikan field-nya agar tidak menyesatkan. | kejujuran tampilan | Extend | **S–M** | A-3 (area sama) |
| A-7 | **Stabilkan SDK (G-1)** | OpenAPI spec resmi dari iot-backend-go untuk tag SCADA → regen orval → pensiunkan normalizer bertahap. Kerjakan **sebelum** gelombang endpoint analytics-view (Fase 3). | fondasi | Extend | **M** | Kerja di iot-backend-go |
| A-8 | **Envelope list `{data, meta}` (G-2)** | Bungkus `GET /api/scada/diagrams` ke envelope platform; kedua klien sudah defensif → aman. | fondasi | Extend | **S** | — |
| A-9 | **Validasi enum `nodeType` backend (G-8f)** | Tolak/normalisasi nodeType di luar registry saat save. | fondasi | Extend | **S** | — |
| A-10 | **Render `rotationDeg` + persist viewport** | Kolom & DTO sudah ada, frame belum menerapkan transform; viewport/zoom tidak pernah ditulis ke `canvasConfig` (doc 22 #35, #39). Persist viewport penting untuk view mode: diagram terbuka langsung pada framing yang engineer siapkan. | UX view & builder | Extend | **S** | — |
| A-11 | **Testing minimum (G-9)** | Jalankan checklist doc 20 T-07…T-19; smoke test Playwright: login → create → add node → bind → save → reload → runtime. | fondasi | Baru | **M** | — |

### 3.B Kekayaan Simbol & Visual Node — *inti Fase 1*

**Edukasi singkat.** Di SCADA air yang baik, simbol bukan gambar mati: ia
**membawa data**. Pompa menunjukkan run/stop dan kecepatannya; tangki
menggambarkan isinya; pipa menunjukkan arah dan ada/tidaknya aliran. Prinsip
tampilan dari praktik High-Performance HMI (ISA-101) yang kita adopsi —
**murni sebagai disiplin visual, bukan alarm workflow**: latar & equipment
normal memakai tone netral, **warna cerah dihemat** untuk hal yang butuh
perhatian, sehingga mata langsung tertarik ke yang penting. Tema dark
industrial Helios dipertahankan; yang dipertegas adalah hirarki visualnya.

| ID | Fitur | Deskripsi | Outcome | Status | Effort | Dependensi |
|---|---|---|---|---|---|---|
| B-1 | **Simbol pompa kaya (status run, RPM, head)** | Extend glyph `pump`/`motor` di `ScadaNodeFrame`: visual run/stop dari binding kategori `pump_status` (kategori sudah ada di `sensorCategories.tsx`; animasi impeller berputar saat run), sub-value RPM/VFD% dan head (dari binding pressure suction/discharge atau head langsung) tampil di node. **Permintaan user.** | (b)(c) | Extend | **M** | A-3 (multi-binding benar) |
| B-2 | **Reservoir/tangki dengan animasi level %** | Extend glyph `reservoir`/`ground_tank`/`elevated_tank`: isi tangki tergambar sesuai binding kategori `level`; config geometri (kapasitas m³) di node config → tampil % + volume. **Permintaan user.** | (a)(b) | Extend | **M** | A-3 |
| B-3 | **Arah aliran pipa data-driven** | As-built: `flowDirection` + animasi **sudah ada** di `PipeEdge` (forward/reverse/bidirectional, CSS dash) tapi statis (di-set engineer). Extend: animasi mengikuti data — flow ≈ 0 → berhenti; flow negatif → berbalik; kecepatan animasi opsional proporsional flow. Butuh referensi binding flow di edge (pakai binding node flowmeter terkait atau field kecil di `config_json` edge — tanpa migrasi DB). **Permintaan user.** | (b) | Sudah ada (statis) → Extend | **M** | A-3 |
| B-4 | **Upload SVG file untuk simbol custom** | Saat ini `customSvg` = paste teks (`NodeConfigDrawer.tsx:1137`, dirender via `dangerouslySetInnerHTML`). Tambah `<input type="file" accept=".svg">` dibaca sebagai teks ke field yang sama, + **sanitasi SVG** (strip script/event handler) — perbaikan keamanan sekalian. **Permintaan user.** | UX builder | Extend | **S** | — |
| B-5 | **Disiplin warna & hirarki visual (prinsip ISA-101, tanpa framing alarm)** | Audit tema view mode: baseline netral, warna cerah dihemat untuk nilai penting/abnormal, kontras teks nilai vs background, tipografi nilai utama. Output: style guide singkat + penyesuaian token Tailwind + state glyph. | (b) — terbaca <1 detik | Extend | **M** | — |
| B-6 | **Agregasi status multi-binding (G-7)** | Status visual node = kondisi terburuk semua binding (urutan D-025: offline>stale>alert>warn>off>ok), bukan hanya primary. Data `allBindings` sudah ada di `useRuntimeStore`. Ini kejujuran tampilan, bukan alarm workflow. | (b) | Extend | **S** | A-3 |
| B-7 | **Valve & PRV state display** | Glyph `valve`/`check_valve`/`prv` menampilkan open/close dari binding status; PRV menampilkan pasangan tekanan upstream/downstream + delta. | (a)(b) | Extend | **M** | A-3 |
| B-8 | **Threshold band per binding (display)** | Override min/max per binding di `NodeConfigDrawer` (simpan di `transform_json`/config; default dari `sensor_channels`) — dipakai untuk pewarnaan nilai & band di chart. Melengkapi D-026 yang belum diimplementasi (doc 22 #32), dibingkai sebagai konfigurasi tampilan. | (b)(d) | Extend | **M** | A-3 |
| B-9 | **Rapikan registry node type** | Union TS mendeklarasi ±60 tipe, registry hanya 26 (doc 22 §3.2). Pangkas union atau registrasikan yang dibutuhkan PDAM (mis. `dma`, `hydrant`) — jangan tampilkan di library sebelum teregistrasi. | konsistensi | Extend | **S–M** | — |

### 3.C Trending / Multi-Chart — *permintaan langsung user*

**Edukasi singkat.** Alat analisis utama operator SCADA adalah **trend viewer
multi-pen**: beberapa variabel (pen) digambar pada satu sumbu waktu untuk
melihat hubungan sebab-akibat — mis. tekanan turun saat pompa stop, level tangki
vs flow outlet. Fitur standar industri: pilih pen, time range (window live yang
bergeser atau rentang absolut), dual axis untuk unit berbeda, ekspor.

| ID | Fitur | Deskripsi | Outcome | Status | Effort | Dependensi |
|---|---|---|---|---|---|---|
| C-1 | **Multi-pen trend panel ("multi grafik")** | Panel trend (drawer bawah / halaman penuh) dengan beberapa pen dalam satu sumbu waktu; pilih channel dari binding diagram; time range 1h/24h/7d/30d/custom; dual axis; overlay band threshold (B-8). Fondasi ada: `useTrendStore` + `Sparkline`/`TrendCard` + endpoint `GET /api/sensor-logs` (envelope `{data,meta}` standar). **Permintaan user.** | (a)(b)(c)(d) | Extend | **M** | Rapikan fetch trend lewat satu client (G-8b) |
| C-2 | **Multi-chart layout (beberapa grafik sekaligus)** | Grid 2–4 chart panel yang masing-masing multi-pen, layout tersimpan per diagram (JSONB) — "halaman grafik" pendamping diagram. | sama | Baru (di atas C-1) | **M** | C-1 |
| C-3 | **Export CSV dari trend** | Unduh data pen yang tampil. | pelaporan | Baru | **S** | C-1 |
| C-4 | **Historical playback diagram** | Time-slider: diagram menampilkan nilai/status pada waktu T (dari ClickHouse), play/pause — post-mortem visual ("semalam jam 02:00 kenapa reservoir kosong?"). Nilai demo tinggi, effort besar → fase belakang. | (b) | Baru | **L** | C-1; endpoint runtime-at-time baru |

### 3.D Kualitas Mode VIEW & Responsif (tablet · mobile · iframe) — *inti Fase 2*

Konteks as-built: view mode sudah punya ViewNavControls, fullscreen + jam,
tooltip mini-card, MiniMap; embed sudah jalan di Angular desktop & mobile Helios.
Yang belum: pengalaman itu **dirancang** untuk layar kecil — sekarang baru
"kebetulan muat". Karena target akhir produk = tablet, HP, dan iframe, tema ini
setara pentingnya dengan simbol.

| ID | Fitur | Deskripsi | Outcome | Status | Effort | Dependensi |
|---|---|---|---|---|---|---|
| D-1 | **Keterbacaan view mode (level-of-detail)** | Ukuran nilai/label adaptif terhadap zoom: jauh = simbol + status saja; dekat = nilai penuh. Kontras & tipografi sesuai B-5. | (b) | Extend | **M** | B-5 |
| D-2 | **Responsif tablet & mobile phone (view)** | Touch target ≥44px, tooltip mini-card jadi bottom-sheet di layar sempit, ViewNavControls versi compact, pinch-zoom mulus, safe-area iOS. Uji nyata di iframe mobile Helios. | (b) — operator pegang HP | Extend | **M** | — |
| D-3 | **Pengalaman embedded iframe** | Auto fit-view saat resize container, sembunyikan chrome redundan saat embedded (Angular sudah punya header), origin handshake aman (A-5), deep-link dari Angular ke node tertentu (query `?focusNode=`). | (b) | Extend | **M** | A-5 |
| D-4 | **Panel nilai / KPI strip di viewer** | Barisan nilai kunci terkurasi di tepi diagram — angka penting site terbaca tanpa mencari node-nya. `ValueDisplayNode` sudah ada; ini menyusunnya sebagai panel. | (b) | Extend | **M** | — |
| D-5 | **Edit mode tablet-friendly** | Builder di tablet (doc 22 #36). Prioritas lebih rendah dari view — engineer umumnya di desktop. | UX builder | Extend | **M** | D-2 |
| D-6 | **Kiosk/TV mode (tetap web murni)** | Fullscreen sudah ada (`F`, overlay jam). Tambah: auto-rotate antar diagram sebuah project + auto-reconnect anti-stale — untuk TV ruang operator PDAM, dibuka dari browser biasa. | (b) | Extend | **S–M** | — |

### 3.E Analytics-View khas PDAM — *Fase 3, dibingkai sebagai tampilan*

**Edukasi singkat (inti NRW).** **DMA (District Metered Area)** = zona
distribusi (±500–3000 sambungan) yang air masuk/keluarnya diukur meter. Dua
tampilan paling bernilai untuk PDAM:

1. **Night-flow view** — flow inlet DMA pada dini hari (±01:00–05:00) saat
   konsumsi pelanggan minimum; setelah dikurangi konsumsi malam yang sah,
   sisanya ≈ kebocoran fisik. **MNF (Minimum Night Flow) yang merangkak naik
   dari baseline = indikasi kebocoran baru.** Sebagai produk view, kita
   **menampilkan** kurva MNF harian vs baseline — menyimpulkan & menindak
   tetap di user.
2. **Mass-balance / NRW% view** — kerangka IWA water balance disederhanakan:
   Σ inflow vs Σ outflow antar meter per zona per hari/bulan → estimasi NRW%
   sebagai panel tampilan.

Pelengkap: **specific energy pompa (kWh/m³)** — energi per volume terpompa;
tren naik = pompa aus/boros — dan **band kualitas air** sesuai regulasi
(pH 6,5–8,5; sisa klor min 0,2 mg/L di titik terjauh distribusi; kekeruhan —
verifikasi angka final Permenkes 2/2023 saat implementasi).

Semua item di bawah = **endpoint agregasi (ClickHouse) + halaman/panel view**.
Tanpa alerting engine, tanpa notifikasi (backlog §3.G).

| ID | Fitur | Deskripsi | Outcome | Status | Effort | Dependensi |
|---|---|---|---|---|---|---|
| E-1 | **Node/zona DMA teregistrasi** | Tipe `dma` sudah di union TS, belum di registry (doc 22 §3.2). Registrasikan sebagai node zona ber-binding flowmeter inlet/outlet & pressure; atribut zona (jumlah SR, panjang pipa) di `config_json` dulu — tanpa entity platform baru. | (a) | Extend | **M** | B-9 |
| E-2 | **DMA night-flow view** ⭐ | Endpoint agregasi: MNF harian per channel flow (window 01:00–05:00 dari ClickHouse) + baseline sederhana (mis. median 30 hari). UI: chart MNF 30–90 hari + garis baseline + anotasi kenaikan, dibuka dari node DMA/flowmeter. | **(a)** | **Baru — signature view** | **L** | E-1, C-1, A-7 |
| E-3 | **Mass-balance / NRW% panel** ⭐ | Endpoint: Σ inflow vs Σ outflow (totalizer/flow) per zona per hari/bulan → panel NRW% estimasi + trend. Tahap 1 meter-to-meter (tanpa data billing). | **(a)** | **Baru — signature view** | **L** | E-1; kelengkapan meter |
| E-4 | **Pump specific energy view (kWh/m³)** ⭐ | Endpoint: kWh (kategori `energy`) ÷ volume terpompa (flow/totalizer) per stasiun per hari → chart trend + perbandingan antar pompa; termasuk run-hours harian dari histori `pump_status`. | **(c)** | Baru — signature view | **L** | Sensor energi+flow terpasang; C-1 |
| E-5 | **Reservoir: laju isi/kuras + estimasi waktu habis** | Turunan level (slope N titik terakhir; data trend sudah di-fetch frontend) → "−12 m³/jam, habis ±5 jam" di tooltip/mini-card. Angka favorit operator shift malam. Murni kalkulasi tampilan frontend. | (b) | Baru | **M** | B-2 |
| E-6 | **Water quality band view** | Nilai chlorine/turbidity/ph (kategori sudah ada) ditampilkan terhadap band regulasi (default dari threshold channel/B-8); ringkasan "dalam/luar spec" per titik + durasi out-of-spec per periode (query ClickHouse) sebagai tabel view. | **(d)** | Extend + Baru | **M** | B-8 |

### 3.F Reporting / Export View — *Fase 4*

PDAM hidup dengan laporan (produksi harian m³, laporan bulanan manajemen).
Sebagai produk view: **halaman laporan + ekspor**, bukan workflow.

| ID | Fitur | Deskripsi | Outcome | Status | Effort | Dependensi |
|---|---|---|---|---|---|---|
| F-1 | **Laporan produksi harian (view + ekspor)** | Volume per totalizer/flowmeter per hari (agregasi ClickHouse), jam operasi pompa, energi; per project; ekspor Excel/CSV/PDF. | (a)(c) | Baru | **M–L** | E-4 (agregasi sama) |
| F-2 | **Ekspor diagram sebagai gambar** | PNG/SVG snapshot diagram (untuk laporan/presentasi PDAM). React Flow punya util viewport-to-image. | pelaporan | Baru | **S–M** | — |
| F-3 | **Multi-site overview page** | Rollup semua diagram/site sebuah owner: kartu per site (status terburuk, KPI kunci) + link; cocok untuk TV (D-6). Butuh endpoint summary lintas diagram. Scoping: admin per `ownerId` yang dipilih, tenant otomatis `idOwner` sendiri (pola `resolveOwnerScope` existing). | (b) | Baru | **M** | A-3; endpoint baru |
| F-4 | **Layer status di peta (webgis Angular)** | Angular mobile sudah punya webgis — tambah marker per site/diagram berwarna status + link ke viewer, memakai endpoint summary F-3. Lebih hemat daripada membangun peta di app SCADA. | (a)(b) | Extend (Angular) | **M** | F-3 |

### 3.G Backlog — ditunda / out-of-scope

| Item | Status keputusan |
|---|---|
| **Alarm management** (event persisted, acknowledge, prioritas, shelving, riwayat; standar ISA-18.2/EEMUA 191) | ⏸ **Backlog — ditunda atas permintaan user (2026-07-05).** Catatan agar tidak menutup jalan: status & threshold per binding sudah dihitung backend tiap polling; bila kelak diangkat, alarm engine tinggal mempersistkan transisi status yang sudah ada — tidak perlu membongkar desain sekarang. |
| **Anomaly detection / ML** | ⏸ Backlog — platform punya modul ml terpisah; SCADA cukup jadi *display surface*-nya nanti. |
| **Notifikasi keluar (WA/email/push)** | ⏸ Backlog — mengikuti alarm. |
| **Control/command device** (setpoint, start/stop pompa) | ⛔ **Out-of-scope produk** (keputusan user 2026-07-05, mempertegas D-002/D-043). Helios = web-based view untuk desktop/tablet/HP/iframe. Dicatat di sini hanya agar keputusan terdokumentasi. |
| Collaborative editing, versioning penuh, template marketplace | ⛔ Tetap out-of-scope (D-043). |

---

## 4. Prioritas (Impact × Effort)

### Quick wins — kerjakan duluan

| # | Item | Alasan |
|---|---|---|
| 1 | A-1 fix delete node | Bug alur inti builder |
| 2 | A-2 tombol Duplicate | API sudah jadi; tinggal UI |
| 3 | A-3 (G-4) + A-4 (G-5) | Backend kecil; membuka semua fitur multi-binding & memperbaiki UX save |
| 4 | A-5 (G-6) origin check | Keamanan jalur embed (jalur utama produk) — murah |
| 5 | B-4 upload SVG file | Permintaan user; extend kecil dari paste yang sudah ada (+sanitasi) |
| 6 | B-6 agregasi status multi-binding | Data sudah di store; tampilan jadi jujur |
| 7 | A-10 persist viewport (+rotasi) | Viewer terbuka langsung pada framing yang benar |
| 8 | C-1 multi-pen trend panel | Permintaan user; fondasi (store, sparkline, endpoint) sudah ada |
| 9 | B-1/B-2/B-3 simbol hidup (pompa, tangki, aliran) | Wow-factor demo terbesar per effort; permintaan user |

### Big bets — effort L, pembeda produk (setelah tampilan dasar matang)

| # | Item | Alasan |
|---|---|---|
| 1 | E-2 DMA night-flow view | Membuat kebocoran *terlihat* — jualan inti DEVETEK (NRW) |
| 2 | E-3 mass-balance NRW% panel | KPI yang direktur PDAM laporkan ke pemda, live |
| 3 | E-4 pump specific energy view | Cerita hemat listrik yang mudah di-Rupiahkan |
| 4 | C-4 historical playback | Nilai demo tinggi, tapi bukan penentu pembelian awal |

### Tunda

- D-5 edit mode tablet (engineer di desktop).
- C-4 playback (setelah C-1/C-2 terbukti terpakai).
- Seluruh §3.G backlog.

---

## 5. Roadmap Bertingkat

Realistis untuk tim kecil (1–2 dev). Durasi = kalender kasar, bukan janji.

### Fase 0 — Fix & Fondasi Tampilan (±2–3 minggu)
**Tujuan:** builder/viewer bisa dipercaya; fondasi multi-binding benar.
**Isi:** A-1 delete node · A-2 Duplicate UI · A-3 (G-4) · A-4 (G-5) · A-5 (G-6) ·
A-8 envelope · A-9 validasi nodeType · A-10 rotasi+viewport · mulai A-11 (checklist E2E).
**Demoable:** builder tanpa bug memalukan; duplicate sekali klik; diagram terbuka
pada framing yang disiapkan engineer.
**Prasyarat:** akses deploy iot-backend-go.

### Fase 1 — Simbol Hidup (±3–4 minggu)
**Tujuan:** diagram berhenti jadi gambar mati — pompa berputar, tangki terisi,
air mengalir sesuai data.
**Isi:** B-1 pompa (run/RPM/head) · B-2 reservoir level % animasi · B-3 arah aliran
data-driven · B-4 upload SVG · B-5 disiplin warna/hirarki visual · B-6 agregasi
status · B-7 valve/PRV display · B-9 rapikan registry.
**Demoable:** diagram WTP dengan pompa berputar sesuai status nyata, tangki
terisi sesuai level, aliran pipa berhenti saat flow nol — momen jualan pertama.
**Prasyarat:** Fase 0 (khususnya A-3).

### Fase 2 — Multi-Chart & Kualitas VIEW di Semua Layar (±3–5 minggu)
**Tujuan:** enak dipakai di desktop, tablet, HP, dan iframe; grafik jadi alat analisis.
**Isi:** C-1 multi-pen panel · C-2 multi-chart layout · C-3 export CSV ·
D-1 keterbacaan/level-of-detail · D-2 responsif tablet & mobile ·
D-3 pengalaman embedded iframe (+deep-link focusNode) · D-4 KPI strip ·
D-6 kiosk/TV mode · A-6 runtimeConfig · B-8 threshold band display.
**Demoable:** operator buka Helios mobile → tab SCADA → diagram nyaman di HP;
supervisor membandingkan tekanan vs status pompa 24 jam di panel multi-grafik.
**Prasyarat:** Fase 1 (simbol & warna).

### Fase 3 — Analytics-View NRW & Energi (±6–8 minggu)
**Tujuan:** Helios menjawab "di mana air & uang saya bocor" — sebagai tampilan.
**Isi:** A-7 stabilkan SDK (sebelum endpoint baru) · E-1 node DMA · **E-2
night-flow view** · **E-3 mass-balance NRW% panel** · **E-4 specific energy view
+ run-hours** · E-5 estimasi waktu habis reservoir · E-6 water quality band view.
**Demoable:** "DMA Cibinong: night-flow naik 40% sejak Selasa" terlihat di chart
+ kartu NRW% per zona + perbandingan kWh/m³ antar pompa.
**Prasyarat:** Fase 2 (chart engine C-1 dipakai ulang); **dependensi hardware** —
flowmeter inlet DMA & kWh meter terpasang; koordinasikan pemasangan sejak Fase 1.

### Fase 4 — Reporting & Multi-Site View (±4–6 minggu)
**Tujuan:** manajemen PDAM ikut memakai; angka keluar otomatis.
**Isi:** F-1 laporan produksi harian + ekspor · F-2 ekspor diagram sebagai gambar ·
F-3 multi-site overview (untuk TV, dengan D-6) · F-4 layer status webgis Angular ·
C-4 playback (bila kapasitas ada).
**Demoable:** laporan produksi harian PDF otomatis; satu layar TV menampilkan
status semua site.
**Prasyarat:** Fase 3 (agregasi yang sama).

### Backlog (hanya bila kelak diputuskan user)
Alarm management → anomaly/ML display → notifikasi. Control/command: tetap
out-of-scope produk.

---

## 6. Rekomendasi Fitur "Signature" PDAM (sebagai view)

Tiga tampilan yang paling layak jadi materi jualan Helios — semuanya memakai
data yang **platform sudah kumpulkan hari ini** (telemetry per menit di
ClickHouse + `sensor_logs`; metadata `sensor_channels`/`sensor_types` dengan
kategori flow/pressure/level/energy/totalizer/pump_status; threshold per channel):

1. **DMA Night-Flow View (E-2).** Kurva MNF harian per zona vs baseline —
   kebocoran baru terlihat sebagai garis yang merangkak naik. Hanya butuh
   flowmeter inlet (produk DEVETEK sendiri) + query agregasi ClickHouse.
   *Pitch: "lihat zona mana yang bocor dari HP Anda, sebelum airnya muncul ke jalan."*
2. **Mass-Balance / NRW% Panel (E-3).** Σ inflow vs Σ outflow per zona → NRW%
   estimasi yang bergerak harian, bukan rekap tahunan. Angka yang direktur PDAM
   laporkan ke pemda, kini live di dashboard.
3. **Pump Specific Energy View (E-4).** Trend kWh/m³ per pompa + run-hours;
   pompa aus terlihat sebagai garis yang menanjak. *Pitch: "pompa #2 Anda 18%
   lebih boros dari tahun lalu — ini Rupiahnya."*

Ketiganya murni **tampilan di atas data existing** — konsisten dengan scope
web-based view-only — dan menjadikan DEVETEK bukan penjual "dashboard IoT",
melainkan solusi visibilitas NRW & efisiensi.

---

## 7. Referensi

Prinsip tampilan High-Performance HMI (ISA-101) — dipakai sebagai disiplin visual:
- https://plcprogramming.io/blog/hmi-design-best-practices-complete-guide
- https://www.realpars.com/blog/high-performance-hmi
- https://industrialmonitordirect.com/blogs/knowledgebase/high-performance-hmi-design-principles-for-industrial-control
- https://www.iotindustries.sk/en/blog/isa-101/

DMA / MNF / NRW / pressure management:
- https://iwaponline.com/ws/article/24/8/2781/103525/ (MNF & WB-EasyCalc case study)
- https://www.mdpi.com/2076-3417/12/13/6467 (MNF untuk deteksi kebocoran)
- https://www.lacroix-environment.com/telemetry-solutions/water-markets/water-distribution/district-metering-of-drinking-water-networks/
- https://aquaanalytics.com.au/resources/using-the-iwa-water-balance-to-understand-your-water-loss/
- https://en.wikipedia.org/wiki/Non-revenue_water
- https://www.pacificwater.org/_resources/article/files/IWA%20Standard%20Water%20Balance_Water%20Loss%20Task%20Force%20Article%202.pdf
- http://toolbox.calwep.org/wiki/Distribution_System_Pressure_Management

Pump station & energy monitoring:
- https://www.innorobix.com/scada-based-monitoring-for-pump-runtime-and-efficiency/
- https://tigernix.com.au/blog/how-to-monitor-pump-station-efficiency
- https://deq.utah.gov/drinking-water/technology-scada-efficiencies-energy-saving-investigation-process
- https://www.waterandwastewater.com/pump-station-scada-system/

Reservoir/tank level monitoring:
- https://www.scadalink.com/solutions/remote-water-level-monitoring-and-control-solutions/
- https://www.scadacore.com/applications/environmental-monitoring/water-level-monitoring/

Trending/historian (multi-pen, playback):
- https://www.vtscada.com/scada-trend-viewer/
- https://www.fernhillsoftware.com/help/getting-started/part-04-historian-and-trends.html
- https://www.dataparc.com/blog/historian-vs-scada-for-manufacturing-analytics/

Kualitas air (regulasi RI):
- https://hannainst.id/standar-ph-suhu-air-pdam-sni-permenkes-who/ (pH 6,5–8,5; Permenkes 492/2010 & 2/2023)
- https://hannainst.id/panduan-pemantauan-klorin-bebas-pdam-frekuensi-ambang-aman-protokol/ (sisa klor min 0,2 mg/L titik terjauh — Permenkes 736/2010)
- https://id.scribd.com/document/727916724/LAMPIRAN-PERMENKES-RI-NOMOR-2-TAHUN-2023

Alarm management (ISA-18.2 / EEMUA 191) — referensi untuk backlog §3.G saja:
- https://www.pteinc.com/scada-alarm-management-isa-18-2-best-practices/
- https://www.chemengonline.com/alarm-management-numbers/

> Catatan verifikasi: angka batas regulasi (khususnya kekeruhan di Permenkes
> 2/2023) WAJIB dicek ulang ke teks peraturan resmi sebelum dipakai sebagai
> default band tampilan di produk.
