# Re-QA visual putaran 3 — Tab Peta mobile + peta TV/WebGIS · 14 Nov 2026

Auditor: scada-visual-auditor (mode QA, read-only). Build segar `npx ng build --configuration development` (dist 10:01, hash 80c93de8), dilayani server statis sementara :4210 (`serve-dist.js`, sudah dihentikan); API :3000. Token via `mint.js`, dihapus sesudah run.
Warna/font mobile (restyle helios.scss sesi lain) tidak dinilai. Screenshot ditimpa: `qa-<viewport>-*.png`, `qa-re-tv-*.png`, `qa-re-webgis-1920.png`. Data: scratchpad `qaM-*.json`, `qaT-*.json` (metrik baru `dist` = jarak px tepi kartu ke marker lead / marker anggota terjauh).

## Kesimpulan: **NO-GO**
TV kini membaca baik (4–6 kartu, 0 tumpukan, stabil), landscape lulus semua. Gagal: **WebGIS desktop regresi** (kartu titik di luar layar kini ditempel di tepi peta, terlepas dari markernya) dan **Tebo 390/360 hanya 2 kartu** (target ≥ 3).

## Pemeriksaan khusus

| Kriteria | Hasil | Angka / bukti |
|---|---|---|
| TV `/iot/widget-builder` 1920 fullscreen | **LULUS** (jumlah kartu di bawah target ~6) | 4 kartu (1+1+6+4 node, "+1 lainnya"), 0 tumpukan, 0 tertutup, 0 unit terpotong, 0 di luar peta; jarak kartu→lead 17–22 px, anggota terjauh 62 px; 10 s: 0 perubahan; reset 12,03→12,22, 0 tumpukan; tanpa scroll — `qa-re-tv-wb-1920-fs.png` |
| TV `/monitor` 1920 / 1366 / 3840 | **LULUS** | 1920: 5 kartu, lead ≤ 21 px, terjauh 83 px; 1366: 6 kartu, lead ≤ 15, terjauh 43; 3840: 5 kartu, lead ≤ 43, terjauh 182 (skala 2×); semua 0 tumpukan, 0 terpotong, 0 perubahan 10 s, tanpa scroll — `qa-re-tv-mon-*-fs.png` |
| WebGIS desktop Tebo 1920 | **GAGAL** | 7 kartu, 0 tumpukan, font 9/8/10 px OK, **tetapi** kartu Kelompok Tani, SMP 24, Inline, grup "IPA Kantor…Cadangan" dan grup "p2 Mangun jaya…" yang markernya di luar viewport kini **ditempel di tepi kanan/bawah** (x≈1805–1910), kartu bawah terpotong tepi bawah layar. Sebelumnya (putaran 1/2) kartu ikut keluar layar bersama markernya. Operator membaca seolah titik itu di tepi peta — `qa-re-webgis-1920.png` |
| Mobile Tebo 390 / 360: ≥ 3 kartu terpisah saat awal | **GAGAL** | 2 kartu (3 node + 9 node "+4 lainnya"), zoom 11,49 / 11,32 — `qa-t390-01-load.png`, `qa-t360-01-load.png`. 820: 9 kartu **LULUS** (`qa-t820-01-load.png`) |
| Mobile: tidak ada kartu di bawah rail/chip/header atau melewati tepi | **LULUS** | `cardsVsUi=[]`, terpotong 0 di 390/360/820/844×390/Merangin |
| Landscape 844×390 (3) | **LULUS** | peta 66→325 ≤ nav 329; atribusi 11 px y≤321; chip tidak menutupi kartu; 4 chip utuh termasuk "Offline 1" 98×36; "Diperbarui 10:01" + refresh pindah ke rail (94×44) — `qa-tland-01-load.png` |
| Merangin node berimpit | **LULUS** | 2 kartu terpisah (143×47, 184×133), 0 tumpukan; tap kartu → detail "MAN Tekanan"; tap marker → "2 node di titik ini" → pilih → "MAN Debit & Tekanan" — `qa-m390-06-chooser.png`, `qa-m390-07-chosen.png` |

## Cek ulang yang sebelumnya lulus
| Kriteria | Hasil |
|---|---|
| Toggle Sensor/Node, default Sensor (juga setelah kembali) | LULUS |
| 0 tumpukan saat awal & zoom −2 (semua viewport) | LULUS |
| Hitungan chip = marker; filter menyembunyikan marker & kartu (Sensor & Node) | LULUS (12/11/0/1; Merangin 2/2) |
| Marker offline di atas (mode Node) | LULUS (teratas = "111 hari lalu", merah) |
| Header Diperbarui + refresh; error "Gagal memuat data" + Coba lagi → pulih "Diperbarui 10:03" | LULUS (`qa-err-*`) |
| Rail 44×44: +/−, Seluruh area, Lokasi saya (−1,4853/102,1112 z15), layar penuh | LULUS portrait; landscape: tidak bisa ditekan selama sheet terbuka (sheet y134–329 menutup rail) — P2 lama |
| Sheet di atas nav (783/783, 679/679, 1119/1119, 329/329), judul alamat/kode/status/angka koma, Rute/Salin/Bagikan/Tren/Buka node | LULUS |
| Tap area kosong menutup sheet | LULUS portrait |
| Peta penuh tanpa area di bawah nav | LULUS (+4 px semua viewport) |
| Teks ≥ 11 px; target ≥ 44 (chip 36 + `::before` 44) | LULUS |
| Atribusi CARTO | LULUS |
| Rute lama → `/mobile/p/<pid>/peta` | LULUS |
| Console | LULUS bersyarat (hanya 500 `/api/activity/track`, bukan peta) |

## Temuan
1. **[P1] · `webgis/components/sensor-labels/sensor-labels.ts` (clamp ke dalam peta) · Kartu untuk marker di luar viewport ditempel di tepi.** Regresi WebGIS desktop (dan berlaku juga di TV/mobile saat operator pan). Perbaikan: clamp hanya bila marker lead berada di dalam viewport (atau dalam ≤ ½ lebar kartu dari tepi); kartu yang markernya di luar layar disembunyikan/dibiarkan keluar.
2. **[P1] · klaster di HP 390/360 masih 2 kartu** (kartu 9 node "+4 lainnya"). Penempatan alternatif tampaknya tidak dicoba cukup di lebar 366 px karena kartu 230 px (scale 1,15) + inset kanan rail. Opsi: kartu lebih ramping di HP (lebar maks ±170 px, nama dipotong), atau zoom awal +0,5–1 bila klaster terbesar > 4 node.
3. **[P2]** Kartu grup di 390 menutupi beberapa marker kluster Muara Tebo (`qa-t390-01-load.png`); di TV 1920 masih 4 kartu (target ~6).
4. **[P2] lama** Sheet di landscape menutup rail sehingga zoom/Lokasi saya tidak bisa ditekan sebelum sheet ditutup.
5. **[P3] lingkungan** `ng serve` :4200 masih basi — restart.
