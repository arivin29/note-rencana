---
title: Daftar Sensor Project
version: 1.3.2
updatedAt: 2026-11-13
audience: operator, supervisor distribusi, admin
sources: [src/app/pages/iot/projects/project-workspace/pages/sensors-page/sensors-page.component.ts, src/app/pages/iot/projects/project-workspace/pages/sensors-page/sensors-page.component.html, src/app/shared/utils/telemetry-freshness.ts, src/app/shared/utils/threshold.ts, src/app/shared/utils/fetch-all.ts]
related: [project-overview, sensor-channel-detail, node-detail]
---

## 1. Untuk apa halaman ini

Halaman ini menampilkan **semua sensor di satu project** beserta nilai terakhir, status kirim datanya, dan apakah nilainya keluar dari batas (ambang) yang sudah diatur. Pakai untuk mencari titik pantau yang berhenti mengirim data, memeriksa titik yang tekanannya di luar batas, menghubungi penanggung jawabnya, dan membuat laporan Excel untuk atasan.

> **Node** = alat pencatat (logger) di satu titik. **Sensor** menempel pada node. Satu sensor bisa punya beberapa **channel** (misalnya tekanan dan debit). **Ambang** = batas bawah (min) dan batas atas (maks) yang dianggap normal untuk satu channel.

## 2. Bagian-bagian layar

### Header

- Judul **Sensors**, lalu ringkasan seperti "12 sensors across 12 nodes".
- Di sebelahnya: "updated HH:mm:ss (auto every 60s)", yaitu jam data terakhir berhasil dimuat.
- Kalau tren 24 jam tidak bisa dimuat, di baris yang sama muncul tulisan **kuning**: "Tren 24 jam tidak tersedia (server data)." (server data tidak bisa dibaca) atau "Tren 24 jam gagal dimuat." (penyebab lain). Tren terakhir yang berhasil dimuat tetap tampil, tidak ada angka karangan.
- **Tombol putar** (Muat ulang) di kanan: memuat ulang daftar sensor **dan** tren 24 jam sekarang juga.
- **Ekspor Excel** di sebelah tombol putar: mengunduh daftar sensor ke file Excel (lihat bagian "Ekspor Excel" di bawah).

### Lima kartu ringkasan (KPI)

Ada di atas tabel. Kartu muncul setelah data selesai dimuat, project punya sensor, dan nilai terakhir sensor **bisa dibaca**. Angkanya dihitung dari **semua sensor project**, tidak terpengaruh kotak pencarian.

| Kartu | Isinya |
|---|---|
| Mengirim data | Jumlah sensor Fresh dibanding total, contoh "10 / 12". Klik: buka tab **Fresh** |
| Terlambat | Jumlah sensor Stale. Klik: buka tab **Stale** |
| Mati / belum pernah kirim | Jumlah Offline ditambah No Data. Klik: tabel disaring, muncul chip merah (lihat bawah) |
| Di luar ambang | Jumlah sensor yang nilainya di luar ambang. Klik: buka tab **Di luar ambang** |
| Nilai terendah saat ini | Nilai paling kecil di antara channel yang datanya Fresh. Tidak bisa diklik |

Catatan tiap kartu:

- **Mati / belum pernah kirim** menulis di bawah angkanya: "terlama: *alamat node* · *tanggal*", yaitu sensor Offline yang data terakhirnya paling lama. Kalau tidak ada yang Offline, tertulis "N belum pernah kirim" atau "semua aktif".
- Klik kartu ini **tidak** membuka tab Offline atau No Data. Tabel disaring ke Offline dan No Data **sekaligus**, dan di atas kotak pencarian muncul chip merah "Filter: Mati / belum pernah kirim (N)". Klik tanda **×** di chip untuk menghapus filter (kembali ke tab All). Klik tab mana pun juga menggantikan filter ini. Tidak ada tab khusus untuk filter ini.
- **Di luar ambang** menulis di bawah angkanya "X dari Y sensor punya ambang". Artinya: dari Y sensor di project, hanya X yang ambangnya sudah diatur. Sensor tanpa ambang tidak pernah bisa terhitung di luar ambang (lihat bagian 4).
- **Nilai terendah saat ini** dihitung dari nilai dan satuan **tiap channel** (bukan nilai gabungan sensor), hanya dari channel yang **Fresh** dan punya nilai. Kartu hanya menampilkan angka kalau semua channel itu memakai **satu satuan yang sama** (misalnya semua bar). Kalau satuannya campur (bar dan m³/jam), atau tidak ada channel Fresh, kartu menampilkan "—" dengan keterangan "tidak ada data segar satu satuan". Di bawah angka tertulis alamat node pemilik nilai itu. Angka di kartu ini selalu 2 desimal.
- Klik kartu hanya mengganti tab atau filter. Kata di kotak pencarian tidak dihapus, jadi kosongkan bila hasilnya tampak kurang.

> **Kartu hilang saat banner kuning muncul.** Kalau banner kuning "Nilai terakhir sensor sedang tidak dapat dibaca dari server data" tampil, kelima kartu **disembunyikan**. Alasannya: tanpa nilai terakhir, semua sensor akan terhitung "mati" dan angkanya menyesatkan. Tombol **Ekspor Excel** juga dinonaktifkan, supaya laporan tidak menulis semua logger sebagai mati. Pada kondisi ini kolom **Updated** menulis "Nilai terakhir tidak tersedia" sebagai ganti "Data terakhir ... lalu".

### Tab status

Enam tab, masing-masing dengan jumlah sensor: **All, Fresh, Stale, Offline, No Data, Di luar ambang**. Klik tab untuk menyaring tabel. Jumlah di tab tidak terpengaruh kotak pencarian.

Tab **Di luar ambang** berisi sensor yang minimal satu channel-nya melewati ambang **dan datanya Fresh**. Sensor dihitung satu kali walaupun dua channel-nya sama-sama keluar batas.

### Kotak pencarian

Ketik sebagian nama untuk mencari. Yang dicari:

- nama sensor dan kode sensor,
- kode node, **alamat** node, dan nama node,
- nama atau nomor telepon penanggung jawab (PIC).

Huruf besar atau kecil tidak berpengaruh. Hasil muncul sekitar setengah detik setelah Anda berhenti mengetik.

### Tabel sensor

| Kolom | Isinya |
|---|---|
| Sensor | Nama sensor. Baris kedua: kode sensor · metrik (· N channel kalau channel lebih dari satu) |
| Node | **Alamat** node, kode node di bawahnya |
| Last Value | Nilai terakhir tiap channel dengan satuan, tren 24 jam, plus penanda ambang |
| Status | Lencana Fresh / Stale / Offline / No Data, interval lapor di bawahnya |
| Updated | Waktu data terakhir (lihat penjelasan di bawah) |

- Kolom **Node** memakai alamat sebagai nama utama. Kalau alamat kosong, yang tampil kode node. Klik alamat untuk membuka detail node.
- Pada baris **bermasalah** (Stale, Offline, atau No Data), kalau node punya nomor telepon PIC, di kolom Node muncul baris dengan ikon telepon dan **nama PIC**. Nomornya tidak tampil di baris, tetapi ada di tooltip (arahkan kursor). Kalau nama PIC kosong, tertulis "Telepon PIC". Klik untuk menelepon (tautan `tel:`, jadi di komputer akan membuka aplikasi telepon yang terpasang, kalau ada). Klik ini tidak membuka detail sensor. Baris Fresh tidak menampilkan telepon ini, tetapi pencarian PIC tetap bekerja.
- Kolom **Status** menampilkan interval lapor node di bawah lencana, misalnya "tiap 15 dtk", "tiap 2 mnt", atau "tiap 1 jam". Kalau interval node tidak diketahui, baris ini tidak ada.
- Kolom **Last Value**:
  - Satu baris per channel. Kalau sensor punya lebih dari satu channel, nama metrik tampil di depan nilainya. Klik satu baris untuk membuka channel itu.
  - **Jumlah desimal mengikuti pengaturan presisi tiap channel.** Kalau presisi belum diatur, dipakai 2 desimal.
  - Nilai kosong ditulis "-".
  - Di bawah nilai tiap channel ada **tren 24 jam** (lihat bagian "Tren 24 jam" di bawah).
  - Penanda ambang dijelaskan di bagian "Penanda di luar ambang" di bawah.
- Kolom **Updated**:
  - Baris Fresh dan Stale: selisih waktu ("4 mnt lalu", "2 jam lalu") dan tanggal serta jam bacaan terakhir.
  - Baris **Offline dan No Data**: tulisan merah "Data terakhir *durasi* lalu" dan di bawahnya "sejak *tanggal, jam*". Durasi ditulis dalam mnt, jam, hari, atau bln.
  - Kalau sensor tidak pernah mengirim nilai, baris pertama (merah) tertulis "Belum pernah kirim". Baris kedua "node terlihat *durasi* lalu" muncul **kalau node-nya pernah terlihat** (misalnya node mengirim data lain). Artinya alat hidup, tetapi channel ini belum pernah menyetor nilai. Periksa pemetaan atau kabel sensornya. Kalau node juga tidak pernah terlihat, baris kedua tidak ada.

### Tren 24 jam (kolom Last Value)

Di bawah nilai tiap channel ada garis kecil dan tulisan "24 jam: *min*–*maks*".

- **Garis** = **rata-rata per jam** selama 24 jam terakhir, jam sekarang di ujung kanan. Jam tanpa data membuat garis **putus** (ada celah). Jam kosong tidak digambar sebagai 0 dan tidak diisi atau ditebak. Garis hanya tampil kalau ada **minimal 2 jam** yang punya data.
- **"24 jam: min–maks"** = bacaan **mentah** terendah dan tertinggi dalam 24 jam terakhir (bukan dari rata-rata per jam), dengan jumlah desimal channel itu. Rentangnya 24 jam terakhir, **bukan** hari kalender (tidak mulai dari jam 00:00).
- **Bentuk garis relatif terhadap rentang channel itu sendiri.** Titik terendah di garis selalu di bawah dan tertinggi selalu di atas, berapa pun selisih angkanya. Garis menunjukkan **pola**, bukan tinggi nilai sebenarnya. Bandingkan tinggi nilai lewat angka, bukan lewat garis.
- Tren dimuat sekali saat halaman dibuka, lalu diperbarui **tiap 5 menit** (hanya selagi tab browser terlihat). Ini terpisah dari penyegaran otomatis daftar tiap 60 detik. Tombol putar memuat ulang keduanya.
- Kalau channel tidak punya data 24 jam, bagian ini tidak tampil.

> **Baca "sejak" dengan hati-hati.** Tanggal itu adalah waktu **data terakhir tiba** di sistem. Itu bukan saat alat terbukti mati. Alat bisa saja mati sedikit setelahnya, atau data terakhir tertahan di jaringan. Untuk laporan, tulis "tidak ada data sejak ...", bukan "alat mati pada ...".

### Penanda di luar ambang (kolom Last Value)

Setiap nilai dibandingkan dengan ambang **channel itu sendiri**, dan dinilai berdasarkan kesegaran data **channel itu sendiri**.

| Tampilan nilai | Artinya |
|---|---|
| Merah, panah ↓ atau ↑, di bawahnya "di bawah min X" / "di atas maks Y" | Channel Fresh dan nilainya melewati ambang. **Dihitung** di kartu dan tab |
| Kuning, panah, di bawahnya "di bawah min X · data terlambat" | Channel Stale dan nilainya melewati ambang. **Tidak dihitung** |
| Hitam biasa tanpa panah | Normal, ambang belum diatur, atau channel Offline / No Data (tidak dinilai) |

- Arahkan kursor ke satu nilai untuk melihat ambangnya, misalnya "Ambang 0.5–5 bar". Kalau hanya satu sisi yang diatur, tertulis "Ambang min ..." atau "Ambang maks ...". Kalau belum ada, tertulis **"Ambang belum diatur"**.
- Channel yang Offline atau No Data **tidak dinilai** terhadap ambang. Nilai lama bukan masalah saat ini.
- Ambang diatur di **halaman detail sensor**: kartu **Ambang**, tombol **Atur**.

### Urutan dan halaman

- Klik judul kolom **Sensor, Node, Last Value, Updated** untuk mengurutkan. Klik lagi untuk membalik arah. Urutan awal: nama sensor, A ke Z.
- **Last Value** diurutkan menurut nilai **channel pertama** (yang tampil paling atas di baris). Sensor tanpa nilai selalu di paling bawah, naik maupun turun.
- Penomoran halaman di bawah tabel. Pilihan jumlah baris (Rows): 10, **20 (awal)**, 50, atau 100.

### Ekspor Excel

Tombol **Ekspor Excel** di header mengunduh file `.xlsx` berisi daftar yang **sedang tampil menurut tab atau filter, pencarian, dan urutan Anda**, **semua halaman** (bukan hanya halaman yang terlihat). Satu baris untuk **setiap channel**, jadi sensor dengan dua channel menjadi dua baris.

Kolom di file:

| Kolom | Isinya |
|---|---|
| Alamat Node, Kode Node | Lokasi dan kode node |
| Sensor, Metrik | Nama sensor dan nama channel |
| Nilai Terakhir, Satuan | Nilai angka dan satuannya. Jumlah desimal mengikuti presisi channel |
| Min 24 jam, Maks 24 jam, Rata-rata 24 jam | Terendah, tertinggi (bacaan mentah), dan rata-rata dalam 24 jam terakhir. Kosong kalau tidak ada data. Jumlah desimal sama dengan nilai terakhir |
| Ambang Min, Ambang Maks | Batas yang diatur. Kosong kalau belum diatur |
| Status Ambang | Di bawah min / Di atas maks / Normal / Belum diatur / - |
| Status | Fresh / Stale / Offline / No Data |
| Data Terakhir (WIB/WITA/WIT) | Tanggal dan jam data terakhir. Judul kolom menyebut zona waktu komputer Anda |
| Keterangan | Diisi untuk baris Stale, Offline, No Data: "Data terakhir ... lalu", atau "Belum pernah kirim" (ditambah "· node terlihat ... lalu" kalau node pernah terlihat). Kosong untuk baris Fresh |
| Interval Lapor (dtk) | Interval kirim node, dalam detik |
| PIC, Telepon PIC | Penanggung jawab node |

Arti **Status Ambang** di file:

| Isi | Artinya |
|---|---|
| Di bawah min / Di atas maks | Nilai melewati ambang |
| Normal | Nilai di dalam ambang |
| Belum diatur | Channel punya data tetapi ambang kosong. **Bukan** "normal" |
| - | Channel Offline / No Data, atau tidak ada nilai |

Hal lain tentang file:

- Di file, nilai yang melewati ambang tetap tertulis "Di bawah min" atau "Di atas maks" walaupun channel-nya Stale. Di layar, yang Stale tidak dihitung sebagai di luar ambang. Lihat kolom **Status** untuk membedakan.
- Angka 24 jam diambil dari tren yang sedang dimuat di layar. Kalau tren gagal dimuat (ada tulisan kuning di header), kolom 24 jam kosong.
- Baris judul dibekukan (tetap terlihat saat menggulir) dan tiap kolom punya **filter** di judulnya.
- Nama file: `sensor-<project>-<yyyymmdd-hhmm>.xlsx`. Bagian `<project>` adalah 8 karakter pertama kode project, dan tanggal serta jam diambil dari jam komputer Anda saat mengunduh.
- Tombol **tidak bisa diklik** saat data sedang dimuat, saat ekspor sedang berjalan, saat daftar kosong (misalnya tab atau pencarian tidak menemukan apa pun), atau saat banner kuning "nilai terakhir tidak dapat dibaca" tampil.
- Kalau gagal, muncul kotak merah "Ekspor Excel gagal. Coba lagi." dengan tombol **Coba lagi**.

## 3. Cara melakukan tugas umum

### Mencari titik pantau yang tidak mengirim data

1. Buka tab **Sensors** di menu samping.
2. Lihat kartu **Mati / belum pernah kirim**. Angka di situ adalah jumlah sensor Offline ditambah No Data. Baca juga "terlama" untuk tahu sensor yang paling lama diam.
3. Klik kartu itu. Tabel disaring ke Offline dan No Data sekaligus, dan muncul chip merah "Filter: Mati / belum pernah kirim". Untuk memisahkan keduanya, klik tab **Offline** atau **No Data**. Untuk yang mulai terlambat, klik kartu **Terlambat** (tab **Stale**).
4. Urutkan kolom **Updated** supaya yang paling lama diam ada di atas.
5. Baca kolom **Updated**. Tulisan "sejak ..." menunjukkan kapan data terakhir masuk (bukan saat alat pasti mati). Kalau tertulis "Channel belum pernah kirim · node terakhir terlihat ...", alatnya hidup tetapi channel itu belum pernah mengirim nilai.
6. Arahkan kursor ke lencana status untuk melihat ambang waktunya.
7. Hubungi PIC lewat tautan telepon di kolom **Node** pada baris itu. Atau klik alamat node untuk memeriksa detail alat.
8. Untuk menghapus chip, klik tanda **×** di chip itu.
9. Untuk laporan, klik **Ekspor Excel** (lihat tugas berikutnya).

### Memeriksa titik yang tekanannya di luar batas

1. Lihat kartu **Di luar ambang**. Angkanya adalah jumlah sensor yang sedang melewati batas, dengan data yang masih Fresh. Baca juga "X dari Y sensor punya ambang" untuk tahu berapa sensor yang bisa dinilai.
2. Klik kartu itu, atau klik tab **Di luar ambang**.
3. Di kolom **Last Value**, cari nilai merah dengan panah. Baca catatan di bawahnya: "di bawah min 0.5" berarti tekanan lebih rendah dari batas bawah, "di atas maks 5" berarti lebih tinggi dari batas atas.
4. Arahkan kursor ke nilai itu untuk melihat ambang lengkapnya, misalnya "Ambang 0.5–5 bar".
5. Klik nilai (atau barisnya) untuk membuka detail sensor. Lihat grafik, apakah turun mendadak atau sudah lama rendah.
6. Periksa kalibrasi dan kondisi lapangan: sensor lepas, kabel, katup tertutup sebagian, atau memang gangguan distribusi. Hubungi PIC dari kolom **Node** kalau perlu (telepon hanya tampil di baris bermasalah, yaitu Stale, Offline, No Data).
7. Kalau batas dirasa tidak cocok, ubah di halaman detail sensor, kartu **Ambang**, tombol **Atur**.
8. Untuk laporan, klik **Ekspor Excel** saat tab **Di luar ambang** aktif. Kolom **Status Ambang** memuat keterangannya.

### Membuat laporan untuk atasan

1. Pilih tab yang ingin dilaporkan. Misalnya **Offline** untuk daftar alat yang diam, **Di luar ambang** untuk titik di luar batas, atau **All** untuk seluruh sensor.
2. Kalau perlu, ketik lokasi atau nama PIC di kotak pencarian, dan urutkan kolom sesuai selera (misalnya **Updated** supaya yang terlama di atas).
3. Klik **Ekspor Excel** di header. Tunggu sampai file terunduh.
4. Buka file. Isinya mengikuti tab atau filter, pencarian, dan urutan tadi, semua halaman, satu baris per channel.
5. Pakai kolom **Keterangan** untuk bahasa siap tulis ("Data terakhir 5 jam lalu"), kolom **Status Ambang** untuk kondisi batas, dan **PIC** serta **Telepon PIC** untuk tindak lanjut.
6. Cantumkan jam unduh dari nama file di laporan. Angka "lalu" di kolom Keterangan dihitung pada saat Anda mengunduh.

### Mencari sensor di lokasi tertentu

1. Ketik sebagian alamat, kode node, atau nama PIC di kotak pencarian.
2. Klik baris hasil untuk membuka detail.

### Melihat tren sebuah sensor

1. Klik barisnya (di mana saja selain alamat node dan telepon PIC). Anda dibawa ke detail sensor.
2. Untuk sensor multi-channel, klik langsung nama channel yang diinginkan.
3. Di halaman detail, pilih periode dan lihat grafiknya (lihat panduan Detail Sensor Channel).

### Melihat pola 24 jam semua titik sekaligus

1. Pilih tab yang ingin dilihat (misalnya **Fresh** atau **All**). Lihat garis kecil di bawah nilai tiap channel di kolom **Last Value**.
2. Cari garis yang **putus-putus** (ada jam tanpa data) atau yang tiba-tiba turun. Itu tanda titik perlu diperiksa.
3. Baca "24 jam: min–maks" di sebelahnya untuk tahu rentang angka sebenarnya. Garis hanya menunjukkan pola, jadi jangan membandingkan tinggi garis antar titik.
4. Untuk melihat lebih rinci, klik nilainya untuk membuka detail channel.
5. Untuk laporan, klik **Ekspor Excel**. Kolom **Min 24 jam**, **Maks 24 jam**, dan **Rata-rata 24 jam** ikut tertulis.

### Membandingkan nilai antar lokasi

1. Pilih tab **Fresh** supaya hanya sensor yang datanya masih baru.
2. Klik judul kolom **Last Value** untuk mengurutkan dari kecil ke besar. Urutan memakai channel pertama tiap sensor.
3. Nilai terendah di atas. Klik lagi untuk dari besar ke kecil.
4. Untuk sekadar tahu nilai terendah, lihat kartu **Nilai terendah saat ini**.

## 4. Arti status, warna & angka

Ambang waktu dihitung dari **interval kirim node** tempat sensor terpasang.

| Status | Warna | Aturan |
|---|---|---|
| Fresh | Hijau | Data terakhir lebih baru dari yang terbesar antara 10 menit atau 3 kali interval |
| Stale | Kuning | Lebih baru dari yang terbesar antara 60 menit atau 12 kali interval |
| Offline | Merah | Lebih lama dari batas Stale |
| No Data | Abu-abu | Belum pernah ada data |

**Contoh logger 120 detik (2 menit):**

- Batas Fresh: 3 x 2 = 6 menit. Yang terbesar dengan 10 menit adalah **10 menit**. Fresh jika data kurang dari 10 menit lalu.
- Batas Stale: 12 x 2 = 24 menit. Yang terbesar dengan 60 menit adalah **60 menit**. Stale jika 10 sampai kurang dari 60 menit.
- Offline jika 60 menit atau lebih.

**Contoh logger 15 menit (900 detik):** Fresh di bawah 45 menit, Stale di bawah 180 menit, Offline setelahnya.

Kalau interval node tidak diketahui, dipakai batas minimum: 10 dan 60 menit.

**Tooltip lencana.** Arahkan kursor ke lencana status. Muncul teks seperti "interval 120s · Fresh < 10 min · Stale < 60 min · Offline ≥ 60 min". Itu ambang untuk sensor tersebut.

**Interval di bawah lencana.** "tiap 2 mnt" berarti node diatur mengirim data setiap 2 menit. Ini pengaturan node, bukan hasil pengukuran.

**Status per sensor, kesegaran per channel.** Lencana Status menilai sensor secara keseluruhan. Penanda ambang menilai tiap channel dengan kesegaran channel itu sendiri, karena channel pada satu sensor bisa berhenti sendiri-sendiri. Jadi di satu baris bisa saja lencana Fresh sementara satu nilai ditandai "data terlambat".

**Kolom Updated.**

| Status baris | Tampilan |
|---|---|
| Fresh, Stale | "4 mnt lalu" / "2 jam lalu", lalu tanggal dan jam |
| Offline | "Data terakhir 5 jam lalu", lalu "sejak 13 Nov 2026, 08:00" (merah) |
| No Data | "Belum pernah kirim" (merah), dan di bawahnya "node terlihat ... lalu" kalau node pernah terlihat |

Satuan durasi "Data terakhir ... lalu": **mnt** (di bawah 60 menit), **jam** (sampai 47 jam), **hari** (sampai 59 hari), lalu **bln**.

**Status ambang sebuah channel.**

| Kondisi channel | Penilaian |
|---|---|
| Fresh, ambang diatur | Dinilai: normal, di bawah min, atau di atas maks. Yang melewati dihitung |
| Stale, ambang diatur | Melewati ambang ditampilkan kuning, **tidak dihitung** |
| Offline / No Data, atau ambang kosong | Tidak dinilai, tanpa penanda |

**Kenapa Stale tidak dihitung?** Nilai yang sudah tua belum tentu mewakili keadaan sekarang, jadi bukan masalah saat ini. Aturan ini sama dengan halaman Telemetry Channels dan aplikasi mobile, sehingga angkanya sama di semua tempat. Nilai Stale yang melewati batas tetap ditampilkan (kuning) supaya tidak tersembunyi.

**Ambang kosong = "belum diatur", bukan "normal".** Sensor tanpa ambang tidak pernah muncul di tab **Di luar ambang**, serendah apa pun nilainya.

## 5. Tips & hal yang perlu diperhatikan

- **Penyegaran otomatis tiap 60 detik**, hanya selagi tab browser Anda terlihat. Kalau tab disembunyikan, penyegaran berhenti dan lanjut lagi saat tab dibuka (paling lama menunggu 60 detik). Tabel tidak berkedip, dan halaman serta pencarian Anda tetap di tempatnya.
- Kalau penyegaran otomatis gagal, data lama tetap tampil. Lihat jam "updated" untuk tahu seberapa lama datanya.
- **Nilai tekanan negatif** tidak masuk akal di pipa bertekanan. Curigai sensor lepas, kabel putus, atau kalibrasi. Laporkan ke teknisi. Kalau ambang bawah diatur, nilai negatif akan ditandai merah "di bawah min".
- **Nilai yang di luar ambang belum tentu pipa bermasalah.** Bisa juga kalibrasi sensor bergeser atau ambang yang salah atur. Cek detail sensor sebelum bertindak di lapangan.
- **Nilai persis sama** berjam-jam bisa berarti sensor macet. Buka detail dan lihat grafiknya.
- Status mengukur **kapan data terakhir masuk**, bukan kesehatan fisik alat atau kebenaran angkanya. Begitu pula "sejak": itu waktu data terakhir tiba, bukan saat alat terbukti mati.
- Angka **Di luar ambang** hanya sebagus kelengkapan ambang. Lihat "X dari Y sensor punya ambang" di kartu: semakin kecil X, semakin banyak sensor yang tidak dinilai.
- File Excel adalah **potret saat diunduh**. Unduh ulang kalau butuh data terbaru.
- Semua sensor dalam project dimuat, tidak dipotong di jumlah tertentu.
- Tabel **tidak menggulir ke samping**. Teks panjang dibungkus ke baris berikutnya, sedangkan angka, lencana, dan waktu tetap satu baris.

### Keterbatasan

- Tidak ada filter berdasarkan angka (misalnya "di bawah 1 bar"). Pakai tab **Di luar ambang** (kalau ambang sudah diatur), atau urutkan kolom Last Value.
- Tren di halaman ini hanya **24 jam terakhir** (bukan hari kalender) dengan titik per jam. Untuk periode lain atau grafik rinci, buka halaman detail sensor.
- Ambang hanya bisa **dilihat** di halaman ini (lewat tooltip dan Excel). Mengubahnya dilakukan di halaman detail sensor.

## 6. FAQ / masalah umum

**Kenapa No Data padahal alat menyala?**
No Data artinya sistem belum menerima data apa pun dari sensor itu. Penyebab umum: alat baru dipasang dan belum kirim, sinyal 4G tidak ada, pemetaan sensor belum selesai, atau data belum sampai ke server. Kalau baris kedua tertulis "node terlihat ... lalu", alatnya terlihat hidup tetapi channel ini belum pernah menyetor nilai: periksa pemetaan atau kabel sensornya. Kalau semua sensor mendadak No Data dan muncul banner kuning (lihat di bawah), masalahnya ada di pembacaan data, bukan di alat.

**Kenapa Stale, bukan Offline?**
Stale adalah masa peralihan. Contoh logger 2 menit: data terakhir 25 menit lalu sudah lewat batas Fresh (10 menit) tetapi belum 60 menit, jadi Stale. Bisa jadi sinyal sedang buruk dan data tertunda. Pantau dulu. Kalau berlanjut, statusnya jadi Offline dan alat perlu diperiksa.

**Apakah tanggal "sejak" itu saat alat mati?**
Bukan. Itu waktu data terakhir yang diterima sistem. Alat bisa saja berhenti sesaat setelahnya, atau data terakhir tertahan di jaringan. Sistem tidak mengukur saat tepatnya alat mati.

**Kenapa nilai kuning tidak dihitung di luar ambang?**
Nilai kuning dengan tulisan "· data terlambat" berasal dari channel yang Stale: datanya sudah mulai tua. Nilai tua belum tentu mewakili keadaan sekarang, jadi tidak dihitung sebagai masalah saat ini. Aturan ini sama dengan halaman Telemetry Channels dan aplikasi mobile. Nilainya tetap ditampilkan supaya Anda tahu. Kalau data masuk lagi dan nilainya masih melewati batas, ia berubah merah dan mulai dihitung. Kalau channel makin lama diam sampai Offline, penandanya hilang karena tidak dinilai.

**Kenapa ada sensor tanpa penanda padahal tekanannya rendah?**
Kemungkinan besar ambangnya **belum diatur**. Arahkan kursor ke nilainya: kalau tertulis "Ambang belum diatur", sistem tidak punya batas untuk membandingkan. Ambang kosong bukan berarti normal. Atur di halaman detail sensor, kartu **Ambang**, tombol **Atur**. Penyebab lain: channel-nya Offline atau No Data (tidak dinilai), atau nilainya memang masih di dalam batas yang diatur.

**Kenapa kartu ringkasan hilang?**
Karena nilai terakhir sensor tidak dapat dibaca dari server data, dan banner kuning tampil. Kartu disembunyikan supaya semua sensor tidak terhitung "mati" secara keliru. Ekspor Excel juga dinonaktifkan selama itu. Klik **Coba lagi** di banner. Kalau tetap muncul, laporkan ke admin. Kartu juga tidak tampil saat data masih dimuat, saat gagal dimuat, atau saat project belum punya sensor.

**Kenapa chip merah "Filter: Mati / belum pernah kirim" muncul dan tidak ada tabnya?**
Chip itu muncul karena Anda mengklik kartu **Mati / belum pernah kirim**. Isinya Offline dan No Data digabung. Klik **×** di chip untuk menghapus, atau klik tab lain.

**Kenapa tidak ada nomor telepon PIC di baris saya?**
Nomor hanya tampil di baris Stale, Offline, dan No Data, dan hanya kalau node punya nomor PIC. Baris Fresh tidak menampilkannya. Kalau barisnya bermasalah tetapi tidak ada nomor, data PIC node itu belum terisi. Hubungi admin.

**Kenapa tombol Ekspor Excel tidak bisa diklik?**
Data sedang dimuat, ekspor sebelumnya masih berjalan, daftar kosong karena tab atau pencarian tidak menemukan sensor, atau banner kuning "nilai terakhir tidak dapat dibaca" sedang tampil. Tunggu sebentar, atau klik tab **All** dan kosongkan kotak pencarian.

**Muncul kotak merah "Ekspor Excel gagal. Coba lagi."**
File tidak berhasil dibuat. Klik **Coba lagi**. Kalau tetap gagal, periksa apakah browser memblokir unduhan, lalu laporkan ke admin.

**Kenapa isi file Excel lebih banyak dari baris di layar?**
File memuat semua halaman dan satu baris per channel. Sensor multi-channel tampil satu baris di tabel, tetapi beberapa baris di file.

**Kenapa di Excel tertulis "Di bawah min (data terlambat)"?**
Sama seperti nilai kuning di layar: channel itu Stale, nilainya melewati ambang, tetapi tidak masuk hitungan Di luar ambang karena datanya sudah tua. Tanpa keterangan "(data terlambat)" berarti channel itu Fresh dan ikut dihitung.

**Kenapa Status Ambang di Excel berisi "-"?**
Channel-nya Offline atau No Data, atau tidak punya nilai, jadi tidak dinilai terhadap ambang.

**Muncul banner kuning "Nilai terakhir sensor sedang tidak dapat dibaca dari server data".**
Server data nilai terakhir tidak bisa dibaca saat ini. Status "No Data" di tabel belum tentu berarti alat mati. Kartu ringkasan disembunyikan dan Ekspor Excel dinonaktifkan sampai data bisa dibaca. Klik **Coba lagi**. Kalau tetap muncul, laporkan ke admin.

**Muncul kotak merah "Gagal memuat data sensor." dengan tombol Coba lagi.**
Daftar sensor gagal dimuat, biasanya masalah koneksi. Klik **Coba lagi**. Kalau penyegaran otomatis yang gagal dan tabel sudah terisi, tabel lama dipertahankan tanpa pesan galat.

**Tertulis "Belum ada sensor di project ini."**
Project belum memiliki sensor terdaftar. Hubungi admin.

**Tertulis "Tidak ada sensor sesuai filter."**
Tab, chip filter, atau kata pencarian tidak cocok dengan sensor mana pun. Klik tab **All** dan kosongkan kotak pencarian. Di tab **Di luar ambang**, ini juga bisa berarti memang tidak ada titik yang melewati batas.

**Kenapa angka di tab dan kartu tidak berubah waktu saya mencari?**
Jumlah di tab dan kartu menghitung semua sensor project. Kotak pencarian hanya mempersempit isi tabel.

**Kenapa kartu "Nilai terendah saat ini" berisi "—"?**
Tidak ada channel Fresh yang punya nilai, atau channel Fresh memakai satuan berbeda (misalnya bar dan m³/jam) sehingga "terendah" tidak bermakna. Pilih tab **Fresh** dan urutkan Last Value kalau tetap ingin membandingkan.

**Kenapa klik baris tidak membuka apa-apa?**
Sensor itu tidak terhubung ke node, jadi detailnya tidak bisa dibuka. Hubungi admin.

**Kenapa Last Value untuk satu sensor ada beberapa baris?**
Sensor itu punya beberapa channel. Setiap baris adalah satu channel. Klik baris yang diinginkan untuk membuka channel itu.

**Kenapa urutan Last Value tidak cocok dengan nilai di baris kedua?**
Pengurutan memakai nilai channel **pertama** tiap sensor. Nilai channel lain di baris yang sama tidak ikut menentukan urutan.

**Kenapa garis tren putus-putus?**
Setiap titik adalah rata-rata satu jam. Kalau dalam satu jam tidak ada data yang masuk (alat mati, sinyal hilang), jam itu dibiarkan kosong dan garis **putus**. Sistem sengaja tidak menggambarnya sebagai 0 dan tidak mengisinya, supaya celah data terlihat jelas.

**Kenapa garis tren terlihat naik turun tajam padahal angkanya kecil?**
Bentuk garis diskalakan terhadap rentang channel itu sendiri selama 24 jam. Selisih kecil (misalnya 0,64 sampai 0,70 bar) tetap digambar dari dasar sampai puncak. Garis menunjukkan pola, bukan besarnya perubahan. Lihat angka "24 jam: min–maks" di sebelahnya untuk tahu selisih sebenarnya.

**Kenapa tidak ada garis tren, atau tulisan kuning "Tren 24 jam ..." muncul di header?**
Garis hanya tampil kalau ada minimal 2 jam yang punya data dalam 24 jam terakhir. Kalau tulisan kuning muncul, tren gagal dimuat (atau server data tidak tersedia). Tren terakhir yang berhasil tetap dipakai dan dicoba lagi otomatis tiap 5 menit. Kalau tetap muncul, laporkan ke admin.
