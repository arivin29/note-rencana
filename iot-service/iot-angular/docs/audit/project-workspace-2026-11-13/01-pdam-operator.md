# Audit Operator PDAM — Workspace Project PDAM TEBO (13 Nov 2026)

Peran: pdam-operator. Metode: **browser tidak tersedia** ("Browser is already in use" oleh sesi lain), jadi seluruh audit dari template HTML + TS (dibaca penuh, tidak ada tampilan live). Semua yang tertulis "terlihat" di bawah adalah hasil membaca kode; angka/teks persis dikutip dari template. Perlu verifikasi visual kalau browser bebas.

Konteks: 12 titik pantau, semuanya logger tekanan (bar), kirim tiap 120 detik.

---
# BAGIAN 1 — HALAMAN DETAIL SENSOR/CHANNEL (utama)
URL: `.../node/<nodeId>/sensor/<id>` → `SensorPageComponent` membungkus `SensorChanelDetail` (embedded).

## 1.1 Kesan pertama
Judul halaman besar berbunyi **"pressure"** (kode metrik mentah), subjudul "Pressure channel • BAR • Node: TBO-xxx". Isinya tabel log mentah 10 baris per halaman dengan label bahasa Inggris dan Indonesia bercampur. Tidak ada grafik sama sekali. Untuk pekerjaan saya (melihat tren tekanan 24 jam), halaman ini tidak menjawab; saya cuma bisa membaca baris demi baris.

## 1.2 Tugas harian × status
| Tugas | Status | Alasan |
|---|---|---|
| 1. Cek mana yang mati, sejak kapan | ⚠️ | Hanya ada "Last sample: dd MMM, HH:mm" kecil di kartu Channel Code, tanpa badge Fresh/Stale/Offline, tanpa "x menit lalu". Kalau tidak ada data: "Belum ada data". Badge "Online/Offline" di tabel adalah status per-baris berdasar ambang, BUKAN status alat (menyesatkan, lihat T-3). |
| 2. Tekanan sekarang vs normal | ❌ | Tidak ada angka "nilai terakhir" besar. Nilai terbaru harus dicari di baris pertama tabel (format 2 desimal). Tidak ada pembanding normal/rata-rata. |
| 3. Tren 24 jam / 7 hari | ❌ | Tidak ada grafik, tidak ada min/maks/rata-rata periode. Pilihan periode ada (Hari Ini ... Custom) tapi hanya mengubah isi tabel. |
| 4. Tindak lanjut alarm | ❌ | Tidak ada daftar alarm channel ini. "Status" tabel hanya hasil hitungan ambang di browser, bukan alarm sungguhan. |
| 5. Laporan/ekspor | ⚠️ | "Export CSV" ada (dua tombol sama) tapi hanya mengekspor yang sudah dimuat; kolom dalam Inggris ("ID, Timestamp, Value, ...") dengan timestamp ISO UTC; nama file `sensor-pressure-2026-...csv` tanpa nama lokasi. Catatan berkoma bisa merusak CSV (tidak di-quote). |
| 6. Cari berdasar alamat | ❌ | Lokasi ditulis "Node: <kode>" — alamat tidak muncul di mana pun di halaman ini. Melanggar aturan proyek (alamat sebagai nama utama). |

## 1.3 Temuan
1. **[Kritis] Ambang default palsu → "Auto alert di luar rentang aman" bohong.** TS: `minThreshold: parseFloat(...) || 0`, `maxThreshold: parseFloat(...) || 100`. Kalau channel tidak punya ambang di database, halaman memajang badge hijau "MIN 0 BAR" dan merah "MAX 100 BAR" seolah-olah itu ambang sungguhan, dan menulis "Auto alert di luar rentang aman". Untuk logger tekanan distribusi (normal ~1–5 bar) rentang 0–100 tidak akan pernah memicu apa pun. Operator mengira ada pengaman padahal tidak. Usulan: kalau ambang belum diisi tampilkan "Ambang belum diatur" + tombol Atur; jangan tulis "Auto alert" kecuali ada aturan alert aktif. Juga `|| 0` membuat ambang yang memang bernilai 0 tidak bisa dibedakan dari kosong.
2. **[Kritis] Data acak palsu bisa muncul sebagai data nyata.** Di semua jalur error (API gagal, sensor gagal dimuat) kode memanggil `generateDummyData()`: 150 baris nilai acak sekitar 5,2 dengan status acak online/warning/error/offline dan kualitas acak 70–100%. Tidak ada tanda "DATA CONTOH". Total Records, tabel, dan CSV akan berisi data bohong. Operator bisa melaporkan angka rekayasa ke atasan. Usulan: ganti dengan state error jelas ("Gagal memuat data, coba lagi") + tombol Muat ulang; tidak ada data acak sama sekali. Juga `applyFilters()` tanpa channelId memanggil dummy lagi, dan dummy bertambah (push) tiap klik karena `allReadings` tidak dikosongkan.
3. **[Tinggi] Kolom "Status" dan tab status ("All Status/Online/Warning/Error/Offline") bukan status alat.** "Online" = nilai berada di dalam ambang; "Error" = di luar ambang; "Offline" tidak pernah diisi oleh logika sebenarnya (hanya oleh dummy), tetapi tab "Offline" tetap tampil dengan hitungan 0. Operator akan membaca "Offline" sebagai alat mati dan "Error" sebagai alat rusak. Padahal ini soal nilai terhadap ambang. Usulan: ubah label ke "Normal / Mendekati batas / Di luar batas"; status alat (Fresh/Stale/Offline relatif interval 120 dtk) dipisah dan ditaruh di header seperti tab Sensors.
4. **[Tinggi] Logika "warning" salah untuk ambang min.** `value < minThresh*1.1 || value > maxThresh*0.9`. Dengan min=0 (default), `0*1.1=0` jadi sisi bawah tidak pernah peringatan; dengan min negatif perhitungannya terbalik. Tekanan turun mendekati 0 (tanda kebocoran/putus pasokan) tidak ditandai. Juga `value < min` memberi status "error" padahal nilai 0 bar dari logger bisa berarti pipa kosong — penting tapi tidak dijelaskan. Usulan: margin = 10% dari lebar rentang (max−min), dua sisi simetris.
5. **[Tinggi] Tidak ada grafik tren.** Tugas inti saya (tekanan turun, MNF naik) memerlukan garis waktu dengan garis ambang. Halaman hanya tabel. Usulan: grafik garis tekanan untuk periode terpilih (default 24 jam) di atas tabel, garis ambang min/maks, nilai terakhir besar, kartu Min/Rata-rata/Maks.
6. **[Tinggi] Nama & lokasi tidak sesuai aturan alamat.** Judul = `channel.metricCode` ("pressure"); lokasi = `Node: <nodeCode>`. 12 titik pantau akan semua berjudul "pressure" — tak bisa dibedakan jika ada banyak tab/riwayat browser. Kartu "Node Location" juga hanya menulis kode. Usulan: judul = alamat node (fallback kode), baris kedua = kode node + "Tekanan (bar)".
7. **[Tinggi] ID di URL ambigu: kadang ID sensor, kadang ID channel.** Daftar aset di sidebar kiri membuka `sensor/<idSensor>`, sedangkan tab Sensors membuka `sensor/<idSensorChannel>`. Komponen coba sebagai channel dulu → gagal (error 404 di console) → baru coba sebagai sensor dan hanya memuat **channel pertama**. Konsekuensi: sensor multi-channel hanya menampilkan satu channel tanpa pemberitahuan; ada permintaan gagal tiap buka dari sidebar; header (judul/ambang) diisi dari dua jalur berbeda sehingga isinya tidak sama (dari jalur sensor, judul = label sensor, sensorUnit diatur; dari jalur channel, judul = kode metrik). Untuk logger tekanan (1 channel) tidak terasa, tetapi tidak konsisten. Usulan: satu jenis ID; kalau sensor punya >1 channel beri pemilih channel.
8. **[Tinggi] Tombol Hapus Channel berbahaya & keluar dari workspace.** "Delete Channel" (merah, berdampingan dengan Export) hanya memakai `confirm()` Inggris, dan setelah sukses mengarahkan ke `/iot/nodes/<nodeId>` (daftar Node global, menu sidebar utama berubah, workspace project hilang). Operator pun bisa menghapus data telemetri dan aturan alert tanpa hak/peringatan peran. Usulan: pindahkan ke menu "⋯" atau halaman Config; konfirmasi mengetik kode; kembali ke `/iot/projects/<id>/node/<nodeId>`.
9. **[Sedang] "Sync Telemetry" tidak menyinkronkan apa pun.** Tombol bernama "Sync Telemetry" hanya memanggil `applyFilters()` (muat ulang data), sama dengan tombol "Refresh" di bawah. Dua tombol Refresh + dua "Export CSV" membingungkan. Usulan: satu tombol "Muat ulang" + satu "Ekspor CSV"; atau tambah auto-refresh 60 dtk seperti tab Sensors dan tampilkan "Diperbarui HH:MM:SS".
10. **[Sedang] Kolom "Kualitas" mengada-ada.** `quality: dp.quality === 'good' ? 100 : 70` — nilai hanya dua kemungkinan (100% / 70%), digambar sebagai bar persen. Operator mengira ini sinyal/kualitas data terukur. Usulan: hapus bar persen; tampilkan "Baik / Meragukan" saja, atau hilangkan kolom.
11. **[Sedang] Kolom "Sample / #id / Frame ID" tidak berarti.** `id = dataPoints.length - index` hanyalah nomor urut dalam jendela saat ini, bukan ID frame; berubah ketika periode diganti. Berlabel "Frame ID" menyesatkan. Usulan: hapus kolom.
12. **[Sedang] Interval data dan sampel tidak dijelaskan; kesenjangan data tak terlihat.** Logger kirim tiap 120 dtk → 720 baris/hari, 5.040 baris/7 hari. Tabel 10 baris/halaman → 504 halaman; paginasi memotong "1 2 3 4 ... 504". Tidak ada indikator **lubang data** (mis. jam 02:00–05:00 kosong) padahal itulah informasi terpenting saat alat mati. Usulan: agregasi (rata-rata per 15 mnt / per jam) untuk periode panjang + penanda "Tidak ada data selama X jam".
13. **[Sedang] Masalah periode/zona waktu.** (a) "Hari Ini" mulai 00:00 jam browser dan akhir = sekarang; "Kemarin" juga memakai akhir = sekarang (bukan akhir kemarin) → kolom hasil "Kemarin" sebenarnya "kemarin sampai sekarang" (2 hari). "Bulan Lalu" sama: dari tanggal 1 bulan lalu sampai sekarang. (b) "Custom Range": tanggal "Sampai" (`dateTo`) tidak pernah dipakai sama sekali — hanya `dateFrom`. Operator mengira memilih rentang, padahal selalu sampai sekarang. (c) "Dalam periode ..." di kartu Total Records tidak menyebut tanggalnya. Usulan: perbaiki ujung periode; tampilkan tanggal mulai–selesai nyata.
14. **[Sedang] Bahasa campur & istilah teknis.** "Channel Code" (isinya kode metrik "pressure"/bukan kode channel), "Satuan & Ambang", "Node Location", "Total Records / logs", "Window data aktif", "Status filter", "Showing x to y of z records / Rows / Previous / Next". Bar info "Menampilkan x–y dari z log" muncul dua kali (atas dan bawah). Usulan: seragamkan Bahasa Indonesia; "Total Records" → "Jumlah pembacaan".
15. **[Sedang] Tab "Edit Channel/Delete Channel" tampil untuk semua peran.** Tidak ada pemeriksaan peran terlihat di template. Operator tenant bisa mengubah ambang/menghapus. Perlu dipastikan di backend/guard.
16. **[Rendah] Kartu "Last sample" tampilkan tanggal tanpa tahun & tanpa selisih.** Format 'dd MMM, HH:mm'. Operator butuh "3 menit lalu" + warna. Jika "nilai terbaru" diambil dari `displayedReadings[0]` — itu baris pertama setelah filter status, jadi kalau tab "Error" aktif, "Last sample" berubah menjadi sampel error terakhir (bukan sampel terakhir). Bug logika tampilan.
17. **[Rendah] Urutan data tidak dijamin.** `displayedReadings[0]` dianggap terbaru; kalau backend mengurutkan naik, "Last sample" adalah yang terlama di periode. Perlu verifikasi urutan respons (kode tidak mengurutkan).
18. **[Rendah] `ngOnChanges` tanpa `implements OnChanges`; setelah menyimpan/menghapus lewat drawer data dimuat ulang tetapi `selectedStatus` tidak direset** — kecil, tidak terlihat operator.
19. **[Rendah] Tombol kembali di workspace tidak ada.** `SensorPageComponent.goBack()` ada tetapi tidak dipakai di template; di halaman detail node (node-detail-page) ada tombol "Back to Nodes", di sensor tidak ada. Operator hanya bisa klik sidebar. Juga breadcrumb "IoT > Nodes > Sensor Detail" disembunyikan saat embedded sehingga tidak ada petunjuk posisi.
20. **[Rendah] Tidak ada auto-refresh.** Halaman tidak memperbarui sendiri; dibiarkan terbuka di layar kantor akan basi tanpa tanda.

## 1.4 Fitur yang saya butuhkan tapi tidak ada
- Grafik tekanan (24 jam / 7 hari) dengan garis ambang dan penanda lubang data.
- Nilai terakhir besar + "x menit lalu" + status Fresh/Stale/Offline relatif interval 120 dtk.
- Min / Rata-rata / Maks periode; (untuk MNF) nilai minimum jam 00:00–04:00.
- Daftar alarm channel ini (kapan, berapa lama, tingkat).
- Alamat node + tautan ke peta dan ke node induk.
- Tautan ke channel lain pada node yang sama.
- Ekspor CSV berformat Indonesia (zona WIB, nama lokasi di nama file), serta PDF/ringkasan.
- Auto-refresh 60 dtk.

## 1.5 Perlu dijelaskan di Panduan (halaman detail sensor)
- Beda "ID sensor" vs "channel" dan mengapa satu logger bisa punya banyak channel.
- Arti kolom Status tabel (nilai terhadap ambang, bukan alat mati) — jika tidak diubah.
- Arti ambang MIN/MAX dan kapan alert benar-benar aktif; arti "belum diatur".
- Cara memilih periode; mengapa "Hari Ini" dihitung dari 00:00 WIB (jam perangkat Anda).
- Interval kirim 120 dtk dan makna baris yang hilang.
- Cara ekspor CSV, kolom apa saja, zona waktu.
- Hati-hati tombol Hapus Channel (tidak bisa dibatalkan).

---
# BAGIAN 2 — TAB LAIN WORKSPACE

## 2A. Shell workspace (sidebar)
Kesan pertama: sidebar kedua dengan menu Overview/Nodes/Sensors/Monitor/Map/SCADA/Config + pohon "Assets". Berguna untuk lompat cepat ke titik pantau.

Temuan:
1. **[Tinggi] Menu aktif tidak menyala di halaman detail.** `isNavActive` memakai `url.includes('/'+path)`: pada `/node/<id>` tidak ada menu yang menyala (menu "Nodes" memeriksa `/nodes`), pada `/sensor/<id>` juga tidak. Operator tidak tahu sedang di bagian mana. Sebaliknya "SCADA" (path `analytics`) dan "Config" sebaiknya diuji untuk tabrakan substring bila ID project mengandung kata itu.
2. **[Tinggi] Label menu "SCADA" mengarah ke path `analytics`** (nama tab di kode "analytics-page"); URL tidak sesuai label; bookmark/laporan bug menyebut "analytics". Usulan: path `scada`.
3. **[Tinggi] Pohon Assets: 1 + 12 permintaan API tiap muat (N+1)** dan label sensor "label || code || name" — untuk logger tunggal tiap node hanya punya 1 anak yang sama namanya ("pressure" atau sejenis) → 12 baris anak identik tanpa alamat. Nama node sudah alamat (bagus). Status titik: ambang online <5 mnt, warning <30 mnt, selainnya offline — **tidak relatif interval node** (tab Sensors sudah relatif interval; di sini 120 dtk vs 5 mnt = 2,5 interval, sementara tab Sensors memakai aturan lain → status bisa berbeda di dua tempat untuk node yang sama). Status sensor anak disalin dari status node (bukan status data sensor itu sendiri).
4. **[Sedang] Status "unknown" (lastSeenAt kosong) tampil sebagai titik tanpa penjelasan**; tidak ada legenda warna titik.
5. **[Sedang] Klik kanan pada aset tampil kosong** (`onContextMenu` hanya console.log, TODO) — event diblokir (preventDefault) sehingga menu browser pun hilang tanpa gantinya.
6. **[Sedang] Tidak ada pencarian di pohon Assets.** Dengan 12 titik masih ok, bila 100 titik tidak bisa dicari. (Tugas 6.)
7. **[Rendah] Teks Inggris: "Back to Projects", "Loading...", "No nodes found", "Open Menu".** `title` tombol toggle dalam bahasa Inggris.
8. **[Rendah] Pohon tidak diperbarui otomatis**; hanya klik ikon refresh kecil di header "Assets". Status titik bisa basi berjam-jam di layar kantor.
9. **[Rendah] State kolaps pohon `expandedNodes` disimpan tapi tidak pernah dibaca kembali** (hanya ditulis) — pohon selalu tertutup tiap muat.
10. **[Rendah] Error muat project hanya `console.error`**, sidebar tampil kosong "No nodes found" — operator mengira project tidak punya alat.

## 2B. Overview
Kesan pertama: terlihat seperti dasbor lengkap — System Health, Project Snapshot, tabel sensor, Device Status Grid. Banyak angka yang tampak "hidup" tetapi sebagian dibuat-buat.

Temuan:
1. **[Kritis] Uptime per perangkat dan latensi per perangkat adalah angka ACAK.** `uptimePercent = 95 + Math.random()*5` (online) / `60+rand*30` / `rand*30`, `latencyMs = 50 + Math.random()*200`. Tabel "Device Status Grid" menampilkan kolom "Uptime (24h)" dan "Latency" yang berubah tiap muat ulang. Ini data bohong, melanggar kepercayaan operator. Usulan: hapus kedua kolom; ganti dengan "Terakhir kirim" + "Kelengkapan data 24 jam" (jumlah sampel diterima / 720 yang diharapkan).
2. **[Kritis] Kartu System Health "Avg Uptime (24h)" dan "Avg Latency" juga rekaan.** Uptime = 100 jika connectivityStatus online, 70 jika warning, 0 jika offline (bukan 24 jam); latensi = telemetryIntervalSec×2 (komentar di kode: "simulated") → untuk 120 dtk = 240 ms padahal itu bukan latensi sama sekali. Hapus atau ganti dengan "Kelengkapan data 24 jam" yang dihitung nyata.
3. **[Tinggi] Device Status Grid hanya menampilkan 8 dari 12 titik** (`slice(0,8)`) dengan badge "8 devices" — padahal ada 12. Operator pagi hari mengira hanya ada 8 alat, 4 yang mati bisa tak terlihat. Perbaiki: tampilkan semua (atau urutkan yang bermasalah dulu) dan badge "8 dari 12".
4. **[Tinggi] Judul badge "All Systems Operational" bisa menyesatkan**: syaratnya onlineDevices === totalDevices; saat 0 perangkat total (0===0) juga hijau "All Systems Operational". Status "unknown" dihitung sebagai offline di angka tetapi tidak di badge.
5. **[Tinggi] Hardcode "Streaming · MQTT / Retention 30 days"** di Project Snapshot — tidak dihitung dari data; retensi klaim 30 hari sementara ClickHouse TTL berbeda-beda. Harus dihapus atau diambil dari konfigurasi.
6. **[Tinggi] Kartu Alerts global** (sudah diketahui) — kartu tampil angka merah `text-danger` bahkan saat 0. Selama belum per-project, beri catatan "semua project" atau sembunyikan.
7. **[Sedang] Tabel "Sensor Overview" hanya menampilkan nilai channel pertama dan "+N channel"**; untuk logger tekanan oke, namun kolom "Type" menampilkan `modelName` katalog (mis. "DPT-xxx") bukan jenis ukur (Tekanan). Tidak ada satuan jika nilai null. Baris tidak bisa diklik (tidak ke detail sensor) — operator harus pindah ke tab Sensors.
8. **[Sedang] Teks Inggris dominan**: "System Health", "Online Devices", "Offline Devices", "Operations & Team", "Project Snapshot", "Deployment: Live since ...", "Deployed ..." (muncul dua kali di kartu yang sama), "Owner" tampil dua kali (kartu Snapshot dan Operations & Team): duplikat.
9. **[Sedang] "Operations & Team" tidak berisi tim** — hanya owner, industri, tipe area; tidak ada nama petugas/kontak piket/yang bisa dihubungi saat alat mati.
10. **[Sedang] "Last sync"** tidak dijelaskan (sinkron apa?). Warna merah/hijau di Last Update sensor memakai `isDataStale` — ambangnya tidak relatif interval 120 dtk (perlu dicek konsisten dengan tab Sensors).
11. **[Rendah] Tombol "Settings" dan "Edit Project"** berdampingan menuju dua tempat berbeda (config vs form edit) — dobel.
12. **[Rendah] Kartu "Locations"** memberi "Deployment sites" tanpa penjelasan jumlah titik berkoordinat vs tidak.
13. Key-metrics trends (tren rata-rata semua node per tipe metrik) dihitung `avgLatest - avgOverall` dengan ambang stabil tetap 0,5 — satuan beda (bar vs m³/jam) memakai ambang sama; untuk tekanan 0,5 bar itu besar. Verifikasi bagian ini di UI.

## 2C. Nodes (nodes-list embedded)
Kesan pertama: tabel node standar; kolom proyek, filter owner/project disembunyikan (benar).
Temuan:
1. **[Sedang] Klik nama node → `/iot/projects/<id>/node/<nodeId>` (benar, tetap di workspace).** Tapi tautan/aksi lain di dalam baris yang diperluas (expandable) dan tombol "Add/Edit" perlu diuji apakah ada yang menuju `/iot/nodes/...` (keluar workspace). Dari grep: header non-embedded punya tautan `/iot/nodes/new`; mode embedded memakai header sendiri (baris 60). Perlu verifikasi tombol tambah node.
2. **[Sedang] Tidak ada auto-refresh & tidak ada indikator Fresh/Stale relatif interval** seperti yang kini ada di tab Sensors → dua tab daftar dengan standar berbeda. Rekomendasi: samakan (tab status, search, pagination, auto-refresh 60 dtk).
3. **[Rendah] Nama menu "Nodes" vs istilah operator "titik pantau/logger"** — perlu glosarium di panduan.

## 2D. Node Detail (nodes-detail embedded)
Kesan pertama: halaman rinci node (profil, sensor, channel). Tombol "Back to Nodes" di toolbar atas.
Temuan:
1. **[Kritis] Tautan ke detail channel keluar dari workspace.** Tabel channel: `routerLink="['/iot/nodes', nodeUuid, 'sensor', channel.id]"` (halaman 267). Di mode embedded ini membuka detail sensor versi global `/iot/nodes/<id>/sensor/<id>` dengan breadcrumb IoT>Nodes, sidebar utama berganti, sidebar project hilang. Saat dihapus dari sana kembali ke `/iot/nodes/...`. Inkonsisten dengan tab Sensors yang tetap di workspace. Perbaiki: bila embedded gunakan `/iot/projects/<projectId>/node/<nodeId>/sensor/<channelId>`.
2. **[Tinggi] "View Telemetry" membuka tab baru ke `/iot/telemetry`** dan "AI Analytics" mengarah ke `/iot/ai/channel/<id>` (keluar workspace) — tanpa penanda keluar.
3. **[Sedang] Kolom "Trend" menampilkan kata Inggris (up/down/stable)** dengan `text-capitalize`; dasar perhitungan trend tidak dijelaskan.
4. **[Sedang] Tombol "Back to Nodes" selalu ke daftar** — dari Overview "Device Status Grid" kembali tidak ke Overview.
5. **[Rendah]** Menu aksi dalam baris dan banyak tombol manajemen (hapus channel) tampil bagi operator; sama seperti di detail sensor.

## 2E. Sensors (sudah dirombak hari ini; hanya catatan konsistensi)
- Bagus: tab status, search, pagination, auto-refresh. Navigasi baris memakai **channelId** (`navigateToSensor`) sedangkan sidebar memakai **sensorId** → sumber ID ambigu di detail (lihat 1.3 #7). Perlu disatukan.
- Fresh/Stale/Offline relatif interval (tepat) harus dipakai pula di sidebar, Overview, dan Nodes.

## 2F. Monitor
Kesan: bagian yang memuat dasbor widget-builder.
1. **[Sedang] Empty state "Create Dashboard" mengirim operator ke `/iot/widget-builder`** (keluar workspace, tak membawa project). Operator tidak seharusnya membangun dasbor; pesan "Create a dashboard in Widget Builder and link it to this project" dalam Inggris dan teknis. Usulan: "Belum ada dasbor untuk project ini. Hubungi admin."
2. **[Sedang] Tanpa dashboardId, otomatis dasbor pertama** tanpa nama dasbor/ penanda; di sidebar anak menu hanya tampil kalau ada dashboard — pemilihan aktif tidak jelas.
3. **[Rendah]** Error muat dasbor hanya `console.error` lalu tampil sebagai "No Dashboard Configured" (menyamarkan kesalahan jaringan sebagai "belum dikonfigurasi").

## 2G. Map
Kesan: `<webgis-map>` embedded; tidak ada isi lain. Lapisan di sidebar kiri hanya muncul bila sedang di Map.
1. **[Sedang] Panel layer di sidebar hanya muncul di halaman map** dan menu Map bisa dibuka/tutup tanpa isi saat di tab lain — rancu (ikon panah ada tetapi tidak ada anak).
2. **[Sedang] Tidak diaudit tampilan peta**; perlu verifikasi: apakah popup titik tampil alamat + tekanan terakhir + status; tautan dari popup ke detail masih di workspace atau keluar.
3. **[Rendah] Istilah layer "operational/custom/core/sensor-type"** perlu penjelasan, bukan istilah operator.

## 2H. SCADA (path analytics)
1. **[Tinggi] Setelah membuka diagram (View/Edit) tidak ada tombol Kembali ke daftar** — template embedded sengaja tanpa header ("user clicks SCADA menu to go back"), padahal mengklik menu SCADA ketika sudah di route yang sama tidak mengubah route sehingga `embedUrl` tidak di-reset; `closeEmbed()` ada di TS tapi tidak dipanggil dari template. Operator bisa "terjebak" di diagram sampai pindah tab lalu kembali.
2. **[Sedang] Istilah "nodes/edges" di kartu diagram** (mis. "12 nodes · 8 edges") bentrok dengan "node" = logger di sisa aplikasi. Operator bingung. Usulan: "12 objek · 8 sambungan".
3. **[Sedang] Tombol "Edit" tampil bagi operator semua peran**; tombol hapus tanpa kontrol peran terlihat. Konfirmasi hapus memakai overlay kartu (bagus).
4. **[Rendah]** Label campur: "SCADA Diagrams", "View/Edit", "Yes, Delete", "Cancel".
5. **[Rendah]** Status "published/draft" ditampilkan Inggris mentah.

## 2I. Config
1. **[Tinggi] Semua tautan keluar dari workspace:** "View Nodes" → `/iot/nodes?projectId=`, "View Sensors" → `/iot/sensors?projectId=`, "Manage Alerts" → `/iot/alerts?projectId=`, "Edit" → form edit project. Halaman Nodes/Sensors versi workspace sudah ada, jadi tautan ini membawa operator ke halaman global yang tidak terfilter bila query-param tak dikenali (lihat memori: backend/query param mismatch `projectId` vs `idProject`) — risiko melihat node project lain.
2. **[Sedang] Halaman ini hanya daftar tautan** tanpa pengaturan nyata: tidak ada interval kirim, ambang default, penerima notifikasi (WhatsApp/Telegram/email), jam kerja piket. Teks "Configure sensors, thresholds, and alerts" menjanjikan lebih dari yang ada.
3. **[Sedang] "Delete Project" tombol nonaktif tanpa penjelasan** (`disabled`) — aman, tapi kenapa? Tambahkan "Hubungi admin DEVETEK".
4. **[Rendah]** Warna `bg-dark` baris pengaturan di tema terang akan kontras janggal (blok hitam di halaman terang). Perlu cek visual.

---
# BAGIAN 3 — LINTAS HALAMAN (konsistensi)
1. **[Kritis] Angka rekaan/acak** di Overview (uptime, latensi acak; hardcode "Retention 30 days") dan data dummy acak di detail sensor saat error. Satu kasus saja sudah merusak kepercayaan pada seluruh dashboard. Aturan: tidak ada angka acak; kosong atau "tidak tersedia" lebih baik.
2. **[Tinggi] Tiga definisi status alat berbeda:** sidebar & Overview (<5 mnt online, <30 mnt warning, sisanya offline, mutlak), tab Sensors (relatif interval node), detail sensor (status = nilai vs ambang, "Online/Offline"). Satu logger bisa "Online" di satu tempat dan "Stale" di tempat lain. Usulan: satu fungsi bersama — Fresh ≤ 2×interval (240 dtk), Stale ≤ 10×interval, Offline setelahnya — dipakai di semua halaman, dengan nama sama (Fresh/Stale/Offline atau Aktif/Tertunda/Mati).
3. **[Tinggi] Navigasi bocor keluar workspace:** Node Detail → channel (`/iot/nodes/...`), Telemetry, AI, Config, Monitor "Create Dashboard", hapus channel. Aturan: semua tautan dari dalam workspace memakai `/iot/projects/<id>/...` atau tampil ikon "buka di halaman lain".
4. **[Tinggi] ID sensor vs channel di URL** (lihat 1.3 #7), diakses dari tiga tempat berbeda dengan dua jenis ID.
5. **[Tinggi] Alamat sebagai nama utama belum konsisten:** pohon Assets, Overview, tab Sensors sudah; **detail sensor tidak** (kode metrik + "Node: kode"); judul halaman Detail Node perlu diverifikasi.
6. **[Sedang] Bahasa tidak seragam** (Inggris vs Indonesia; "Sync Telemetry", "Channel Code", "Operations & Team", "No Dashboard Configured"). Perlu glosarium: node=titik pantau/logger, channel=besaran ukur.
7. **[Sedang] Pola daftar tidak seragam**: Sensors sudah standar (tab, search, auto-refresh), Nodes belum otomatis menyegarkan; Overview tidak punya tombol muat ulang.
8. **[Sedang] Tidak ada auto-refresh di Overview, detail node, detail sensor, sidebar.** Operator di kantor meninggalkan layar terbuka; data basi tanpa tanda "terakhir diperbarui".
9. **[Sedang] Tidak ada "terakhir diperbarui" global** pada halaman mana pun kecuali tab Sensors.
10. **[Sedang] Aksi merusak (hapus channel, SCADA edit/hapus, edit project) tampil untuk semua** — perlu cek peran; dalam bahasa operator "baca saja" vs "admin".
11. **[Rendah] Error hanya ke console** di sidebar, Monitor, Overview parsial → layar kosong tanpa alasan.
12. **[Rendah] Mobile**: ada tombol toggle sidebar, namun tabel detail sensor `text-nowrap` + banyak kolom menyulitkan di HP lapangan.

# BAGIAN 4 — Hal yang perlu dijelaskan di Panduan, per halaman
- **Overview:** arti System Health (apa yang dihitung sebagai Online/Warning/Offline dan ambang menitnya), "Last sync", "Uptime 24 jam" (jika dipertahankan: rumus nyata), kartu Alerts (global vs project), cara membaca "Sensor Overview" (nilai terakhir channel pertama).
- **Nodes:** istilah node = logger/titik pantau; arti status; cara cari berdasar alamat; cara membuka detail.
- **Sensors:** arti Fresh/Stale/Offline relatif interval kirim 120 dtk; arti nilai terakhir; auto-refresh 60 dtk.
- **Detail Node:** arti profil/mapping/channel; arti kolom Latest/Status/Trend; beda "View Telemetry" dan "AI Analytics".
- **Detail Sensor/Channel:** lihat 1.5.
- **Monitor:** apa itu dasbor widget, siapa yang membuatnya, cara pindah antar dasbor.
- **Map:** arti warna titik, layer, cara zoom ke titik berdasar alamat.
- **SCADA:** apa itu diagram, View vs Edit, cara kembali, siapa boleh edit; "objek/sambungan".
- **Config:** apa yang bisa/tidak bisa diatur di sini dan siapa yang berwenang.
- **Umum:** satu definisi status alat; zona waktu (WIB); interval kirim; satuan (bar); cara menghubungi dukungan bila alat Offline > N jam.
