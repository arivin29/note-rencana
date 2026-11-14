# Re-QA visual putaran 6 — Tab Peta mobile (Helios) + regresi TV/WebGIS · 14 Nov 2026

Auditor: scada-visual-auditor (mode QA, read-only). Diuji di `ng serve` :4200. Kesegaran build dicek dari chunk mobile, yang memuat `legendOpen` dan aturan `900` (sumber diubah 10:59–10:59:54). Token dibuat lewat `mint.js` dan dihapus sesudah run.
Screenshot berprefix **`qa-r6-`**. Data: scratchpad `qaM7-*.json` dan `qaT7-*.json`.

## Kesimpulan: **NO-GO tipis**
Semua kegagalan 06 sudah beres. Tersisa 1 temuan P2 baru: di landscape Tebo, satu kartu melewati tepi bawah peta.

## Kegagalan 06-reqa → status sekarang

| # | Kriteria | Hasil | Bukti |
|---|---|---|---|
| 1 | Presisi per metrik, Diameter tidak tampil di kartu | **LULUS** | Kartu: "VOLUME 2.892 m³", "DEBIT 22,17 L/s", "KECEPATAN 0,79 m/s", "TEKANAN 4,00 bar", tanpa Diameter. Sheet: "DIAMETER 188 mm" (bilangan bulat, wajar di detail) — `qa-r6-m390-01-load.png`, `qa-r6-m390-07-chosen.png` |
| 2 | Legenda tertutup bila lebar < 900 atau tinggi < 600 | **LULUS** | Tombol "LEGENDA" 118×32 di 8 viewport (390/360/820/landscape × 2 proyek); tidak ada kartu di bawah legenda (`cardsVsUi=[]`) |
| 3 | Kartu gabungan = satu blok per node | **LULUS** | Landscape Merangin: "● MAN Debit & Tekanan / TEKANAN 4,00 bar / DEBIT 23,64 L/s · ● MAN Tekanan / TEKANAN 2,60 bar / +2 lainnya". Tekanan kedua node tampil — `qa-r6-mland-01-load.png` |
| 4 | Chip ringkas saat meluap (820) | **LULUS** | Tebo/Merangin 820: "Semua 12" 74 + tiga chip 44×28 (+`::before` = 44 tinggi), semuanya utuh |
| 5 | Jam "HH.mm" | **LULUS** | Strip "DIPERBARUI 11.00", rail landscape "11.00" (sama dengan Ringkasan "10.46") |
| 6 | Rail & chip 44 px | **LULUS** | Rail tidak lagi masuk daftar target < 44; chip ringkas 44 lebar |

## Temuan baru
- **[P2] · landscape Tebo 844×390 · kartu grup kanan ("p2 Mangun jaya ujung … +4 lainnya") melewati tepi bawah peta.** Baris "+4 lainnya" terpotong oleh bingkai panel. Kartu "Logger P6" menutupi satu marker merah muda (`qa-r6-tland-01-load.png`, `cardsClipped=1`).
  - Perbaikan: clamp vertikal ke `labelInsets` bawah juga berlaku untuk kartu grup di landscape. Atau batasi baris grup ke `floor((tinggi peta − inset)/tinggi baris)` sehingga "+N lainnya" naik.
- [P3] Landscape Merangin: kedua marker tertutup kartu tunggal (zoom 17). Lainnya tetap seperti catatan 06: Tebo 390/360 memulai dengan 2 kartu (keputusan produk) dan label chip 10 px (sesuai spesifikasi badge).

## Cek ulang penuh (LULUS)
- **Tumpukan & area aman:** 0 tumpukan saat awal dan zoom −2 di 8 viewport. Bawah peta selalu 5 px di atas nav. Atribusi tidak di bawah nav. 12/12 (Tebo) dan 6/6 (Merangin) marker terlihat.
- **Merangin 390/360/820:** 2 kartu berimpit tanpa tumpukan.
- **Toggle Sensor/Node:** default Sensor, juga setelah kembali dari node. Mode Node tanpa kartu. Marker offline teratas ("111 hari lalu" `#ff6060`).
- **Chip/filter:** Tebo 12/11/0/1 dan Merangin 2/2. Kartu & marker ikut tersaring.
- **Sheet:**
  - Judul alamat, kode, pill "AKTIF", "kirim … lalu".
  - Rute, Salin ("Disalin"), Bagikan, Tren, Buka node (`/nodes/<nid>/nilai`) berfungsi.
  - Chooser node berimpit muncul, dan tap area kosong menutup sheet.
  - Di landscape sheet tidak menutupi rail.
- **Rail:** +1/−2/Seluruh area, Lokasi saya z15, layar penuh native.
- **Error:** strip "GAGAL MEMUAT · COBA LAGI" + rail "Ulang" → pulih ke "DIPERBARUI 11.02", 12 node.
- **Console:** hanya 500 `/api/activity/track` (bukan dari peta).

## Regresi TV / WebGIS: **LULUS (identik dengan putaran 4/5)**
| Layar | Posisi kartu | Ukuran | Font | Tumpukan | 10 s |
|---|---|---|---|---|---|
| TV `/iot/widget-builder` 1920 fs | sama | sama | sama | 0 | 0 perubahan |
| TV `/monitor` 1920 fs | sama | sama | sama | 0 | 0 perubahan |
| WebGIS desktop 1920 | sama (12 kartu) | sama | 9/8/10 px | 0 kartu terlihat bertumpuk (zoom-out ×2, Fit All) | 0 perubahan |

`qa-r6-tv-wb-1920-fs.png`, `qa-r6-tv-mon-1920-fs.png`, `qa-r6-webgis-1920*.png`.

---

## Round 7 — pemeriksaan terarah (perbaikan P2 landscape) · 14 Nov 2026 11.07

Diuji di `ng serve` :4200 (`sensor-labels.ts` diubah 11:06:37, sudah ter-build). Token via `mint.js`, dihapus sesudah run. Screenshot berprefix `qa-r7-`; data di scratchpad `qaM8-*.json`, `qaT8-*.json`.

**Kesimpulan: GO** (ada 1 catatan P3).

| Kriteria | Hasil | Bukti |
|---|---|---|
| Tebo 844×390: tidak ada kartu grup yang meluap dari peta, "+N lainnya" terlihat | **LULUS** | 3 kartu, `cardsClipped=0`, 0 tumpukan (awal & zoom −2). Kartu "p2 Mangun jaya ujung / SMP 24 / +7 lainnya" utuh di dalam peta. Bawah peta 324 < nav 329. 12/12 marker terlihat — `qa-r7-tland-01-load.png` |
| Tebo 390 portrait | **LULUS** | 2 kartu, 0 tumpukan, 0 terpotong, tidak di bawah UI, 12/12 terlihat — `qa-r7-t390-01-load.png` |
| Merangin landscape | **LULUS** | 1 kartu, satu blok per node ("MAN Debit & Tekanan … / MAN Tekanan 2,61 bar / +2 lainnya"), 0 terpotong — `qa-r7-mland-01-load.png` |
| TV Tebo `/monitor` 1920 fs | **LULUS, tidak berubah** | posisi, ukuran, dan font kartu identik dengan putaran 6; 0 tumpukan, 0 tertutup, 0 unit terpotong, tanpa scroll, 0 perubahan dalam 10 s — `qa-r7-tv-mon-1920-fs.png` |

Catatan [P3]: di landscape Tebo, tombol "LEGENDA" (terlipat) menindih ±9 px sudut kiri-bawah kartu "Logger P3_Ruko Idai / Kelompok Tani". Hanya bingkai yang tertindih, angka tetap terbaca. Kartu "Perkantoran" menutupi marker-nya sendiri. Perbaikan opsional: masukkan tinggi tombol legenda ke `labelInsets` kiri-bawah.
