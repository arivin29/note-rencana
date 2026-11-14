---
title: Kanal Telemetri
version: 1.0.2
updatedAt: 2026-11-13
audience: operator, supervisor distribusi, admin
sources: [src/app/pages/iot/telemetry-channels/telemetry-channels-list/telemetry-channels-list.ts, src/app/pages/iot/telemetry-channels/telemetry-channels-list/telemetry-channels-list.html, src/app/shared/utils/channel-display.ts, src/app/shared/utils/telemetry-freshness.ts, src/app/shared/utils/threshold.ts, src/app/shared/utils/fetch-all.ts]
related: [project-sensors, sensor-channel-detail, project-overview]
---

## 1. Untuk apa halaman ini

Halaman ini menampilkan **semua channel telemetri dari semua project yang boleh Anda lihat** dalam satu tabel: nilai terakhir, status kirim datanya, dan apakah nilainya keluar dari ambang. Pakai untuk menyapu seluruh wilayah sekaligus pada pagi hari: mana yang berhenti mengirim data, mana yang di luar batas, project mana yang paling banyak masalah, lalu membuat laporan Excel.

> **Node** = alat pencatat (logger) di satu titik. **Sensor** menempel pada node. Satu sensor bisa punya beberapa **channel** (misalnya tekanan dan debit). **Ambang** = batas bawah (min) dan batas atas (maks) yang dianggap normal untuk satu channel.

**Cakupan halaman:**

- **Admin**: semua owner. Ada pilihan **Owner** untuk mempersempit.
- **Pengguna tenant**: hanya project milik owner Anda. Pilihan Owner tidak ada.
- Hanya sensor yang **aktif** yang dimuat.

**Beda dengan tab Sensors di dalam project:**

- Satu baris = **satu channel**, bukan satu sensor. Sensor dengan dua channel tampil dua baris.
- Lintas project. Nama project tampil di kolom **Node**.
- Status dan penanda ambang dinilai **per channel**.
- Kartu ringkasan dan jumlah di tab **ikut berubah** mengikuti filter dan pencarian (di tab Sensors tidak).

## 2. Bagian-bagian layar

### Header

- Judul **Kanal Telemetri**, lalu "N kanal · M project". M adalah jumlah project yang muncul di data yang dimuat.
- Di sebelahnya: "diperbarui HH:mm:ss (otomatis tiap 60 dtk)", yaitu jam data terakhir berhasil dimuat.
- Kalau tren 24 jam tidak bisa dimuat, muncul tulisan **kuning** di baris yang sama (lihat bagian "Tren 24 jam"). Tren terakhir yang berhasil dimuat tetap tampil.
- **Tombol putar** (Muat ulang): memuat ulang daftar **dan** tren 24 jam sekarang juga.
- **Ekspor Excel**: mengunduh daftar ke file Excel (lihat bagian "Ekspor Excel").

### Lima kartu ringkasan (KPI)

Ada di atas tabel. Kartu muncul setelah data selesai dimuat, ada minimal satu channel, dan nilai terakhir **bisa dibaca**. Angkanya dihitung dari channel yang lolos filter **Owner, Project, Kelompok, Jenis ukuran, dan Cari**. Tab status tidak memengaruhi kartu.

| Kartu | Isinya |
|---|---|
| Mengirim data | Channel Fresh dibanding total, mis. "40 / 52". Klik: tab **Fresh** |
| Terlambat | Jumlah channel Stale. Klik: tab **Stale** |
| Mati / belum pernah kirim | Offline ditambah No Data. Klik: chip merah (lihat bawah) |
| Di luar ambang | Jumlah channel Fresh yang nilainya melewati ambang. Klik: tab **Di luar ambang** |
| Project terdampak | Jumlah project yang punya channel bermasalah. Klik: chip merah "Bermasalah" |

Catatan tiap kartu:

- **Mati / belum pernah kirim** menulis "terlama: *alamat node* · *tanggal*", yaitu channel Offline yang data terakhirnya paling lama. Kalau tidak ada yang Offline: "N belum pernah kirim" atau "semua aktif".
- **Di luar ambang** menulis "X dari Y kanal punya ambang". Channel tanpa ambang tidak pernah terhitung di luar ambang.
- **Project terdampak** menulis "terbanyak: *nama project* · N kanal", yaitu project dengan channel bermasalah paling banyak. Kalau tidak ada masalah: "semua kanal normal".
- Yang dihitung **bermasalah**: channel Stale, Offline, No Data, atau Fresh yang melewati ambang.

**Chip merah.** Dua kartu tidak punya tab sendiri. Klik **Mati / belum pernah kirim** untuk menyaring Offline dan No Data sekaligus. Klik **Project terdampak** untuk menyaring semua channel bermasalah. Di atas tabel muncul chip merah, misalnya "Status: Bermasalah (terlambat, mati, di luar ambang) (12)". Klik **×** di chip untuk menghapusnya. Klik tab mana pun juga menggantikan filter ini.

> **Kartu hilang saat banner kuning muncul.** Kalau banner "Nilai terakhir kanal sedang tidak dapat dibaca dari server data" tampil, kelima kartu **disembunyikan** dan **Ekspor Excel dinonaktifkan**. Tanpa nilai terakhir, semua channel akan terhitung mati dan angkanya menyesatkan.

### Tab status

Enam tab dengan jumlah: **Semua, Fresh, Stale, Offline, No Data, Di luar ambang**. Jumlah di tab mengikuti filter dan pencarian di atasnya (bukan hanya halaman yang tampil).

Tab **Di luar ambang** berisi channel yang nilainya melewati ambang **dan datanya Fresh**.

### Filter

| Filter | Cara kerja |
|---|---|
| Owner (hanya admin) | Dipilih lalu data **dimuat ulang dari server** untuk owner itu. Memilih owner mengosongkan pilihan Project |
| Project | Daftar mengikuti owner yang dipilih. Untuk admin yang belum memilih owner, nama owner ikut tertulis di sebelah nama project |
| Kelompok | Kelompok jenis sensor, daftar dari data yang dimuat |
| Cari | Lihat di bawah |

- Project, Kelompok, dan Jenis ukuran **tidak bisa dipilih** kalau datanya hanya punya satu pilihan.
- Pilihan yang tidak ada lagi di data otomatis dilepas.
- **Filter lanjutan**: klik tombolnya untuk membuka **Jenis ukuran**.
- Semua filter aktif tampil sebagai **chip** di atas tabel (Status, Owner, Project, Kelompok, Jenis, Cari). Klik **×** untuk melepas satu filter, atau **Reset filter** untuk melepas semuanya.

**Kotak Cari** mencari di: alamat node, kode node, nama sensor, kode sensor, metrik, nama project, nama PIC, serta kelompok. Huruf besar atau kecil tidak berpengaruh. Hasil muncul sekitar setengah detik setelah Anda berhenti mengetik. Owner dan Jenis ukuran tidak ikut dicari (gunakan filternya).

### Tabel channel

| Kolom | Isinya |
|---|---|
| Kanal | Metrik (nama channel). Baris kedua: nama sensor · kelompok |
| Node | Alamat node (kode di bawahnya), nama project |
| Nilai terakhir | Nilai dengan satuan, tren 24 jam, penanda ambang |
| Status | Lencana Fresh / Stale / Offline / No Data, interval lapor |
| Data terakhir | Waktu data terakhir channel |

- **Klik baris** membuka **detail sensor di dalam workspace project**-nya, langsung pada channel yang Anda klik. Kalau channel tidak punya project, dibuka lewat halaman node.
- Klik **alamat node** membuka detail node (bukan detail sensor).
- Kolom **Node**: kalau alamat kosong, yang tampil kode node. Kolom ini tidak punya tombol telepon. Nomor yang tersimpan pada node adalah nomor **perangkat** untuk mengirim perintah kontrol (SMS restart dan sejenisnya), bukan telepon orang. Perintah dikirim dari tab **Perintah** pada detail node.
- Kolom **Status** menampilkan interval lapor node, mis. "tiap 15 dtk", "tiap 2 mnt", "tiap 1 jam". Kalau tidak diketahui, baris ini tidak ada.
- Kolom **Nilai terakhir**: jumlah desimal mengikuti **presisi channel** (kalau belum diatur, 2 desimal). Nilai kosong ditulis "-". Arahkan kursor untuk melihat ambang, mis. "Ambang 0,5–5 bar", atau **"Ambang belum diatur"**.
- Kolom **Data terakhir**:
  - Fresh dan Stale: selisih waktu ("4 mnt lalu", "2 jam lalu") dan tanggal serta jam.
  - **Offline dan No Data**: tulisan merah "Data terakhir *durasi* lalu" dan "sejak *tanggal, jam*".
  - Kalau channel tidak pernah mengirim: "Belum pernah kirim". Baris kedua "node terlihat *durasi* lalu" muncul kalau node pernah terlihat. Artinya alat hidup tetapi channel ini belum pernah menyetor nilai: periksa pemetaan atau kabel sensornya.
  - Durasi ditulis dalam mnt, jam, hari, atau bln.

> **Baca "sejak" dengan hati-hati.** Itu waktu **data terakhir tiba** di sistem, bukan saat alat terbukti mati. Untuk laporan, tulis "tidak ada data sejak ...", bukan "alat mati pada ...".

### Penanda di luar ambang

Setiap nilai dibandingkan dengan ambang **channel itu sendiri** dan dinilai berdasarkan kesegaran data **channel itu sendiri**.

| Tampilan nilai | Artinya |
|---|---|
| Merah, panah, "di bawah min X" / "di atas maks Y" | Channel Fresh dan melewati ambang. **Dihitung** |
| Kuning, panah, "... · data terlambat" | Channel Stale dan melewati ambang. **Tidak dihitung** |
| Hitam biasa | Normal, ambang belum diatur, atau channel Offline / No Data (tidak dinilai) |

Ambang diatur di halaman detail sensor (kartu **Ambang**, tombol **Atur**). Halaman ini hanya menampilkannya.

### Tren 24 jam

Di bawah nilai ada garis kecil dan tulisan "24 jam: *min*–*maks*".

- **Garis** = rata-rata **per jam** dalam 24 jam terakhir. Jam tanpa data membuat garis **putus**, tidak digambar sebagai 0 dan tidak diisi. Garis hanya tampil kalau ada **minimal 2 jam** yang punya data. Garis disembunyikan di layar sempit.
- **"24 jam: min–maks"** = bacaan mentah terendah dan tertinggi dalam 24 jam terakhir (bukan hari kalender).
- Bentuk garis relatif terhadap rentang channel itu sendiri: menunjukkan **pola**, bukan tinggi nilai. Bandingkan nilai lewat angka.
- Dimuat saat halaman dibuka, lalu diperbarui **tiap 5 menit** (hanya selagi tab browser terlihat). Tombol putar memuat ulang sekarang juga. Tren dimuat ulang juga saat Anda mengganti **Owner atau Project**.
- **Batas jumlah channel.** Tren diminta sekaligus untuk semua channel yang dicakup Owner dan Project. Kalau terlalu banyak, server menolak dan muncul tulisan kuning di header, kira-kira "Tren 24 jam tidak dimuat: Terlalu banyak channel ... pilih owner atau project". Pilih **Owner** (admin) atau **Project** supaya cakupannya lebih kecil. Selama itu, daftar dan statusnya tetap normal, hanya garis dan min–maks yang tidak tampil. Filter Kelompok, Jenis ukuran, dan Cari **tidak** mengecilkan permintaan tren.
- Tulisan kuning lain: "Tren 24 jam tidak tersedia (server data)." atau "Tren 24 jam gagal dimuat."

### Urutan dan halaman

- Klik judul kolom **Kanal, Node, Nilai terakhir, Status, Data terakhir** untuk mengurutkan. Klik lagi untuk membalik arah.
- **Urutan awal** (kolom Status): yang paling bermasalah di atas. Urutannya: Offline, No Data, di luar ambang, Stale, Fresh. Dalam kelompok yang sama, data paling lama di atas, yang belum pernah kirim paling atas.
- **Kanal** diurutkan menurut nama metrik, lalu nama sensor. **Node** menurut alamat (atau kode kalau alamat kosong).
- Channel tanpa nilai (atau tanpa waktu data) selalu di paling bawah saat mengurutkan Nilai terakhir atau Data terakhir.
- Penomoran halaman di bawah tabel. Pilihan **Baris**: 10, **20 (awal)**, 50, atau 100.

### Ekspor Excel

Tombol **Ekspor Excel** mengunduh file `.xlsx` berisi daftar yang **sedang tampil menurut tab, filter, pencarian, dan urutan Anda**, **semua halaman**. Satu baris per channel. Lembar bernama "Kanal Telemetri".

Kolom di file, urut dari kiri:

| Kolom | Isinya |
|---|---|
| Owner (hanya admin) | Owner pemilik project |
| Project, Alamat Node, Kode Node | Lokasi |
| Sensor, Metrik, Kelompok, Jenis Ukuran | Identitas channel |
| Nilai Terakhir, Satuan | Nilai dan satuan, desimal mengikuti presisi |
| Min 24 jam, Maks 24 jam, Rata-rata 24 jam | Dari tren 24 jam. Kosong kalau tren tidak ada |
| Ambang Min, Ambang Maks | Kosong kalau belum diatur |
| Status Ambang | Di bawah min / Di atas maks / Normal / Belum diatur / - |
| Status | Fresh / Stale / Offline / No Data |
| Data Terakhir (WIB/WITA/WIT) | Judul menyebut zona waktu komputer Anda |
| Keterangan | Hanya untuk **Offline dan No Data**: "Data terakhir ... lalu" atau "Belum pernah kirim", ditambah "node terlihat ... lalu". Kosong untuk Fresh dan Stale |
| Interval Lapor (dtk), PIC, Nomor SMS perangkat | Data node (Nomor SMS perangkat = nomor perangkat untuk perintah kontrol, bukan telepon orang) |

Hal lain tentang file:

- **Status Ambang**: channel Stale yang melewati ambang tertulis "Di bawah min (data terlambat)" atau "Di atas maks (data terlambat)". Tanpa keterangan itu berarti Fresh dan ikut dihitung. "Belum diatur" **bukan** "normal". "-" berarti Offline / No Data atau tidak ada nilai.
- Baris judul dibekukan dan tiap kolom punya filter.
- Nama file: `kanal-telemetri-<yyyymmdd-hhmm>.xlsx` (jam komputer Anda).
- Tombol **tidak bisa diklik** saat data dimuat, ekspor sedang berjalan, daftar kosong, atau banner kuning "nilai terakhir tidak dapat dibaca" tampil.
- Kalau gagal, muncul kotak merah "Ekspor Excel gagal. Coba lagi." dengan tombol **Coba lagi**.

## 3. Cara melakukan tugas umum

### Menyapu pagi: mana yang bermasalah

1. Buka **Kanal Telemetri** di menu samping.
2. Lihat kartu **Project terdampak**: berapa project yang punya masalah dan project mana yang terbanyak.
3. Klik kartu itu. Tabel menampilkan semua channel bermasalah, dengan chip merah "Bermasalah".
4. Urutan awal sudah menaruh yang terparah di atas. Baca kolom **Status** dan **Data terakhir**.
5. Klik baris untuk membuka detail sensor pada channel itu, atau kirim perintah ke perangkat dari tab **Perintah** pada detail node.

### Mencari titik pantau yang mati

1. Lihat kartu **Mati / belum pernah kirim** dan baca "terlama".
2. Klik kartu. Tabel menyaring Offline dan No Data sekaligus. Untuk memisahkan, klik tab **Offline** atau **No Data**. Untuk yang baru terlambat, klik kartu **Terlambat**.
3. Urutkan **Data terakhir** supaya yang paling lama diam di atas.
4. Baca "sejak ..." dan, untuk yang belum pernah kirim, "node terlihat ...".
5. Bila perangkat perlu di-restart, kirim perintah dari tab **Perintah** pada detail node.
6. Hapus chip dengan **×**.

### Mempersempit ke satu owner atau project (admin)

1. Pilih **Owner**. Data dimuat ulang untuk owner itu, kartu dan tab ikut berubah.
2. Pilih **Project** kalau perlu.
3. Pakai ini juga kalau tulisan kuning "Terlalu banyak channel" muncul pada tren.

### Memeriksa nilai di luar ambang

1. Klik kartu atau tab **Di luar ambang**.
2. Cari nilai merah berpanah. "di bawah min 0,5" artinya lebih rendah dari batas bawah.
3. Arahkan kursor ke nilai untuk melihat ambang lengkap.
4. Klik baris untuk melihat grafik di detail sensor.
5. Periksa kalibrasi dan kondisi lapangan sebelum bertindak. Ubah ambang di detail sensor kalau batas tidak cocok.

### Menyaring berdasarkan jenis sensor

1. Pilih **Kelompok** di baris filter.
2. Klik **Filter lanjutan** lalu pilih **Jenis ukuran** kalau perlu.
3. Lepas dengan **×** di chip masing-masing, atau **Reset filter**.

### Membuat laporan untuk atasan

1. Pilih owner, project, tab, dan pencarian yang ingin dilaporkan. Urutkan sesuai selera.
2. Klik **Ekspor Excel** dan tunggu file terunduh.
3. File mengikuti pilihan Anda, semua halaman. Kolom **Owner** (admin), **Project**, **Kelompok**, dan **Jenis Ukuran** membantu mengelompokkan.
4. Pakai **Keterangan** untuk kalimat siap tulis dan **PIC** serta **Nomor SMS perangkat** untuk tindak lanjut.
5. Cantumkan jam unduh dari nama file. File adalah potret saat diunduh.

## 4. Arti status, warna & angka

Ambang waktu dihitung dari **interval kirim node** tempat channel terpasang. Aturannya sama dengan tab Sensors dan halaman lain.

| Status | Warna | Aturan |
|---|---|---|
| Fresh | Hijau | Data terakhir lebih baru dari yang terbesar antara 10 menit atau 3 kali interval |
| Stale | Kuning | Lebih baru dari yang terbesar antara 60 menit atau 12 kali interval |
| Offline | Merah | Lebih lama dari batas Stale |
| No Data | Abu-abu | Channel belum pernah ada data |

**Contoh logger 2 menit:** Fresh di bawah 10 menit, Stale 10 sampai kurang dari 60 menit, Offline 60 menit atau lebih. **Logger 15 menit:** Fresh di bawah 45 menit, Stale di bawah 180 menit, Offline setelahnya. Kalau interval tidak diketahui: 10 dan 60 menit.

Arahkan kursor ke lencana untuk melihat batas channel itu, mis. "interval 120 dtk · Fresh < 10 mnt · Stale < 60 mnt · Offline ≥ 60 mnt". "tiap 2 mnt" di bawah lencana adalah pengaturan node, bukan hasil pengukuran.

**Status dinilai per channel.** Berbeda dengan tab Sensors (yang menilai per sensor), di sini setiap baris punya lencananya sendiri. Dua channel pada sensor yang sama bisa berstatus berbeda.

| Kondisi channel | Penilaian ambang |
|---|---|
| Fresh, ambang diatur | Dinilai. Yang melewati **dihitung** di luar ambang |
| Stale, ambang diatur | Melewati ambang tampil kuning, **tidak dihitung** sebagai di luar ambang (tetapi tetap dihitung sebagai bermasalah karena Stale) |
| Offline / No Data, atau ambang kosong | Tidak dinilai, tanpa penanda |

**Ambang kosong = "belum diatur", bukan "normal".** Channel tanpa ambang tidak pernah muncul di tab **Di luar ambang**.

**Kenapa Stale tidak dihitung di luar ambang?** Nilai yang sudah tua belum tentu mewakili keadaan sekarang. Aturan ini sama dengan tab Sensors dan aplikasi mobile, supaya angkanya sama di semua tempat.

Satuan durasi "Data terakhir ... lalu": **mnt** (di bawah 60 menit), **jam** (sampai 47 jam), **hari** (sampai 59 hari), lalu **bln**.

## 5. Tips & hal yang perlu diperhatikan

- **Penyegaran otomatis tiap 60 detik**, hanya selagi tab browser terlihat. Tabel tidak berkedip dan halaman serta pencarian Anda tetap di tempatnya. Kalau penyegaran gagal, data lama tetap tampil. Lihat jam "diperbarui".
- Kartu dan jumlah tab **mengikuti filter dan pencarian**. Kalau angkanya berbeda dengan tab Sensors di project, cek apakah ada filter aktif.
- **Nilai tekanan negatif** tidak masuk akal di pipa bertekanan. Curigai sensor lepas, kabel putus, atau kalibrasi.
- **Di luar ambang belum tentu pipa bermasalah.** Bisa juga kalibrasi bergeser atau ambang salah atur. Cek detail sensor dulu.
- **Nilai persis sama** berjam-jam bisa berarti sensor macet. Buka detail dan lihat grafiknya.
- Status mengukur **kapan data terakhir masuk**, bukan kesehatan fisik alat atau kebenaran angkanya.
- Angka **Di luar ambang** hanya sebagus kelengkapan ambang. Lihat "X dari Y kanal punya ambang" di kartu.
- Semua channel dimuat, tidak dipotong di jumlah tertentu. Untuk admin tanpa filter, memuat bisa lebih lama.

### Keterbatasan

- Tidak ada filter berdasarkan angka (mis. "di bawah 1 bar"). Pakai tab **Di luar ambang** atau urutkan **Nilai terakhir**.
- Tren hanya **24 jam terakhir** dengan titik per jam, dan ada batas jumlah channel (lihat bagian Tren 24 jam). Untuk periode lain, buka detail sensor.
- Ambang hanya bisa **dilihat** di sini. Mengubahnya di detail sensor.
- Hanya sensor **aktif** yang ditampilkan.
- Tidak ada filter "hanya bermasalah" di kotak filter. Pakai kartu **Project terdampak**.

## 6. FAQ / masalah umum

**Apa bedanya halaman ini dengan tab Sensors di project?**
Tab Sensors memperlihatkan satu project dan satu baris per sensor. Halaman ini lintas project dan satu baris per channel, jadi cocok untuk menyapu seluruh wilayah. Aturan status, ambang, tren 24 jam, dan Excel-nya sama. Untuk melihat satu project secara lengkap, buka tab Sensors project itu.

**Kenapa saya tidak melihat project tertentu?**
Pengguna tenant hanya melihat project milik owner sendiri. Admin melihat semua owner. Project tanpa sensor aktif tidak muncul. Kalau tetap tidak ada, hubungi admin.

**Kenapa tidak ada pilihan Owner?**
Pilihan Owner hanya untuk admin. Pengguna tenant sudah dibatasi ke owner sendiri.

**Muncul tulisan kuning "Tren 24 jam tidak dimuat: Terlalu banyak channel ...".**
Cakupan terlalu besar untuk tren sekaligus. Pilih **Owner** atau **Project**. Daftar dan status tetap benar, hanya garis dan min–maks (dan kolom 24 jam di Excel) yang kosong.

**Kenapa No Data padahal alat menyala?**
No Data artinya sistem belum menerima data apa pun dari channel itu. Penyebab umum: alat baru dipasang, sinyal 4G tidak ada, pemetaan sensor belum selesai. Kalau baris kedua tertulis "node terlihat ... lalu", alatnya hidup tetapi channel ini belum pernah menyetor nilai: periksa pemetaan atau kabel sensornya. Kalau semua channel mendadak No Data dan banner kuning muncul, masalahnya ada di pembacaan data, bukan di alat.

**Kenapa Stale, bukan Offline?**
Stale adalah masa peralihan. Logger 2 menit dengan data terakhir 25 menit lalu sudah lewat batas Fresh (10 menit) tetapi belum 60 menit. Pantau dulu. Kalau berlanjut, statusnya jadi Offline.

**Apakah tanggal "sejak" itu saat alat mati?**
Bukan. Itu waktu data terakhir yang diterima sistem.

**Kenapa nilai kuning tidak dihitung di luar ambang?**
Channel itu Stale, datanya sudah tua. Nilainya tetap ditampilkan supaya Anda tahu. Kalau data masuk lagi dan masih melewati batas, ia berubah merah dan mulai dihitung.

**Kenapa ada channel tanpa penanda padahal nilainya rendah?**
Kemungkinan besar ambangnya **belum diatur**. Arahkan kursor ke nilainya: "Ambang belum diatur" berarti sistem tidak punya batas pembanding. Atur di detail sensor. Penyebab lain: channel Offline atau No Data (tidak dinilai).

**Kenapa kartu ringkasan hilang?**
Banner kuning "Nilai terakhir kanal sedang tidak dapat dibaca dari server data" sedang tampil. Klik **Coba lagi**. Kalau tetap muncul, laporkan ke admin. Kartu juga tidak tampil saat data dimuat, gagal dimuat, atau tidak ada channel yang lolos filter.

**Kenapa jumlah di kartu dan tab berubah waktu saya memilih project atau mengetik di Cari?**
Di halaman ini kartu dan tab menghitung channel yang lolos filter Owner, Project, Kelompok, Jenis ukuran, dan Cari. Hapus filter (Reset filter) untuk melihat angka keseluruhan.

**Kenapa chip merah "Bermasalah" atau "Mati / belum pernah kirim" tidak punya tab?**
Chip itu muncul karena Anda mengklik kartu **Project terdampak** atau **Mati / belum pernah kirim**. Klik **×** untuk menghapus, atau klik tab lain.

**Kenapa tidak ada tombol untuk menelepon PIC?**
Nomor pada node bukan telepon orang, melainkan nomor perangkat untuk mengirim perintah kontrol (SMS restart dan sejenisnya). Karena itu halaman ini tidak menyediakan tautan telepon. Kirim perintah dari tab **Perintah** pada detail node.

**Kenapa klik baris tidak membuka apa-apa?**
Channel itu tidak terhubung ke node atau sensor, jadi detailnya tidak bisa dibuka. Hubungi admin.

**Ke mana klik baris membawa saya?**
Ke detail sensor di dalam workspace project-nya, dengan channel yang Anda klik sudah terpilih. Untuk membuka node saja, klik alamat node.

**Kenapa tombol Ekspor Excel tidak bisa diklik?**
Data sedang dimuat, ekspor sebelumnya masih berjalan, daftar kosong karena filter tidak menemukan channel, atau banner kuning "nilai terakhir tidak dapat dibaca" tampil. Tunggu sebentar, atau klik **Reset filter**.

**Muncul kotak merah "Ekspor Excel gagal. Coba lagi."**
File tidak berhasil dibuat. Klik **Coba lagi**. Kalau tetap gagal, periksa apakah browser memblokir unduhan, lalu laporkan ke admin.

**Kenapa kolom Owner kosong di Excel (admin)?**
Daftar owner belum berhasil dimuat (di pilihan Owner tertulis "Gagal memuat owner"). Muat ulang halaman, lalu unduh lagi.

**Kenapa kolom Keterangan di Excel kosong untuk baris Stale?**
Keterangan hanya diisi untuk Offline dan No Data. Untuk Stale, lihat kolom **Status** dan **Data Terakhir**.

**Muncul kotak merah "Gagal memuat kanal telemetri." dengan tombol Coba lagi.**
Daftar gagal dimuat, biasanya masalah koneksi. Klik **Coba lagi**. Kalau yang gagal penyegaran otomatis dan tabel sudah terisi, tabel lama dipertahankan tanpa pesan galat.

**Tertulis "Belum ada kanal telemetri."**
Tidak ada channel dari sensor aktif di cakupan Anda. Hubungi admin.

**Tertulis "Tidak ada kanal sesuai filter."**
Tab, filter, atau pencarian tidak cocok dengan channel mana pun. Klik **Reset filter**.

**Kenapa garis tren putus-putus, atau tidak ada garis?**
Tiap titik adalah rata-rata satu jam. Jam tanpa data dibiarkan kosong dan garis putus. Garis hanya tampil kalau ada minimal 2 jam yang punya data. Kalau tulisan kuning "Tren 24 jam ..." muncul di header, tren gagal dimuat; tren terakhir yang berhasil tetap dipakai dan dicoba lagi otomatis tiap 5 menit.

**Kenapa garis tren naik turun tajam padahal angkanya kecil?**
Bentuk garis diskalakan terhadap rentang channel itu sendiri. Lihat "24 jam: min–maks" untuk selisih sebenarnya.
