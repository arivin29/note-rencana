---
title: Manajemen User
version: 1.0.0
updatedAt: 2026-11-14
audience: admin
sources: [src/app/pages/admin/users/users-list/users-list.component.ts, src/app/pages/admin/users/user-form/user-form.component.ts, src/app/pages/admin/users/user-detail/user-detail.component.ts, iot-backend-go/app/services/user/user_service.go, iot-backend-go/app/http/controllers/user/user_controller.go]
related: [telemetry-channels]
---

## 1. Untuk apa halaman ini

Halaman ini untuk **membuat dan mengatur akun yang boleh masuk ke Helios**: menambah user baru, mengubah peran dan owner-nya, menonaktifkan akun, dan mengganti password. Halaman ini hanya bisa dibuka oleh **admin**.

> **Owner** = badan/perusahaan pemilik data, pada praktiknya satu PDAM. **Role** menentukan seberapa luas jangkauan seseorang. **Tenant** = user milik satu PDAM. **Admin** = pengelola sistem yang melayani semua PDAM.

## 2. Dua peran, dan bedanya besar

| | **Tenant** | **Admin** |
|---|---|---|
| Melihat data | hanya milik **satu** owner | **semua** owner |
| Terikat owner | **wajib** | tidak — dan memang tidak boleh |
| Bisa berpindah owner | tidak | ya, lewat pemilih owner di dashboard |
| Bisa mengelola user | tidak | ya |

Perhatikan baris "terikat owner". Itu bukan sekadar pengaturan tampilan — **itulah yang membatasi jangkauan data seseorang.**

## 3. Kenapa kolom Owner wajib diisi

Saat Anda membuat user **tenant**, kolom **Owner** wajib dipilih. Ini bukan formalitas.

Sistem membatasi data dengan satu aturan sederhana: *"kalau user ini bukan admin dan punya owner, kunci dia ke owner itu; kalau tidak, biarkan dia memilih owner sendiri."* Aturan yang terakhir itu ada supaya **admin** bisa berpindah-pindah PDAM — dan itu memang perlu.

Tapi akibatnya: **user tenant yang owner-nya kosong tidak ikut terkunci.** Dia justru jatuh ke jalur yang disiapkan untuk admin, sehingga bisa membaca data **seluruh PDAM**. Satu kolom yang dilewati menghasilkan akun dengan jangkauan setara superadmin, tanpa ada tanda apa pun di tampilan bahwa itu terjadi.

Karena itu sejak 14 November 2026:

- Kolom Owner berbentuk **daftar pilihan**, bukan lagi kotak teks tempat UUID diketik tangan.
- Kolom itu **wajib**. Form menolak disimpan kalau dikosongkan.
- Backend **juga** menolaknya, walau permintaan datang dari luar aplikasi ini.
- Menurunkan akun admin menjadi tenant ikut ditolak kalau akun itu belum punya owner.

> Sebelum tanggal itu, kolom tersebut bertuliskan "optional". Kalau Anda pernah membuat user tenant dan melewatinya, periksa akun itu di daftar: tenant yang tidak menampilkan Owner perlu diperbaiki.

## 4. Menambah user

1. Klik **Create User**.
2. Isi **Name**, **Email**, **Password** (minimal 8 karakter) dan ulangi di **Confirm Password**.
3. Pilih **Role**.
4. Kalau rolenya **Tenant**, pilih **Owner**-nya. Kalau **Admin**, kolom Owner hilang dengan sendirinya — itu memang benar.
5. **Create**.

Email harus unik. Kalau sudah terpakai, backend menolak dengan pesan *"Email already exists"* dan tidak ada akun yang terbuat.

## 5. Mengubah user

Buka user dari daftar, lalu **Edit**. Yang perlu diperhatikan:

- **Password dikosongkan = password tidak diubah.** Isi hanya kalau memang ingin menggantinya.
- **Mengganti role dari Tenant ke Admin** akan melepas ikatan owner-nya. Itu disengaja: admin tidak boleh terikat owner.
- **Mengganti role dari Admin ke Tenant wajib disertai Owner.** Kalau tidak, permintaannya ditolak — bukan karena rewel, tapi karena hasilnya akan jadi akun bocor seperti di bagian 3.
- **Is Active** mematikan akses tanpa menghapus akun. Ini cara yang benar untuk pegawai yang berhenti; jangan dihapus, supaya jejak datanya tetap utuh.

## 6. Kalau daftar Owner gagal dimuat

Dropdown Owner mengambil daftarnya dari server. Kalau gagal, yang muncul adalah pesan merah **"Gagal memuat daftar owner"** dengan tautan **Coba lagi** — bukan dropdown kosong.

Itu dibuat begitu dengan sengaja. Dropdown kosong akan terbaca seperti "memang belum ada owner", dan orang lalu mencari jalan lain. Pesan gagal memaksa masalahnya diperbaiki dulu. Kalau diklik Coba lagi masih gagal, berarti sambungan ke backend yang bermasalah, bukan datanya.

## 7. Yang tidak bisa dilakukan di sini

- **Menghapus akun sendiri** — ditolak backend.
- **Membuat atau menghapus user** kalau Anda bukan admin.
- **Membuat owner baru.** Owner dikelola di halaman Owners. Kalau PDAM yang Anda cari belum ada di dropdown, buat dulu owner-nya di sana.

## 8. Riwayat

- **1.0.0** (14 Nov 2026) — panduan dibuat. Kolom Owner jadi dropdown dan diwajibkan untuk user tenant, di form maupun di backend; penurunan admin→tenant tanpa owner ditolak.
