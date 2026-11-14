---
title: Detail PDAM / Owner
version: 1.0.0
updatedAt: 2026-11-14
audience: admin
sources: [src/app/pages/iot/owners/owners-detail/owners-detail.ts, src/app/pages/iot/owners/owners-detail/owners-detail.html, src/app/pages/iot/owners/owner-api-keys.service.ts, src/app/pages/iot/owners/owners-add/owners-add.ts, src/app/pages/iot/owners/owners-add/owners-add.html, src/app/shared/utils/project-health.ts, src/app/shared/utils/telemetry-freshness.ts]
related: [owners-list, project-overview, user-management]
---

## 1. Untuk apa halaman ini

Halaman ini merangkum **satu owner** (mis. satu PDAM): kesehatan perangkatnya, project mana yang perlu perhatian, siapa saja yang punya akun login, dan API key untuk integrasi. Halaman ini **hanya untuk admin**.

## 2. Bagian-bagian layar

### Header

- Nama owner dan **status kesehatan** (Bermasalah / Terlambat / Normal / Belum ada perangkat). Di bawahnya: kode owner · industri.
- **Tombol putar**: muat ulang. **Ubah**: buka formulir owner. **Kembali**: ke daftar owner.

### Enam kartu ringkasan

| Kartu | Isinya |
|---|---|
| Project | Jumlah project; "n perlu perhatian" bila ada |
| Node mengirim | Node tepat waktu / total node |
| Node mati | Offline + belum pernah kirim |
| Sensor | Jumlah sensor di node owner ini |
| Alert terbuka | Alert yang belum ditutup |
| Data terakhir | Kapan node owner ini terakhir kirim data |

Klik kartu **Project** untuk membuka tab Project.

### Tab Ringkasan

- **Profil**: kode owner, industri, contact person, email, telepon, alamat, SLA, tanggal terdaftar. Data kosong tampil "—".
- **Project yang perlu perhatian**: project berstatus Bermasalah atau Terlambat, dengan alasannya (mis. "3 node offline · 1 alert terbuka"). Klik untuk masuk ke ringkasan project.
- Catatan: forwarding data ke sistem PDAM **belum tersedia**.

### Tab Project

Semua project owner ini, bermasalah di atas. Kolom: Project (jumlah node · sensor · jenis area), Kesehatan, Node mati, Alert terbuka, Data terakhir. Klik baris untuk masuk ke workspace project.

### Tab Pengguna

Akun login milik owner ini: nama, email, peran, status, login terakhir.

- **Tambah pengguna**: membuat akun baru yang terikat ke owner ini.
- Tombol mata: buka detail pengguna. Tombol larangan/centang: nonaktifkan/aktifkan. Tombol tempat sampah: hapus.

### Tab API key

Key untuk External API owner ini (dikirim di header `X-API-Key`).

- **Buat API key**: isi Label (wajib), Berlaku sampai (kosong = tanpa batas), Batas permintaan, Keterangan.
- Key baru **hanya tampil sekali**. Klik **Salin** dan simpan di tempat aman.
- Tombol jeda/putar: nonaktifkan/aktifkan. Tombol putar-ulang: buat ulang key (key lama langsung tidak berlaku). Tombol tempat sampah: cabut permanen.

## 3. Cara melakukan tugas umum

**Mencari titik mati milik PDAM ini**
1. Lihat kartu **Node mati**.
2. Di tab **Ringkasan**, lihat **Project yang perlu perhatian**.
3. Klik project-nya untuk melihat node mana yang mati.

**Mengubah kontak PDAM**
1. Klik **Ubah**.
2. Ganti contact person, email, telepon, alamat, atau SLA.
3. Klik **Simpan perubahan**. Semua isian disimpan, termasuk yang dikosongkan.

**Membuat akun untuk petugas PDAM**
1. Buka tab **Pengguna**, klik **Tambah pengguna**.
2. Isi data lalu simpan. Daftar langsung diperbarui.

## 4. Arti status kesehatan

| Status | Artinya |
|---|---|
| Bermasalah | Ada node offline atau belum pernah kirim, atau ada alert terbuka |
| Terlambat | Hanya ada node yang datanya terlambat (tidak ada yang mati, tidak ada alert) |
| Normal | Semua node tepat waktu, tidak ada alert |
| Belum ada perangkat | Belum ada node |

Satu node **tepat waktu** bila data terakhirnya lebih baru dari max(10 menit, 3 × interval lapor). **Terlambat** sampai max(60 menit, 12 × interval). Lebih lama dari itu: **offline**.

## 5. Tips

- Angka di halaman ini sama dengan baris owner di daftar owner, karena dihitung dengan cara yang sama di server.
- Arahkan kursor ke waktu "x mnt lalu" untuk melihat tanggal dan jam lengkap.

## 6. FAQ

**Di mana pengaturan webhook / database forwarding?**
Fitur forwarding data ke sistem PDAM belum tersedia, jadi pengaturannya disembunyikan.

**Industri atau SLA owner tidak ada di pilihan formulir?**
Formulir otomatis menambahkan nilai yang sudah tersimpan, jadi nilainya tidak hilang saat disimpan. SLA ditulis dengan huruf awal besar (mis. "gold" menjadi "Gold").
