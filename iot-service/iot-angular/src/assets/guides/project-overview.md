---
title: Overview Project
version: 1.0.0
updatedAt: 2026-11-13
audience: operator, supervisor distribusi, admin
sources: [src/app/pages/iot/projects/project-workspace/pages/overview-page/overview-page.component.ts, src/app/pages/iot/projects/project-workspace/pages/overview-page/overview-page.component.html, src/app/shared/utils/telemetry-freshness.ts, src/app/pages/iot/projects/project-workspace/project-workspace.component.html, src/app/pages/iot/projects/project-workspace/project-workspace.component.ts]
related: [project-sensors, node-detail, sensor-channel-detail]
---

## 1. Untuk apa halaman ini

Overview adalah halaman pembuka sebuah project (misalnya satu wilayah layanan PDAM). Pakai halaman ini di awal shift untuk melihat sekilas: berapa alat yang mengirim data, berapa yang bermasalah, dan apakah ada alert terbuka.

> **Node** = alat pencatat (logger) di satu titik pantau. Satu node bisa punya beberapa **sensor**, misalnya tekanan dan debit.

## 2. Bagian-bagian layar

### Toolbar dan menu samping

- **Breadcrumb** di atas: Projects > nama project > halaman yang dibuka.
- **Panduan**: membuka panduan ini.
- **Menu samping** berisi Overview, Nodes, Sensors, Monitor, Map, SCADA, Config.
- **Assets** (di bawah menu): daftar node, klik panah untuk melihat sensornya. Namanya memakai **alamat** node (kalau kosong, kode node). Ikon putar di judul Assets memuat ulang daftar.
- **Titik warna** di depan nama: warna kesegaran data (lihat bagian 4). Titik node dan titik sensor dihitung sendiri-sendiri.

### System Health

Ringkasan kesehatan alat. Dihitung dari **waktu laporan terakhir tiap node** dibandingkan dengan **interval kirim node itu sendiri**.

| Kotak | Artinya |
|---|---|
| Online Devices | Node yang datanya masih segar (Fresh) |
| Offline Devices | Node Offline, ditambah node yang belum pernah kirim data |
| Last Data Received | Waktu laporan terbaru dari semua node, mis. "4m ago" |
| Stale Devices | Node yang data terakhirnya mulai terlambat |

Arahkan kursor ke tulisan "Last Data Received" untuk melihat tanggal dan jam persisnya.

Di judul kartu ada lencana ringkas:

- Hijau **All Systems Operational**: semua node Online.
- Kuning **N Issues Detected**: ada node Stale atau Offline.
- Merah **System Offline**: semua node Offline.

Halaman ini **tidak** menampilkan uptime maupun latensi, karena sistem belum punya pengukuran itu.

### Project Snapshot

Identitas project dan empat kartu pintas. Lencana di judul: status project, **Last sync**, dan lokasi utama.

- **Last sync** dan **Data Terakhir** sama-sama berasal dari laporan terbaru semua node. Bukan jadwal sinkronisasi. Kalau belum ada data, tertulis "Belum ada data".
- **Data Terakhir** menampilkan tanggal, jam, dan selisih waktu.

Empat kartu bisa diklik:

| Kartu | Isi | Klik membuka |
|---|---|---|
| Devices | Jumlah node dan berapa yang online | Tab Nodes |
| Sensors | Jumlah sensor dan berapa yang "tidak update" | Tab Sensors |
| Locations | Jumlah node yang punya koordinat | Tab Map |
| Alerts | Alert terbuka di project ini | Halaman Alerts |

- "Tidak update" = sensor yang bukan Fresh (Stale, Offline, atau belum pernah kirim).
- Kartu **Alerts** hanya menghitung alert **terbuka (open)** milik project ini. Di bawah angka tertulis jumlah yang sudah **di-acknowledge** (sudah diakui petugas). Angka merah berarti ada alert terbuka. Kalau gagal dimuat, tertulis "Gagal memuat alert" dan angkanya "—".
- Halaman Alerts dibuka dengan project ini sudah terpilih.
- Di kaki kartu ada tombol **Settings** (ke tab Config) dan **Edit Project**.

### Operations & Team

Data pemilik project: nama, kontak, industri, dan tipe area. Isinya informasi, bukan daftar petugas piket.

### Sensor Overview

Tabel nilai terakhir semua sensor di project ini (maksimal 400 px tinggi, bisa digulir).

| Kolom | Isinya |
|---|---|
| Sensor | Nama sensor dan kodenya |
| Value | Nilai terakhir channel pertama |
| Last Update | "x lalu", berwarna menurut kesegaran |
| Node / Address | Alamat node, kode di bawahnya |

- Kalau sensor punya lebih dari satu channel, di bawah nilai tertulis "+1 channel" dan seterusnya. Nilai channel lain dilihat di tab Sensors.
- Kolom Type menampilkan model alat. Baris **tidak bisa diklik**. Klik **View All Sensors** untuk ke tab Sensors.

### Device Status Grid

Daftar **semua** node di project, bukan hanya sebagian. Urutannya: **masalah dulu** (Offline, lalu Stale, lalu belum pernah kirim), lalu yang Online. Dalam satu kelompok diurutkan menurut abjad alamat.

- Klik nama node untuk membuka detail node.
- **View All Nodes** membuka tab Nodes.
- Kolom **Last Seen** berisi waktu laporan terakhir.

## 3. Cara melakukan tugas umum

### Memeriksa kondisi awal shift

1. Buka **Overview**.
2. Lihat lencana di judul System Health. Hijau berarti semua aman.
3. Cek **Last Data Received**. Kalau sudah lebih dari beberapa menit, ada yang terlambat.
4. Gulir ke **Device Status Grid**. Node bermasalah ada di paling atas.
5. Klik node yang bermasalah untuk melihat detailnya.

### Melihat alert yang perlu ditangani

1. Lihat kartu **Alerts** di Project Snapshot.
2. Kalau angka lebih dari 0, klik kartunya.
3. Di halaman Alerts, tangani alert yang masih terbuka.

### Mencari sensor yang tidak update

1. Lihat angka "tidak update" di kartu **Sensors**.
2. Klik kartunya, lalu pilih tab **Stale**, **Offline**, atau **No Data** (lihat panduan Sensors).

### Memuat data terbaru

Halaman Overview **tidak menyegarkan diri** dan tidak punya tombol muat ulang. Tekan **F5** atau pindah tab lalu kembali untuk memuat ulang.

## 4. Arti status, warna & angka

Status memakai aturan yang sama di seluruh aplikasi (Overview, Sensors, titik di menu Assets).

| Status | Warna | Arti |
|---|---|---|
| Online / Fresh | Hijau | Data terakhir masih baru |
| Warning / Stale | Kuning | Data terlambat |
| Offline | Merah | Data sudah lama tidak masuk |
| Unknown / belum ada | Abu-abu | Belum pernah kirim data |

Ambangnya mengikuti interval kirim node:

- **Fresh**: data terakhir kurang dari yang terbesar antara 10 menit atau 3 kali interval.
- **Stale**: kurang dari yang terbesar antara 60 menit atau 12 kali interval.
- **Offline**: lebih lama dari itu.

Contoh logger yang kirim tiap 120 detik: Fresh di bawah 10 menit, Stale 10 sampai 60 menit, Offline di atas 60 menit.

Di Device Status Grid, node yang belum pernah kirim berlabel **Unknown**. Di kotak System Health, node itu dihitung sebagai **Offline**.

## 5. Tips & hal yang perlu diperhatikan

- Status dihitung dari **kapan data terakhir masuk**, bukan dari kondisi fisik alat. Alat bisa menyala tetapi datanya belum sampai.
- Kalau semua node mendadak Offline bersamaan, curigai gangguan koneksi atau server dulu, bukan kerusakan di lapangan.
- Nilai sensor ditampilkan dengan 2 desimal. Nilai tekanan negatif tidak masuk akal di pipa bertekanan. Cek kalibrasi dan sambungan sensor.
- Kartu Locations hanya menghitung node yang punya koordinat. Angkanya bisa lebih kecil dari jumlah Devices.

### Keterbatasan

- Tidak ada penyegaran otomatis di halaman ini (tab Sensors punya).
- Tidak ada uptime atau latensi.
- Titik warna di menu Assets hanya diperbarui saat halaman dimuat atau ikon putar di Assets diklik.

## 6. FAQ / masalah umum

**Kenapa "Last Data Received" tertulis "—"?**
Belum ada satu pun node di project ini yang pernah mengirim data.

**Kenapa jumlah Offline Devices lebih besar dari yang saya kira?**
Node yang belum pernah kirim data ikut dihitung Offline.

**Kenapa angka Alerts tidak sama dengan halaman Alerts?**
Kartu hanya menghitung alert **terbuka** milik project ini. Halaman Alerts bisa menampilkan status lain.

**Kenapa baris di Sensor Overview tidak bisa diklik?**
Memang tidak. Buka tab Sensors, lalu klik baris sensornya.

**Kenapa Sensor Overview kosong ("No sensors found")?**
Project belum punya sensor, atau belum ada node. Daftar sensor baru dimuat setelah node berhasil dimuat.

**Muncul pesan merah di bagian atas halaman.**
Data project gagal dimuat. Muat ulang halaman. Kalau tetap muncul, laporkan ke admin.
