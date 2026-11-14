# Audit Enterprise UX: `/iot/owners` (list, detail, add/edit) dan `/iot/projects` (list), 14 Nov 2026

**Yang diaudit:**
- `src/app/pages/iot/owners/` (`owners-list/`, `owners-detail/`, `owners-add/` yang juga dipakai untuk edit, `owners-edit/` yang sudah mati, `user-modal/`, routing, module)
- `src/app/pages/iot/projects/projects-list/`

**Standar acuan:** skill `ui-coding-style`, `ui-list`, `ui-detail`, `ui-card`, `page-guide` dan `CLAUDE.md` (non-negotiables). Halaman pembanding: tab Sensors workspace (`project-workspace/pages/sensors-page/`), `telemetry-channels/telemetry-channels-list/`, `project-workspace/pages/overview-page/`, dan `nodes/nodes-list/`.

**Backend yang dicek** (untuk memastikan angka di layar benar-benar ada sumbernya):
- `iot-backend-go/app/services/owner/owner_service.go` (`List` :117, `GetByIDDetailed` :198, `ownerStatistics` :772, `ownerToMap` :1006)
- `app/services/project/project_service.go:43-103`

**Cara audit:** hanya membaca kode. Tidak ada file yang diubah dan browser tidak dibuka.

---

## Ringkasan untuk owner

Keluhan bahwa datanya "tidak realistis" memang benar, dan sumbernya bisa ditunjuk satu per satu:

1. **Daftar Owner selalu menampilkan "0 Projects · 0 Nodes · 0 Sensors" dan "0" alert merah.** FE membaca field `totalProjects/totalNodes/totalSensors/alertCount`, sedangkan backend mengirim `projectCount/nodeCount/sensorCount` dan tidak punya field alert sama sekali.
2. **Status setiap owner tampil "Active" dan SLA-nya "BRONZE".** Kedua nilai itu diisi default di FE. Backend tidak punya kolom status, jadi tab Trial dan Suspended selalu 0.
3. **Detail Owner menampilkan konfigurasi webhook/MySQL/PostgreSQL palsu** (`hooks.adhiwater.co.id`, `whsec-demo-token`, status "Healthy", pengiriman terakhir 26 Mei 2024) untuk owner yang belum punya konfigurasi. Kalau tombol Save ditekan, data palsu itu tersimpan sungguhan.
4. **Detail Owner menampilkan catatan developer sebagai teks biasa** di bagian bawah halaman ("Needs implementation: 1. Backend endpoint…").
5. **Kartu Project selalu menampilkan "0 Alerts"**, karena backend menulis `alerts: 0` secara hardcode. Angka "Nodes Online" diambil dari kolom `connectivity_status` dan bukan dari `getFreshness`, sehingga bisa berbeda dengan angka di workspace project.

Tidak ada `Math.random`. Yang ada adalah **angka nol dan default yang tampil seolah-olah data nyata**, dan itu juga melanggar aturan No-fake-data.

---

## 1. Skor ringkas (1–5)

| Halaman | Konsistensi | Hierarki | State | Kejujuran data | Navigasi |
|---|---|---|---|---|---|
| Owners list | **2** | **1** | **2** | **1** | **2** |
| Owner detail | **2** | **1** | **2** | **1** | **2** |
| Owner add/edit | **2** | 3 | 3 | **2** | 3 |
| Projects list | 3 | **2** | 3 | **2** | 4 |

- **Owners list.** Kerangka `ui-list` sudah ada (tab, card, pagination). Tapi hampir semua angkanya nol atau default, banyak aksi yang mati, tidak ada KPI maupun Panduan, dan teksnya berbahasa Inggris.
- **Owner detail.** Halaman ini tidak punya tab. Daftar project milik owner sebenarnya ada di respons API tetapi tidak ditampilkan. Bagian Forwarding berisi data demo, dan catatan dev ikut tampil di layar.
- **Owner add/edit.** Edit tidak menyimpan perubahan email, telepon, dan alamat. Ada widget "Payload Preview – Demo JSON". Pilihan Industri tidak memuat PDAM.
- **Projects list.** Paling rapi dari keempatnya (sudah memakai debounce, "Coba lagi", dan penanganan zero-time). Tapi alert-nya selalu 0, status online tidak memakai aturan freshness, tidak ada KPI maupun Panduan, dan bentuk kartunya sulit dipakai untuk mencari project yang bermasalah.

---

## 2. Temuan

Format: `[Prioritas]` · `file:line` · masalah · standar yang dilanggar · rekomendasi.

### A. Kejujuran data (P0)

**1. [P0]** · `owners-list/owners-list.ts:140-143`
- **Masalah:** `projects: owner.totalProjects || 0`, `nodes: owner.totalNodes`, `sensors: owner.totalSensors`, `alerts: owner.alertCount`. Backend (`owner_service.go:1019-1023`) mengirim `projectCount`, `nodeCount`, `sensorCount` dan tidak punya field alert. Akibatnya semua baris tampil "0 Projects · 0 Nodes · 0 Sensors", dan kolom Alerts berisi angka 0 berwarna merah (`.html:143`).
- **Standar:** No fake data; counts harus dari sumber nyata.
- **Rekomendasi:** Petakan `projectCount/nodeCount/sensorCount`. Hapus kolom Alerts sampai backend mengirim `openAlerts` per owner. Alternatifnya, tambahkan `openAlerts` di query `List` dengan subquery yang sama seperti `ownerStatistics` :783-791. Format angka dengan `| number`.

**2. [P0]** · `owners-list/owners-list.ts:139, 144, 153-160` dan `.html:46-54, 134-137`
- **Masalah:** `slaLevel || 'bronze'` dan `mapStatus()` selalu menghasilkan `'active'`, karena tabel `owners` (`models/owner/owner.go`) tidak punya kolom status. Tab "Trial" dan "Suspended" akan selalu 0, dan setiap owner tampil sebagai "SLA BRONZE · Active".
- **Standar:** No fake data; default tidak boleh tampil seolah sudah dikonfigurasi.
- **Rekomendasi:** Hapus tab status Active/Trial/Suspended. Ganti dengan tab kesehatan yang turunannya nyata (lihat §3). SLA ditampilkan "—" kalau `null`, dan kalau ada pakai `| titlecase` (nilai tersimpan "Gold" sedangkan default list "bronze", casing-nya campur).

**3. [P0]** · `owners-detail/owners-detail.ts:120-137, 139-175` dan `.html:76-329`
- **Masalah:** `webhookConfig` dan `databaseConfigs` diinisialisasi dengan data demo: `endpointUrl: 'https://hooks.adhiwater.co.id/iot/ingest'`, `secretToken: 'whsec-demo-token'`, header `X-Tenant-Code: ADHI-WATER`, `lastStatus: 'Healthy'`, `lastDeliveryAt: '2024-05-26…'`, serta host MySQL/PG fiktif. Nilai ini hanya ditimpa kalau API mengembalikan konfigurasi (:252, :276).
- **Dampaknya:** Owner yang belum dikonfigurasi terlihat "Healthy, pengiriman terakhir 26 Mei 2024". Lebih parah lagi, `saveWebhookConfig()` (:416, cabang create :459) akan **membuat webhook sungguhan ke domain demo**.
- **Standar:** No fake data (non-negotiable).
- **Rekomendasi:** Inisialisasi `webhookConfig = null` dan `databaseConfigs = []`. Kalau kosong, tampilkan empty state "Belum ada konfigurasi pengiriman" dengan tombol `btn-outline-theme` "Tambah webhook" / "Tambah koneksi database". Form baru dibuka kosong.

**4. [P0]** · `owners-detail/owners-detail.html:637-642`
- **Masalah:** Tag pembuka `<!--` hilang. Teks "Needs implementation: 1. Backend endpoint: GET /owners/:id/forwarding-logs … See: DASHBOARD-TODO-NEXT-PHASE.md for roadmap -->" ikut **ter-render sebagai teks** di bawah halaman, termasuk di layar pelanggan.
- **Standar:** Tidak boleh ada elemen yang "asal jadi".
- **Rekomendasi:** Hapus blok :637-687 seluruhnya (termasuk tabel Forwarding Activity yang dikomentari). Kalau perlu, pindahkan catatannya ke docs.

**5. [P0]** · `backend project_service.go:82-86` dan `projects-list.html:139-143`, `.ts:70`
- **Masalah:** `"alerts": 0` di-hardcode di backend. Setiap kartu project tampil "0 ALERTS" seolah tidak ada masalah, dan opsi urut "Alert terbanyak" tidak berfungsi.
- **Standar:** No fake data; metrik tanpa sumber tidak boleh ditampilkan.
- **Rekomendasi:** Untuk sekarang, hapus kolom Alerts dan opsi urut tersebut. Fase backend: hitung `alert_events.status='open'` per project dengan join yang sama seperti `ownerStatistics`, baru tampilkan lagi.

**6. [P1]** · `backend project_service.go:78` dan `projects-list.html:128-134`
- **Masalah:** "Nodes Online" dihitung dari `nodes.connectivity_status = 'online'`, yaitu flag tersimpan dan bukan aturan freshness. Workspace Overview/Sensors memakai `getFreshness(lastAt, telemetryIntervalSec)`, jadi project yang sama bisa menunjukkan angka online berbeda di dua halaman.
- **Standar:** Device status hanya dari `telemetry-freshness.ts`.
- **Rekomendasi:** Backend mengirim `lastSeenAt` dan `telemetryIntervalSec` per node (atau agregat per project). Hitung di FE dengan `getFreshness`, lalu tampilkan "Mengirim data X / Y". Kalau belum tersedia, beri label jujur "status koneksi alat" dengan tooltip.

**7. [P1]** · `backend project_service.go:91-101` dan `projects-list.ts:428, 412`
- **Masalah:**
  - `location` = alamat `node_locations ... LIMIT 1` tanpa `ORDER BY`, jadi acak di antara node dan bisa berganti antar-load. Fallback-nya "Unknown location" (bahasa Inggris).
  - `lastSync` = `MAX(last_seen_at)`, yaitu node *paling segar*. Ini menutupi node lain yang mati: project dengan 1 dari 10 node hidup tetap tampil "5m ago".
- **Rekomendasi:**
  - Lokasi: pakai alamat project kalau ada. Kalau tidak, sebut jumlah lokasi ("3 lokasi"). Kosong ditampilkan "—".
  - Waktu: ganti "lastSync" dengan "Data terakhir" plus jumlah node terlambat atau mati (lihat temuan 6).

**8. [P1]** · `owners-detail/owners-detail.ts:243-247` dan `.html:47-51, 62-65, 69`
- **Masalah:**
  - `email: ''` dan `phone: ''` di-hardcode dengan komentar "Not in API yet", padahal tabel dan `GetByID` punya kolom tersebut (endpoint detailed :232 saja yang tidak menyertakannya). Kartu Snapshot jadi berisi dua baris kosong.
  - `contactPerson || 'N/A'` menghasilkan subjudul "• PIC N/A".
  - `sensors = statistics.activeSensors` (status default 'active') diberi label "Sensors" saja.
  - Badge "Forwarding Health" **selalu `bg-success-subtle`**, termasuk untuk nilai "Not Configured" atau "Disabled".
- **Rekomendasi:**
  - Tambahkan `email`, `phone`, `address`, `ownerCode` ke respons `GetByIDDetailed`, atau gabungkan dengan `GET /owners/:id`.
  - Field kosong ditampilkan "—". Baris PIC tidak dirender kalau kosong.
  - Badge memakai map `Operational → bg-success-subtle text-success`, `Disabled → bg-secondary-subtle text-secondary`, `Not Configured → bg-warning-subtle text-warning`.

**9. [P1]** · `owners-list/owners-list.ts:146, 165-184` dan `.html:110, 144`
- **Masalah:**
  - "Last Activity" = `updatedAt` record owner, yaitu waktu profil terakhir diedit, bukan aktivitas alat.
  - Formatnya `toLocaleTimeString('en-US', … timeZone: 'UTC') + ' UTC'`, `'Yesterday'`, atau `toLocaleDateString('en-US')`. Formatnya berbahasa Inggris, memakai jam UTC, dan bertentangan dengan `LOCALE_ID id-ID`.
- **Rekomendasi:** Ganti kolom menjadi "Data terakhir", yaitu MAX `last_value_at` kanal milik owner. Tampilkan dengan `timeAgo()` dari `telemetry-freshness.ts` dan `title` berisi `date:'dd MMM yyyy HH:mm'`. Kalau belum ada sumbernya, hapus kolom ini.

**10. [P1]** · `owners-add/owners-add.ts:193-204`
- **Masalah:** Payload update tidak mengirim `email`, `phone`, dan `address`. Pengguna mengubah ketiganya, menekan "Update Owner", lalu diarahkan ke detail, tetapi perubahannya **tidak tersimpan** tanpa pesan apa pun. Field `notes` (:80, :170) tidak ada di DTO backend dan ikut terbuang diam-diam.
- **Standar:** `ui-form`: form object datar yang sama persis dengan DTO.
- **Rekomendasi:** Samakan payload create dan update (satu `buildPayload()`). Hapus field Notes, atau tambahkan kolomnya di backend lebih dulu.

**11. [P1]** · `owners-add/owners-add.html:128-138` (`Payload Preview` / "Demo JSON")
- **Masalah:** Widget developer berisi JSON mentah dengan `pre.bg-dark` (warna hardcode, tidak ikut tema). Kartu "Owner Summary" (:116-127) hanya mengulang isi form.
- **Rekomendasi:** Hapus kedua kartu. Kalau perlu ringkasan, cukup tampilkan validasi di dekat tombol simpan.

**12. [P1]** · `owners-add/owners-add.ts:23-24, 36, 98`
- **Masalah:** `industryOptions` tidak memuat "PDAM / Air Minum" (pelanggan utama), dan opsi pertamanya "Water Treatment". Owner yang industrinya di luar daftar (misalnya "PDAM") akan tampil kosong atau tergeser ke opsi pertama di `<select>`, lalu **tertimpa saat disimpan**.
- **Rekomendasi:** Opsi industri diambil dari daftar nyata (distinct industry owner, `fetchAll`) ditambah "PDAM" di urutan pertama. Kalau nilai tersimpan tidak ada di daftar, sisipkan sebagai opsi.

### B. Hierarki informasi

**13. [P0]** · `owners-detail/owners-detail.html` (seluruh halaman) dan `.ts:223`
- **Masalah:** API detail mengembalikan `projects[]` (nama, status, areaType, `nodeCount`) dan `statistics.activeAlerts`, tetapi **tidak ada satu pun yang ditampilkan**. Admin yang membuka sebuah PDAM tidak bisa melihat project apa saja yang dimilikinya, yang justru merupakan tujuan utama halaman ini. Urutan sekarang: Snapshot, form Forwarding raksasa, User, API Key. Form konfigurasi teknis menempati posisi teratas.
- **Standar:** `ui-detail`: tab `activeTab` dengan hitungan; koleksi anak per tab.
- **Rekomendasi:** Susun ulang ke layout §4.2: KPI, lalu tab Ringkasan / Project (n) / Pengguna (n) / Integrasi. Tab Project memakai `ownerData.projects` dan tidak butuh request tambahan.

**14. [P1]** · `owners-list/owners-list.html` dan `projects-list.html`
- **Masalah:** Tidak ada baris KPI. Pertanyaan pertama admin ("PDAM/project mana yang bermasalah sekarang?") tidak bisa dijawab tanpa membuka satu per satu. Di daftar project, urutan defaultnya "Nama A–Z" (`projects-list.ts:73`).
- **Standar:** Pola referensi KPI di `sensors-page.component.html:31-…` dan `telemetry-channels-list.html:50-108` (kartu `kpi-link` yang bisa diklik untuk memfilter).
- **Rekomendasi:** Tambahkan KPI dari data yang sudah dimuat (lihat §4). Urutan default "Bermasalah dulu" (jumlah node mati/terlambat terbanyak), lalu nama.

**15. [P2]** · `owners-list/owners-list.html:128` dan `projects-list.html:108-111`
- **Masalah:** Baris owner menampilkan `ID: <uuid>` (36 karakter, tidak berguna bagi manusia), padahal ada `ownerCode` 5 digit. Industri "Unspecified" tampil sebagai teks.
- **Rekomendasi:** Baris 2: `{{ ownerCode }} · {{ industry || '—' }}`. Hapus UUID.

**16. [P2]** · `owners-list/owners-list.html:138-142`
- **Masalah:** Kolom Contact menumpuk 3 baris ikon dengan nilai `'-'`, sehingga tinggi baris dua kali lipat dan kurang padat.
- **Rekomendasi:** Satu baris PIC, lalu telepon di baris kecil di bawahnya. Email ditaruh di `title` atau di halaman detail. Nilai kosong tidak dirender.

### C. Navigasi, aksi mati, peran

**17. [P1]** · `owners-list/owners-list.html:17-42`
- **Masalah:** "Export Owners", "Invite Owner Admin", dan "More Actions" (Assign SLA / Generate Contract / Archive Owner) semuanya `href="javascript:;"` tanpa handler. Semuanya aksi mati.
- **Rekomendasi:** Hapus seluruh blok. Ekspor dikembalikan sebagai tombol header "Ekspor Excel" kalau sudah diimplementasikan dengan `exceljs` dan helper `channel-display.ts`.

**18. [P1]** · `owners-list/owners-list.html:104, 115-120`
- **Masalah:** Ada kolom checkbox, tetapi tidak ada aksi massal. Ini elemen dekoratif.
- **Rekomendasi:** Hapus.

**19. [P1]** · `src/app/service/app-menus.service.ts:19`
- **Masalah:** Menu "Data Delivery Config" mengarah ke `/iot/owners#delivery`. Daftar owner tidak punya anchor `delivery` (hanya detail yang punya `id="delivery-config"`), jadi menu ini mendarat di daftar biasa.
- **Rekomendasi:** Hapus sub-menu dan sisakan satu item "Owners". Konfigurasi pengiriman ditaruh di tab Integrasi di detail.

**20. [P1]** · `owners-detail/owners-detail.html:630`
- **Masalah:** `<a href="/external-api/docs" target="_blank">` bukan route Angular, sehingga jatuh ke `**` dan pengguna diarahkan ke `iot/dashboard`. Dokumentasi resmi ada di `/developer` (`developer-portal.component.ts:62`).
- **Rekomendasi:** Pakai `routerLink="/developer"` dengan label "Buka Portal Developer".

**21. [P1]** · `app-routing.module.ts:189-192`
- **Masalah:** `iot/owners` tidak punya `canActivate: [AuthGuard]` maupun `data.roles: ['admin']`, padahal hampir semua route IoT lain punya. Menu memang disembunyikan untuk tenant, tetapi URL-nya tetap bisa dibuka. Tombol "Add Owner" juga tampil ke tenant.
- **Standar:** Multi-tenancy role checks.
- **Rekomendasi:** Tambahkan `canActivate: [AuthGuard], data: { title: 'Owners', roles: ['admin'] }`. Teruskan ke `senior-dev-auditor` untuk memastikan scoping backend `ensureOwnerAccess`.

**22. [P2]** · `owners-add/owners-add.ts:177`
- **Masalah:** Setelah create, pengguna diarahkan ke `/iot/owners?created=<id>`, tetapi list tidak membaca parameter itu. Tidak ada konfirmasi, dan owner baru tidak terlihat kalau tidak berada di halaman 1.
- **Rekomendasi:** Arahkan ke detail owner baru (`/iot/owners/:id`) dengan toast "Owner berhasil dibuat".

**23. [P2]** · `projects-list.html:150-157`
- **Masalah:** Tiga tombol sejajar (Detail `btn-theme` / Nodes / Monitor) di setiap kartu membuat 9 tombol primer berwarna penuh per layar. Kartu sendiri tidak bisa diklik.
- **Rekomendasi:** Satu aksi utama, yaitu baris atau kartu yang bisa diklik ke `/iot/projects/:id/overview`. Aksi sekunder dimasukkan ke menu `⋯` atau tautan kecil.

### D. Konsistensi header, Panduan, bahasa, format

**24. [P1]** · `owners-routing.module.ts:8-13`, `projects-routing.module.ts:19` dan header ketiga halaman
- **Masalah:** Tidak ada `data.guide` dan tidak ada `<page-guide-button>`. Halaman referensi sudah punya keduanya (`telemetry-channels-list.html:16`).
- **Standar:** skill `page-guide`: setiap halaman wajib punya Panduan.
- **Rekomendasi:**
  - Tambahkan `data: { title, guide: 'owners-list' | 'owner-detail' | 'owner-form' | 'projects-list' }`.
  - Taruh `<page-guide-button>` paling kiri di grup aksi header.
  - Import `GuideModule` di `OwnersModule` dan `ProjectsModule`.
  - Jalankan `guide-writer` setelah perbaikan.

**25. [P1]** · semua file
- **Masalah:** Bahasa campur. Contoh: "IoT Owners", "Add Owner", "All", "Industry", "Showing 1 to 10 of 7 owners", "Previous/Next", "Loading owners...", "Tidak ada owner sesuai filter.", "Owner Snapshot", "Retry", "Save Webhook Config", "No users found", "Nodes Online", "just now / 5m ago / 3d ago" (`projects-list.ts:461-470`), "Unknown Owner", "Untitled Project". Halaman referensi Kanal Telemetri sudah berbahasa Indonesia penuh.
- **Rekomendasi:** Satu glosarium: Owner (istilah domain, tetap), Project, Node, Sensor, Tambah, Ubah, Kembali, Cari, Semua, Memuat…, Coba lagi, Menampilkan a–b dari n, Sebelumnya/Berikutnya. Waktu relatif lewat `timeAgo()`.

**26. [P2]** · `projects-list.ts:471`
- **Masalah:** `new Date(time).toLocaleDateString()` tanpa locale, hasilnya mengikuti browser. Angka di template tidak memakai `| number` (`owners-list.html:131-132`, `projects-list.html:131-141`).
- **Rekomendasi:** Pakai `date:'dd MMM yyyy'` dan `| number` (id-ID) di semua angka.

**27. [P2]** · tombol header
- **Masalah:** Gaya tombol tidak seragam. "Add Owner/Add Project" memakai `btn-outline-theme` ukuran normal, Kanal Telemetri memakai `btn-sm`, "Edit Owner" memakai `fa-pen` (referensi `ui-detail` memakai `fa-edit`), dan tombol "Back" tanpa ikon.
- **Rekomendasi:** Header semua halaman: `btn-sm`. Urutannya Panduan, lalu Muat ulang (`btn-outline-default`, `title`/`aria-label`), lalu aksi utama `btn-outline-theme`. Tombol Kembali di halaman detail memakai `fa-arrow-left` dengan teks "Kembali".

**28. [P2]** · `owners-detail/owners-detail.html:8`
- **Masalah:** Judul "Owner {{name}}" (awalan berlebihan). Breadcrumb dan judul menampilkan "Loading..." dan tetap begitu kalau load gagal.
- **Rekomendasi:** Judul `{{ name }}`, subjudul `ownerCode · industri`. Header baru dirender setelah `!loading` (pola `ui-detail`).

**29. [P2]** · `owners-detail/owners-detail.html:386-403, 571-583`
- **Masalah:** Email muncul dua kali di tabel pengguna (di bawah nama dan sebagai kolom sendiri). Badge solid `bg-danger/bg-info/bg-success/bg-warning text-dark` tidak sesuai pola `bg-*-subtle text-*`. Role "admin" berwarna merah (danger), sehingga terbaca sebagai peringatan.
- **Rekomendasi:** Hapus kolom Email. Badge role: `bg-theme-subtle text-theme` / `bg-secondary-subtle`. Status: `bg-success-subtle text-success` / `bg-secondary-subtle text-secondary`.

**30. [P2]** · `owners-detail/owners-detail.html:189-201, 296-322, 476-484`
- **Masalah:** Warna alert ditentukan dengan `message.includes('success'|'Error'|'Simpan'|'tidak')`. Rapuh: pesan "Test error: …" tidak cocok dengan `'Error'` karena huruf kecil, jadi tampil biru.
- **Rekomendasi:** Simpan `{ type: 'success'|'danger'|'info', text }` dan bind `[ngClass]="'alert-' + msg.type"`.

**31. [P3]** · `owners-detail.ts:744-778, 852-891`
- **Masalah:** `confirm()` dan `alert()` bawaan browser berbahasa Inggris dipakai untuk aksi destruktif (hapus user, revoke key).
- **Rekomendasi:** Pakai modal konfirmasi NgbModal bersama, dengan teks Indonesia dan tombol `btn-danger` "Hapus".

### E. State (loading / error / empty)

**32. [P1]** · `owners-list/owners-list.html:57-61, 150-156` dan `.ts:101`
- **Masalah:**
  - Error tampil sebagai alert yang bisa ditutup tanpa "Coba lagi", dan isinya `err.message` mentah ("Http failure response for …").
  - Saat error, empty state "Tidak ada owner sesuai filter." dan pagination tetap muncul, jadi pengguna melihat pesan yang salah.
  - Empty state tidak membedakan "Belum ada owner" dari "tidak ada yang cocok dengan filter".
- **Standar:** `ui-list`: `alert alert-danger d-flex` + "Coba lagi"; empty membedakan dua kondisi.
- **Rekomendasi:** Samakan dengan `telemetry-channels-list.html:29-33`. Sembunyikan tabel/empty/pagination kalau `error`.

**33. [P2]** · `projects-list.html:95-99` dan `.ts:112`
- **Masalah:** Error memakai `alert-warning` (referensi: `alert-danger`) dengan `err?.message` mentah. Saat reload, spinner muncul di bawah kartu lama (`.html:163`) karena `projects` tidak dikosongkan. Empty state "Tidak ada project sesuai filter." juga muncul saat memang belum ada project sama sekali.
- **Rekomendasi:**
  - Pesan: "Gagal memuat daftar project." dengan `alert-danger` dan "Coba lagi".
  - Spinner di atas grid, atau overlay di atas data lama.
  - Empty dibedakan: "Belum ada project" ditambah tombol Tambah Project.

**34. [P2]** · `owners-detail/owners-detail.html:354-357`
- **Masalah:** Error pengguna tanpa tombol Coba lagi. Error API key punya tombol "Retry" (`btn-danger` solid).
- **Rekomendasi:** Semua error per-bagian memakai `alert-danger d-flex` + `btn-sm btn-outline-danger ms-auto` "Coba lagi".

**35. [P2]** · `owners-detail/owners-detail.ts:276-308`
- **Masalah:** Kalau owner hanya punya konfigurasi MySQL, `databaseConfigs` diganti seluruhnya sehingga tab PostgreSQL kosong total, tanpa empty state dan tanpa tombol tambah. Pengguna tidak bisa membuat konfigurasi kedua.
- **Rekomendasi:** Setiap tab Integrasi punya empty state sendiri dengan tombol tambah.

### F. Data loading dan kelengkapan

**36. [P1]** · `projects-list.ts:96-97, 331-332`, `owners-list.ts:112` dan `projects-list.ts:330`
- **Masalah:** `limit: 200` dan `limit: 1000` dalam satu request. Backend membatasi 100, jadi daftar project, opsi Owner, dan opsi Industri **terpotong diam-diam**.
- **Standar:** `ui-coding-style`: `fetchAll` dari `shared/utils/fetch-all.ts`.
- **Rekomendasi:** Ganti dengan `fetchAll(p => …$Response({ ...p }))`. Hapus `parseBody/extractDataArray` lokal (:365-397) dan pakai `parseBody/listOf` bersama.

**37. [P2]** · `owners-list.ts:192-199, 270-276`
- **Masalah:** Pencarian tidak di-debounce (satu request per ketukan, komentarnya pun mengakui ini). Hitungan tab "All" = `meta.total` (semua halaman), sedangkan tab lain menghitung halaman aktif saja, jadi hitungannya tidak sebanding.
- **Rekomendasi:** Debounce 400 ms dan `currentPage = 1`. Owner jumlahnya kecil (puluhan), jadi muat semua via `fetchAll` dan filter/urut/paginate di klien seperti `projects-list` dan Kanal Telemetri, sehingga hitungan tab konsisten.

**38. [P2]** · `backend project_service.go:47-101`
- **Masalah:** 6 query per project (owner, 3 count, lokasi, last seen). Ini N+1 di backend: 50 project berarti 300 query per load.
- **Rekomendasi:** Untuk `senior-dev-auditor`: satu query agregat dengan `GROUP BY id_project` (pola `OwnerService.List` :136-157).

### G. Inline style, CSS, kode mati

**39. [P2]** · `projects-list.html:39`
- **Masalah:** `style="max-height: 320px; overflow-y: auto;"`.
- **Rekomendasi:** Kelas `.pl-owner-menu` di `projects-list.scss` (prefiks komponen, lihat aturan class collision). Lebih baik lagi, ganti dropdown Owner menjadi `<select class="form-select">` seperti filter Kanal Telemetri.

**40. [P2]** · `owners-detail.html:467` dan `owners-add.html:135`
- **Masalah:** `bg-dark text-light` / `bg-dark text-white` di-hardcode. Di tema terang hasilnya kotak hitam, dan tidak memakai token tema.
- **Rekomendasi:** `bg-body-secondary font-monospace` (input readonly) / `bg-body-tertiary` (pre).

**41. [P3]** · `owners-detail.scss:1-24`
- **Masalah:** Kelas `.forwarding-card*` tidak dipakai di mana pun. `border rgba(255,255,255,.08)` juga tidak terlihat di tema terang.
- **Rekomendasi:** Hapus.

**42. [P3]** · `owners/owners-edit/` dan `owners/user-modal/user-modal.ts:8-13`
- **Masalah:** `OwnersEditPage` tidak dideklarasikan atau di-route-kan (kode mati). `UserModal` tidak punya `standalone: false` dan memakai `imports: [...]`, sehingga di Angular 20 otomatis menjadi standalone. Ini melanggar aturan NgModule.
- **Rekomendasi:** Hapus `owners-edit/`. Deklarasikan `UserModal` di `OwnersModule` dengan `standalone: false`.

**43. [P3]** · `owners-add` memakai ReactiveForms
- **Masalah:** `ui-form` menetapkan template-driven `[(ngModel)]` dengan objek datar. Selain itu `[disabled]` dipasang pada `formControlName` (`owners-add.html:97`), yang memicu peringatan Angular dan tidak benar-benar menonaktifkan field.
- **Rekomendasi:** Rombak saat payload diperbaiki (temuan 10). Toggle "Enable Webhook" sebaiknya dihapus dari form owner. Defaultnya `true` dan mewajibkan URL (`.ts:44, 132`), sehingga pengguna **tidak bisa menyimpan owner baru tanpa mengisi URL webhook**. Ini juga duplikat dari tab Integrasi.

### H. Catatan lintas halaman (di luar cakupan tapi terlihat)

**44. [P2]** · `sensors-page.component.html:4-7` (halaman referensi)
- **Masalah:** Header masih berbahasa Inggris ("Sensors", "sensors across … nodes", "updated … (auto every 60s)"), sedangkan Kanal Telemetri sudah Indonesia ("diperbarui … (otomatis tiap 60 dtk)").
- **Rekomendasi:** Seragamkan saat glosarium diterapkan.

**45. [P2]** · `app-menus.service.ts:22`
- **Masalah:** Badge menu "Unpaired Devices" di-hardcode `'3'`. Ini angka palsu di sidebar setiap halaman.
- **Rekomendasi:** Hapus, atau isi dari hitungan nyata.

---

## 3. Pola lintas halaman yang perlu diseragamkan sekali jalan

1. **Komponen header halaman bersama** (`<page-header>` di `SharedComponentsModule`).
   - Input: `breadcrumb[]`, `title`, `subtitle`.
   - Slot aksi `<ng-content>`, dengan `<page-guide-button>` otomatis di posisi paling kiri. Semua tombol `btn-sm`.
   - Dipakai owners list/detail/form, projects list, Kanal Telemetri, nodes list.
   - Header workspace tetap memakai toolbar shell (tidak boleh ada tombol Panduan kedua).
2. **Komponen KPI** (`<kpi-card [config]>` sesuai `ui-card`: `label`, `value`, `total?`, `tone`, `hint`, `filterKey`, `title`).
   - Sekarang markup-nya disalin di `sensors-page` dan `telemetry-channels-list`. Halaman owners/projects akan menjadi salinan ketiga dan keempat.
3. **Blok state** (`<state-block>`: `loading` | `error` + Coba lagi | `empty` dengan varian "belum ada" vs "tidak cocok filter").
   - Saat ini ada 5 variasi di 4 file yang diaudit.
4. **Agregator kesehatan** di `shared/utils/telemetry-freshness.ts`.
   - `summarizeFreshness(items, getLastAt, getInterval) → { fresh, stale, offline, nodata, lastAt }`. Dikelompokkan per `idProject` dan per `idOwner`.
   - Dipakai Kanal Telemetri (yang sudah menghitung `problemsByProject`, `telemetry-channels-list.ts:478`), projects list, dan owners list, supaya angka "bermasalah" sama di semua halaman.
5. **Badge status** hanya dari tiga peta:
   - `FRESHNESS_BADGE` untuk alat dan sensor.
   - Satu `projectStatusBadge` untuk status administratif project (Aktif / Pemeliharaan / Nonaktif; jangan pakai "Offline", karena kata itu milik konektivitas; `projects-list.ts:479` memetakan `archived` ke "offline").
   - `subtle` untuk role/plan.
6. **Glosarium dan format:** satu daftar istilah ID (temuan 25), `| number` id-ID, `timeAgo()` untuk relatif, `date:'dd MMM yyyy HH:mm'` untuk absolut. Tidak ada `toLocale*String` tanpa locale.
7. **Daftar kecil = muat semua via `fetchAll`**, lalu filter/urut/paginate di klien, dan hitungan tab dari dataset penuh. Owners dan projects jumlahnya puluhan, tidak perlu paginasi server.
8. **Integrasi pelanggan di satu tempat.**
   - Saat ini: API key ada di detail owner *dan* di `/developer`, MQTT broker hanya di `/developer`, webhook/DB hanya di detail owner.
   - Usulan: tab "Integrasi" di detail owner menampilkan ringkasan status ketiganya, dengan tautan "Kelola di Portal Developer".
   - Perlu keputusan owner produk: apakah webhook/MySQL/PG masih dipakai (tidak ada log pengiriman, `forwardingLogs` belum ada endpoint). Kalau tidak dipakai, sembunyikan.

---

## 4. Usulan layout

### 4.1 Owners list (`/iot/owners`, khusus admin)

```
IoT / Owner
Owner                                            [Panduan] [⟳] [+ Tambah Owner]
12 owner · 31 project · diperbarui 10:42:05 (otomatis tiap 60 dtk)

┌ KPI (row-cols-2 row-cols-lg-5, kpi-link → memfilter tab) ───────────────────┐
│ Owner        │ Project      │ Node mengirim  │ Alert terbuka │ Owner        │
│ 12           │ 31           │ data 184 / 210 │ 7             │ bermasalah 3 │
│              │              │ sesuai interval│ dari N aturan │ terbanyak:   │
│              │              │                │               │ PDAM Tebo · 9│
└───────────────────────────────────────────────────────────────────────────────┘
<card>
 Tab: Semua (12) · Bermasalah (3) · Normal (8) · Belum ada perangkat (1)
 Filter: [Cari nama / kode / PIC] [Industri ▾] [SLA ▾]
 Tabel (sortable, default: Bermasalah ↓ lalu nama):
 OWNER              │ PROJECT · NODE · SENSOR │ KESEHATAN DATA          │ ALERT │ DATA TERAKHIR │ PIC
 PDAM Tirta Tebo    │ 3 · 42 · 96             │ ● 30  ● 8  ● 4          │ 2     │ 3 mnt lalu    │ Budi S.
 00412 · PDAM       │                         │ (badge FRESHNESS_BADGE) │       │ (title: abs.) │ 0812…
 Menampilkan 1–10 dari 12 · [10 ▾] · ‹ 1 2 ›
</card>
```

- **Yang dihapus:** checkbox, Export/Invite/More Actions, tab Active/Trial/Suspended, UUID, kolom Alerts palsu, "Last Activity".
- **Sumber "Kesehatan data" dan "Data terakhir":** sensor via `fetchAll` (sama seperti Kanal Telemetri) dikelompokkan per `idOwner` dengan `summarizeFreshness`, atau field agregat baru dari backend. **Kalau sumbernya belum tersedia, kolom dan KPI terkait tidak ditampilkan.**
- **Sumber "Alert terbuka":** subquery `alert_events.status='open'` di `OwnerService.List`. Sebelum itu ada, kolom ini juga tidak ditampilkan.
- Baris yang bisa diklik mengarah ke `/iot/owners/:id`.

### 4.2 Owner detail (`/iot/owners/:id`)

```
IoT / Owner / PDAM Tirta Tebo
PDAM Tirta Tebo                                  [Panduan] [Ubah] [← Kembali]
00412 · PDAM · PIC Budi Santoso

┌ KPI ─────────────────────────────────────────────────────────────────────┐
│ Project 3 │ Node 42 │ Sensor 96 │ Alert terbuka 2 (→ /iot/alerts) │ Data terakhir 3 mnt lalu │
└──────────────────────────────────────────────────────────────────────────┘
Tab (nav-tabs-v2): Ringkasan · Project (3) · Pengguna (4) · Integrasi (API key 2)

Ringkasan:  [Profil: kode, industri, SLA, PIC, email, telepon, alamat, dibuat, diubah; kosong = "—"]
            [Project perlu perhatian: 3 teratas dengan node mati/terlambat → link workspace]
Project:    tabel dari ownerData.projects: Nama · Status (subtle) · Area · Node · aksi "Buka" → /iot/projects/:id/overview
            empty: "Owner ini belum punya project" + [Tambah Project] (prefill owner)
Pengguna:   tabel yang ada; tanpa kolom Email ganda; badge subtle; Coba lagi; modal konfirmasi
Integrasi:  ① API Key (yang ada, sudah nyata) ② Penerusan data: status per tujuan (Webhook/MySQL/PostgreSQL/MQTT)
            → hanya yang terkonfigurasi; empty state + [Tambah]; MQTT & dokumentasi → /developer
            tanpa "Forwarding Activity" sampai endpoint log ada
```

- **Dihapus:** data demo, teks catatan dev, badge "Forwarding Health" hijau permanen, form konfigurasi raksasa di atas lipatan layar.
- Form webhook/DB dibuka di drawer/modal dari tab Integrasi. Isinya tidak dirender penuh di halaman.

### 4.3 Projects list (`/iot/projects`, admin + tenant)

**Pilihan bentuk: tabel, bukan kartu.** Halaman ini halaman *monitoring indeks*. Admin membandingkan puluhan project dari banyak PDAM pada beberapa angka yang sama (node mengirim/terlambat/mati, data terakhir). Tabel memungkinkan scan vertikal, sort per kolom, dan 15–20 baris per layar. Grid kartu sekarang hanya memuat 9 project per layar dengan 3 tombol per kartu. Kartu hanya cocok untuk tenant dengan ≤ 6 project. Kalau mau dipertahankan, jadikan toggle tampilan, bukan default. Update `ui-list`: projects-list tidak lagi menjadi referensi "card grid".

```
IoT / Project
Project                                          [Panduan] [⟳] [+ Tambah Project]
31 project · 5 owner · diperbarui 10:42:05 (otomatis tiap 60 dtk)

┌ KPI ──────────────────────────────────────────────────────────────────────────┐
│ Node mengirim data │ Terlambat │ Mati / belum pernah │ Project bermasalah │ (Alert terbuka — │
│ 184 / 210          │ 14        │ 12                  │ 6 · terbanyak: DMA │  hanya jika      │
│                    │           │ terlama: Jl. Sudirman│ Sungai Bengkal · 5 │  sumber nyata)   │
└───────────────────────────────────────────────────────────────────────────────┘
<card>
 Tab: Semua (31) · Bermasalah (6) · Normal (23) · Belum ada perangkat (2)
 Filter: [Owner ▾ (admin saja)] [Area ▾] [Status project ▾ Aktif/Pemeliharaan/Nonaktif] [Cari]  [× Reset]
 PROJECT                │ STATUS  │ NODE MENGIRIM │ TERLAMBAT/MATI │ SENSOR │ DATA TERAKHIR │
 DMA Sungai Bengkal     │ Aktif   │ 7 / 12        │ 2 · 3          │ 28     │ 4 mnt lalu    │ ›
 PDAM Tirta Tebo        │ (subtle)│ (getFreshness)│ (warning/danger)│        │ title: abs.   │
 Menampilkan 1–20 dari 31 · [20 ▾] · ‹ 1 2 ›
</card>
```

- Default sort: Bermasalah ↓ (mati + terlambat terbanyak), lalu nama. Baris diklik mengarah ke `/iot/projects/:id/overview`.
- Kolom Owner disembunyikan untuk tenant. Filter Owner juga hanya untuk admin.
- Opsi Area diganti istilah PDAM (DMA, IPA/Intake, Jaringan transmisi, Reservoir, Lainnya). Ini perlu keputusan produk, karena `ProjectAreaType` sekarang berisi `plant/pipeline/farm/industrial`.
- Sumber angka node: sensor/node per project lewat `fetchAll` dan `getFreshness`, satu dataset dengan Kanal Telemetri. Alert disembunyikan sampai backend menghitungnya.

---

## 5. Urutan perbaikan (quick wins dulu)

**Gelombang 1 (≤ ½ hari, hanya FE, menghapus semua yang "tidak realistis"):**
1. Hapus teks catatan dev yang bocor (temuan 4) dan data demo forwarding, lalu ganti dengan empty state (temuan 3).
2. Owners list:
   - Petakan `projectCount/nodeCount/sensorCount` (temuan 1).
   - Hapus kolom Alerts, tab status palsu, default SLA "bronze", UUID, checkbox, aksi mati, dan "Last Activity" (temuan 2, 9, 15, 17, 18).
3. Projects list: hapus Alerts dan opsi urut "Alert terbanyak" (temuan 5).
4. Owner form:
   - Payload update menyertakan email, telepon, alamat. Hapus Notes, Payload Preview, dan Owner Summary.
   - Hapus forwarding dari form owner.
   - Tambahkan PDAM ke opsi industri (temuan 10–12, 43).
5. Owner detail:
   - Badge forwarding sesuai status. "—" untuk field kosong.
   - Tautan `/developer`. Hapus menu `#delivery` (temuan 8, 19, 20).
6. Route: `AuthGuard` + `roles:['admin']` untuk owners. Tambahkan `data.guide` di keempat route dan `<page-guide-button>` (temuan 21, 24).

**Gelombang 2 (1–2 hari, FE):**
7. `fetchAll` di semua list dan opsi filter. Muat semua lalu filter di klien. Debounce pencarian (temuan 36, 37).
8. State seragam: `alert-danger` + Coba lagi, dua varian empty state, sembunyikan tabel saat error (temuan 32–35).
9. Glosarium ID, `timeAgo`, `| number`, gaya tombol header, badge subtle (temuan 25–31).
10. Owner detail jadi bertab: Ringkasan / Project (dari `ownerData.projects`) / Pengguna / Integrasi (temuan 13).
11. Ekstrak `<page-header>`, `<kpi-card>`, `<state-block>`, dan `summarizeFreshness()` (§3). Terapkan ke owners/projects, lalu Kanal Telemetri dan Sensors.

**Gelombang 3 (FE + backend):**
12. Projects list menjadi tabel dengan KPI dan tab kesehatan berbasis `getFreshness`. Backend mengirim `lastSeenAt` + `telemetryIntervalSec` per node, atau FE memakai dataset sensor (temuan 6, 7, 14, 23).
13. Owners list: KPI dan kolom Kesehatan data / Data terakhir / Alert terbuka dari sumber nyata (§4.1).
14. Backend: `alerts` nyata per project dan owner, `email/phone/address/ownerCode` di detail, lokasi deterministik, query agregat menggantikan N+1 (temuan 5, 8, 7, 38).
15. Keputusan produk: webhook/MySQL/PG dipertahankan atau disembunyikan, istilah Area untuk PDAM. Setelah itu jalankan `guide-writer` untuk empat panduan baru.

### Hal yang perlu dijelaskan di Panduan (untuk `guide-writer`, setelah perbaikan)
- Arti "Mengirim data / Terlambat / Mati": dasarnya interval lapor alat (`telemetry-freshness.ts`), bukan menit tetap.
- "Project bermasalah" = punya ≥ 1 node terlambat atau mati. Urutan default menaruh yang bermasalah di atas.
- Perbedaan "Status project" (administratif, diatur admin) dan status koneksi alat.
- Tab Integrasi: API key hanya tampil sekali saat dibuat. Pengaturan MQTT ada di Portal Developer.
- Alasan sebuah angka tampil "—": belum diatur atau belum ada sumbernya, bukan nol.
