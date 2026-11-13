# Review `/iot/telemetry-channels` (rebuild) dengan data live — 2026-11-13

Reviewer: Staff Engineer (review saja: tidak ada edit, tidak ada restart).
Cakupan: perubahan uncommitted di iot-angular (`telemetry-channels/**`, `shared/utils/channel-display.ts`,
helper sensors-page diganti, AuthGuard, label menu, SDK find-all/trends) + backend `4e291e7`.
Bukti: backend lokal `:3000` dengan JWT 5 menit (admin, tenant TEBO `4cabf383-cb99-47e2-9c6c-9ad4bbf543fd`,
tenant dengan owner kosong, tenant tanpa klaim `idOwner`). Logika halaman disimulasikan dengan util yang
dikompilasi dari TS asli (`tsc` → `/tmp/claude-501/tcrev/js`), dijalankan atas respons API live.

**Verdict: PERBAIKI DULU (kecil), lalu ship.** Tidak ada P0. Ada 2 P1 (reset owner tidak memuat ulang data,
berkas Panduan belum ada) — masing-masing perbaikan beberapa baris. Data, scoping, status, ambang, Excel, dan
pertukaran helper sensors-page sudah terbukti benar.

Build: `npx ng build --output-path=/tmp/claude-501/ngbuild-rev` → **exit 0**, tanpa warning; chunk
`pages-iot-telemetry-channels-telemetry-channels-module` 53,40 kB (13,02 kB transfer).

---

## 1. Peta request

| # | Endpoint | Param yang dikirim | Dibaca backend? | Jumlah panggilan | Catatan |
|---|---|---|---|---|---|
| 1 | `GET /api/owners` (hanya admin, tidak dipanggil di mode embedded) | `page=1&limit=100` (fetchAll) | ya | 1× saat init (27 owner → 1 halaman) | gagal → `ownersError` pada select, tidak diam-diam |
| 2 | `GET /api/sensors` | `activeOnly=true`, `ownerId` (admin), `idNode` (embedded), `page`, `limit=100` | ya: `sensor_controller.go:34,43`; tenant dipaksa ke owner-nya (`sensor_service.go:168`) | admin semua owner: **2** (139 sensor), tenant TEBO: 1. Diulang tiap 60 dtk (hanya saat tab terlihat dan tidak sedang loading) + tiap ganti owner | 0,24–0,42 dtk (hal. 1), 0,18–0,26 dtk (hal. 2) |
| 3 | `GET /api/sensors/trends` | `hours=24`, `idProject` (bila dipilih), `ownerId` (admin) | ya: `sensor_controller.go:124-127`; tenant dipaksa (`sensor_trends.go:101-104`) | 1× saat init, tiap 5 mnt, dan hanya bila scope `owner|project` berubah (guard `trendsScope`) | 0,16 dtk untuk 238 kanal. Batas 1500 → 400 |
| 4 | `GET assets/guides/telemetry-channels.md` | – | – | saat Panduan dibuka | **berkasnya tidak ada** (F2) |

Tidak ada N+1: satu list (dipaginasi 100) + satu trends untuk semua kanal. Tidak ada request ganda saat init
(`loadData()` + `loadTrends(true)` masing-masing sekali; `onFilterChange()` di dalam `onOwnerChange()` memanggil
`loadTrends()` lagi tetapi keluar lebih awal karena scope sudah sama).

### Hasil API live (13 Nov 2026 ±22:55 WIB)

| Pemanggil | List `activeOnly` | Kanal | Trends | Catatan |
|---|---|---|---|---|
| admin, semua owner | 139 sensor (`meta.total`), 2 halaman | **238** (unik 238; tanpa `activeOnly`: 140 sensor / 241 kanal → 1 sensor nonaktif, 3 kanal, dikecualikan dengan benar) | 238 baris, id **identik** dengan list (0 selisih di kedua arah) | 17 project, 15 owner punya kanal |
| admin `ownerId=TEBO` | 12 sensor / 12 kanal | 12 | 12 | |
| tenant TEBO | 12 / 12, semua `idOwner` = TEBO | 12 | 12 | |
| tenant TEBO + `ownerId=<owner lain>` | tetap 12 kanal TEBO | – | tetap 12 | spoofing diabaikan ✔ |
| tenant `idOwner:""` | **403** "Akun tenant tanpa owner tidak boleh mengakses data sensor" | – | **403** | |
| tenant tanpa klaim `idOwner` | **403** | – | – | |
| admin `ownerId=abc` | **500** "Failed to fetch sensors" | – | 400 "ownerId harus berupa UUID" | F7 |

### Angka halaman hasil simulasi (logika `derive()`/`computeCounts()` asli atas data live)

| Scope | Semua | Fresh | Stale | Offline | No Data | Di luar ambang | Mati (off+nodata) | Bermasalah | Punya ambang | Project terdampak / terbanyak |
|---|---|---|---|---|---|---|---|---|---|---|
| Admin, semua owner | 238 | 29 | 0 | 80 | 129 | 5 | 209 | 214 (= 238−29+5 ✔) | 151 | 16 / "Way Rilau" 40 |
| Tenant TEBO | 12 | 11 | 0 | 0 | 1 | 2 | 1 | 3 (= 12−11+2 ✔) | 7 | 1 / "Cabang Tebo" 3 |

- Persamaan `problem = all − fresh + outofrange` dan `dead = offline + nodata` berlaku di kedua scope; KPI,
  tab, chip, dan total paginasi diambil dari array `scoped`/`filtered` yang sama → konsisten.
- 129 kanal "No Data": 0 di antaranya punya bucket tren 24 jam (bukan No Data palsu); 128 berada di node yang
  `lastSeenAt`-nya ada → baris menampilkan "node terlihat … lalu" (masalah pemetaan profil, bukan UI — lihat
  skill `node-profile-repair`).
- `lastValueAt` vs `stats.lastBucketAt` tren: 0 ketidakcocokan; umur terkecil 2,5 mnt, tidak ada umur negatif
  (tidak ada kuirk UTC/WIB pada nilai terakhir).
- Kanal dengan ≥ 2 titik tren = 29 = jumlah Fresh (konsisten).

---

## 2. Temuan

### [P0] Tidak ada.

### F1 [P1] · `telemetry-channels-list.ts:525` dan `:535-541` · Menghapus filter Owner (chip ×, "Reset filter") tidak memuat ulang list — data owner lama tampil sebagai "Semua owner" sampai 60 dtk

- **Bug:** filter owner sekarang berjalan di server (`loadData()` mengirim `ownerId`), tetapi
  `clearFilter('owner')` dan `resetFilters()` hanya mengosongkan `ownerId` lalu memanggil `rebuildOptions()` +
  `onFilterChange()`. Tidak ada `loadData()`.
  ```ts
  case 'owner': this.ownerId = ''; this.rebuildOptions(); break;   // :525
  resetFilters(): void { this.ownerId = this.projectId = ... = ''; ...; this.rebuildOptions(); this.onFilterChange(); } // :535
  ```
  `onFilterChange()` → `loadTrends()` memang memuat tren semua owner (scope berubah), tetapi `rows` tetap hanya
  berisi owner sebelumnya.
- **Dampak:** admin memilih TEBO (12 kanal), lalu klik × pada chip Owner atau "Reset filter" (juga tombol
  "Reset filter" di empty state): select menunjukkan "Semua owner", chip hilang, header tetap "12 kanal · 1 project",
  KPI "Mengirim data 11 / 12" — padahal seharusnya 29 / 238. Bertahan sampai tick auto-refresh (≤ 60 dtk;
  lebih lama bila tab sedang tersembunyi). Persis kelas bug "filter diam-diam tidak jalan".
- **Perbaikan:**
  ```ts
  case 'owner': this.onOwnerChange(''); return;          // reset project + loadData + loadTrends + onFilterChange
  ...
  resetFilters(): void {
    const ownerChanged = !!this.ownerId;
    this.ownerId = this.projectId = this.groupName = this.category = this.searchText = '';
    this.statusFilter = 'all';
    clearTimeout(this.searchDebounce);
    if (ownerChanged) this.loadData();                    // server-side owner scope
    this.rebuildOptions();
    this.onFilterChange();
  }
  ```

### F2 [P1] · `telemetry-channels-routing.module.ts:7` · Route memakai `data.guide: 'telemetry-channels'` tetapi `src/assets/guides/telemetry-channels.md` tidak ada

- **Bukti:** `ls src/assets/guides/` → hanya `project-overview.md`, `project-sensors.md`, `sensor-channel-detail.md`;
  `git status` tidak menunjukkan berkas baru di `src/assets`.
- **Dampak:** tombol Panduan muncul (`<page-guide-button>` di `html:16`), drawer menampilkan "Panduan untuk halaman
  ini belum tersedia." Jujur, tetapi melanggar aturan skill `page-guide` ("perubahan halaman belum selesai sampai
  panduannya cocok") dan audit 03 F11 / audit 01 "Panduan perlu". Perlu verifikasi: bila server produksi
  memakai fallback SPA (`try_files … /index.html`), request `.md` yang hilang bisa mengembalikan `index.html`
  dengan 200 dan drawer akan merender HTML aplikasi alih-alih pesan "belum tersedia".
- **Perbaikan:** jalankan `guide-writer` untuk key `telemetry-channels` dengan sources = list ts/html,
  `telemetry-freshness.ts`, `threshold.ts`, `channel-display.ts`, dan isi "Panduan perlu" dari 01-pdam-operator.md
  (batas Fresh/Stale/Offline/No Data relatif interval node, arti "Data terakhir … lalu" ≠ durasi mati, ambang hanya
  dihitung saat Fresh, tren 24 jam per jam, cakupan owner admin/tenant, auto-refresh 60 dtk, isi Excel).

### F3 [P2] · `telemetry-channels-list.ts:238-243` · Tenant tanpa owner (403) mendapat pesan generik; polling 403 tiap 60 dtk tanpa henti

- **Bukti:** API mengembalikan `403 {"message":"Akun tenant tanpa owner tidak boleh mengakses data sensor"}` untuk
  list dan trends. Handler: `this.error = 'Gagal memuat kanal telemetri.'` (pesan server dibuang); trends 403 →
  `'Tren 24 jam gagal dimuat.'` muncul di header bersama "0 kanal · 0 project" (`html:10-12`).
- **Dampak:** halaman **tidak** menampilkan empty state "Belum ada kanal" palsu (card disembunyikan oleh
  `*ngIf="!error"`, `html:107`) — jadi lulus syarat kejujuran dasar. Tetapi pengguna tidak tahu bahwa ini masalah
  akun (bukan jaringan), tombol "Coba lagi" tidak akan pernah berhasil, header menulis "0 kanal · 0 project", dan
  timer terus mengirim request yang pasti 403.
- **Perbaikan:**
  ```ts
  error: (err) => {
    const msg = parseBody(err?.error)?.message;
    if (err?.status === 403) {
      this.error = `${msg || 'Akun ini tidak punya akses data sensor.'} Hubungi admin untuk menautkan akun ke owner.`;
      clearInterval(this.refreshTimer); clearInterval(this.trendsTimer);
      this.trendsError = null;   // satu pesan saja
    } else if (!silent || !this.rows.length) { this.error = 'Gagal memuat kanal telemetri.'; }
    this.loading = false;
  }
  ```
  dan di `html:9-13` sembunyikan "N kanal · N project" bila `error || !lastRefreshedAt`.

### F4 [P2] · `telemetry-channels-list.ts:721,733-735` · Excel mengosongkan kolom Min/Maks/Rata-rata 24 jam tanpa keterangan saat tren gagal / belum termuat

- **Bug:** `st = this.trendsByChannel.get(...)?.stats` → `null` bila trends 400 (batas 1500), 503 (ClickHouse),
  atau masih memuat setelah ganti owner. Sheet terlihat seperti "tidak ada data 24 jam" untuk kanal yang
  sebenarnya punya data.
- **Dampak:** laporan ekspor bisa dibaca sebagai kanal tanpa data 24 jam (kelas bug "error ditelan").
- **Perbaikan:** bila `this.trendsError` ada, tulis baris catatan di atas header (`ws.spliceRows`/sheet kedua
  "Catatan": `Tren 24 jam tidak tersedia: ${this.trendsError}`) atau beri judul kolom
  `Min 24 jam (tidak tersedia)`; alternatifnya pakai `exportError`-style warning sebelum `saveAs`.

### F5 [P2] · `telemetry-channels-list.ts:186-191` · Kembali ke tab setelah lama tersembunyi: status/umur beku sampai tick berikutnya

- **Bug:** timer melewati refresh saat `document.visibilityState !== 'visible'`; tidak ada listener
  `visibilitychange`. Semua status dihitung dengan `nowMs` saat load terakhir.
- **Dampak:** monitor pagi: tab dibuka lagi setelah 8 jam → hingga 60 dtk badge "Fresh"/"4 mnt lalu" berasal dari
  8 jam lalu. Ada label "diperbarui HH:mm:ss" (jujur), tetapi mudah terlewat.
- **Perbaikan:** tambah `@HostListener('document:visibilitychange')` → bila visible dan
  `Date.now() - lastRefreshedAt > refreshIntervalMs` panggil `loadData(true)` (dan `loadTrends(true)` bila
  > 5 mnt). Bersihkan otomatis oleh Angular.

### F6 [P3] · minor

1. `html:109-117` — saat ganti owner (loading), tab status langsung menghitung ulang dari `rows` lama yang
   difilter ke owner baru (sering 0) sementara tabel menampilkan spinner. Sembunyikan badge hitungan saat
   `loading`.
2. `html:107` — error non-silent menyembunyikan seluruh card termasuk select Owner; admin yang memilih owner yang
   gagal dimuat hanya bisa "Coba lagi" untuk owner yang sama (harus reload halaman untuk kembali ke semua owner).
   Pindahkan alert ke dalam card di bawah baris filter, atau tampilkan tombol "Semua owner" di alert.
3. `ts:226` / `fetch-all.ts` — `latestAvailable` hanya dibaca dari halaman 1; bila ClickHouse jatuh di antara
   halaman 1 dan 2, halaman 2 tampil "No Data" tanpa banner. Kumpulkan `latestAvailable` dari semua halaman
   (`fetchAll` → callback per halaman, AND-kan hasilnya).
4. `ts:403` — `rebuildOptions()` bisa mengosongkan `projectId` (project hilang dari data saat refresh) tanpa
   `loadTrends()`; tren tetap scope project lama sampai tick 5 mnt. Panggil `this.loadTrends()` setelah
   `rebuildOptions()` di `loadData`.
5. Backend `sensor_service.go:572` — `COALESCE(n.telemetry_interval_sec, 300)`: node tanpa interval
   ditampilkan "tiap 5 mnt" dan tooltip "interval 300 dtk" seolah dikonfigurasi (saat ini 0 node null, jadi
   laten). Sama di sensors-page.
6. Backend `sensor_controller.go:34` / `sensor_service.go:628` — `ownerId` bukan UUID → 500 (log:
   `invalid input syntax for type uuid`). UI hanya mengirim UUID dari `/api/owners`, jadi laten; samakan dengan
   trends (400 "ownerId harus berupa UUID").
7. `ts:723` — kolom Owner Excel kosong bila `/api/owners` gagal; fallback `this.ownerLabel(r.idOwner) || r.idOwner`.
8. `html:53,62,71,84,93,248` — kartu KPI dan baris tabel hanya bisa diklik mouse (tanpa `tabindex`/`keydown.enter`/
   `role="button"`); header kolom sudah aksesibel.
9. Teks waktu relatif berbeda bahasa antar halaman: list ini `timeAgoId` ("4 mnt lalu"), sensors-page `timeAgo`
   ("4m ago"). Bukan regresi, tetapi inkonsistensi untuk operator.
10. `decimalsFromPrecision(0)` → 2 desimal (data live punya `precision: 0` dan `1`); arti 0 = bilangan bulat
    ambigu. Helper bersama, sudah ada sebelumnya — catat saja.

---

## 3. Terverifikasi BENAR (jangan diperbaiki ulang)

- **Jumlah baris = kanal sensor aktif:** 238 (API live), 1 sensor nonaktif (3 kanal) dikecualikan via
  `activeOnly=true`; `fetchAll` memuat kedua halaman (139 sensor), tidak terpotong limit default 20.
  `ORDER BY s.created_at DESC, s.id_sensor` stabil antar halaman. 2 sensor tanpa kanal wajar tidak tampil.
- **Freshness per kanal:** `getFreshness(ch.lastValueAt, node.telemetryIntervalSec, nowMs)` (`ts:337`), satu
  `nowMs` per load untuk badge, KPI, "x lalu", dan teks mati. Interval live: 30/60/120/180/300 dtk.
- **Di luar ambang hanya saat Fresh:** `isOut = (below|above) && fresh` (`ts:341`); offline/no data → `novalue`
  (tidak ada vonis); stale yang melewati ambang ditandai kuning "· data terlambat" dan tidak dihitung. Excel memakai
  `excelThresholdLabel(tstate, isOut)` yang sama.
- **Konsistensi hitungan:** tab, KPI (termasuk "Project terdampak" = jumlah project dengan ≥ 1 kanal bermasalah,
  "Bermasalah" = stale + offline + nodata + di luar ambang), chip, dan paginasi semuanya dari `scoped`/`filtered`;
  terbukti dengan persamaan di §1.
- **Owner filter admin server-side + tidak ada race:** `onOwnerChange` mengosongkan project, `loadData()`
  (unsubscribe request sebelumnya, termasuk refresh silent yang sedang berjalan), `loadTrends()` (scope berubah →
  unsubscribe + request baru); panggilan `loadTrends()` kedua dari `onFilterChange()` keluar lebih awal. Respons
  lama dibatalkan, bukan ditimpa. Tren lama disimpan dalam map berkunci `idSensorChannel`; owner tidak berbagi
  kanal, sehingga tidak pernah ada sparkline/min-maks owner lain yang tampil di baris owner baru (paling buruk
  kosong sampai tren baru tiba). Timer refresh dilewati selama `loading`.
- **Tenant:** select Owner tersembunyi (`isAdmin && !embedded`), backend memaksa owner sendiri untuk list dan
  trends, `ownerId` spoof diabaikan (terbukti), dan tidak dikirim ke trends untuk tenant.
- **Tenant owner kosong:** backend 403 di list dan trends (juga token tanpa klaim `idOwner`); halaman menampilkan
  alert error, bukan "Belum ada kanal" (hanya pesannya generik → F3).
- **Pesan batas 400 trends:** `ts:286-287` membaca `message` server (SDK `responseType:'text'` → `parseBody`) →
  "Tren 24 jam tidak dimuat: Terlalu banyak channel (> 1500) … pilih owner atau project"; tren terakhir yang baik
  dipertahankan. 503 → "Tren 24 jam tidak tersedia (server data)". Batas saat ini tidak tercapai (238 kanal, 0,16 dtk).
- **`latestAvailable=false`:** banner kuning, KPI disembunyikan, `deadText` = "Nilai terakhir tidak tersedia",
  ekspor Excel dinonaktifkan (`canExport`). Backend mengembalikan `false` saat ClickHouse mati/gagal
  (`fetchLatestValues`), bukan sukses kosong.
- **Link:** `openChannel` → `/iot/projects/:p/node/:n/sensor/:sensorId?channel=<idSensorChannel>` (route ada di
  `projects-routing.module.ts:32`, `sensor-chanel-detail.ts:213,254` membaca `channel`); link node →
  `/iot/projects/:p/node/:n`. Sama dengan sensors-page. Semua node live punya project (cabang `/iot/nodes/...`
  praktis mati karena list memakai `JOIN projects`).
- **Excel:** 21 kolom (+Owner untuk admin = 22), filter + urutan aktif semua halaman, header beku + autofilter;
  angka tetap numerik (nilai mentah di sel, `numFmt` sesuai presisi kanal untuk Nilai/Min/Maks/Rata-rata);
  waktu `toExcelLocal` + header `Data Terakhir (WIB)` + `dd-mm-yyyy hh:mm:ss`; null tetap sel kosong (bukan 0 /
  "null"); rata-rata 24 jam backend berbobot jumlah sampel (`sensor_trends.go`).
- **Locale:** tampilan angka lewat `formatNumber(…, LOCALE_ID='id-ID')` dan pipe `number`; satu-satunya `toFixed`
  ada di koordinat path SVG (string mesin).
- **Performa:** turunan dihitung sekali per load (`derive`) dan sekali per perubahan filter (`applyFilters`), tidak
  di getter; template hanya membaca field siap pakai (+ `timeAgo`/`badgeClass` murah untuk ≤ 100 baris halaman);
  `trackBy` per kanal. 238 baris + refresh 60 dtk tidak masalah.
- **Cleanup:** `ngOnDestroy` membersihkan 2 interval, debounce, dan 3 subscription.
- **Tidak ada data palsu:** tidak ada `Math.random`/dummy; jam tanpa data = putus garis (bukan 0).
- **Regresi sensors-page dari pertukaran helper: tidak ada.** 299 perbandingan old (dari `git show HEAD`) vs new
  — `formatInterval` (22 input termasuk null/negatif/string/NaN/desimal), `formatDuration` (12 input termasuk
  negatif/NaN/batas 60 mnt/48 jam/60 hari), `localTzLabel` (TZ WIB, WITA, UTC, Asia/Kolkata), `telHref` (7 input),
  `sparkPath` (250 kanal tren live + 7 kasus sintetis) → **0 selisih byte**. Satu-satunya perbedaan perilaku:
  versi baru tahan `buckets` undefined (`(buckets || [])`), versi lama akan melempar — lebih aman.
- **Backend `requireTenantOwner`** dipanggil di List, Statistics, detail, akses node, Trends.

---

## 4. Rencana perbaikan berurutan

1. **Frontend (wajib sebelum ship, paralel satu sama lain):**
   - F1 — `clearFilter('owner')` → `onOwnerChange('')`; `resetFilters()` memanggil `loadData()` bila owner berubah.
   - F2 — tulis `src/assets/guides/telemetry-channels.md` (agent `guide-writer`), cek tiap klaim terhadap kode.
2. **Frontend (P2, boleh rilis berikutnya, paralel):** F3 (403 jujur + stop polling + header), F4 (catatan tren di
   Excel), F5 (refresh saat tab terlihat lagi).
3. **Backend (P3, paralel dengan langkah 2):** F6.6 validasi UUID `ownerId` di `SensorController.Index` → 400;
   F6.5 kirim `telemetryIntervalSec: null` bila belum diatur (lalu cek sensors-page juga).
4. **SDK:** tidak perlu perubahan (parameter `activeOnly`/`ownerId`/`idProject?` sudah cocok dengan controller).
5. **Frontend P3 sisanya** (F6.1–F6.4, F6.7–F6.9) kapan saja.

Verifikasi ulang setelah F1: admin pilih TEBO → klik × chip Owner → header harus kembali "238 kanal · 17 project"
dan Network menunjukkan `GET /api/sensors?activeOnly=true&page=1&limit=100` tanpa `ownerId`.
