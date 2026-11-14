# Re-QA visual — Tab Peta mobile + regresi peta TV · 14 Nov 2026 (putaran 2)

Auditor: scada-visual-auditor (mode QA, read-only). Token admin via `mint.js` (tidak dicetak, dihapus sesudah run).

**Catatan lingkungan:** `ng serve` di :4200 **tidak memuat perubahan** (chunk `src_app_mobile_mobile_module_ts.js` masih tanpa `pm-chip__label` lebih dari 6 menit setelah file diubah 09:44; watcher macet). Yang diuji = build dev segar `iot-angular/dist/` (09:45, berisi perbaikan) yang dilayani server statis scratchpad `serve-dist.js` di :4210 (API tetap :3000). Restart `ng serve` sebelum QA berikutnya.
Perubahan warna/font mobile (helios.scss, sesi lain) tidak dinilai — hanya tata letak & perilaku.
Screenshot: `qa-<viewport>-*.png` (ditimpa putaran ini) dan `qa-re-tv-*.png`, `qa-re-webgis-1920.png`. Data: scratchpad `qaM-*.json`, `qaT-*.json`.

## Kesimpulan: **NO-GO** (selisih kecil)
Diperbaiki: TV 0 tumpukan & tanpa flicker, marker offline di atas, landscape tidak lagi tembus nav, chip Offline terlihat di 390/360, ukuran target/teks. Masih gagal: **(4) 390 tetap 1 kartu & kartu terpotong tepi kanan / menimpa rail**, **(3) landscape kartu tertimpa chip + header strip, chip Offline tertutup**.

## Pemeriksaan khusus

| # | Kriteria | Hasil | Bukti / angka |
|---|---|---|---|
| 1a | TV Tebo 1920 fullscreen `/iot/widget-builder/…` | **LULUS** | 1 kartu (12 node), 0 pasang tumpang-tindih, 0 tertutup, 0 unit terpotong, 0 di luar peta; scroll 1080/1080; 10 s: 0 perubahan tata letak; zoom 11,82 → +2 → reset 12,39, 0 tumpukan setelah reset — `qa-re-tv-wb-1920-fs.png` |
| 1b | TV `/monitor` 1920 / 1366 / 3840 fullscreen | **LULUS** | 1920: 1 kartu 277×160, 0 tumpukan; 1366: 1 kartu 195×115, 0; 3840: 2 kartu (563×315, 553×173), 0; semua 0 perubahan dalam 10 s, tanpa scroll — `qa-re-tv-mon-1920-fs.png`, `qa-re-tv-mon-1366-fs.png`, `qa-re-tv-mon-3840-fs.png` |
| 1c | WebGIS desktop Tebo 1920 | **LULUS** | 10 kartu, 0 tumpukan, font 9/8/10 px (= baseline) — `qa-re-webgis-1920.png` |
| 2 | Mode Node: marker offline di atas di titik bersama | **LULUS** | hit teratas di koordinat "Cadangan" = "111 hari lalu #fb5b6d" (390, 360, 820) |
| 3 | Landscape 844×390: bawah peta ≤ top nav, atribusi terlihat, chip tidak menutupi kartu | **GAGAL (sebagian)** | Peta 68→320, nav 324 (+4) **LULUS**; atribusi 11 px @ y300–316 **LULUS**; tetapi kartu tumpang-tindih `.pm-chips` **dan** `.pm-head` (strip "Diperbarui" melayang di atas peta), bagian atas kartu terpotong tepi peta, chip "Offline 1" tertutup strip header (elementFromPoint ≠ chip) — `qa-tland-01-load.png` |
| 4 | Tebo 390: tampilan awal ≥ 3 kartu terpisah | **GAGAL** | zoom awal 11,49 (sebelumnya 9,9) tetapi tetap **1 kartu** (12 node, "+7 lainnya"); kartu melewati tepi kanan peta (unit "bar" terpotong jadi "ba") dan menimpa rail kontrol — `qa-t390-01-load.png`. 360: sama (zoom 11,32, 1 kartu, menimpa `.pm-ctrl`, 1 terpotong) |
| 5 | 390/360: chip Offline terlihat penuh | **LULUS** | chip ringkas: "Semua 12" 87×36, "● 11" 52×36, "● 0" 45×36, "● 1" 45×36, semua di dalam baris & teratas |
| 6 | Target sentuh ≥ 44 px | **LULUS** | chip visual 36 px + `::before` −4/+4 px → area sentuh 44 px; tombol refresh 44×44; rail 44×44; seg 52; aksi sheet 68×52 / 62×63 / 154×52 |

## Cek ulang yang sebelumnya lulus
| Kriteria | Hasil | Bukti |
|---|---|---|
| Toggle Sensor/Node, default Sensor (juga setelah kembali) | LULUS | seg 189×52 |
| Kartu gabungan 0 tumpukan, awal & zoom −2 | LULUS | 0 pasang di 5 viewport |
| Hitungan chip = marker tampil, filter menyembunyikan | LULUS | Tebo 12/11/0/1 di kedua mode, Merangin 2/2, pesan "Tidak ada node …" |
| Header "Diperbarui HH:mm" + refresh; error + Coba lagi | LULUS | blokir nilai → "Gagal memuat data · Coba lagi" → retry "Diperbarui 09:52", 12 node — `qa-err-02-error.png`, `qa-err-03-after-retry.png` (catatan: chip tetap "Semua 0" saat error, P2 lama) |
| Rail: +/−, Seluruh area, Lokasi saya, layar penuh | LULUS (portrait) | +1/−2 zoom, fit kembali 11,49; lokasi −1,4853/102,1112 z15; fullscreen native. Landscape: Lokasi saya tak tertekan karena sheet masih terbuka menutup rail (P2 lama) |
| Sheet di atas nav, isi, 5 aksi, chooser Merangin, tap kosong menutup | LULUS | bawah sheet = top nav (778/778, 674/674, 1114/1114); Rute/Salin/Bagikan/Tren/Buka node benar; "2 node di titik ini" |
| Peta penuh tanpa area di bawah nav (portrait) | LULUS | celah +4 px di 390/360/820 |
| Teks ≥ 11 px | LULUS (mobile) | min 11 px (atribusi 11, "+7 lainnya" ≥ 11) |
| Atribusi CARTO | LULUS | semua viewport, tidak di bawah nav |
| Rute lama → `/mobile/p/<pid>/peta` | LULUS | `qa-redir-01-load.png` |
| Console | LULUS bersyarat | hanya 500 `/api/activity/track` (bukan peta) |

## Temuan baru / tersisa
1. **[P1] · `webgis/components/project-map/webgis-project-map.component.ts` (fit) + `sensor-labels.ts` · Di HP kartu grup 230 px ditambatkan di node lead dekat tepi kanan → keluar peta & menimpa rail.** Perbaikan: setelah klaster, geser (clamp) overlay kartu ke dalam viewport dikurangi area UI (`fitPadding` kanan 56, atas 100) — mis. `positioning` dinamis atau offset-x terhitung; atau jadikan `fitPadding` juga "safe area" kartu.
2. **[P1] · klaster terlalu agresif di layar sempit / TV 1920** — semua 12 node dalam satu kartu ("+7 lainnya"), anggota yang berjarak ±150 px (Perkantoran/Logger P3 di barat) ikut digabung ke kartu yang ditambatkan jauh di timur (`qa-re-tv-wb-1920-fs.png`). Lolos kriteria tumpukan, tapi 7 titik tak terbaca di TV dan lokasi menyesatkan. Perbaikan: saat dua grup bertabrakan, coba dulu sisi alternatif (kartu di bawah / kiri / kanan marker) sebelum menggabung; batasi radius gabung (mis. ≤ 1,5 × lebar kartu tunggal dari lead).
3. **[P1] · `project-map.component.scss` `@media (max-height: 430px)` · landscape:** strip `.pm-head` melayang (right ±190 px) menutup chip Offline dan kartu; kartu tertimpa chip. Perbaikan: di landscape pindahkan "Diperbarui"/refresh ke rail atau ke baris seg; tambahkan `fitPadding` atas = tinggi seg+chip agar kartu tidak naik ke bawah UI.
4. **[P3] Lingkungan:** watcher `ng serve` :4200 macet — restart sebelum QA/operator berikutnya, kalau tidak pengguna lokal melihat versi lama.
5. **[P3]** `qa-re-tv-wb-1920-fs.png`: widget "Tren tekanan DMA" masih kosong 14 s setelah dimuat pada run ini (run monitor 3840 normal). Kemungkinan timing kueri; pantau.
