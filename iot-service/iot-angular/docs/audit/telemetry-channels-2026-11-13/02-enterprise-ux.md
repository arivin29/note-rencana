# Audit Enterprise UX: `/iot/telemetry-channels` (2026-11-13)

**Diaudit:** `src/app/pages/iot/telemetry-channels/telemetry-channels-list/{telemetry-channels-list.ts,.html,.scss}`, `telemetry-channels-routing.module.ts`, `telemetry-channels.module.ts`
**Standar acuan:** skill `ui-coding-style`, `ui-list`, `ui-card`, `page-guide`. Pembanding: tab Sensors di workspace project, `src/app/pages/iot/projects/project-workspace/pages/sensors-page/` (ditetapkan owner sebagai referensi) dan `nodes/nodes-list/`.
**Backend yang dicek:** `iot-backend-go/app/services/sensorchannel/sensor_channel_service.go` (`Overview`, `computeChannelStatus`), `app/http/controllers/sensorchannel/sensor_channel_controller.go:59`, `app/services/sensor/sensor_trends.go:68`.
**Cara audit:** hanya membaca kode. Tidak ada perubahan file dan tidak membuka browser.

---

## 1. Skor ringkas

| Dimensi | Skor | Alasan singkat |
|---|---|---|
| Konsistensi | **2/5** | Kerangka `ui-list` sudah dipakai (tab `nav-tabs-v2` + badge, `<card>`, pagination). Tapi status, label node, format angka, bahasa, loading/error, dan bentuk tabel berbeda dari tab Sensors. |
| Hierarki | **2/5** | Tidak ada KPI. Baris filter (6 dropdown) lebih menonjol daripada masalahnya. Nilai tidak menandai pelanggaran ambang, dan kolom Type/Links memakan lebar. |
| State | **2/5** | Error memakai `alert-warning` tanpa "Coba lagi", dan tabel + "No … match" tetap tampil di bawah error. Tidak ada refresh senyap, tidak ada "diperbarui HH:mm", tidak ada peringatan data terpotong. |
| Kejujuran data | **2/5** | Status dari backend tidak sama dengan aturan `telemetry-freshness.ts`, jadi kanal yang sama punya status berbeda di dua halaman. Data diam-diam dipotong di 2000 baris. Nilai default ditampilkan seolah sudah dikonfigurasi (`?? 1`, `?? 0`). Tidak ada `Math.random` atau data dummy. |
| Navigasi | **3/5** | Route tujuan memang ada. Tapi ikon project tidak tampil (`fa-diagram-3` bukan ikon FA6), link sensor tanpa `?channel=`, link membawa user keluar dari konteks workspace, dan breadcrumb mati. |

---

## 2. Temuan

Format: `[Prioritas] · file:line · masalah · standar yang dilanggar · perbaikan`.
Singkatan path: `ts` = `telemetry-channels-list.ts`, `html` = `telemetry-channels-list.html`, `routing` = `telemetry-channels-routing.module.ts`, `module` = `telemetry-channels.module.ts`.

### P0: data menyesatkan

**F1 [P0] · `ts:8,57,227-229,282-299` · `html:23,127` · backend `sensor_channel_service.go` `computeChannelStatus`**
Status baris diambil mentah dari `c.status` backend: `ok | out_of_range | stale | offline`. Semantiknya berbeda dari aturan bersama:
- Backend menyebut "stale" untuk data yang lebih tua dari max(3×interval, 10 mnt). Batas ini sama dengan batas *fresh* di `getFreshness`. Akibatnya data 3 jam lalu tampil "Stale" (kuning) di sini, sedangkan tab Sensors menampilkan "Offline" (merah).
- Backend menyebut "offline" kalau `node.connectivityStatus === 'offline'`, berapa pun umur datanya. Di sini badge-nya abu-abu (`bg-secondary-subtle`), sedangkan `FRESHNESS_BADGE.offline` merah.
- Kanal yang belum pernah kirim dilaporkan backend sebagai "stale", bukan "No Data".

Akibatnya operator PDAM melihat kanal yang sama dengan status berbeda di dua menu.
**Melanggar:** `ui-coding-style` → "Device/sensor status … `getFreshness` … Never local minute thresholds"; `ui-list` → "Status badges from `getFreshness()` + `FRESHNESS_BADGE`".
**Perbaikan:** turunkan status di frontend per kanal dengan `getFreshness(c.latest?.ts, c.node.telemetryIntervalSec, this.nowMs)`, lalu `FRESHNESS_BADGE` / `FRESHNESS_LABEL`, dan `[title]` dari `freshnessThresholds()` (salin `getStatusTitle` dari sensors-page). "Di luar ambang" dihitung dengan `thresholdState()` dari `shared/utils/threshold.ts` dan **hanya kalau kanal fresh**, mengikuti `isChannelOut()` di sensors-page `:436-439`. Abaikan `c.status`, atau samakan `computeChannelStatus` di Go dengan util ini (tiket backend). Sort status worst-first (`ts:227`) tetap, dengan urutan rank `offline, nodata, outofrange, stale, fresh`.

**F2 [P0] · `html:132` · `ts:205`**
Label node memakai `c.node.name || c.node.code`, padahal API sudah mengirim `node.address` (`toOverviewResponse` → `"address"`). Pencarian juga tidak mencakup alamat.
**Melanggar:** `ui-coding-style` → "Node label: primary = `node.address || node.code`; second line = `node.code` only when the address is shown".
**Perbaikan:** tambahkan `address` di interface `OverviewChannel.node` (`ts:21-26`). Template: `{{ c.node.address || c.node.code }}` + `<div class="text-muted small" *ngIf="c.node.address">{{ c.node.code }}</div>` + `.cell-mw text-truncate [title]`. Masukkan `address`, `project.name`, dan `picName` ke string pencarian `ts:205`.

### P1: standar rumah dilanggar dan kelihatan oleh user

**F3 [P1] · `ts:93` · backend `Overview` (`limit` dibatasi 2000, `"total": len(data)`)**
Halaman meminta `limit: 2000` dalam satu panggilan. Kalau kanal lebih dari 2000 (admin, semua owner), sisanya terpotong tanpa tanda. `total` yang dikirim backend sama dengan jumlah baris yang dikembalikan, jadi pemotongan tidak bisa dideteksi. Bentuk envelope `{data,total,limit}` juga menyalahi kontrak.
**Melanggar:** CLAUDE.md non-negotiable (list = `{ data, meta:{total,page,limit,totalPages} }`); `ui-coding-style` → "never rely on the default page size… `fetchAll`", "Counts come from `meta.total`".
**Perbaikan (backend):** tambahkan `COUNT(*)` dan kembalikan `meta`, lalu dukung `page`. **Frontend:** `fetchAll(p => this.channelsService.sensorChannelsControllerOverview$Response({ ...params, ...p }))`. Sampai backend siap: kalau `data.length >= limit`, tampilkan `alert alert-warning` berisi "Menampilkan 2.000 kanal pertama; persempit dengan filter Owner/Project."

**F4 [P1] · `ts:308-313` · `html:123,167-168,175`**
`formatValue` memakai `toFixed()`, jadi tampil "1.79". Tab Sensors menampilkan "1,79". Desimal juga ditebak dari besaran nilai (`>=100 → 1`, selain itu 3 desimal yang dipangkas), bukan dari `precision` kanal. Raw value (`html:168`) dan ambang (`ts:322-327`) dicetak mentah.
**Melanggar:** `ui-coding-style` → "Displaying numbers … id-ID … `toFixed()` always print a dot", "Decimals from `sensor_channels.precision` → `decimalsFromPrecision()`".
**Perbaikan:** `@Inject(LOCALE_ID)` + `formatNumber(v, locale, '1.d-d')` dengan `d = decimalsFromPrecision(c.precision)`, menyalin `fmt` / `formatValue` dari sensors-page `:405-417`. Backend `Overview` perlu menambahkan `sc.precision` di SELECT dan response, karena kolom ini ada di `models/sensorchannel/sensor_channel.go:19`.

**F5 [P1] · `html:83,86,204` · `ts:107`**
Error tampil sebagai `alert alert-warning` tanpa tombol "Coba lagi", berisi `err.message` mentah (Inggris/HTTP). Karena `*ngIf="!loading"` di tabel dan empty state tidak mengecek `error`, di bawah pesan error juga muncul "No telemetry channels match the filter.", yang tidak benar.
**Melanggar:** `ui-list` → "Error state: `alert alert-danger d-flex` + `Coba lagi` button", "Empty state distinguishes 'Belum ada data' vs 'Tidak ada … sesuai filter'".
**Perbaikan:** salin blok error sensors-page `html:95-99` (`alert-danger d-flex`, ikon, `btn-outline-danger ms-auto` "Coba lagi"). Bungkus card dengan `*ngIf="!error"`. Pesan: "Gagal memuat kanal telemetri." Empty state: `channels.length === 0 ? 'Belum ada kanal telemetri.' : 'Tidak ada kanal sesuai filter.'` + ikon `fa-wave-square fa-2x opacity-50`.

**F6 [P1] · `html:87` (`text-nowrap` + 8 kolom) · `html:31-75`**
Tabel `text-nowrap` dengan 8 kolom (expand, Channel, Type, Value, Status, Node, Last Reading, Links) di dalam `table-responsive` hampir pasti menggulir horizontal di ≤1440 px dan mobile. Nama alamat panjang memperparah.
**Melanggar:** brief owner ("no horizontal scroll"); pola sensors-page `.sensors-table` di `scss:23-43`.
**Perbaikan:** hapus `text-nowrap` dan pakai kelas `.channels-table` dengan aturan yang sama seperti `.sensors-table` (teks boleh wrap; badge, nilai, dan waktu `nowrap`). Pangkas menjadi 5 kolom data + chevron (lihat §5). Gabungkan Type ke sel Kanal, buang kolom Links, dan pindahkan connectivity/model ke detail.

**F7 [P1] · `routing:7` · `module:14-20` · `html:10-14`**
Halaman ini tidak punya Panduan. Route tidak punya `data.guide`, `GuideModule` tidak di-import, `<page-guide-button>` tidak dipasang, dan `src/assets/guides/telemetry-channels.md` tidak ada. Halaman ini berada di luar shell workspace, jadi tombol dari toolbar workspace tidak berlaku di sini.
**Melanggar:** `ui-coding-style` checklist "page has `data.guide` + its Panduan"; skill `page-guide`.
**Perbaikan:** `data: { title: 'Kanal Telemetri', guide: 'telemetry-channels' }`. Import `GuideModule` dari `src/app/shared/guide/guide.module.ts`. Taruh `<page-guide-button *ngIf="!embedded">` sebagai item **paling kiri** di grup aksi kanan header, mengikuti `sensor-chanel-detail.html:35`. Tulis `telemetry-channels.md` mengikuti frontmatter `project-sensors.md` (title/version/updatedAt/audience/sources/related).

**F8 [P1] · `html:122-127,140-142`**
Sel nilai tidak menandai pelanggaran ambang, tidak punya sparkline atau rentang 24 jam, tidak menampilkan interval lapor, tidak menyebut sejak kapan kanal mati, dan tidak punya kontak PIC. Ini semua yang membuat tab Sensors bisa langsung ditindaklanjuti.
**Melanggar:** paritas dengan referensi (brief owner); `ui-list` "Monitoring lists…".
**Perbaikan:** pakai ulang blok `value-line` sensors-page `html:211-237` (panah atas/bawah, `text-danger` kalau fresh dan keluar ambang, `text-warning` + "· data terlambat" kalau tidak fresh, SVG `.spark` 72×20, `rangeText`), `formatInterval` di bawah badge (`html:245`), `deadSinceText` / `nodeSeenText` (`html:250-258`), dan link `tel:` PIC kalau kanal bermasalah (`html:202-206`).
**Butuh backend:** (a) `Overview` menambahkan `n.pic_name`, `n.pic_phone`, `sc.precision`. (b) `GET /api/sensors/trends` saat ini **mewajibkan** `idProject` UUID (`sensor_trends.go:70`). Tambahkan param `idSensorChannels` (CSV, maks. 100, tetap di-scope owner) supaya halaman bisa meminta tren hanya untuk ±20 baris yang tampil. Sebagai fallback, tampilkan sparkline hanya kalau satu project dipilih.

**F9 [P1] · `html:153-156,189`**
`fa-diagram-3` adalah nama ikon Bootstrap Icons, bukan FontAwesome 6. Hasilnya `<a>` kosong: area klik tak terlihat di kolom Links, dan heading "Context" kehilangan ikonnya. Ketiga link ikon juga hanya punya `title`, tanpa `aria-label`.
**Melanggar:** `ui-coding-style` → "Icons: FontAwesome 6"; a11y untuk elemen ikon saja.
**Perbaikan:** pakai `fa-diagram-project`. Lebih baik lagi, buang kolom Links (F11). Kalau dipertahankan, tambahkan `[attr.aria-label]` dan target minimal 32×32 (`btn btn-sm btn-link`).

**F10 [P1] · `html:1-15` · `ts:77-87`**
Header tidak punya subjudul (jumlah kanal/project), tidak punya "diperbarui HH:mm:ss", tidak ada auto-refresh, dan tidak ada Ekspor Excel. Tombol Refresh memakai label teks Inggris dan ikon berbeda dari referensi (`fa-rotate-right` vs `fa-sync-alt`), tanpa `aria-label`.
**Melanggar:** `ui-list` → "Monitoring lists: optional silent auto-refresh (60 s, only when visible, keep last good data on failure, show 'updated HH:mm:ss')", "Refresh button `btn-outline-default` + `title`/`aria-label`"; `ui-coding-style` → Excel export.
**Perbaikan:** tambahkan `loadChannels(silent = true)` + `setInterval` 60 dtk dengan guard `document.visibilityState`, dibersihkan di `ngOnDestroy`. Saat refresh senyap gagal, data terakhir dipertahankan (sensors-page `:163-216`). Tambahkan `exportExcel()` dengan kolom seperti sensors-page `:595-614` plus kolom **Project** dan **Owner** (khusus admin), dan geser waktu ke WIB lewat `toExcelLocal`.

### P2: inkonsistensi dan hierarki

**F11 [P2] · `html:102-103,130,145-151`**
Klik baris membuka panel expand, sedangkan di tab Sensors klik baris membuka detail sensor. Link node menuju `/iot/nodes/:id` (keluar dari workspace project). Link sensor menuju `/iot/nodes/:id/sensor/:sid` **tanpa** `?channel=`, sehingga yang terbuka adalah kanal pertama sensor, bukan kanal di baris itu.
**Melanggar:** `ui-list` → "Row navigation stays inside the current workspace"; URL kanonik sensors-page `:385-393` (`node/:nodeId/sensor/:idSensor?channel=`).
**Perbaikan:** klik baris → `router.navigate(['/iot/projects', c.project.idProject, 'node', c.node.idNode, 'sensor', c.sensor.idSensor], { queryParams: { channel: c.idSensorChannel } })`, dengan `.channel-row { cursor:pointer }` + chevron di kolom terakhir. Link alamat node → `['/iot/projects', p, 'node', n]`. Fallback ke `/iot/nodes/...` hanya kalau `idProject` null.

**F12 [P2] · `html:6,8,23,35,42,47-49,61-63,68,71,79,91-97,107,166-192,205,211,214` · `ts:107,293-296,316-320,325` · `app-menus.service.ts:22`**
Bahasa campur dalam satu baris filter ("Owner / Project / Node Type / **Kelompok** / Channel Type / Search", "All Models" di sebelah "**Semua Kelompok**"). Waktu relatif berbahasa Inggris ("5m ago", "no data", "Never").
**Melanggar:** brief owner ("Indonesian wording").
**Perbaikan:** gunakan istilah baku: *Kanal Telemetri, Kanal, Nilai terakhir, Status, Data terakhir, Semua, Cari, Menampilkan x–y dari z kanal, Baris, Memuat kanal…, Belum pernah kirim, Ambang belum diatur*. Hapus `ageLabel` dan pakai `timeAgo` bersama (lihat §3, label util juga perlu di-Indonesiakan).

**F13 [P2] · `html:31-75`**
Ada 6 kolom filter (`col-lg-3+3+2+2+2+2` = 14/12), jadi baris pecah dan **Search mendapat `col-lg-2`**, kolom tersempit untuk kontrol yang paling sering dipakai. Placeholder "Metric code" juga keliru, karena pencarian mencakup sensor dan node. Dropdown muncul/hilang tergantung `options.length > 1`, sehingga layout melompat setelah reload atau ganti owner.
**Melanggar:** `ui-list` filter row (Owner col-lg-4 admin + Search col-lg-4).
**Perbaikan:** baris utama berisi Owner (admin, `col-lg-3`), Project (`col-lg-3`), Kelompok (`col-lg-2`), Cari (`col-lg-4`, placeholder "Cari alamat, kode node, sensor, metrik, PIC…"). Node Type dan Channel Type dipindah ke tombol `btn btn-sm btn-outline-default` "Filter lanjutan" (collapse). Kolom selalu dirender (`disabled` kalau opsinya hanya satu) supaya layout stabil. Filter aktif ditampilkan sebagai chip `badge bg-theme-subtle` dengan tombol × (pola sensors-page `html:124-130`).

**F14 [P2] · `html:134-137`**
Sel Node menampilkan titik connectivity + "Online · ModelName". Ini status kedua yang bisa bertentangan dengan badge baris (node "Online" tapi kanal "Offline" karena kanal ini berhenti sendiri). `[class]` di `<i>` juga mencampur kelas statis dan binding.
**Melanggar:** satu sumber status (`telemetry-freshness.ts`).
**Perbaikan:** baris 2 = kode node, baris 3 = nama project (kecil, muted) kalau view mencakup lebih dari satu project, lalu PIC kalau bermasalah. Info connectivity/model cukup di halaman detail.

**F15 [P2] · `html:161-197` (expand) · `html:177,186,168` · `ts:322-327`**
`{{ c.multiplier ?? 1 }} / {{ c.offsetValue ?? 0 }}` menampilkan nilai default seolah sudah dikonfigurasi. `Interval: {{ … ?? '—' }}s` menghasilkan "—s". `thresholdLabel` mengembalikan 'none' (Inggris) dan angka mentah. Panel ini berisi detail teknis (register, multiplier) yang tidak relevan bagi tenant/operator dan sudah ada di halaman detail kanal.
**Melanggar:** `ui-coding-style` → "Unset numbers … keep `null` → render '—' / 'Belum diatur'".
**Perbaikan:** hapus panel expand (navigasi ke detail sudah cukup, lihat F11). Kalau admin tetap butuh, jadikan tombol ikon admin-only `fa-circle-info` dengan `aria-label`. Nilai null dirender "—", ambang memakai `thresholdText()` dari sensors-page `:457-463`.

**F16 [P2] · `ts:236`**
Sort nilai memakai `?? -Infinity`, sehingga baris tanpa data naik ke atas saat ascending.
**Melanggar:** `ui-list` → "rows with no value sink to the bottom in both directions".
**Perbaikan:** salin komparator sensors-page `:289-297` (null selalu `return 1` / `-1` sebelum arah sort diterapkan).

**F17 [P2] · `ts:197-275`**
`baseFilteredChannels` / `filteredChannels` adalah getter yang memfilter dan **menyortir ulang hingga 2000 baris** pada setiap change detection, berkali-kali per siklus (5× `statusCount`, `totalEntries`, `totalPages`, `paginatedChannels`, `pageNumbers`, `paginationStart/End`). Pemakaian CPU di laptop operator akan terasa.
**Perbaikan:** pola `applyFilters()` seperti sensors-page `:256-309`. Hitung `filteredChannels` dan `counts` sekali per perubahan filter/sort/data dan simpan sebagai properti. `nowMs` diset sekali per load.

**F18 [P2] · `ts:113-121`**
Owner dimuat dengan `limit: 500` dalam satu halaman, dan error ditelan (`error: () => {}`), sehingga dropdown kosong tanpa penjelasan.
**Melanggar:** `ui-coding-style` → `fetchAll`.
**Perbaikan:** `fetchAll(p => this.ownersService.ownersControllerFindAll$Response(p))`. Saat gagal, tampilkan opsi disabled "Gagal memuat owner" + `title`.

**F19 [P2] · Hierarki (tidak ada KPI)**
Begitu halaman terbuka, operator tidak tahu berapa kanal mati atau keluar ambang tanpa membaca angka kecil di badge tab.
**Melanggar:** paritas dengan referensi; `ui-card` (KPI card dalam `<card>`).
**Perbaikan:** baris KPI `row row-cols-2 row-cols-lg-5 g-3 mb-3` memakai `<card class="h-100 kpi-link">` dari sensors-page `html:32-92`. Isinya lihat §5.

### P3: rapikan

**F20 [P3] · `html:5`** · Breadcrumb "IoT" `href="javascript:;"` adalah link mati (nodes-list sama). Ganti dengan `routerLink="/iot/dashboard"` atau jadikan teks non-link.

**F21 [P3] · `html:78-80`** · Loading memakai `fa-spinner fa-2x`, sedangkan referensi memakai `spinner-border spinner-border-sm text-theme` + `visually-hidden`. Samakan. Saat refresh senyap, tabel tidak boleh diganti spinner.

**F22 [P3] · `ts:42-44` · `module:21-23` · `html:95,129,162`** · `@Input() embedded/nodeId` tidak dipakai di mana pun (`grep <telemetry-channels-list` kosong). Akibatnya ada logika `colspan` dan `*ngIf="!nodeId"` yang mati. Pilih salah satu: hapus, atau dokumentasikan dan uji. Kalau dipertahankan, embedded juga harus menyembunyikan KPI dan Panduan.

**F23 [P3] · `html:91-96`** · `<th (click)>` tidak bisa difokus dengan keyboard (masalah yang sama ada di referensi). Tambahkan `tabindex="0"`, `(keydown.enter)`, dan `[attr.aria-sort]`.

**F24 [P3] · `html:118`** · Badge kelompok memakai `bg-theme bg-opacity-25 text-theme`, sedangkan halaman lain memakai `bg-*-subtle`. Pakai `badge bg-theme-subtle text-theme` (atau `bg-secondary-subtle text-secondary` kalau kelompok bukan status).

**F25 [P3] · `app-menus.service.ts:22`** · Label menu "Telemetry Channels" diganti "Kanal Telemetri" (ikon `bi bi-broadcast-pin` boleh tetap, karena menu memakai bootstrap-icons).

---

## 3. Pola lintas halaman (seragamkan sekali jalan)

1. **Satu header untuk list mandiri.** Buat komponen `page-list-header` (atau partial) berisi breadcrumb + `h1.page-header` + subjudul `text-muted small` ("N item · diperbarui HH:mm:ss (otomatis tiap 60 dtk)") + slot aksi kanan dengan urutan tetap: `<page-guide-button>` → Muat ulang (ikon `fa-sync-alt`, `btn-outline-default`) → Ekspor Excel (`btn-outline-theme`) → aksi primer. Dipakai di telemetry-channels, nodes-list, unpaired-devices, alerts. Header workspace sudah punya versi sendiri, jangan dobel.
2. **Status per kanal/sensor hanya dari `telemetry-freshness.ts`.** Endpoint `/sensor-channels/overview` (dipakai halaman ini **dan** mobile `project-channels`) harus mengikuti util ini, atau backend memakai aturan yang identik. Tambahkan helper bersama `channelVerdict(latestAt, intervalSec, value, min, max, now)` → `{ freshness, threshold, isOut }` di `shared/utils/` supaya sensors-page, halaman ini, dan mobile tidak menyalin `isChannelOut`.
3. **Sel "Nilai + tren" sebagai komponen.** Ekstrak `value-line` sensors-page (nilai id-ID + panah ambang + sparkline + rentang 24 jam + teks ambang) menjadi `<channel-value-cell [channel] [trend] [freshness]>` di `SharedComponentsModule`. Pakai di sensors-page, halaman ini, dan nanti node detail.
4. **KPI status.** Ekstrak 4 KPI pertama sensors-page menjadi `<status-kpi-row [counts] (pick)>` dengan input `config` sesuai `ui-card`.
5. **Bahasa label bersama.** `FRESHNESS_LABEL` dan `timeAgo()` di `telemetry-freshness.ts` masih Inggris ("Fresh/Stale/No Data", "5m ago", "Never"), dan teks pagination di semua list juga ("Showing … Rows Previous Next", "Search"). Indonesiakan sekali di util dan potongan pagination (komponen `<list-pagination>`). Referensi sensors-page pun ikut terdampak (`html:4,135,169-171,275,278`).
6. **Export Excel.** Satu helper `exportRowsToExcel(columns, rows, fileStem)` yang menangani geser zona waktu, `excelNumFmt`, freeze header, dan autofilter, supaya tiap list tidak menyalin ±80 baris kode.
7. **Kontrak overview.** `/sensor-channels/overview` harus kembali ke `{data, meta}` + `page`, serta menambahkan `precision`, `node.picName/picPhone`. Mobile `project-channels` yang "mirror desktop" harus diperbarui bersamaan.

---

## 4. Urutan perbaikan

**Gelombang 1: quick wins, khusus frontend (±½ hari)**
1. F2 label alamat + pencarian alamat.
2. F9 ikon `fa-diagram-project` + `aria-label`.
3. F5 error `alert-danger` + Coba lagi, sembunyikan tabel/empty saat error, empty state dua varian.
4. F16 sort null di bawah.
5. F4 `formatNumber` id-ID (sementara tetap `1.0-3` sampai `precision` tersedia).
6. F12/F25 bahasa (label, tab, pagination, menu).
7. F7 `data.guide` + `GuideModule` + `<page-guide-button>` + berkas `telemetry-channels.md`.
8. F20, F21, F24.

**Gelombang 2: paritas dengan tab Sensors (frontend, 1–1½ hari)**
9. F1 status via `getFreshness` + ambang hanya kalau fresh, dengan tab Semua / Fresh / Stale / Offline / No Data / Di luar ambang.
10. F6 + F14 + F15 tabel 5 kolom tanpa scroll horizontal, panel expand dihapus.
11. F11 klik baris → URL kanonik workspace `?channel=`.
12. F19 KPI row, F10 auto-refresh senyap + "diperbarui", Ekspor Excel.
13. F13 filter row 4 kolom + "Filter lanjutan" + chip.
14. F17 `applyFilters()` cache, F18 `fetchAll` owner.

**Gelombang 3: butuh backend**
15. F3 `meta` + `page` di overview (lalu `fetchAll` di frontend) + peringatan pemotongan.
16. F4/F8 `precision`, `picName`, `picPhone` di overview.
17. F8 `trends?idSensorChannels=` untuk sparkline lintas project.
18. §3.2 samakan `computeChannelStatus` dengan util (atau hapus field `status` dari respons).

**Gelombang 4: konsolidasi** (§3: komponen header, `channel-value-cell`, `status-kpi-row`, `list-pagination`, helper Excel, Indonesianisasi util). Ini juga merapikan sensors-page dan nodes-list.

---

## 5. Usulan layout final (atas → bawah)

```
[Header]  IoT › Kanal Telemetri
          h1 "Kanal Telemetri"
          muted: "1.248 kanal · 14 project · diperbarui 14.05.12 (otomatis tiap 60 dtk)"
          ⟶ kanan: [? Panduan] [⟳] [Ekspor Excel]

[Alert]   (kondisional, alert d-flex + Coba lagi)
          - error muat                       → alert-danger
          - data terpotong (meta.total > n)  → alert-warning "Menampilkan 2.000 dari 2.431 …"
          - tren 24 jam gagal                → teks text-warning di subjudul (seperti sensors-page)
          - ekspor gagal                     → alert-danger py-2

[KPI]     row row-cols-2 row-cols-lg-5 g-3 · <card class="h-100 kpi-link">, klik = set tab
          1 Mengirim data     fresh / total            "sesuai interval lapor"
          2 Terlambat         stale                    "data mulai tertunda"
          3 Mati / belum kirim offline+nodata          "terlama: <alamat> · 12 Okt 2026"
          4 Di luar ambang    isOut (fresh saja)       "x dari N kanal punya ambang"
          5 Project terdampak #project dgn ≥1 kanal mati/keluar ambang
                              baris 2: project terburuk + jumlahnya → klik = filter project + 'dead'
            (KPI "nilai terendah" milik sensors-page TIDAK dipakai: lintas project satuannya campur)

[Card]    <card class="shadow-sm">
  Tabs    nav-tabs-v2 + pill count (dari dataset terfilter, bukan halaman):
          Semua · Fresh · Stale · Offline · No Data · Di luar ambang
          (+ chip "Mati / belum pernah kirim ×" bila datang dari KPI 3)
  Filter  row g-3 mb-4
          [Owner — admin, col-lg-3, server-side]
          [Project — col-lg-3, server-side idProject; tenant: project miliknya]
          [Kelompok — col-lg-2]
          [Cari — col-lg-4 "Cari alamat, kode node, sensor, metrik, PIC…"]
          [Filter lanjutan ▾] → Tipe node, Tipe kanal
          Chip filter aktif + "Reset filter"
  Tabel   .channels-table (tanpa text-nowrap, tanpa scroll horizontal)
```

| # | Kolom | Isi (baris 1 / 2 / 3) | Sort | Sumber blok |
|---|---|---|---|---|
| 1 | **Kanal** | ikon box 40px `fa-wave-square` · **metricCode** / label sensor · `badge bg-theme-subtle` kelompok | metrik | sensors-page `html:179-193` |
| 2 | **Node** | **alamat** (fallback kode, link ke workspace node) / kode node / nama project (muted, kalau lebih dari satu project) / `fa-phone` PIC kalau bermasalah | alamat | sensors-page `html:195-209` |
| 3 | **Nilai terakhir** (end) | nilai id-ID + satuan, panah atas/bawah, `text-danger` atau `text-warning` / sparkline 72×20 + "24 jam: 0,64–2,28" / "di atas maks 3 · data terlambat" | nilai (null di bawah) | sensors-page `html:211-237` |
| 4 | **Status** | badge `FRESHNESS_BADGE` + `title` ambang menit / "tiap 2 mnt" | worst-first (default) | sensors-page `html:241-246` |
| 5 | **Data terakhir** (end) | normal: "5 mnt lalu" / "13 Nov, 14.00". Mati: **"Data terakhir 3 hari lalu"** merah / "sejak 10 Nov 2026, 08.15" atau "node terlihat 2 jam lalu" | waktu | sensors-page `html:248-259` |
| 6 | › | chevron; klik baris → `/iot/projects/:p/node/:n/sensor/:s?channel=:c` | – | sensors-page `html:260` |

```
  Empty   "Belum ada kanal telemetri." / "Tidak ada kanal sesuai filter." + [Reset filter]
  Paging  "Menampilkan 1–20 dari 1.248 kanal" · Baris [10|20|50|100] (default 20) · « 1 2 3 4 5 »
          (window 5 halaman seperti sekarang — lebih baik dari referensi yang merender semua nomor)
```

**Mobile (< md):** KPI 2 kolom. Filter ditumpuk per baris. Tabel tetap 5 kolom: sel 1 dan 2 wrap, sparkline disembunyikan dengan `d-none d-md-flex`, kolom 5 diringkas ke baris 2 sel Status dengan `d-md-none`.

**Ekspor Excel** (semua baris terfilter dan tersortir): Owner (admin) · Project · Alamat Node · Kode Node · Sensor · Metrik · Kelompok · Nilai Terakhir · Satuan · Min/Maks/Rata-rata 24 jam · Ambang Min/Maks · Status Ambang · Status · Data Terakhir (WIB) · Keterangan · Interval Lapor (dtk) · PIC · Telepon PIC.
