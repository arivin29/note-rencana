---
title: Detail Sensor Channel
version: 1.1.1
updatedAt: 2026-11-13
audience: operator, supervisor distribusi, admin
sources: [src/app/pages/iot/nodes/nodes-detail/sensor-chanel-detail/sensor-chanel-detail.ts, src/app/pages/iot/nodes/nodes-detail/sensor-chanel-detail/sensor-chanel-detail.html, src/app/shared/utils/telemetry-freshness.ts]
related: [node-detail, project-sensors]
---

## 1. Untuk apa halaman ini

Halaman ini menampilkan **satu channel sensor** (misalnya tekanan, debit, atau level) beserta riwayat bacaannya. Pakai halaman ini untuk mengecek kondisi saat ini, mencari kapan nilai terendah atau tertinggi terjadi, menemukan bacaan yang janggal, dan mengambil data untuk laporan.

> **Channel** adalah satu jenis ukuran dari sebuah sensor. Satu sensor bisa punya lebih dari satu channel.

## 2. Bagian-bagian layar

### Header (baris paling atas)

- **Panah kiri**: kembali ke halaman detail node.
- **Nama sensor** dan **satuan** (mis. BAR), lalu **lencana kesegaran** (lihat bagian 4).
- Di bawah nama: kode metrik, jenis sensor, dan kode node.
- **Pemilih channel**: tombol-tombol channel, hanya muncul kalau sensor punya lebih dari satu channel. Klik untuk pindah channel.
- **Panduan**: membuka panduan ini.
- **Muat ulang**: mengambil data lagi. Halaman **tidak menyegarkan diri sendiri**, jadi klik tombol ini untuk melihat bacaan terbaru.
- **Ekspor**: mengunduh berkas **Excel (.xlsx)** berisi ringkasan, grafik, dan seluruh data. Tombol mati kalau tidak ada bacaan yang bisa diekspor.
- **Menu ⋮**: berisi **Ubah channel** dan **Hapus channel**.

### Empat kartu ringkasan

Semua angka dihitung untuk **periode yang sedang dipilih**.

| Kartu | Artinya |
|---|---|
| Nilai terkini | Bacaan paling baru di periode ini, beserta waktunya |
| Terendah · Rata-rata · Tertinggi | Tiga angka ringkasan. Di bawahnya tertulis **kapan** nilai terendah dan tertinggi terjadi |
| Jumlah bacaan | Banyaknya sampel di periode ini, dan berapa yang di luar ambang |
| Ambang | Batas MIN dan MAKS alarm. Kalau kosong tertulis "Belum diatur" dengan tombol **Atur** |

### Kartu Tren nilai

- Grafik garis nilai dari waktu ke waktu.
- **Pemilih periode** di kanan atas (daftar pilihan ada di bagian 4).
- **Garis putus-putus oranye** = batas MIN, **merah** = batas MAKS (hanya muncul kalau ambang diatur).
- Alat di atas grafik: perbesar, geser, dan reset tampilan. Arahkan kursor ke grafik untuk melihat waktu dan nilai tepatnya.
- Di bawah grafik, kalau ada jeda data, muncul catatan seperti "4 jeda pengiriman · total 9j 12m".

### Kartu Bacaan

Tabel semua bacaan, **terbaru di atas**.

| Kolom | Isinya |
|---|---|
| Waktu | Tanggal dan jam bacaan |
| Nilai | Angka yang sudah dikalibrasi, dengan satuan |
| Mentah | Sinyal asli dari sensor (disembunyikan di layar sempit) |
| Keterangan | Normal / Di bawah min / Di atas maks |

- Chip **Semua / Di luar ambang** hanya muncul kalau ambang sudah diatur.
- Di bawah tabel ada penomoran halaman dan pilihan jumlah baris (25, 50, 100, atau 200).

## 3. Cara melakukan tugas umum

### Mengecek tekanan saat ini

1. Buka halaman channel. Periode awalnya **7 hari terakhir**.
2. Lihat lencana di header. Kalau tertulis "Data terakhir ... lalu" berwarna hijau, alat sedang mengirim data.
3. Baca kartu **Nilai terkini**. Waktu bacaannya tertulis di bawah angka.
4. Kalau ingin pasti terbaru, klik **Muat ulang**.
5. Lihat grafik. Pastikan tidak ada garis yang putus atau turun tiba-tiba (lihat bagian 5).

### Mencari kapan tekanan terendah terjadi

1. Pilih periode yang dimaksud, misalnya **Kemarin** atau **Rentang khusus**.
2. Lihat kartu **Terendah · Rata-rata · Tertinggi**. Di baris bawahnya tertulis "terendah ... tertinggi ..." lengkap dengan tanggal dan jam.
3. Untuk melihat bentuk kejadiannya, cari titik itu di grafik lalu arahkan kursor.
4. Bila ambang sudah diatur, klik chip **Di luar ambang** untuk melihat hanya bacaan yang melanggar batas.

### Mengekspor data untuk laporan

1. Pilih periode. Untuk "3 hari terakhir", pilih **Rentang khusus**, isi **Dari tanggal** dan **Sampai tanggal**.
2. (Opsional) Pilih chip **Di luar ambang** kalau hanya itu yang dibutuhkan.
3. Klik **Ekspor**. Berkas Excel (.xlsx) terunduh.
4. Buka di Excel atau aplikasi spreadsheet.

Berkasnya punya dua lembar:

| Lembar | Isinya |
|---|---|
| Ringkasan | Alamat & kode node, sensor, channel, satuan, periode, lalu statistik (jumlah sampel, terendah/tertinggi beserta waktunya, rata-rata, nilai pertama & terakhir), ambang, daftar jeda pengiriman, dan **gambar grafik** |
| Data | Seluruh bacaan, satu baris per bacaan |

Yang perlu diketahui:

- Mengikuti **periode, filter, dan urutan yang sedang aktif** di layar. Seluruh bacaan hasil filter ikut, bukan hanya halaman tabel yang terlihat.
- **Waktu** memakai zona waktu perangkat Anda dan ditulis sebagai tanggal Excel asli, jadi bisa disaring dan dihitung. Nama zonanya tertulis di judul kolom, mis. `Waktu (Asia/Jakarta)`.
- Angka **ditampilkan sesuai presisi sensor**, sama dengan di layar.
- Kolom **Keterangan kosong** kalau ambang belum diatur.
- Baris judul dibekukan dan penyaring (filter) Excel sudah aktif.

### Mengatur ambang alarm

1. Kalau ambang belum ada, klik **Atur** di kartu Ambang. Atau buka menu **⋮** lalu **Ubah channel**.
2. Isi batas minimum dan/atau maksimum di panel yang terbuka, lalu simpan.
3. Halaman memuat ulang. Garis ambang muncul di grafik, kolom Keterangan terisi, dan chip **Di luar ambang** muncul.

Boleh mengisi hanya MIN atau hanya MAKS.

### Berpindah channel atau periode

- Klik tombol channel di header. Alamat halaman ikut berubah, jadi bisa dibagikan ke rekan.
- Mengganti periode langsung memuat ulang data.

## 4. Arti status, warna & angka

### Lencana kesegaran

Jaraknya dihitung dari **bacaan terbaru di periode yang dipilih** sampai sekarang.

| Lencana | Arti |
|---|---|
| Hijau | **Fresh**: bacaan terakhir kurang dari 10 menit lalu |
| Kuning | **Stale**: 10 sampai kurang dari 60 menit lalu. Data mulai terlambat |
| Merah | **Offline**: 60 menit atau lebih. Periksa alatnya |
| Abu-abu "Tidak ada data" | Tidak ada bacaan sama sekali di periode ini |
| Abu-abu "Data periode lampau" | Periode yang dipilih sudah berlalu. **Bukan tanda alat mati** |

"Data periode lampau" muncul pada **Kemarin**, **Bulan lalu**, dan **Rentang khusus** yang diisi "Sampai tanggal". Untuk mengecek apakah alat hidup sekarang, pilih periode seperti **24 jam terakhir** atau **Hari ini**.

Halaman ini memakai ambang tetap 10 dan 60 menit untuk semua channel.

### Periode yang tersedia

| Pilihan | Rentang |
|---|---|
| Hari ini | Jam 00:00 sampai sekarang |
| Kemarin | Seluruh hari kemarin |
| 24 jam terakhir | 24 jam ke belakang dari sekarang |
| 7 hari terakhir | Awal hari 7 hari lalu sampai sekarang |
| 30 hari terakhir | Awal hari 30 hari lalu sampai sekarang |
| Bulan ini | Tanggal 1 sampai sekarang |
| Bulan lalu | Seluruh bulan lalu |
| Rentang khusus | Pilih tanggal sendiri |

Pada **Rentang khusus**, tanggal dibaca menurut jam perangkat Anda. **Sampai tanggal bersifat inklusif**: kalau diisi 12 November, data sampai pukul 23:59 tanggal 12 ikut masuk. Kalau "Dari tanggal" kosong, dipakai 7 hari lalu. Kalau "Sampai tanggal" kosong, dipakai sampai sekarang.

### Cara angka ditulis

Halaman ini memakai penulisan angka Indonesia:

- **Koma** adalah pemisah desimal: `2,11 bar` dibaca "dua koma sebelas bar".
- **Titik** adalah pemisah ribuan: `5.453 sampel` berarti **lima ribu empat ratus lima puluh tiga** sampel, bukan "lima koma empat".

Aturan yang sama berlaku di kartu ringkasan, label grafik, tooltip, dan tabel, jadi angka yang sama selalu tertulis sama di seluruh layar.

Berkas Excel hasil Ekspor menyimpan angka sebagai **angka sungguhan**, bukan teks. Excel di komputer Anda yang menentukan tampilannya, jadi pada Excel berbahasa Indonesia angkanya ikut memakai koma, dan rumus seperti `AVERAGE` tetap bisa dipakai langsung.

### Nilai vs Mentah

- **Nilai** adalah angka yang sudah diubah ke satuan sebenarnya (mis. bar). Pakai kolom ini untuk laporan dan pengambilan keputusan.
- **Mentah** adalah sinyal asli dari sensor, biasanya tegangan (volt) atau arus (mA), sebelum diubah. Kolom ini berguna untuk memeriksa alat.

Contoh nyata dari sensor "Tekanan 0.5v-5V 0-10 bar": mentah **0,716** menjadi **1,79 bar**. Rumus kalibrasinya tersimpan di jenis sensor, bukan di halaman ini, dan untuk jenis tersebut berbunyi `((mentah - 0,349) / (2,4 - 0,349)) x 10`. Setiap jenis sensor punya rumusnya sendiri, dan rumus itu bisa diubah petugas. Halaman ini hanya menampilkan hasilnya, tidak menampilkan rumusnya.

Kalau hubungan mentah dan nilai tiba-tiba berubah pada tanggal tertentu, biasanya kalibrasi jenis sensor itu memang diubah. Tanyakan ke admin sebelum menyimpulkan sensornya rusak.

Kalau Mentah mendekati batas bawah sensor (atau nol) padahal Nilai aneh, curigai sensor atau kabel.

### Ambang

| Tampilan | Arti |
|---|---|
| MIN dan MAKS terisi | Bacaan di luar batas ditandai kuning (Di bawah min) atau merah (Di atas maks) |
| "Belum diatur" | **Tidak ada alarm sama sekali** untuk channel ini, dan bacaan **tidak diperiksa** |

Selama ambang belum diatur, kolom Keterangan kosong dan semua bacaan tidak ditandai. Itu **bukan berarti semua bacaan aman**.

### Jeda data pada grafik

Kalau jarak antar bacaan jauh lebih besar dari biasanya, garis grafik **sengaja diputus**. Syaratnya: jarak lebih dari 3 kali jarak normal, dan minimal 10 menit. Catatan di bawah grafik menyebut jumlah jeda dan total lamanya.

Penyebab yang lazim:

- alat atau baterai mati,
- sinyal 4G hilang,
- gateway atau server tertunda menerima data.

**Jeda bukan tekanan yang turun.** Itu artinya tidak ada data. Tekanan sebenarnya pada saat itu tidak diketahui.

## 5. Tips & hal yang perlu diperhatikan

**Halaman ini belum menandai bacaan janggal secara otomatis.** Operator perlu mengenalinya sendiri dari grafik dan tabel:

- **Tekanan negatif.** Mustahil di pipa bertekanan. Biasanya sensor lepas atau kabel putus, dan nilai Mentah mendekati nol. Cek kalibrasi dan sambungan sensor, lalu laporkan ke teknisi.
- **Nilai persis sama berjam-jam.** Grafik datar sempurna dan angka tidak bergerak sedikit pun. Tekanan pipa nyata hampir selalu naik-turun. Kemungkinan sensor macet atau data tertahan.
- **Garis turun curam lalu putus.** Jangan simpulkan ada kebocoran sebelum memeriksa apakah ada jeda data.
- **Lonjakan tunggal yang jauh dari sekitarnya.** Bisa gangguan sinyal. Lihat apakah titik tetangganya wajar.

Hal lain:

- Cek lencana periode: kalau bertuliskan "Data periode lampau", jangan menilai alat dari lencana itu.
- Angka di kartu mengikuti periode. Kartu "Nilai terkini" adalah bacaan terbaru **di periode itu**, bukan selalu bacaan saat ini.
- Bacaan yang waktunya tidak terbaca dibuang dan tidak ikut ditampilkan.

### Mengurutkan tabel

Klik judul kolom **Waktu**, **Nilai**, atau **Keterangan** untuk mengurutkan. Klik sekali lagi untuk membalik arahnya. Panah kecil di sebelah judul menunjukkan kolom dan arah yang sedang dipakai.

Pengurutan berlaku untuk **seluruh bacaan pada periode itu**, bukan cuma halaman yang sedang terlihat. Jadi mengurutkan Nilai dari besar ke kecil benar-benar menaikkan nilai tertinggi periode itu ke baris pertama. Keterangan diurut menurut tingkat keparahan (Normal → Di bawah min → Di atas maks), bukan menurut abjad.

Tulisan kecil di samping judul "Bacaan" selalu memberi tahu urutan yang sedang aktif.

### Skala grafik dan garis ambang

Tinggi grafik **mengikuti data**, bukan mengikuti ambang. Kalau sumbu dipaksa memuat ambang yang jauh, kurvanya jadi kerdil dan perubahan kecil tidak terlihat.

Akibatnya, ambang yang jauh dari data tidak digambar sebagai garis. Supaya tidak ada yang hilang diam-diam, di bawah grafik muncul catatan **"Di luar rentang tampilan"** yang menyebut ambang mana yang sedang tidak tergambar. Ambang yang datanya memang mendekat tetap tampil sebagai garis putus-putus.

Anda bisa menyeret mendatar di atas grafik untuk memperbesar satu rentang waktu; skala tegaknya ikut menyesuaikan. Tombol rumah di pojok kanan atas grafik mengembalikan tampilan penuh.

### Keterbatasan halaman ini

- **Belum ada perbandingan antar periode.** Untuk membandingkan hari ini dengan kemarin, ganti periode bergantian dan catat angkanya.
- **Tidak ada filter khusus nilai negatif.** Satu-satunya filter adalah Di luar ambang, dan itu hanya ada kalau ambang diatur. Untuk nilai negatif, urutkan kolom **Nilai** dari kecil ke besar — yang paling rendah naik ke atas.
- Tidak ada penyegaran otomatis.

### Peringatan: Hapus channel

> **Hapus channel menghapus permanen** konfigurasi channel, **seluruh data telemetrinya**, dan aturan alert yang menempel padanya. **Tidak bisa dibatalkan.** Ekspor dulu kalau datanya masih diperlukan. Sistem akan meminta konfirmasi sebelum menghapus.

## 6. FAQ / masalah umum

**Lencana saya abu-abu "Data periode lampau". Apakah alatnya mati?**
Tidak. Itu hanya karena Anda memilih periode yang sudah berlalu (Kemarin, Bulan lalu, atau rentang dengan tanggal akhir). Pilih **24 jam terakhir** untuk melihat kondisi sekarang.

**Lencana merah Offline, padahal alat menyala.**
Lencana hanya melihat kapan bacaan terakhir **masuk**. Alat bisa menyala tetapi datanya belum sampai, misalnya karena sinyal 4G hilang atau gateway tertunda. Coba **Muat ulang**, lalu periksa sinyal di lokasi.

**Kenapa angka Nilai dan Mentah berbeda?**
Nilai sudah dikalibrasi ke satuan sebenarnya, Mentah adalah sinyal asli sensor. Lihat bagian "Nilai vs Mentah".

**Kolom Mentah tidak terlihat.**
Kolom itu disembunyikan di layar sempit. Lebarkan jendela atau pakai layar yang lebih besar.

**Kenapa tidak ada chip "Di luar ambang"?**
Karena ambang belum diatur. Klik **Atur** di kartu Ambang.

**Kenapa kolom Keterangan kosong di berkas Excel?**
Ambang belum diatur, jadi tidak ada penilaian. Kolom sengaja dikosongkan, bukan diisi "Normal".

**Kenapa grafik terputus?**
Ada jeda pengiriman data. Garis sengaja diputus supaya tidak terlihat seperti tekanan yang turun. Lihat catatan di bawah grafik.

**Tertulis "Tidak ada bacaan pada ...".**
Tidak ada data di periode itu. Coba periode yang lebih panjang. Kalau di periode panjang pun kosong, periksa alat dan koneksinya.

**Muncul pesan "Channel tidak ditemukan atau sensornya nonaktif".**
Channel mungkin sudah dihapus atau sensornya dinonaktifkan. Kembali ke detail node dan cek daftar sensor. Pesan lain, "Server tidak dapat dihubungi", berarti koneksi bermasalah. Klik **Coba lagi**.

**Ekspor tidak aktif (abu-abu).**
Tombol mati saat data sedang dimuat, terjadi galat, atau tidak ada bacaan pada filter yang aktif.

**Bagaimana mengekspor 3 hari terakhir?**
Pilih **Rentang khusus**, isi tanggal mulai (3 hari lalu) dan tanggal akhir (hari ini, inklusif), lalu klik **Ekspor**.
