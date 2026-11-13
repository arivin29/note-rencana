# Optimasi Widget Builder — Monitor & Layar TV

Tanggal: 2026-11-13 · Status: DRAFT v2 (menunggu persetujuan) · Skill acuan: `widget-builder`, `scada-view`, `ui-card`, `ui-coding-style`

## 1. Maksud & alasan
Widget Builder awalnya dirancang sebagai **custom dashboard ala Grafana** (widget = SQL). Dalam praktik justru
dipakai PDAM sebagai **Monitor** proyek, dan sekarang PDAM ingin menaruhnya di **TV** (kasus pertama:
PDAM Tebo, proyek "Cabang Tebo", dashboard `635a8cef…` — disukai, tapi ±15 baris grid → harus scroll).

Keputusan user: **jangan buat widget/modul TV khusus.** Optimalkan Widget Builder supaya semua dashboard
mendapat fitur yang dibutuhkan (layar penuh, auto-refresh, peta, SCADA embed, dst.); "TV" hanyalah
**setelan ukuran layar target** pada dashboard. Widget tetap **berbasis SQL**. Untuk PDAM lain, yang
dibakukan adalah **cara membangunnya** (skill + agen), bukan isi/tata letak — tiap dashboard dirakit dari awal sesuai permintaan PDAM.

Ukuran sukses: (1) dashboard Tebo versi TV berjalan seharian di 1920×1080 tanpa scroll dan angka
berganti sendiri; (2) untuk PDAM baru, agen bisa merakit dashboard sesuai susunan & node pilihan PDAM itu dalam
satu sesi, memakai skill yang sama.

## 2. Keputusan user (final)
1. Kembangkan Widget Builder (bukan modul baru); widget tetap SQL.
2. TV = **tag/setelan ukuran layar** per dashboard, bukan widget khusus.
3. Fitur layar penuh, auto-refresh, widget Peta (dari modul Map), widget SCADA embed berlaku untuk **semua** dashboard/monitor.
4. Login TV normal: login Helios → proyek → Monitor → dashboard → layar penuh.
5. Reproduksi ke PDAM lain lewat skill/agen.

## 3. Tujuan / non-tujuan / anti-tujuan
**Tujuan**: fondasi refresh yang benar; layar penuh universal (termasuk sembunyikan sidebar workspace proyek); setelan layar target (muat satu layar); widget Peta, SCADA embed, stat-grid; skill + agen untuk membangun dashboard per PDAM dari awal dengan cara kerja paten.
**Non-tujuan**: widget/endpoint khusus TV; pustaka template "semua titik otomatis" / dashboard baku per PDAM; endpoint "metric-snapshot" tanpa SQL; token layar TV; NRW/MNF (butuh flow meter); rotasi halaman.
**Anti-tujuan**: angka TV tidak berubah; data palsu; layar TV yang tetap scroll; PDAM baru butuh developer menulis kode Angular.

## 4. Kondisi sekarang (temuan)
- `toggleKioskMode()` (`dashboard-view.component.ts:~375`) hanya menyembunyikan header & sidebar **aplikasi**; sidebar workspace proyek (`project-workspace.component.html:12`) tetap tampil di Monitor.
- Bug fondasi (`skills/widget-builder/references/backlog.md`): auto-refresh stub (`refreshAllWidgets` hanya log); widget CH Expert jalan di PG; `time_range/refresh_interval` tersimpan diabaikan; menu Edit/Hapus tampil di embed; `heatmap` tanpa renderer.
- Dashboard Tebo: 11 widget SQL CH; status warna gauge memakai thresholds widget.
- Modul Map: `iot-project-map-widget` (OpenLayers `ol` 9, `@Input() nodes`), label `webgis/components/sensor-labels`; basemap CARTO via environment.
- SCADA embed: handshake `scada-auth`/`scada-ready` di `analytics-page.component.ts`.
- Data Tebo: 12 titik tekanan; batas min/maks hanya 5/12; `p2 Mangun jaya ujung` datar −0,72; nilai negatif di P6 & IPA Kantor 2; `Cadangan` mati sejak Juli.

## 5. Pendekatan
| | Pendekatan | Trade-off | Hasil |
|---|---|---|---|
| A | Modul TV otomatis dari inventori | Kaku; tak cocok variasi PDAM | Ditolak |
| B1 | Widget Builder + widget TV khusus tanpa SQL (metric-snapshot) | Lebih "otomatis", tapi sistem kedua di dalam Widget Builder | Ditolak user (v1 dokumen ini) |
| **B2** | **Optimasi Widget Builder untuk semua dashboard; TV = setelan layar; SQL tetap; tiap dashboard dirakit dari awal lewat skill/agen paten** | Fleksibel ala Grafana, satu sistem; dashboard per PDAM dirakit agen (bukan otomatis) | **Dipilih** |

## 6. Desain

### 6.1 Fase 0 — Fondasi (semua dashboard)
- Auto-refresh nyata: interval menggeser rentang waktu relatif dan memuat ulang semua widget; refresh per widget; timer dengan subject sendiri.
- Default dari `time_range` & `refresh_interval` dashboard; pilihan user di toolbar bisa disimpan ke dashboard.
- Expert wizard mengirim `dataSource` top-level; view tidak menimpa `config.dataSource`.
- Menu Edit/Hapus/Duplikat disembunyikan di `embeddedMode` dan layar penuh.
- Refresh tanpa kedip: data lama tetap tampil sampai yang baru datang; gagal → badge kecil di widget. Indikator "Diperbarui HH:MM:SS"; bila gagal > 2× berturut-turut → peringatan di header.
- Sesi habis (refresh token gagal/401) → overlay "Sesi berakhir — login ulang", bukan angka basi.

### 6.2 Fase 1 — Layar penuh universal + setelan layar target
- Tombol **Layar Penuh** di toolbar semua dashboard (Monitor & Widget Builder): Fullscreen API + state layout bersama (mis. `LayoutStateService.immersive$`) yang menyembunyikan header app, sidebar app, **sidebar workspace**, toggle mobile, toolbar dashboard. Keluar: Esc / tombol yang muncul saat mouse bergerak. Sinkron dengan `fullscreenchange`.
- Header tipis layar penuh: nama proyek · nama dashboard · jam · "Diperbarui …".
- **Setelan "Layar target"** di pengaturan dashboard, disimpan di `layout_config.screen` (tanpa migrasi): `{ preset: 'auto' | 'tv-1080' | 'tv-4k' | 'custom', width, height }`.
  - `auto` (default) = perilaku sekarang (scroll vertikal).
  - Preset TV = grid diskalakan agar semua widget muat dalam rasio layar target (tinggi baris dihitung dari viewport ÷ jumlah baris terpakai); font widget ikut skala.
  - Di mode edit: garis bantu batas layar target + peringatan bila widget melewati batas.
  - Badge "TV 1920×1080" di daftar dashboard (ini "tag"-nya).

### 6.3 Fase 2 — Widget baru (generik, berlaku semua dashboard)
1. **`map`** — memakai ulang `iot-project-map-widget`. SQL mengembalikan baris per titik dengan kolom `node_code` (wajib) dan `value`, opsional `label`, `unit`, `status`. Koordinat & alamat di-resolve FE dari node proyek dashboard (lewat `node_code`), jadi SQL CH tidak perlu join PG. Warna titik dari thresholds widget (sama seperti gauge) atau kolom `status`. Label nilai pola `sensor-labels`. Fit-to-extent otomatis.
2. **`scada-embed`** — tanpa SQL (`sql_query=''`, config `diagramId`). Dropdown diagram proyek. Iframe `<scadaUrl>/embed/<projectId>/diagrams/<id>/view?chrome=none` + handshake pola analytics-page (cek `event.origin`). Di iot-scada: `chrome=none` menyembunyikan TopBar/toggle Edit/kontrol navigasi, auto-fit saat resize.
3. **`stat-grid`** (dibutuhkan agar dashboard tidak perlu 1 widget per titik — ini panel "Stat multi-value" ala Grafana, bukan khusus TV): satu SQL → banyak baris → banyak tile (kolom `label`/`node_code`, `value`, opsional `unit`, `sparkline` dari query kedua via `config.queries`). Warna dari thresholds; tile auto-fit sesuai jumlah baris. Titik baru di proyek otomatis muncul bila SQL-nya tidak menyebut node satu per satu.
4. Perbaiki/selesaikan `heatmap` atau sembunyikan dari pilihan.

### 6.4 Fase 3 — Skill & agen untuk membangun dashboard per PDAM (dari awal)
Tiap PDAM/user ingin **susunan dan node tertentu** → tidak ada template "semua titik otomatis" dan tidak ada
dashboard baku. Setiap dashboard dirakit **dari awal sesuai permintaan**, tapi dengan **cara kerja yang paten**:
- **Skill `monitor-dashboard`** (runbook Claude): (1) wawancara singkat kebutuhan — siapa penonton, layar target,
  node/titik mana, metrik apa, urutan prioritas; (2) cek inventori & kualitas data node terpilih (batas min/maks kosong,
  sensor macet/datar, nilai negatif, metric_code tak seragam, node offline) dan laporkan ke user sebelum membangun;
  (3) usulkan tata letak (sketsa grid) sesuai layar target → minta persetujuan; (4) tulis SQL per widget dengan
  pola SQL yang sudah teruji (dicatat di skill: nilai terkini CH `sensor_channel_latest FINAL`, tren
  `sensor_telemetry_10min` + `avgMerge`, statistik, stat-grid multi-baris, peta, deteksi data terlambat) — selalu
  terskop `${ownerCode}` + node terpilih; (5) buat dashboard + widget via API `/api/widget-builder/*` (JWT dari user,
  dashboard baru, tidak menimpa yang ada); (6) verifikasi: semua widget mengembalikan data, layar penuh tanpa scroll
  pada layar target, screenshot.
- **Agen `dashboard-author`** menjalankan skill tersebut; `scada-visual-auditor` untuk QA visual.
- **Contoh pertama**: dashboard baru "Monitor TV — Cabang Tebo" (preset `tv-1080`) dengan node & susunan yang
  disepakati bersama user; dashboard lama tidak diubah.

## 7. Batasan
- NgModule non-standalone, ECharts, `<card>`, FontAwesome, UI Bahasa Indonesia; label node = alamat (fallback kode).
- Tidak ada data palsu. Tidak ada migrasi DB (semua via `config`/`layout_config` jsonb). `scada-embed` menyimpan `sql_query=''`, `data_source='postgresql'`.
- SDK ditambah manual (regen rusak). Warna dari token tema, dukung terang/gelap.
- Risiko SQL tenant (backlog P0) **tidak diselesaikan di sini**, tapi setiap SQL yang dibuat skill/agen wajib terskop `${ownerCode}` + node terpilih.

## 8. Ketetapan Claude (mohon dicek)
- Map me-resolve koordinat dari `node_code` di FE (bukan wajib kolom lat/lng di SQL) — agar SQL CH tetap sederhana.
- `stat-grid` ditambahkan sebagai widget generik (pengganti 6 gauge terpisah).
- Pola SQL "data terlambat" di skill memakai `telemetry_interval_sec` node (stale > max(5 mnt, 2,5×interval)).
- Flag nilai negatif hanya untuk tekanan/level/kualitas air, tidak untuk debit.

## 9. Diserahkan ke builder
Algoritma skala grid & font; nama komponen/file; detail visual (ikuti `scada-visual-auditor`); bentuk persis pola SQL di skill.

## 10. Urutan & verifikasi
Fase 0 → 1 → 2 → 3 (+ contoh Tebo). Tiap fase: `tsc` bersih, `go build ./...` bila backend tersentuh, cek visual 1920×1080 & 1366×768 (layar penuh, tanpa scroll di preset TV), terang/gelap, Monitor embedded; review `senior-dev-auditor`.
