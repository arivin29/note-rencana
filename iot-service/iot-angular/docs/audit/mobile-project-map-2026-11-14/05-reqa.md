# Re-QA visual putaran 4 — Tab Peta mobile + peta TV/WebGIS · 14 Nov 2026

Auditor: scada-visual-auditor (mode QA, read-only). Build dev segar hash `7c16ee2ee438654e`. Catatan: `iot-angular/dist/` ditimpa build produksi oleh sesi lain di tengah run pertama (10:09:13, `main.<hash>.js`, tanpa API debug `ng`) → run diulang dari build terpisah `scratchpad/dist-qa` (hash sama) di server statis sementara :4210 (sudah dihentikan). Token via `mint.js`, dihapus sesudah run.
Screenshot: `qa-<viewport>-*.png`, `qa-re-tv-*.png`, `qa-re-webgis-1920*.png` (ditimpa). Data: scratchpad `qaM-*.json`, `qaT-*.json`, `qaW.js`.

## Kesimpulan: **NO-GO (1 kriteria)** — hanya Tebo 390/360 masih 2 kartu. Semua lainnya LULUS.

## Fokus putaran ini

| Kriteria | Hasil | Angka / bukti |
|---|---|---|
| WebGIS desktop Tebo 1920 normal kembali | **LULUS** | Awal 2 kartu terlihat (Perkantoran, Logger P3) di samping markernya; kartu titik di luar layar tidak lagi ditempel ke tepi. Zoom out ×1: 5 kartu, ×2: 10, "Fit to All Layers": 11 kartu — **0 tumpukan di semua langkah**, font 9/8/10 px (= baseline). (3 pasang "tumpang-tindih" di metrik mentah hanya kartu di luar layar x≈3150, tidak terlihat.) — `qa-re-webgis-1920.png`, `qa-re-webgis-1920-fitAll.png` |
| Tebo 390/360 ≥ 3 kartu saat awal, semua node terlihat | **GAGAL** (node terlihat LULUS) | 12/12 marker di dalam peta, kartu ringkas 180 px, tetapi tetap **2 kartu** (3 node + 9 node "+4 lainnya"), zoom 11,49 / 11,32 (tidak naik). Penyebab: `zoomForCards()` (`webgis-project-map.component.ts:584-611`) hanya zoom +0,5 bila extent semua node masih muat di viewport; di 366 px extent sudah pas sehingga zoom-in diblok — syarat "semua node terlihat" dan "≥ 3 kartu" bertentangan di lebar ini. Keputusan produk diperlukan: terima 2 kartu, atau izinkan zoom-in yang memotong node terluar, atau kartu lebih ramping lagi (±140 px) — `qa-t390-01-load.png`, `qa-t360-01-load.png` |
| Landscape: sheet tidak menutupi rail | **LULUS** | sheet x 0–560, rail x 729–823 → tidak bertumpuk; +/− (11,06→12,06→10,06), Seluruh area, Lokasi saya (−1,4853/102,1112 z15) bisa ditekan saat sheet terbuka. Landscape kini 3 kartu awal — `qa-tland-01-load.png`, `qa-tland-05-tap-marker.png` |
| TV 1920 (`/iot/widget-builder` & `/monitor`), 1366, 3840 fullscreen | **LULUS** | wb 1920: 4 kartu; monitor 1920: 5; 1366: 6; 3840: 5 — semua 0 tumpukan, 0 tertutup, 0 unit terpotong, 0 di luar peta, 0 perubahan dalam 10 s, tanpa scroll; jarak kartu→marker lead 11–22 px (3840: 34–43); reset tetap 0 tumpukan — `qa-re-tv-*-fs.png` |

## Cek ulang (semua LULUS)
| Kriteria | Angka |
|---|---|
| Toggle Sensor/Node, default Sensor (juga setelah kembali) | OK di 5 viewport |
| 0 tumpukan awal & zoom −2 | 390/360/landscape/820/Merangin: 0 |
| Kartu tidak di bawah rail/chip/header, tidak melewati tepi | `cardsVsUi=[]`, terpotong 0 |
| Chip: hitungan = marker, filter menyembunyikan; chip Offline utuh | 12/11/0/1 (Sensor & Node), Merangin 2/2; "Offline 1" 44×36 (+`::before` = 44) |
| Marker offline di atas (mode Node) | teratas = "111 hari lalu" merah |
| Header Diperbarui + refresh; error + Coba lagi | "Gagal memuat data · Coba lagi" → "Diperbarui 10:13" |
| Rail 44×44 portrait & landscape | +1/−2/fit/lokasi/layar penuh native OK |
| Sheet di atas nav, isi & 5 aksi; Merangin chooser; tap kosong menutup | bawah sheet = top nav (783, 679, 1119, 329); Rute/Salin/Bagikan/Tren/Buka node OK; "2 node di titik ini"; tap kosong menutup (Sensor & Node) |
| Peta penuh tanpa area di bawah nav | +4 px semua viewport, halaman tidak scroll |
| Teks ≥ 11 px; atribusi CARTO terlihat | min 11 px; atribusi 11 px di atas nav |
| Rute lama → `/mobile/p/<pid>/peta` | OK |
| Console | hanya 500 `/api/activity/track` (bukan peta) |

## Catatan
- [P2] Kartu grup 9 node di 390 menyembunyikan 4 titik ("+4 lainnya"); operator perlu zoom 1× untuk melihat semua — dapat diterima bila produk memilih "semua node terlihat" sebagai prioritas.
- [P3] Lingkungan: `ng serve` :4200 masih basi; `dist/` dipakai bersama oleh beberapa sesi — QA sebaiknya build ke output path sendiri.
