# Audit visual — Tab Peta proyek (mobile) · 14 Nov 2026

Auditor: scada-visual-auditor (mode AUDIT, read-only). Browser: Puppeteer headless, tema gelap, token admin 10 menit (sudah dihapus).
Target: `/mobile/projects/<id>/map` — Merangin `3f7f0f09…` (2 node, 0 layer WebGIS) & Tebo `1414bdba…` (12 node, layer "Jaringan Pipa").
Pembanding: desktop WebGIS `/iot/projects/1414bdba…/map` (1440×900) → `tdesk-01-load.png`.
Kode: `src/app/mobile/projects/tabs/project-map/project-map.component.{ts,html,scss}` + `src/scss/mobile/mobile.scss:416-424`.
Skrip: scratchpad `mmap.js` (tap via `page.touchscreen`, swipe/pinch via CDP `synthesizeScrollGesture/PinchGesture`).

Screenshot (folder ini): prefix `m390` = Merangin 390×844@3x · `t390` / `t360` (360×740@2x) / `t820` (820×1180) / `tland` (844×390) = Tebo · sufiks `01-load, 02-sensor, 03-tap-sensor, 04-tap-node, 05-zoomout-sensor, 06-after-gestures` (`07-bottom` = sama dgn 06, halaman tidak bisa di-scroll).

## Skor (1–5)
| Warna-makna | Hierarki | Tata letak | State | Responsif | Konsistensi |
|---|---|---|---|---|---|
| 2 | 2 | 1 | 2 | 2 | 2 |

## Angka terukur
| Viewport | Tinggi peta | Kartu sensor tampil | Pasang kartu bertumpuk (zoom awal → −2) | Kartu terpotong tepi | Popup terpotong |
|---|---|---|---|---|---|
| 390×844 Merangin | 523 px (62vh) | 2 | 1 → 1 (100%) | 0 | tidak |
| 390×844 Tebo | 523 | 12 | **23 → 66** (dari 66 maks) | 4 | tidak |
| 360×740 Tebo | 459 | 12 | 26 → 66 | 4 | **ya (kanan)** |
| 820×1180 Tebo | 732 | 12 | 6 → 42 | 2 | tidak |
| 844×390 Tebo | 242 (≈140 terlihat di atas bottom-nav) | 12 | **54** → 66 | 0 | — |
- Console error/warning: **0** di semua run. Request API halaman peta: 3 (`/nodes?limit=200`, `/webgis/core/<p>/sensor-channel-values`, `/webgis/layers`) + 1 per layer non-core; 0 gagal. Tile CARTO 25–40, 0 gagal. Desktop: 33 API. Waktu sampai peta tampil ≈7–8 s (dev server).
- Tap 12 px di samping marker → **tidak** membuka popup (hit area = lingkaran 16 px). Tap area kosong → popup tertutup (OK).
- Swipe vertikal di atas peta → peta ter-pan, halaman tidak scroll. Di 390/820 halaman memang tidak perlu scroll (OK), tapi di landscape lihat P1-6.
- Pinch berfungsi (zoom 13.2 → 12.4), wheel-zoom OK. **Tidak ada tombol zoom/reset** sama sekali (`controls: []`), padahal `mobile.scss:423-424` sudah menyiapkan gaya `.ol-zoom`.
- Font terkecil di kartu sensor: **8 px** (`channel-name`, `label-foot`, `more-indicator`), judul 9 px.

## Temuan

### P0
1. **[P0] · `project-map.component.ts:307-315` · Kartu nilai sensor ditaruh 1 overlay per node tanpa penggabungan → bertumpuk total.** Tebo 390: 23 pasang tumpang-tindih di zoom awal, 66/66 setelah zoom out (`t390-02`, `t390-05`); Merangin dua node berlokasi sama → satu kartu menutup kartu lain 100% (`m390-02`), "now / now" bertumpuk di mode Node (`m390-01`). Dampak: operator tidak bisa membaca tekanan titik mana pun di HP — inti tab ini gagal; nilai merah (−0,720 bar) bisa tertutup kartu hijau. Perbaikan: pakai `webgis/shared/label-clusters.ts` + `<sensor-labels>` (`WebgisSharedModule`) seperti widget peta (`widget-builder/components/widgets/map/`) — kartu digabung jadi satu kartu grup per kluster, alarm-first, re-cluster di `moveend`.
2. **[P0] · `project-map.component.ts:241-256,122,134` · Layer WebGIS digambar dengan gaya salinan sendiri, bukan `webgis-styles.ts`.** `styleJson` Tebo memakai `colorByField`/`fillOpacity`/`labelMinZoom` → di mobile semua diabaikan, fallback cyan `#22d3ee`; layer `isVisibleDefault=false` dibuang permanen (tak ada toggle). Sensor-type layer (4 warna di desktop: biru/ungu/pink/oranye) dan layer Alerts tidak ada sama sekali — semua titik sensor biru `#3b82f6` (`t390-02` vs `tdesk-01`). Dampak: peta HP tidak sama dengan peta yang dikenal operator di kantor; alarm tidak terlihat di peta. Perbaikan: ganti blok gaya dengan `webgisSupportLayers()` + `createWebgisLayerStyle()`/`webgisSensorTypeLayerStyle(i)` + alert source seperti `map-widget.component.ts:519-560`. Catatan: endpoint lokal `/webgis/layers/<Jaringan Pipa>/geojson` mengembalikan `featureCount:0` (bbox ada) → pipa tidak bisa diverifikasi di lokal untuk mobile maupun desktop; cek data di prod.

### P1
3. **[P1] · `mobile.scss:418` + `ts:287` · Popup tidak di-anchor ke marker.** `.m-ol-popup{position:absolute}` membuat container overlay OL berukuran 0×0 sehingga `positioning:'bottom-center'` tidak berefek: popup muncul di kanan-bawah titik, **menutupi marker yang di-tap** dan kartu tetangga (`m390-03`, `m390-04`); tidak ada `autoPan` → terpotong tepi kanan di 360 (`t360-03`). Perbaikan: `position:relative` (atau static) pada `.m-ol-popup`, `autoPan:{animation:{duration:200}, margin:12}`; di HP < 480 px lebih baik **bottom sheet** (`position:fixed; bottom: bottom-nav`) daripada popup mengambang.
4. **[P1] · `ts:264,280,318-321` · Target sentuh terlalu kecil.** Marker node r=8 (16 px), sensor r=6 (12 px); `forEachFeatureAtPixel` tanpa `hitTolerance` → tap 12 px meleset (terukur). Pedoman ≥ 44 px. Perbaikan: `hitTolerance: 14` (≈44 px total), marker r=9–10; untuk titik berimpit (Merangin) tampilkan daftar pilihan di sheet.
5. **[P1] · `ts:302` · Tidak ada kontrol peta sama sekali.** Tanpa zoom ±, tanpa "Pas ke semua node" (setelah pan/pinch operator kehilangan semua titik — `tland-06`: tidak ada marker tersisa di layar), tanpa lokasi-saya, tanpa layar penuh, tanpa refresh/waktu update, tanpa legenda/toggle layer, tanpa atribusi CARTO/OSM (wajib lisensi). Perbaikan: tombol vertikal kanan-atas 44×44 px: `+`, `−`, `fa-expand` (fit extent), `fa-location-crosshairs` (geolocation, opsional), `fa-layer-group` (sheet toggle layer = daftar seperti desktop CORE/SENSOR CHANNELS/OPERATIONAL), `fa-up-right-and-down-left-from-center` (fullscreen). Tambah `Attribution({collapsible:true})`.
6. **[P1] · `mobile.scss:417` · Tinggi `62vh` tak sadar konteks.** Landscape 844×390: peta 242 px, ±100 px tertutup bottom-nav, halaman tidak bisa scroll, caption tak terlihat (`tland-02`, `tland-07`). 820 tablet: hanya 732 px dari 1180 terpakai. Perbaikan: `height: calc(100dvh - var(--m-appbar-h) - var(--m-tabs-h) - var(--m-bottomnav-h) - seg - gaps)` dengan `min-height:280px`; di landscape sembunyikan caption & ringkas toggle (segmented di dalam peta sebagai chip).
7. **[P1] · `ts:15-45,55-71` · Data tidak pernah diperbarui & tidak jujur soal umur.** Satu kali `forkJoin`; tidak ada polling/refresh, tidak ada "Diperbarui HH:MM"; chip "now/1m" dihitung sekali saat load lalu membeku. Kalau tab dibiarkan 30 menit, "now" tetap tampil → data basi terlihat segar. Perbaikan: refresh 60 s (hanya `sensor-channel-values` + status node, geometri sekali), stempel waktu + tombol refresh, hitung ulang umur; status dari `getFreshness()` (`shared/utils/telemetry-freshness.ts`) bukan `connectivityStatus` mentah.
8. **[P1] · `ts:97,108,200-206` + `html:29,41` · Label salah sumber.** Judul kartu = `sensorLabel` ("Tuf-2000" ×3 di satu kartu, `m390-02`), judul popup = kode perangkat panjang "HELIO-354002393536022" yang patah 2 baris; alamat jadi baris sekunder. Melanggar aturan label = alamat (fallback kode). Perbaikan: judul = `nodeAddress` (sudah dikirim `GetSensorChannelValues`), baris 2 = kode; nama channel = label channel, bukan sensorLabel diulang.

### P2
9. **[P2] · `scss:24-105` · Ukuran teks di bawah minimum.** 8–10 px (kartu), chip node 10 px; target ≥ 11 px di HP. Perbaikan: pakai `<sensor-labels [scale]>` dengan scale ≈1.15 di mobile (`--sl-scale`), bukan CSS salinan.
10. **[P2] · `scss:4-109` · `::ng-deep` global atas `.sensor-label-card/.channel-row/.sensor-name`** tanpa host scope → setelah tab ini dibuka sekali, gaya bocor ke `sensor-labels` desktop/widget di sesi yang sama (font 9 px). Perbaikan: hapus file ini saat pindah ke `<sensor-labels>`; sementara bungkus dengan `:host ::ng-deep`.
11. **[P2] · `ts:153-172,201` · Format angka/waktu tidak Indonesia.** "2.25 bar", "0.960 m/s" (titik desimal), "now", "1m", "2h"; status "online/degraded" berbahasa Inggris di popup (`html:32`). Perbaikan: `formatIdNumber(v,2)` (`widget-builder/utils/format-id.ts`), `timeAgoId` (`shared/utils/channel-display.ts`), label status Indonesia ("Daring/Terlambat/Luring"). Nilai hilang "N/A" → "—".
12. **[P2] · `ts:339` · Warna status hardcode** (`#2dd4a7/#fbbf24/#fb5b6d`) dan `degraded/offline/unknown` digabung jadi merah — perangkat "tidak diketahui" tampil sebagai alarm. Perbaikan: token status mobile (`--m-ok/--m-warn/--m-danger/--m-muted`) + stale abu-abu.
13. **[P2] · `ts:209` · "+2 sensor" menyembunyikan channel** tanpa cara melihatnya kecuali tap (Merangin: Debit, Diameter, Velocity tampil; Tekanan — yang kritis — bisa jadi justru yang tersembunyi). Perbaikan: urutkan alarm-first, prioritaskan metrik utama (tekanan/debit), sembunyikan konstanta seperti Diameter.
14. **[P2] · `html:1` · Loading = satu skeleton 200 px** lalu lompat ke peta 523 px (layout shift); error tanpa "Coba lagi"; `count===0` mengecek **node** padahal mode Sensor bisa kosong sendiri tanpa pesan. Perbaikan: skeleton setinggi peta, tombol "Coba lagi", empty state per mode.
15. **[P2] · `html:11` · Toggle Node/Sensor 34 px tinggi** (< 44) dan memakan 50 px vertikal. Perbaikan: `min-height:44px` atau pindahkan sebagai segmented chip overlay di atas peta.

### P3
16. **[P3] · `ts:58` · `limit:200`** tanpa paginasi (`fetchAll`) — proyek besar akan kehilangan node diam-diam.
17. **[P3] · `ts:300` · center awal = node[0]** lalu `fit` → tidak masalah, tapi tidak ada animasi; pertimbangkan `fit` dengan padding kartu seperti widget (lebar/ tinggi kartu terukur).

## Dibanding desktop WebGIS (Tebo) — yang belum ada di mobile
| Fitur | Desktop | Mobile |
|---|---|---|
| Layer per tipe sensor (warna beda) | Ya (4) | Tidak (semua biru) |
| Layer Alerts | Ya | Tidak |
| Gaya layer data-driven (`colorByField`, zoom-gated label) | Ya | Tidak (cyan polos) |
| Toggle/daftar layer + legenda | Ya (panel kiri) | Tidak |
| Kartu nilai digabung saat bertumpuk | Ya (label-clusters) | Tidak |
| Zoom ± / fit semua | Ya | Tidak |
| Refresh + jam update + auto-refresh | Ya (08:50:14) | Tidak |
| Ganti basemap | Ya | Tidak |
| Cari node | Tidak (desktop pun tidak) | Tidak — usulan: search sheet → zoom ke node |
| Lokasi saya / layar penuh | — | Tidak (relevan untuk petugas lapangan) |

## Quick wins (≤ 30 menit)
- `mobile.scss:418` `.m-ol-popup` → `position:relative` + `autoPan` di Overlay (P1-3).
- `hitTolerance:14` di `forEachFeatureAtPixel` (P1-4).
- `controls: defaults({rotate:false, attributionOptions:{collapsible:true}})` → zoom ± + atribusi muncul (gaya sudah ada `mobile.scss:423`) (P1-5 sebagian).
- Ganti `fmtVal/fmtAgo` dengan `formatIdNumber` / `timeAgoId`, status berbahasa Indonesia (P2-11).
- Judul kartu/popup = alamat, baris 2 = kode (P1-8).
- `:host ::ng-deep` pada scss (P2-10).

## Perbaikan struktural
- Buang peta salinan: jadikan tab ini konsumen modul bersama (`WebgisSharedModule`: `webgis-layer-config.ts`, `webgis-styles.ts`, `label-clusters.ts`, `<sensor-labels>`), atau ekstrak inti widget peta (`map-widget.component.ts` mode `webgis`) ke komponen peta read-only bersama dengan input `projectId`, `scale`, `interactive`. Satu sumber gaya = desktop, widget, mobile identik.
- Kontrol mobile: rail tombol 44 px (zoom, fit, layer sheet, lokasi, fullscreen) + bottom sheet detail node (alamat, status freshness, channel alarm-first, "Buka node").
- Refresh 60 s + "Diperbarui HH:MM", tinggi peta berbasis `dvh`, mode landscape.
