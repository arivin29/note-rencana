# Mobile Helios — Ringkasan Audit & Rencana (14 Nov 2026)

Sumber: `01-pdam-operator.md` · `02-enterprise-ux.md` (37 temuan + IA) · `03-senior-dev.md` (alur data, uji live dengan token tenant) · `00-notes-peer-sessions.md`.
Tenant uji TIRTAMERANGIN: 1 project, 2 node, 3 sensor, 6 channel, tanpa ambang, belum pernah alert.

## Hipotesis owner — keduanya TERBUKTI
1. **Landing**: `/mobile` selalu ke Dashboard; untuk tenant 1 project butuh 4 ketukan untuk melihat satu nilai tekanan.
2. **Kode sebagai label**: ±11 tempat (daftar perangkat, Ringkasan/Dashboard, header perangkat, alert, channel-list = `metricCode`, detail channel, judul header).

## Kenapa terasa "aneh"
Dua konteks project yang bersaing (chip header vs URL; Dashboard & Alert mengabaikan chip) · kode sebagai judul · 4 kosakata status berbeda, tak satu pun aturan freshness desktop · angka/warna saling bertentangan antar layar.

## Keamanan (di luar mobile, ditemukan saat audit)
- **P0 — `/api/iot-logs` tanpa scoping tenant** (`iot_log_controller.go:24,50`): token tenant membaca 1.316.617 log semua owner; node owner lain → 200 (5.398 baris). Perbaikan: paksa owner untuk non-admin di Index/Stats/Show + tolak tenant tanpa owner. Belum ada pemilik sesi → minta keputusan owner.

## Gelombang 0 — Bug data salah (frontend mobile, bisa langsung)
| # | Bug | Lokasi |
|---|---|---|
| 0.1 | Alert selalu 0: filter `status=triggered` padahal backend hanya `open/acknowledged/cleared`; galat ditelan → "Semua aman" | `mobile-dashboard.component.ts:59,75`, `mobile-alerts.component.ts:50` |
| 0.2 | "Alert aktif" maks 5 (baca `total` halaman, limit 5) | `mobile-dashboard.component.ts:65` |
| 0.3 | Daftar project "0 online" (baca `activeNodes`, API kirim `stats.online`) | `mobile-projects-list.component.ts:63` |
| 0.4 | Semua titik channel kuning di Info perangkat (`status:"active"` → warn) | `mobile-node-info.component.ts:168-173` |
| 0.5 | Project aktif bertahan setelah logout → akun berikut di HP sama dapat daftar kosong; logout ke `/auth/login` desktop | `auth.service.ts:321-327` |
| 0.6 | Muat ganda (projects list 2×, detail 4×), tanpa pembatalan → poll menumpuk | `03` F10 |

## Gelombang 1 — IA baru (butuh persetujuan owner)
- **Entry `/mobile`**: guard hitung project (1 panggilan `/api/projects?limit=100`, di-cache, dibersihkan saat logout): 0 → layar kosong · **1 → langsung `/mobile/p/:pid`** · **>1 → daftar project** (bermasalah di atas). Redirect root & default login diarahkan ke `/mobile`.
- **Dalam project**: nav bawah **Ringkasan · Perangkat · Channel · Peta · Peringatan** (ganti tab atas yang di luar jangkauan jempol; ganti tab tidak menambah history).
- **Ringkasan menggantikan Dashboard**: status (Aktif/Terlambat/Offline/Belum ada data), 4 KPI yang membuka daftar terfilter, "Perlu perhatian" (alert aktif + perangkat mati: alamat, nilai vs ambang, telepon PIC). SCADA jadi kartu → layar penuh (`<app-scada-embed>`).
- **Dihapus**: Dashboard, chip project + sheet "Pilih Project", service konteks project global.
- **Detail**: `/p/:pid/nodes/:nid` (segmen Nilai · Perintah · Log, judul = alamat); detail channel bersarang di bawahnya. Tautan lama di-redirect.
- **Back** naik hierarki (channel → perangkat → tab → Ringkasan → daftar project); `location.back()` hanya bila halaman sebelumnya di dalam aplikasi.
- Tab Peta milik sesi `scada` (route/selector dijaga stabil, koordinasi sebelum ubah routing).

## Gelombang 2 — Data & aturan bersama
- Channel/sensor: `/api/sensors?idProject|idNode` (nilai terakhir ClickHouse, ambang, presisi, `latestAvailable`) + 1× `/api/sensors/trends?idProject&hours=24` (11,6 KB untuk 6 channel vs 71 KB per sparkline sekarang).
- Status: `getFreshness` × `thresholdState` (di luar ambang hanya saat fresh) — satu kosakata dengan desktop.
- Label: alamat-dulu di semua daftar/header (`channel-display`/helper label bersama).
- Angka `formatNumber`/id-ID + presisi; waktu `timeAgoId`; jangan ubah `toFixed` koordinat SVG (`mobile-channel-detail.component.ts:96,98,99`, `shared/util.ts:28,31`).
- Daftar: tidak terpotong diam-diam (fetchAll / total jujur); filter status atas semua data.
- Refresh 60 dtk (bukan 30), `switchMap`; satu galat refresh tidak mengganti daftar valid dengan layar galat; galat berbahasa Indonesia + "Coba lagi"; pull-to-refresh benar-benar memuat ulang.
- Detail channel: poll hanya rentang 1 jam; 24 j/7 h dimuat sekali (agregasi backend belum ada — `aggregation` diabaikan).

## Gelombang 3 — Kualitas mobile
Tap target ≥44 px, kontras teks abu, zoom tidak diblokir, safe-area iPhone (`viewport-fit=cover` + padding atas — verifikasi di perangkat), ikon tanpa label diberi aria, istilah Indonesia konsisten (Perangkat/Peringatan/Channel), hapus pengaturan palsu di Profil, ganti `alert/confirm` native, ±142 inline style → kelas, grafik dengan sumbu/min-maks/garis ambang.

## Backend (terpisah)
- **Uptime palsu** (`node_service.go:1034-1049`: 100/50/0, detik dibaca menit) & "Baterai unknown" → jangan tampilkan sampai ada metrik nyata (aturan tanpa data palsu) + perbaiki backend.
- `/projects` hard-code `alerts:0` (`project_service.go:83`), 6 kueri per project; `projects/{id}/detailed` snake_case.
- `aggregation` readings diabaikan (data 7 hari 196–520 KB tiap poll).

## Alur kerja
Gelombang 0 → (persetujuan IA) Gelombang 1+2 → `senior-dev-auditor` review → `pdam-operator` uji ulang di HP → `guide-writer` panduan mobile.
