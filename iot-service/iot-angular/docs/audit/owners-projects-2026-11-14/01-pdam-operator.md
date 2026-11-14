# Audit Operator PDAM — /iot/owners, /iot/owners/:id, /iot/projects (14 Nov 2026)

## Catatan metode (jujur)
- Dev server `:4200` dan API `:3000` **tidak jalan** saat audit (ERR_CONNECTION_REFUSED, `nc` gagal). Saya tidak menyalakan backend karena terhubung ke DB lewat tailnet. Jadi **tidak ada angka hidup**. Semua perbandingan "tampil vs nyata" saya turunkan dari kontrak yang dikirim backend Go (`iot-backend-go/app/services/owner/owner_service.go`, `project/project_service.go`, `http/controllers/owner/owner_controller.go`) dibanding nama field yang dibaca Angular.
- Temuan bertanda **[perlu cek angka hidup]** adalah dugaan kuat yang jumlahnya baru bisa dipastikan setelah server jalan.

---
## 1. /iot/owners (daftar)

### Kesan pertama
Tabel terlihat lengkap (badge status, SLA, kontak, Alerts), tetapi hampir semua kolom angka dan badge dibaca dari nama field yang **tidak dikirim backend**. Hasilnya kemungkinan besar "0 Projects / 0 Nodes · 0 Sensors", Alerts 0, semua "Active", SLA "BRONZE". Sebagai operator saya tidak bisa membedakan PDAM sehat dan PDAM bermasalah.

### Tugas harian
| Tugas | Status | Alasan |
|---|---|---|
| Cek titik pantau mati per PDAM | ❌ | Tidak ada kolom node online/mati, tidak ada "data terakhir masuk". |
| Tekanan/debit sekarang | ❌ | Bukan fungsi halaman ini, tapi tidak ada ringkasan kesehatan sama sekali. |
| Tren / kebocoran | ❌ | Tidak ada. |
| Tindak lanjut alarm | ❌ | Kolom "Alerts" dibaca dari `alertCount`, backend tidak mengirimnya, jadi 0 terus. |
| Laporan/ekspor | ❌ | "Export Owners", "Invite Owner Admin", "Assign SLA", "Generate Contract", "Archive Owner" adalah `href="javascript:;"` tanpa fungsi. |
| Cari berdasarkan alamat/nama | ⚠️ | Search hanya nama/industri/kontak (backend), padahal placeholder menjanjikan "ID / kontak". |

### Temuan
1. [Kritis] Kolom "Projects / Nodes / Sensors" salah baca field. Angular membaca `totalProjects`, `totalNodes`, `totalSensors`; backend mengirim `projectCount`, `nodeCount`, `sensorCount`. Hasil: `|| 0` → semua baris "0 Projects, 0 Nodes · 0 Sensors" walau PDAM punya node. Usul: baca nama field yang benar; jika benar-benar 0 tampilkan 0, jika gagal tampilkan "–".
2. [Kritis] Kolom "Alerts" (merah tebal) membaca `alertCount`; list backend tidak mengirim field itu. Selalu 0. Operator mengira tidak ada alarm. Usul: sediakan jumlah alarm terbuka dari backend (`activeAlerts` sudah dihitung di detail) atau hapus kolom.
3. [Kritis] Badge status "Active/Trial/Suspended" dan tab filternya palsu. Tabel `owners` tidak punya kolom status; `mapStatus` mengembalikan `'active'` untuk semua. Tab "Trial 0" dan "Suspended 0" tidak punya arti. Usul: hapus tab dan badge, atau ganti dengan status yang nyata (jumlah node mati / data terakhir).
4. [Tinggi] Hitungan tab tidak konsisten: "All" = total backend, "Active/Trial/Suspended" = hitung dari **halaman yang sedang dimuat** (10 baris). Mengganti halaman mengubah angkanya.
5. [Tinggi] "SLA BRONZE" muncul sebagai default rekaan (`owner.slaLevel || 'bronze'`) untuk owner yang SLA-nya kosong. Itu klaim kontrak yang tidak ada. Usul: tampil "SLA belum diisi".
6. [Tinggi] Kolom "Last Activity" = `owners.updated_at` (kapan data owner terakhir disunting di admin), bukan kapan data sensor terakhir masuk. Format jam `en-US` + "UTC" (mis. "09:12 AM UTC"), selain itu "Yesterday"/"Nov 12". Operator membaca ini sebagai "PDAM terakhir kirim data". Usul: ganti jadi "Data terakhir masuk" dari node, format WIB, "12 mnt lalu".
7. [Sedang] Kontak: nilai kosong diganti string `'-'` lalu ditampilkan dengan ikon telepon; `contactPhone` bisa berupa nomor SMS perangkat, bukan orang (aturan picPhone). Tidak ada alamat PDAM padahal `address` dikirim backend.
8. [Sedang] Search: placeholder "Cari nama owner / ID / kontak", backend hanya `name ILIKE`, `industry`, `contact_person`. Cari ID, email, atau nomor telepon tidak menemukan apa-apa. Tiap ketikan memanggil API tanpa debounce (ada komentar "reload immediately for now").
9. [Sedang] Filter Industry dibangun dari `limit: 1000`, tetapi backend memotong ke 100. Jika owner > 100, opsi industri tidak lengkap tanpa pemberitahuan.
10. [Rendah] Bahasa campur: "Showing 1 to 10 of N owners", "Rows", "Previous/Next", "Loading owners...", "Yesterday" vs "Tidak ada owner sesuai filter". Checkbox per baris tidak terhubung ke aksi apa pun. Error list hanya `err.message` tanpa tombol "Coba lagi" (tombol Refresh hanya di state kosong).
11. Istilah "Owner" membingungkan operator. Di lapangan itu "PDAM / pelanggan". Usul: "PDAM (Owner)".

### Fitur yang dibutuhkan tapi tidak ada
- Per PDAM: node mati / total (pakai `getFreshness`), data terakhir masuk, alarm terbuka (angka nyata), tautan ke daftar node mati.
- Urut "paling banyak masalah".
- Ekspor CSV yang benar-benar jalan; kolom alamat.

### Perlu dijelaskan di Panduan
Beda Owner vs Project vs Node; arti kolom "Last Activity"; apa itu SLA dan sumbernya; status Active/Trial/Suspended (jika dipertahankan); halaman ini belum ada Panduan (`assets/guides/` hanya punya project-overview dan project-sensors).

---
## 2. /iot/owners/:id (detail)

### Kesan pertama
Dua pertiga halaman adalah **form konfigurasi forwarding (Webhook/MySQL/PostgreSQL)** yang terisi data contoh bernama "adhiwater", sedangkan hal yang saya butuhkan (daftar project, node mati, alarm, kontak) hampir tidak ada. Tombol Save/Test terlihat berfungsi tetapi backend hanya stub.

### Tugas harian
| Tugas | Status | Alasan |
|---|---|---|
| Titik pantau mati / sejak kapan | ❌ | Tidak ada daftar project/node di halaman ini, padahal backend sudah mengirim `projects[]` dengan `nodeCount`. |
| Tekanan & debit | ❌ | Tidak ada. |
| Tren 24 jam/7 hari | ❌ | Tidak ada. |
| Alarm | ❌ | `statistics.activeAlerts` dikirim backend, tidak ditampilkan. |
| Laporan | ❌ | Tidak ada. |
| Cari titik/alamat | ❌ | Tidak ada. |
| Kelola akses (user, API key) | ⚠️ | Tabel user dan API key nyata, tetapi kolom Email ganda dan teks Inggris. |

### Temuan
1. [Kritis] **Form Webhook/DB berisi data rekaan bila owner belum punya konfigurasi.** Default di kode: label "Command Center Webhook", URL `https://hooks.adhiwater.co.id/iot/ingest`, secret `whsec-demo-token`, header `X-Tenant-Code: ADHI-WATER`, "Last Delivery 26 May 09:12" status **"Healthy"**; MySQL `mysql-fw.adhiwater.local` "Healthy 26 May 09:10"; PostgreSQL `pg-fw.ops.internal` "Disabled". Ini muncul sebagai konfigurasi PDAM yang sedang bocor ke owner mana pun yang belum punya data. Menekan Save akan membuat konfigurasi dari data contoh. Melanggar aturan "no fake data". Usul: awali state kosong ("Belum ada webhook. Tambah webhook") tanpa nilai bawaan.
2. [Kritis] **Save/Test forwarding adalah stub di backend.** `OwnerController.CreateWebhook/UpdateWebhook/CreateDatabase/UpdateDatabase` hanya `return {}` HTTP 200; `TestWebhook` mengembalikan `success:false, "placeholder"`; `TestDatabase` `connected:false, "placeholder"`. Akibatnya UI menampilkan hijau "Configuration saved successfully!" padahal **tidak tersimpan**; setelah muat ulang kembali ke data lama. Operator mengira data PDAM sudah diteruskan ke sistem mereka. Test menampilkan "Test failed: placeholder". Usul: sembunyikan seluruh kartu sampai backend siap, atau beri label "belum tersedia".
3. [Kritis] State bocor antar owner. Komponen dipakai ulang saat pindah `/iot/owners/A` → `/B`. Jika B tidak punya webhook/DB, `webhookConfig` dan `databaseConfigs` **tetap berisi milik A** (hanya `webhookId` yang direset). Operator bisa melihat (dan menyimpan) endpoint/host PDAM lain di PDAM yang salah. Perlu direset ke kosong tiap muat.
4. [Tinggi] Setelah backend benar, secret token tampil `***` dan dikirim balik `***` saat Save (`secretToken || undefined`), berisiko menimpa secret asli dengan tiga bintang. Field juga `type=text` (bukan password).
5. [Tinggi] "Forwarding Health" badge selalu hijau (`bg-success-subtle`) walau nilainya "Not Configured" atau "Disabled". Nilai "Operational" hanya berarti ada konfigurasi enabled, bukan bahwa pengiriman berhasil. Usul: warna sesuai nilai, dan tampilkan "Pengiriman terakhir" nyata atau "belum pernah".
6. [Tinggi] Kartu Owner Snapshot: Email dan Phone **selalu kosong**. Kode: `email: ''  // Not in API yet`, padahal detail backend memang tidak mengirim email/phone/address (hanya list/GetByID yang mengirim). Baris kosong tampil tanpa label. Usul: kirim dari backend atau panggil owner biasa; tampilkan "belum diisi".
7. [Tinggi] Angka "Sensors" tidak konsisten dengan daftar. Detail memakai `statistics.activeSensors` (hanya status 'active'), daftar memakai semua sensor. Label "Sensors" menyesatkan; angka kedua halaman bisa berbeda untuk owner yang sama. Selain itu `COUNT(DISTINCT ...)` melintas join alert, jadi query berat. Usul: tampilkan "Sensor aktif x dari y".
8. [Tinggi] Tidak ada kesehatan operasional: tidak ada daftar Project milik PDAM ini, node mati/total, data terakhir, alarm terbuka (`activeAlerts` dibuang). Statistik cuma 3 angka tanpa makna kondisi.
9. [Sedang] Tabel User: kolom Email muncul dua kali (di bawah Name dan kolom sendiri); "Last Login" memakai `date:'short'` (format Amerika "11/14/26, 9:12 AM"); "Never" untuk null. Tombol ikon mata berpindah halaman, bukan melihat sekadar. Konfirmasi dan alert berbahasa Inggris. Role selain admin/tenant tidak berwarna.
10. [Sedang] "Last Delivery" memakai `date:'dd MMM HH:mm'` tanpa tahun; tanggal 2024 terlihat seperti tahun ini. Tombol Test sukses di sisi klien menulis `lastDeliveryAt = now` dan "Healthy" seolah pengiriman nyata.
11. [Sedang] Judul "Owner {{name}}" dan fallback "Not Specified" / "N/A" / "Unknown Owner" / "Loading..." di breadcrumb. Error halaman: "Failed to load owner details" tanpa penjelasan (403/404/jaringan).
12. [Rendah] API Key: "Usage 0 today / 0 total", "Plan basic (60/min)" nyata dari DB, tetapi "Usage" bukan statistik tren; ada link `/external-api/docs` relatif ke host Angular (bisa 404). Pesan status dicocokkan lewat `includes('success')` (rapuh).
13. [Rendah] Bagian "Forwarding Activity" dikomentari, tetapi sisa komentar (baris 637 "Needs implementation…") bocor di template.

### Fitur yang dibutuhkan tapi tidak ada
Daftar project + node mati; alarm terbuka; kontak lengkap (email/telepon/alamat PDAM); SLA/kontrak hanya jika sumber nyata; data terakhir masuk per PDAM; tautan ke monitor project.

### Perlu dijelaskan di Panduan
Apa itu forwarding (kirim data PDAM ke sistem mereka), status "Healthy/Operational/Disabled", API key dan batas permintaan, beda user "admin" dan "tenant", siapa yang boleh mengubah.

---
## 3. /iot/projects (daftar)

### Kesan pertama
Kartu terlihat rapi dengan "Nodes Online x/y", "Sensors", "Alerts" dan "last sync". Tetapi Alerts **di-hardcode 0 di backend**, "online" tidak memakai aturan freshness, dan daftar dipotong 100 tanpa pemberitahuan.

### Tugas harian
| Tugas | Status | Alasan |
|---|---|---|
| Titik mati & sejak kapan | ⚠️ | "online/total" dan "last sync" ada, tetapi dari kolom tersimpan, bukan `getFreshness`; tidak ada nama node mati. |
| Tekanan & debit sekarang | ❌ | Tidak ada (tombol Monitor mengarah ke halaman lain). |
| Tren | ❌ | Tidak ada. |
| Alarm | ❌ | Alerts selalu 0. |
| Laporan/ekspor | ❌ | Tidak ada tombol ekspor. |
| Cari berdasarkan alamat | ⚠️ | Placeholder "nama project / ID / lokasi", backend hanya `name ILIKE`. |

### Temuan
1. [Kritis] "Alerts" di kartu = **0 hardcode** di backend (`"alerts": 0` di `project_service.go` List). Angka merah/abu itu bukan data. Operator mengira tidak ada alarm di semua project. Usul: hitung `alert_events` terbuka per project, atau sembunyikan.
2. [Kritis] "Nodes Online x/y" memakai `nodes.connectivity_status = 'online'` (kolom tersimpan), bukan `getFreshness` dari data terakhir. Jika penulis kolom itu tertinggal, node yang sudah diam berjam-jam tetap dihitung online (atau sebaliknya). Bertentangan dengan aturan proyek (satu sumber status). [perlu cek angka hidup: bandingkan dengan node-list project]. Usul: hitung dari `last_seen_at`/interval dengan aturan yang sama dan tampilkan "mati" terpisah dari "tak ada data".
3. [Tinggi] Daftar terpotong diam-diam: Angular minta `limit: 200`, backend (service dan repo) memaksa maksimal 100. Tab "All (N)", jumlah per status dan "Showing 1 to 9 of N projects" menghitung hanya 100 pertama; jika ada >100 project, project lain tidak muncul dan tidak ada peringatan. Dropdown Owner (`limit 200`) juga terpotong 100.
4. [Tinggi] "last sync" = `MAX(nodes.last_seen_at)` project. Satu node hidup membuat project tampak segar walau 9 dari 10 node mati. Tampilan "5m ago", "just now", "3d ago" berbahasa Inggris, lebih dari 7 hari memakai `toLocaleDateString()` (format tergantung browser), "Belum pernah" Indonesia. Usul: "Data terakhir 12 mnt lalu (WIB)", beri tanda jika node mati > 0.
5. [Tinggi] Status project "Offline" (dari `inactive/archived`) adalah status administrasi, tetapi operator membacanya "perangkat mati". Dua tab "Maintenance/Offline" juga tidak punya sumber jelas; semua nilai tak dikenal dipaksa "active". Usul: ganti "Nonaktif/Diarsipkan".
6. [Sedang] Lokasi: `SELECT address FROM node_locations WHERE id_project=? LIMIT 1` tanpa urutan. Alamat yang tampil acak antar muat, dan "Unknown location" jika kosong. Aturan alamat di sini juga tidak memisahkan alamat titik pantau.
7. [Sedang] Performa: List menjalankan ±6 query per project (owner, 3 count, alamat, last seen) × 100 = ±600 query/muat; halaman bisa lambat saat dibuka pagi hari.
8. [Sedang] Fallback teks "Unknown Owner", "Untitled Project", "Unknown location" ditampilkan seperti data nyata. Tipe area "Plant/Pipeline/Farm/Industrial" tidak relevan untuk PDAM (DMA, reservoir, pompa, sumur).
9. [Rendah] Bahasa campur: "Nodes Online", "Alerts", "Per page", "Showing x to y", "Previous/Next", "Detail/Nodes/Monitor". Search tanpa tombol bantu; error "Failed to load projects" dengan "Coba lagi" (baik) tetapi pesan Inggris.
10. [Rendah] Tidak ada Panduan untuk halaman ini.

### Fitur yang dibutuhkan tapi tidak ada
Daftar project dengan node mati dihitung benar; alarm terbuka nyata; urut "paling bermasalah"; filter "ada node mati"; ekspor; ringkasan di atas kartu (total node, mati, tanpa data).

### Perlu dijelaskan di Panduan
Arti "Nodes Online" (aturan freshness, ambang menit), arti "last sync", beda status project vs status node, arti Maintenance/Offline, batas 100 project.

---
## Ringkasan 15 teratas
Lihat pesan akhir.
