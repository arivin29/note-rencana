# Review rework mobile, 14 Nov 2026

**Verdict: perbaiki dulu (kecil), lalu rilis.** Tidak ada P0 di kode mobile. Ada satu P1 yang terlihat di layar: di HP baru, auto-reload diam-diam "Mati", sehingga status perangkat berubah jadi Terlambat lalu Offline padahal alat tetap mengirim. Perbaikannya satu baris. P2 bisa ikut dikerjakan di PR yang sama atau menyusul.

Lingkup review: diff yang belum di-commit di `src/app/mobile/**`, ditambah `services/auth.service.ts`, `services/root-redirect.guard.ts`, `shared/utils/channel-verdict.ts` dan `components/header/header.component.ts`. Yang **tidak** direview: `projects/tabs/project-map/**`, baris `WebgisSharedModule`, dan aturan peta di `mobile.scss` (milik sesi scada).

## Cara verifikasi
- **Membaca kode**: route → komponen → SDK `fn/` → controller Go (`node_controller.go:37-39`, `sensor_controller.go:39-43,124`, `alert_event_controller.go:28-43`) → repo/service.
- **API live (:3000)** dengan JWT 5 menit:
  - tenant TIRTAMERANGIN (`73e28ea4…`, 1 project)
  - tenant AquaFarm (`8d33efa8…`, **3 project**)
  - admin
- **Runtime**: `ng serve` (mode dev, :4200) + puppeteer headless dengan viewport 390×844. Dikunjungi 20 layar/aksi dari ketiga akun, termasuk klik tab, baris channel, tombol back, dan kartu SCADA. Tidak ada `NG0100` dan tidak ada galat konsol, kecuali 403 SCADA admin (lihat T10) dan 403 project asing (lihat T6, disengaja).
- **Build**: `npx ng build --output-path=/tmp/claude-501/ngbuild-mrev` → sukses (exit 0), tanpa galat atau peringatan baru.

## 1. Peta request (hasil runtime, hitungan per kunjungan)

| Layar | Endpoint × param | Panggilan | Catatan |
|---|---|---|---|
| `/mobile` (landing guard) | `/projects?page=1&limit=100` | 1 | di-cache `MobileScopeService`; daftar project tidak me-request ulang |
| Shell `/p/:pid/*` (store) | `/nodes?idProject&page&limit=100` · `/sensors?idProject&activeOnly=true&page&limit=100` · `/alert-events?status=open&idProject&page=1&limit=20` | masing-masing 1 per siklus | dibagi Ringkasan/Perangkat/Channel/detail; pindah tab = 0 request |
| Ringkasan | `/scada/diagrams?projectId` | 1 | admin → 403 (T10) |
| Channel / Nilai perangkat | `/sensors/trends?idProject&hours=24` | 1 (lalu tiap 5 mnt) | satu request untuk semua sparkline |
| **Peringatan (dalam project)** | `/alert-events?status=open&idProject&limit=20` | **2** | store + tab memanggil request yang sama (T4) |
| Detail perangkat | – (dari store) | 0 | Perintah: `/node-model-commands/by-node-model/:id` 1×; Log: `/iot-logs?deviceId&limit=20` 1× |
| Detail channel | `/sensor-channels/:id/readings?startTime&endTime` | 1 (dipoll hanya untuk rentang 1 jam) | 24 jam/7 hari dimuat sekali |
| `/mobile/nodes/:id` (lama) | `/nodes/:id` | 1 | lalu redirect `replaceUrl` ke `/p/:pid/nodes/:nid/nilai` |
| `/mobile/alerts` (>1 project) | `/alert-events?status=open&page=1&limit=20` | 1 | lintas project, di-scope owner oleh backend |
| Deep-link ke project | `/projects?limit=100` (judul) | 1 | `/projects/:id` hanya bila pid tidak ada di cache |

Semua parameter dibaca backend: `idProject` (nodes, sensors, trends, alert-events), `activeOnly`, `status`, `page`, `limit`. Tidak ada lagi query-param yang tidak cocok.

## 2. Temuan

### T1 [P1] · `src/app/services/auto-refresh.service.ts:71-75`: di HP baru, auto-reload default "Mati", sehingga status palsu menua jadi Terlambat/Offline
- **Bukti**:
  - Kodenya: `const v = Number(localStorage.getItem(this.KEY));` Bila key belum ada, `Number(null) === 0`. Nilai `0` ada di daftar yang diizinkan, jadi hasilnya `0` (Mati), bukan "default 30s" seperti tertulis di komentar.
  - Runtime di profil puppeteer yang baru: Profil menampilkan "Muat ulang otomatis **Mati**".
  - Teks di sheet Profil (`mobile-profile.component.html:41`) menjanjikan "memuat ulang tiap 60 detik".
- **Dampak**:
  - `mobilePoll$` hanya memuat sekali.
  - Tiap 30 dtk komponen menghitung ulang `getFreshness(lastSeenAt lama, now)`. Setelah ±10 mnt semua perangkat jadi "Terlambat", setelah 60 mnt jadi "Offline", dan "Perlu perhatian" penuh perangkat "mati". Padahal datanya ada di server.
  - Ini data salah yang tampil sebagai fakta, dan berlaku untuk semua operator di HP baru.
- **Perbaikan**:
  ```ts
  const raw = localStorage.getItem(this.KEY);
  if (raw === null) return 60000;          // atau 30000 untuk desktop, lihat T12
  const v = Number(raw);
  ```
  Opsional tapi disarankan: saat `interval === 0`, beri label "Diperbarui 09.33 · auto-reload mati" di Ringkasan. Bisa juga jangan menuakan freshness melewati `updatedAt + 60 dtk`.

### T2 [P2] · `shared/mobile-project-store.service.ts:150`, `alerts/mobile-alerts/mobile-alerts.component.ts:107`: peringatan `acknowledged` hilang dari mobile
- **Bukti**:
  - Backend hanya memfilter satu status (`alert_event_repository.go:30`, `alert_event_service.go:531`: `e.status = ?`).
  - Mobile hanya meminta `open` (Aktif) dan `cleared` (Riwayat). Data live: admin `status=acknowledged` total **1**, dan alert itu tidak muncul di tab mana pun.
  - Desktop overview menghitung open + acknowledged (`overview-page.component.ts:329-336`).
- **Dampak**: badge nav "Peringatan", KPI "Peringatan aktif" dan "Perlu perhatian" lebih kecil dari angka desktop. Alert yang sudah di-ack tapi belum selesai tidak bisa ditemukan di HP.
- **Perbaikan**:
  - **Backend (disarankan)**: terima `status=open,acknowledged` (split koma → `e.status IN (?)`) di `alert_event_service.go:531` dan repo `:30`.
  - **Frontend (tanpa backend)**: `forkJoin` dua request (`open` dan `acknowledged`, `limit=20`), gabungkan, jumlahkan `total`. Tandai baris acknowledged dengan pill "Diakui".

### T3 [P2] · `projects/tabs/project-summary/project-summary.component.ts:199-200`: "Semua perangkat aktif" untuk project 0 perangkat atau project tanpa akses
- **Bukti (runtime)**:
  - Tenant AquaFarm membuka project sendiri "ABC" (0 node) → "Semua perangkat aktif, tidak ada peringatan aktif."
  - Membuka pid project lain (`/mobile/p/3f7f0f09…/ringkasan`) → backend benar mengembalikan list kosong dan `/projects/:id` 403. UI tetap menampilkan judul "Project" dan teks "Semua perangkat aktif".
- **Dampak**:
  - Kepastian palsu di project kosong.
  - Tautan lama/bookmark ke project yang sudah dipindah owner tampil sebagai "aman", padahal seharusnya "tidak punya akses".
- **Perbaikan**:
  - `allClear` wajib `this.total > 0`. Untuk `total === 0` tampilkan "Belum ada perangkat di project ini".
  - Di `MobileProjectShellComponent.loadNameDirect` (`mobile-project-shell.component.ts:109-117`): bila 403/404, set flag `notFound` (lewat store atau field shell) dan render layar "Project tidak ditemukan atau Anda tidak punya akses" + tombol ke `/mobile`, ganti `<router-outlet>`.

### T4 [P2] · `alerts/mobile-alerts/mobile-alerts.component.ts:62-69,74` (dalam project): request peringatan ganda + pull menjalankan dua handler
- **Bukti**: runtime tab Peringatan memanggil `/alert-events?page=1&limit=20&status=open&idProject=3f7f0f09` **2×** per siklus, satu dari store dan satu dari tab. Pull memicu `store.refresh()` (shell) sekaligus `reload()` (tab).
- **Dampak**: request dobel tiap 60 dtk. Daftar tab dan badge bisa berbeda sesaat.
- **Perbaikan**: bila `inProject && filter === 'active' && page === 1`, pakai `store.state.alerts` (`list`, `total`) dan jangan poll sendiri. Fetch sendiri hanya untuk Riwayat dan "Muat lagi". Daftarkan `refreshBus` hanya bila `!inProject`.

### T5 [P2] · `src/app/services/auth.service.ts:206-208`: refresh token gagal di mobile melempar ke login desktop
- **Bukti**: `catchError(... this.clearSession(); this.router.navigate(['/auth/login']) ...)`. Logika `fromMobile` baru hanya ada di `logout()` (`:133-140`). Jalur ini dipicu `jwt.interceptor.ts:80` saat sesi 60 hari habis.
- **Dampak**: operator di HP mendarat di login desktop (gelombang 0.5 baru selesai sebagian).
- **Perbaikan**: `this.router.navigate([this.router.url.startsWith('/mobile') ? '/mobile/login' : '/auth/login'])`. Lebih rapi lagi: ekstrak `loginUrl()` dan pakai di tiga tempat (auth.guard, logout, refresh).

### T6 [P2] · `shared/mobile-guards.ts:20-28,41-46`: admin melihat layar kosong 5–6 dtk saat landing dan saat membuka `/mobile/alerts`
- **Bukti**:
  - `curl` `/projects?limit=100` untuk admin butuh **5,38 dtk dan 6,49 dtk**; untuk tenant 0,29 dtk. Penyebabnya N+1 di backend, 6 kueri per project (`project_service.go:58-95`, audit 03 F13).
  - Runtime admin setelah 2,5 dtk: URL masih `/mobile`, tanpa AppBar, tanpa nav, teks kosong. Guard menahan seluruh navigasi termasuk shell layout.
- **Dampak**: admin/demo internal mengira aplikasi macet. Tenant PDAM tidak terdampak, karena owner dengan 1–3 project butuh < 0,3 dtk.
- **Perbaikan**:
  - **Backend**: satukan statistik `/projects` ke satu kueri agregat (GROUP BY id_project).
  - **Frontend**: tampilkan indikator navigasi di `AppComponent`/`index.html` selama `NavigationStart→End`. Alternatifnya, ganti guard landing menjadi `MobileHomeComponent` yang langsung merender skeleton lalu `navigateByUrl(..., { replaceUrl: true })`.

### T7 [P2] · `shared/mobile-scope.service.ts:85`: `lastSync` "0001-01-01" tampil "Data terakhir 739933 hari lalu"
- **Bukti**: tenant AquaFarm, project "ABC" → `lastSync: '0001-01-01T00:00:00Z'` (zero time dari Go). Runtime menampilkan "Data terakhir 739933 hari lalu".
- **Perbaikan**:
  - **Frontend**: `lastSync: p.lastSync && !String(p.lastSync).startsWith('0001-') ? p.lastSync : null`.
  - **Backend**: kirim `null` bila `MAX(last_seen_at)` NULL (scan error yang sama sudah tercatat di log goravel).

### T8 [P3] · `project-summary.component.ts:74`, `mobile-nodes-list.component.ts:49`, `mobile-node-detail.component.ts:35`: `pid` dibaca sekali
- **Masalah**: bila router memakai ulang shell untuk pid lain (deep-link `/mobile/p/B/ringkasan` saat sedang di `/mobile/p/A/ringkasan`), KPI/tautan/SCADA masih menunjuk ke A.
- **Perbaikan**: di `build(s)` pakai `this.pid = s.pid`, dan panggil ulang `loadScada()` bila pid berubah.

### T9 [P3] · `nodes/mobile-channel-detail/mobile-channel-detail.component.ts:107`: data rentang lama tampil di bawah chip rentang baru saat galat
- **Masalah**: pindah dari 1 jam ke 7 hari lalu gagal → kondisi `this.rows.length && range === this.range` bernilai benar. Baris dan grafik 1 jam tetap tampil dengan chip "7 hari" dan banner "Gagal…".
- **Perbaikan**: simpan `loadedRange`. Data lama hanya dipertahankan bila `loadedRange === range`; selain itu set `error`.

### T10 [P3] · `project-summary.component.ts:85`: kartu SCADA admin selalu "Akses ditolak"
- **Bukti**: `/scada/diagrams?projectId=46d24450…` dengan token admin → 403 `"ownerId is required for admin requests"`.
- **Perbaikan**:
  - **Frontend**: `getDiagramsByProject(pid, ownerId?)`. Untuk admin kirim `idOwner` project, yang tersedia di `MobileProject` lewat `owner.idOwner`; tambahkan field `ownerId` di `toProject`.
  - **Backend**: alternatifnya, turunkan owner dari project.

### T11 [P3] · lain-lain
- `project-channels.component.ts:46-56`: `status` divalidasi terhadap `options` lama, sebelum `options` diganti `['all']` saat `latestAvailable=false`. Akibatnya `?status=out` menghasilkan daftar kosong tanpa chip aktif. Pindahkan penetapan `options` ke atas.
- `nodes/node-logs/mobile-node-logs.component.ts:58-63`:
  - `reload()` sebelum `code` siap: `load()` return tanpa `finish()`, sehingga spinner pull menunggu 10 dtk.
  - Dua reload beruntun menimpa `onDone`.
  - Perbaikan: `if (!this.code) { this.finish(); return; }` dan simpan antrean resolver.
- `shared/mobile-project-store.service.ts:157`: `filter(() => pid === this.pid)` bisa menelan emisi, sehingga promise `refresh()` baru selesai lewat timeout bus. Ganti dengan `map` yang tetap `done$.next()`.
- `mobile-profile.component.ts:47` `setInterval()` menulis key `devetek.refreshInterval` yang sama dengan desktop. Memilih "Mati" di HP juga mematikan auto-reload desktop di browser yang sama. Pakai key mobile sendiri, atau terima perilaku ini dan dokumentasikan.
- `mobile-profile.component.html:12,44`: baris yang bisa diketuk adalah `<div (click)>` tanpa `role="button"`/`tabindex`. Ganti dengan `<button class="m-list__item m-list__item--btn">`.
- `src/index.html:8` masih `maximum-scale=1.0, user-scalable=no` (gelombang 3: zoom diblokir).
- `/mobile/alerts` lintas project: baris tidak menyebut nama project. Tambahkan `node.project.name` bila tersedia.
- Presisi `null` → fallback 2 desimal ("Diameter 188,00 mm", "Volume 2.759,00 m3"). Sama dengan desktop (`decimalsFromPrecision` fallback 2), jadi ini data master: isi `precision` channel.
- Store tetap memuat 3 request/menit saat user di detail channel atau SCADA layar penuh (data tidak dipakai di sana). Boleh: jeda `pollSub` saat route aktif tidak memakai store.

## 3. Terverifikasi BENAR (jangan diperbaiki ulang)
- **NG0100**:
  - `[mPullEnabled]="pullEnabled"` diisi dari `refreshBus.handlers$` + `observeOn(asapScheduler)` (`mobile-layout.component.ts:88-89`). `title`/`sub` (dari `chrome.title$`) dan `showBack` (dari `scope.count$`) juga ditunda asap. `nav`/`onProfile` diisi pada `NavigationEnd` (di luar CD).
  - Pemindaian semua template mobile: tidak ada binding parent yang membaca state yang diubah anak dalam CD yang sama. `alertTotal` shell hanya berubah dari respons HTTP; `setProject` berjalan di `ngOnInit` milik shell sendiri.
  - Runtime mode dev di 20 layar/aksi: 0 NG0100.
- **Landing**:
  - 1 project → `/p/:pid/ringkasan` dengan `replaceUrl` (history tidak bertambah).
  - >1 → `/mobile/projects`, satu panggilan `/projects` yang dipakai ulang daftar project (runtime: 1 request).
  - 0 → layar kosong jujur dengan Muat ulang/Desktop/Keluar.
  - Galat → `projectsOrNull$` mengembalikan `null`, sehingga login tidak terblokir dan Home menampilkan galat + Coba lagi.
  - Cache dibuang saat `currentUser$` berganti (logout = `null`).
  - `devetek.activeProject` dihapus di `clearSession`.
  - Login memakai `replaceUrl`; logout dari mobile → `/mobile/login`.
- **Redirect tautan lama**: semua route lama punya padanan.
  - `/dashboard`, `/projects/:id[/detail|map|nodes|channels|scada]`, `/nodes` → 1 project ke Perangkat.
  - `/nodes/:id[/info|command|logs|channels/:cid]` lewat lookup `/nodes/:id` → `idProject`. Diuji live: `/mobile/nodes/ee3bc231…` → `/mobile/p/3f7f0f09…/nodes/ee3bc231…/nilai`.
  - `**` → `/mobile`.
  - `/mobile/alerts` dengan 1 project → tab Peringatan project.
- **Store per project**:
  - Satu set request per siklus dibagi semua tab (runtime: pindah tab = 0 request).
  - `switchMap` membatalkan request lama.
  - Poll 60 dtk lewat `AutoRefreshService.every` (berhenti saat `document.hidden`, langsung memuat saat kembali); tren 5 mnt.
  - `ngOnDestroy` dipanggil karena store ada di `providers` shell, jadi pembersihannya jalan saat keluar project.
  - Muat ulang yang gagal mempertahankan data lama + banner "Sebagian data gagal diperbarui · data per …".
- **Peringatan**: tidak ada lagi `status=triggered`. Aktif = `open`, Riwayat = `cleared`. `idProject` dikirim dan dibaca backend (`alert_event_controller.go:43`, `alert_event_service.go:555`). Total dibaca dari `total` (envelope alert-events). Galat tidak pernah tampil sebagai "aman".
- **Daftar project**: memakai `stats.online` (live: `{"nodes":2,"online":2}` → "2 online").
- **Status**:
  - Status channel = `getFreshness(lastValueAt, node.telemetryIntervalSec)` × `thresholdState`, dan di luar ambang hanya saat fresh (`channel-verdict.ts:32-37`). Kosakata Aktif/Terlambat/Offline/Belum ada data dipakai di semua layar.
  - `latestAvailable=false` → banner, nilai "—", chip hanya "Semua", KPI "—".
- **Label alamat dulu** di semua daftar, header, peringatan, Ringkasan dan judul AppBar (runtime: "MAN Tekanan" / sub "HELIO-354002393536022"; "MAN Debit & Tekanan · Debit"). `metricCode` hanya dipakai lewat `metricLabel()`. Kode selalu baris kedua.
- **Angka**: `mFormatNumber` (`formatNumber` + `LOCALE_ID` id-ID + `decimalsFromPrecision`). Runtime: "24,13 l/s", "2.759,00 m3". `toFixed` SVG dipertahankan (`mobile-channel-detail.component.ts:160-163`, `shared/util.ts:15-18`). Pipe `number` di flow diagram memakai locale id-ID.
- **Tanpa data palsu**: tidak ada `Math.random`, `generateDummy`, Uptime atau Baterai. "Sumber daya" hanya dari field master node.
- **Scoping tenant**:
  - Mobile tidak pernah mengirim `ownerId`.
  - Live: tenant + pid owner lain → `/nodes`, `/sensors`, `/sensors/trends` dan `/alert-events` kosong; `/projects/:id` 403; `/nodes/:id` 403; `/sensor-channels/:id/readings` 404.
  - (P0 backend `/iot-logs` dari audit 03 F2 masih terbuka. Tab Log mobile memakai `deviceId=code` dari store, tidak memalsukan apa pun.)
- **Back**:
  - `location.back()` hanya bila entri sebelumnya halaman `/mobile` di aplikasi (stack `NavigationEnd`). `lastSuccessfulNavigation` di-set sebelum `NavigationEnd`, terverifikasi di `@angular/router` `router2.mjs:4960-4961`. Selain itu naik ke `data.parent`.
  - Runtime: detail channel → back → tab Channel. Admin/multi: Ringkasan → back → daftar project. 1 project: Ringkasan tanpa tombol back.
  - Tab project dan segmen Nilai/Perintah/Log memakai `replaceUrl`.
- **Tap target/aria**:
  - Chip, tab, nav project, tombol telepon, banner, "Muat lagi" dan `m-btn--tap` ≥ 44 px (`mobile-ia.scss`).
  - Tombol ikon punya `aria-label`. `aria-current` ada di nav project. Status bar Ringkasan memakai `role="img"` + label.

## 4. Rencana perbaikan berurutan

1. **Frontend kecil, satu PR, bisa langsung**:
   - (a) T1 `auto-refresh.service.ts` default bila key belum ada.
   - (b) T3 `allClear` mensyaratkan `total > 0`, plus layar "project tidak ditemukan" di shell.
   - (c) T5 `loginUrl()` mobile-aware di `refreshToken`.
   - (d) T7 normalisasi `lastSync` zero-time.
   - (e) T4 tab Peringatan memakai store untuk Aktif halaman 1.
   - (f) T8/T9/T11 kecil.
   - Semuanya file berbeda dan bisa dikerjakan paralel.
2. **Backend, paralel dengan langkah 1**:
   - (a) `alert-events` menerima multi-status (T2).
   - (b) `/projects` agregat satu kueri dan `lastSync` null (T6/T7).
   - (c) `/scada/diagrams` untuk admin menurunkan owner dari project (T10).
   - (d) P0 `/iot-logs` scoping (audit 03 F2, masih menunggu keputusan owner).
3. **SDK**: tidak perlu regen. Bila backend 2(a) memakai param yang sama (`status`), SDK tetap cocok. Bila T10 diperbaiki di frontend, tambahkan `ownerId` manual di `ScadaService.getDiagramsByProject` (bukan SDK generated).
4. **Frontend lanjutan, setelah 2(a)**: Aktif = `open,acknowledged` + pill "Diakui" (T2).
5. **Gelombang 3**: zoom (`index.html:8`), `<button>` di Profil, nama project di peringatan lintas project, lalu uji ulang `pdam-operator` di HP fisik (safe-area, pull gesture).

Yang perlu verifikasi di perangkat fisik: gestur pull-to-refresh (tidak bisa disimulasikan di puppeteer tanpa touch-scroll nyata) dan safe-area iPhone.
