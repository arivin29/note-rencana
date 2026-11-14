# Mobile Helios — audit operator PDAM (pdam-operator, 14 Nov 2026)

Metode: kode semua komponen `src/app/mobile/` + panggilan API lokal dengan token tenant uji (tidak disimpan). Browser sedang dipakai sesi lain → tanpa screenshot; aspek visual = inferensi dari kode.

## Data tenant uji (TIRTAMERANGIN)
1 project "IPA BELANAG MAN" · 2 node (online, interval 120 dtk): `HELIO-354002393536022` (address "MAN Tekanan"), `F9YUN-7C6C2113CFD0` (address "MAN Debit & Tekanan") · 6 channel (tekanan, debit, diameter, velocity, volume, tekanan) · semua ambang kosong · 0 alert.

## Verdict hipotesis owner
- **H1 landing — TERBUKTI.** `/mobile` → `dashboard` tanpa logika jumlah project. Bagi tenant 1 project, dashboard cuma 4 angka (online 2/offline 0/alert 0/total 2) + "Semua aman"; nilai tekanan/debit baru terlihat setelah 4 ketukan (Dashboard → Project → ketuk project → tab Detail → tab Channel). Chip/sheet "Pilih Project" tak berguna untuk 1 project. Usulan: 1 project → langsung `/mobile/projects/:id` (tab pertama = nilai sekarang); >1 → daftar project.
- **H2 kode sebagai label — TERBUKTI.** Daftar perangkat: judul `n.code`; alamat jadi keterangan kecil (dan hanya bila city/province kosong). Juga kode sebagai judul di: dashboard "Perlu perhatian" (`a.node?.code`), alert (`node.code`), kepala info perangkat (`head.code`), kartu "Perlu perhatian" tab Detail project (`n.code`), sheet log (`this.code`). Channel-list: judul `metricCode` ("tekanan") + baris 2 "kode node · label sensor" ("Tekanan.tekanan", "TUF.Tuf-2000") → dua baris "tekanan" hanya dibedakan kode.

## Temuan (urut prioritas)
1. **[Kritis]** Daftar Project "2 perangkat · 0 online" padahal 2 online — kode baca `st.activeNodes`, API kirim `stats.online`. Bertentangan dengan tab Detail ("2/2 online").
2. **[Kritis]** Titik status channel di Info perangkat kuning untuk semua channel sehat — endpoint kirim `status:"active"`, `mapCh` hanya kenal ok/offline/stale/out_of_range → default "warn". Hijau di tab Channel project. Operator belajar mengabaikan kuning.
3. **[Tinggi]** Landing salah (H1).
4. **[Tinggi]** Kode jadi label utama di semua daftar (H2). Usulan: judul `address || name || code`, baris 2 kode; channel "MAN Tekanan · Tekanan".
5. **[Tinggi]** Tidak memakai aturan Fresh/Stale/Offline (`telemetry-freshness.ts` tak diimpor di mobile): `connectivityStatus` mentah, "Degraded" tak dijelaskan, stale & offline digabung, dashboard offline = total−online (degraded ikut offline).
6. **[Tinggi]** Angka bukan format Indonesia: `String(Math.round(v*100)/100)` → "3.83", volume "2682" tanpa pemisah ribuan; desimal tak ikut presisi.
7. **[Tinggi]** Tanpa konteks normal/ambang: ambang kosong tak dinyatakan ("ambang belum diatur"); grafik tanpa sumbu/waktu/min-maks/garis ambang.
8. **[Sedang]** Alert tak bisa ditindaklanjuti: hanya kode node + pesan + "x jam lalu"; tanpa alamat/nilai/ambang/ack/telepon PIC; label keparahan Inggris ("Critical"); pil dashboard selalu "Alert".
9. **[Sedang]** Istilah tak konsisten & Inggris mentah: Node vs Perangkat, Alert vs Peringatan, kartu "Sensor" menuju tab "Channel", "Command/Logs/Installation Context/Dev EUI/Uptime/Degraded", "Baterai: unknown", "l/s" vs "L/s", banyak baris "-".
10. **[Sedang]** Navigasi 4 tingkat (5 nav bawah → 5 tab project → 3 tab node → channel); "Aktif" vs "Detail" di sheet project membingungkan; back = `location.back()` keluar aplikasi bila dibuka dari tautan langsung/refresh; tab Node project tanpa judul/ruang lingkup.
11. **[Sedang]** Detail project/node penuh data teknis: tab Detail tanpa nilai tekanan, 4 "aksi cepat" duplikat tab, tabel Informasi mengulang Owner/Area; Info node menaruh nilai sekarang di bawah diagram hidrolika; "Uptime 100.0%" dari `onlineHours:0/totalHours:0` (mencurigakan).
12. **[Rendah]** Profil menampilkan "Satuan: Metrik"/"Bahasa: Indonesia" seolah pengaturan padahal tak bisa diubah; command SMS memakai `window.alert`; tak ada "buka di peta/arahkan".

## Tugas harian di HP
Mati & sejak kapan ⚠️ · nilai vs normal ⚠️ · tren ⚠️ · tindak lanjut alarm ⚠️ · laporan/ekspor ❌ · cari alamat ⚠️ · telepon PIC ⚠️ (node tanpa PIC tak ada fallback ke kontak project/owner).

## Fitur yang dibutuhkan
Layar "Sekarang" per project (alamat, nilai terkini, Fresh/Stale/Offline, bermasalah di atas) · "mati sejak" absolut + telepon PIC · normal 24 jam/7 hari + MNF + garis ambang · alert dengan alamat/nilai/ambang/ack/PIC · cari global by alamat · bagikan ringkasan · push notifikasi · navigasi ke lokasi.

## Bahan Panduan
Online/Degraded/Offline vs Fresh/Stale/Offline (3×/12× interval); arti warna titik; cara baca grafik 24 jam; project aktif vs detail; Command (SMS vs MQTT) & Logs; istilah Installation Context/Dev EUI/Interval/Uptime; arti "—" dan "ambang belum diatur".
