---
title: Daftar Project
version: 1.0.0
updatedAt: 2026-11-14
audience: operator, supervisor distribusi, admin
sources: [src/app/pages/iot/projects/projects-list/projects-list.ts, src/app/pages/iot/projects/projects-list/projects-list.html, src/app/shared/utils/project-health.ts, src/app/shared/utils/telemetry-freshness.ts, src/app/shared/utils/fetch-all.ts, src/app/shared/utils/channel-display.ts]
related: [project-overview, project-sensors, telemetry-channels]
---

## 1. Untuk apa halaman ini

Halaman ini menampilkan **semua project** dalam satu tabel beserta **kesehatan perangkatnya**: berapa node yang mengirim data, berapa yang terlambat atau mati, dan berapa alert yang belum selesai. Pakai setiap pagi untuk menjawab: *project mana yang perlu dicek dulu?*

> **Project** = satu wilayah pantau (misalnya IPA atau jaringan satu kota). **Node** = alat pencatat di satu titik. **Sensor** menempel pada node. Satu PDAM (owner) bisa punya beberapa project.

Admin melihat semua project. Akun PDAM (tenant) hanya melihat project miliknya sendiri.

## 2. Bagian-bagian layar

### Header

- Judul **Project**, lalu ringkasan "*n* project · *n* PDAM" (mengikuti filter yang aktif) dan jam data terakhir dimuat.
- Daftar dimuat ulang **otomatis tiap 60 detik** selama tab browser terbuka. Kalau muat ulang otomatis gagal, data terakhir yang berhasil tetap tampil.
- **Panduan**: membuka halaman ini.
- **Tombol putar** (Muat ulang): memuat ulang daftar sekarang juga.
- **Tambah Project**: membuka formulir project baru.

### Lima kartu ringkasan (KPI)

Angkanya adalah **jumlah dari semua project yang lolos filter** Owner, Tipe area, Status project dan Cari. Tab kesehatan tidak mengubah angka kartu.

| Kartu | Isinya | Klik |
|---|---|---|
| Project bermasalah | Project berstatus Bermasalah dari total | Tab Bermasalah |
| Node mengirim data | Node yang datanya tepat waktu dari total node | Tab Normal |
| Node terlambat | Node yang datanya mulai tertunda | Tab Terlambat |
| Node mati | Offline + belum pernah kirim (rinciannya di bawah angka) | Tab Bermasalah |
| Alert terbuka | Alert yang belum selesai ditangani | Tab Bermasalah |

### Tab kesehatan

**Semua / Bermasalah / Terlambat / Normal / Belum ada perangkat**. Angka di tiap tab dihitung dari seluruh hasil filter, bukan hanya halaman tabel yang tampil. Klik tab yang sedang aktif sekali lagi untuk kembali ke Semua.

### Baris filter

- **Owner** (hanya admin): pilih satu PDAM.
- **Tipe area** dan **Status project**: pilihan hanya berisi nilai yang benar-benar ada di data.
- **Cari**: mencocokkan nama project, nama owner, atau lokasi. Hasil berubah sekitar 0,3 detik setelah Anda berhenti mengetik.
- Filter yang aktif tampil sebagai **chip** di bawahnya. Klik × untuk menghapus satu filter, atau **Reset filter** untuk menghapus semuanya.

### Kolom tabel

| Kolom | Arti |
|---|---|
| Project | Nama project; baris kecil = nama owner. Badge abu-abu (mis. "Nonaktif") = status administrasi |
| Kesehatan | Bermasalah / Terlambat / Normal / Belum ada perangkat |
| Node mengirim | Node tepat waktu / total node, dengan bilah hijau |
| Terlambat / Mati | Node terlambat · node mati. Berwarna hanya jika lebih dari 0 |
| Sensor | Jumlah sensor di project |
| Alert terbuka | Alert yang belum selesai; merah jika ada |
| Lokasi | Alamat node pertama yang alamatnya terisi; "—" jika belum ada |
| Data terakhir | Kapan data terbaru masuk dari node mana pun; arahkan kursor untuk tanggal lengkap |

Kolom paling kanan berisi tautan cepat: **Node**, **Monitor**, dan **Ubah project**. Klik di bagian lain baris untuk membuka **Ringkasan** project.

## 3. Cara melakukan tugas umum

**Mencari project yang perlu dicek pagi ini**
1. Biarkan urutan bawaan (kolom Kesehatan): Bermasalah paling atas, lalu node mati terbanyak.
2. Klik kartu **Project bermasalah** atau tab **Bermasalah**.
3. Klik baris project untuk membuka Ringkasan, atau ikon **Node** untuk langsung ke daftar node.

**Melihat project satu PDAM saja (admin)**
1. Pilih nama PDAM di filter **Owner**.
2. Kartu dan angka tab langsung menghitung ulang untuk PDAM itu.

**Mengurutkan tabel**
1. Klik judul kolom. Klik lagi untuk membalik arah.
2. Kolom angka dan waktu diurutkan dari yang terbesar / terbaru lebih dulu.

## 4. Arti status, warna, dan angka

Status setiap node dihitung dari **waktu data terakhir** dibanding **interval lapor** alat, aturan yang sama dengan tab Sensor dan halaman Kanal Telemetri:

| Status node | Syarat |
|---|---|
| Mengirim data | Data terakhir < maks(10 menit, 3 × interval) |
| Terlambat | Lebih lama dari itu, tetapi < maks(60 menit, 12 × interval) |
| Mati | Lebih lama lagi (offline), atau **belum pernah** kirim data |

Contoh: alat lapor tiap 15 menit → tepat waktu jika data < 45 menit, terlambat jika < 3 jam, sesudah itu mati.

Kesehatan project disimpulkan dari node-nodenya:

| Kesehatan | Artinya |
|---|---|
| Bermasalah (merah) | Ada node mati **atau** ada alert terbuka |
| Terlambat (kuning) | Tidak ada yang mati, tetapi ada node terlambat |
| Normal (hijau) | Semua node mengirim data dan tidak ada alert terbuka |
| Belum ada perangkat (abu) | Project belum punya node |

**Alert terbuka** = alert berstatus *open* (baru) ditambah *acknowledged* (sudah diketahui, belum selesai).

**Status project** (Aktif, Pemeliharaan, Nonaktif) adalah status administrasi yang diatur di formulir project. Status ini **bukan** kondisi alat: project "Aktif" bisa saja Bermasalah.

## 5. Tips

- Angka di halaman ini sama dengan angka di daftar Owner dan detail Owner karena dihitung server dengan satu aturan.
- "Data terakhir" yang baru (mis. "2 mnt lalu") **tidak** berarti semua node sehat; cukup satu node hidup. Selalu lihat kolom Terlambat / Mati.
- Tanda "—" berarti datanya tidak ada, bukan nol.

## 6. FAQ

**Kenapa project saya "Bermasalah" padahal datanya masuk?**
Mungkin ada satu node yang mati atau ada alert yang belum ditutup. Lihat kolom Terlambat / Mati dan Alert terbuka.

**Kenapa lokasinya "—"?**
Belum ada node di project itu yang alamatnya diisi. Isi alamat node di halaman detail node.

**Apakah semua project tampil walau jumlahnya ratusan?**
Ya. Halaman memuat semua halaman data dari server, lalu memfilter dan mengurutkan di browser.

**Muncul kotak kuning "Kesehatan perangkat … tidak dikirim server"?**
Server tidak mengirim data kesehatan untuk project tersebut. Angkanya ditampilkan "—" (bukan 0). Klik **Coba lagi**; jika tetap muncul, hubungi admin.
