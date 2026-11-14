---
title: Daftar PDAM / Owner
version: 1.0.0
updatedAt: 2026-11-14
audience: admin
sources: [src/app/pages/iot/owners/owners-list/owners-list.ts, src/app/pages/iot/owners/owners-list/owners-list.html, src/app/pages/iot/owners/owners-add/owners-add.ts, src/app/pages/iot/owners/owners-add/owners-add.html, src/app/shared/utils/project-health.ts, src/app/shared/utils/telemetry-freshness.ts, src/app/shared/utils/channel-display.ts]
related: [owner-detail, project-overview, telemetry-channels]
---

## 1. Untuk apa halaman ini

Halaman ini menampilkan **semua owner** (PDAM atau pelanggan lain) dalam satu tabel, beserta kesehatan perangkatnya. Pakai untuk melihat pagi hari owner mana yang perangkatnya mati atau punya alert, lalu masuk ke detailnya.

> **Owner** = pelanggan (mis. satu PDAM). Satu owner punya beberapa **project**. Project berisi **node** (alat pencatat di satu titik). **Sensor** menempel pada node.

Halaman ini **hanya untuk admin**. Pengguna tenant yang membuka alamatnya diarahkan ke beranda.

## 2. Bagian-bagian layar

### Header

- Judul **PDAM / Owner**, lalu "N owner · M punya perangkat · X node · diperbarui HH:mm:ss".
- **Tombol putar** (Muat ulang): memuat ulang semua owner. Halaman tidak memuat ulang otomatis.
- **Tambah Owner**: membuka formulir owner baru.

### Lima kartu ringkasan

Angkanya dihitung dari **semua owner**, tidak ikut tab atau pencarian.

| Kartu | Isinya |
|---|---|
| Owner | Owner yang punya node / total owner |
| Node mengirim data | Node yang datanya tepat waktu / total node |
| Node mati | Node offline + node yang belum pernah kirim |
| Alert terbuka | Alert yang belum ditutup, semua owner |
| Owner bermasalah | Jumlah owner berstatus Bermasalah |

Klik kartu **Node mati**, **Alert terbuka**, atau **Owner bermasalah** untuk membuka tab **Bermasalah**. Klik **Owner** untuk kembali ke **Semua**.

### Tab

**Semua, Bermasalah, Terlambat, Normal, Belum ada perangkat**, masing-masing dengan jumlah. Jumlahnya ikut pencarian.

### Tabel

| Kolom | Isinya |
|---|---|
| Owner | Nama; di bawahnya kode owner · industri, dan SLA bila sudah diatur |
| Project · Node · Sensor | Jumlah nyata milik owner |
| Kesehatan | Status (lihat bagian 4) + "x/y node mengirim" |
| Alert terbuka | Jumlah alert yang belum ditutup |
| Data terakhir | Kapan node owner ini terakhir mengirim data |
| PIC | Contact person, email, telepon |

- Arahkan kursor ke **Data terakhir** untuk melihat tanggal dan jam lengkap. "Belum pernah" = belum ada node owner ini yang pernah mengirim data.
- Klik baris mana pun untuk membuka detail owner.
- Klik judul kolom **Owner, Kesehatan, Alert terbuka, Data terakhir** untuk mengurutkan.

## 3. Cara melakukan tugas umum

**Mencari owner yang perangkatnya bermasalah**
1. Klik tab **Bermasalah** (atau kartu **Owner bermasalah**).
2. Owner dengan node mati dan alert terbanyak ada di atas.
3. Klik barisnya untuk melihat project mana yang bermasalah.

**Mencari owner tertentu**
1. Ketik di kotak **Cari**: nama, kode owner (mis. RDWNJ), industri, nama PIC, email, atau telepon.
2. Tabel tersaring sekitar 0,3 detik setelah Anda berhenti mengetik.
3. Klik **Reset filter** untuk kembali ke semua owner.

**Menambah owner**
1. Klik **Tambah Owner**.
2. Isi Nama, Industri, dan Contact person (wajib). Email, telepon, alamat, dan SLA boleh kosong.
3. Klik **Simpan owner**. Anda langsung dibawa ke detail owner baru.

## 4. Arti status kesehatan

Status owner dihitung dari **semua node** di semua project-nya.

| Status | Artinya |
|---|---|
| Bermasalah | Ada node offline atau belum pernah kirim, **atau** ada alert terbuka |
| Terlambat | Tidak ada node mati dan tidak ada alert, tetapi ada node yang datanya terlambat |
| Normal | Semua node mengirim tepat waktu, tidak ada alert terbuka |
| Belum ada perangkat | Owner belum punya node sama sekali |

Status satu node mengikuti **interval lapor** node itu:

- **Tepat waktu**: data terakhir lebih baru dari max(10 menit, 3 × interval).
- **Terlambat**: lebih lama dari itu, tetapi lebih baru dari max(60 menit, 12 × interval).
- **Offline**: lebih lama lagi.
- **Belum pernah kirim**: node belum pernah mengirim data.

Contoh: node dengan interval 5 menit dianggap terlambat setelah 15 menit dan offline setelah 60 menit.

## 5. Tips

- Urutan bawaan: **Bermasalah dulu**, lalu Terlambat, Normal, Belum ada perangkat. Dalam satu status, yang node mati + alert-nya paling banyak ada di atas, lalu urut nama.
- Owner uji coba atau yang belum dipasangi alat tidak dihapus. Mereka masuk tab **Belum ada perangkat**.
- SLA hanya tampil kalau sudah diisi.

## 6. FAQ

**Kenapa tidak ada status Aktif / Trial / Suspended?**
Data owner belum menyimpan status kontrak, jadi status itu tidak ditampilkan. Yang tampil adalah kesehatan perangkat yang nyata.

**Kenapa angka di sini sama dengan halaman Projects dan detail owner?**
Ketiganya memakai perhitungan yang sama dari server, berdasarkan waktu data terakhir tiap node.

**Apakah halaman ini memuat semua owner?**
Ya. Semua owner dimuat sekaligus, lalu dicari dan dibagi per halaman di layar.
