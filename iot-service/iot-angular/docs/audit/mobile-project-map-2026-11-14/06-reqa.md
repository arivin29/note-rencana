# Re-QA visual putaran 5 — Tab Peta mobile (restyle Helios HUD) + regresi TV/WebGIS · 14 Nov 2026

Auditor: scada-visual-auditor (mode QA, read-only). Diuji langsung di `ng serve` :4200 (di-restart 10:13; chunk mobile memuat "Peta jaringan" + `<m-panel>` → segar). Token via `mint.js`, dihapus sesudah run. Pembanding desain: `docs/design/mobile-helios/design-language.md` + halaman `/mobile/p/<pid>/ringkasan` (`qa-r5-ringkasan-t390.png`).
Screenshot putaran ini berprefix **`qa-r5-`** (screenshot putaran 4 `qa-re-*` tetap ada sebagai pembanding). Data: scratchpad `qaM6-*.json`, `qaT6-*.json`.

## Kesimpulan: **NO-GO**. Ada 3 kegagalan, semuanya kecil-sedang. Regresi TV/WebGIS: tidak ada perubahan.

## (a) Tampilan mobile vs spesifikasi Helios

| Kriteria | Hasil | Bukti |
|---|---|---|
| Nama metrik di kartu (bukan "Tuf-2…") | **LULUS portrait / GAGAL landscape Merangin** | Portrait: "TEKANAN 3,93 bar · DEBIT 24,41 L/s · KECEPATAN 0,88 m/s · VOLUME …" (`qa-r5-m390-01-load.png`). Landscape Merangin: kedua node digabung jadi satu kartu dengan baris "MAN Debit & Tekanan ·… 24,11 L/s", "MAN Debit & Teka… 2.878,00 m³". Nama metrik terpotong habis, dan tekanan "MAN Tekanan" tidak tampil (`qa-r5-mland-01-load.png`) |
| Tanpa presisi palsu | **GAGAL** | "VOLUME 2.875,00 m³" dan "DIAMETER 188,00 mm" di kartu maupun sheet. Spesifikasi §4: volume 0 desimal; diameter adalah konstanta |
| Satuan L/s, m³ | LULUS | "L/s", "m³", "m/s", "bar" |
| Chakra Petch | LULUS | kartu 300/12,65 px, tab 600/11 px, chip 600/10 px, strip 600/11 px (sama dengan Ringkasan: strip 600/11, body 300/14) |
| Tampilan tag HUD | LULUS | kartu tanpa radius, LED kotak, strip panel + braket siku, sheet berbraket |
| Merangin 390: dua kartu berimpit tanpa tumpukan | LULUS | 2 kartu (127×49, 145×135), 0 tumpukan, berjarak 16/18 px dari marker. Catatan: marker pasangan nyaris tertutup di antara kedua kartu |
| Toolbar: tab bergaris bawah + chip halus | LULUS | tab aktif: latar transparan, radius 0, `::after` 2 px `#3cd2a5`; chip aktif: latar `rgba(60,210,165,.1)`, border .5, radius 2 px, tanpa shadow |
| Strip legenda bisa dilipat | **GAGAL sebagian** | Portrait & Merangin 820: tertutup ("LEGENDA" 118×32), OK. **Landscape (dan Tebo 820): terbuka sejak awal** (h 90/68) dan **menutupi kartu**: Tebo 2 kartu + marker, Merangin kartu gabungan (`cardsVsUi=['.pm-legend']`) — `qa-r5-tland-01-load.png`, `qa-r5-mland-01-load.png` |
| Rail 44 px | LULUS (catatan) | 44×42 (tinggi 42); landscape: "↻ 10:55" 94×42 di rail |
| "Diperbarui" di strip panel | LULUS | "DIPERBARUI 10:50 ↻" (portrait), rail di landscape. Catatan: Ringkasan memakai "10.46" (titik, sesuai spesifikasi §4), Peta memakai "10:50" |
| Sheet sebagai panel HUD | LULUS | braket siku, pill "AKTIF", "kirim 1 mnt lalu", nilai 28 px tabular, 5 aksi 68×70 (`qa-r5-m390-07-chosen.png`) |
| Tidak ada yang tersembunyi di bawah nav | LULUS | bawah peta 4–5 px di atas nav di 8 run; atribusi 11 px di atas nav |
| Chip lengkap | **GAGAL di 820** | Tebo & Merangin 820: chip "Offline" terpotong di tepi kanan toolbar (lebar toolbar 358 px, label penuh). 390/360/landscape OK |
| Target sentuh ≥ 44 | LULUS (catatan) | Chip 28 px tinggi + `::before` ±8 → 44; tombol refresh strip 32×28 + inset → 44×44; tab 40 + 4. Lebar chip ringkas di 390: 35–39 px (< 44) |
| Teks ≥ 11 px | sesuai spesifikasi | label chip 10 px. Spesifikasi §6 badge 10 px; kriteria QA 11 px tidak dipenuhi pada chip |
| Tebo 390/360 kartu awal | 2 kartu (sama dengan putaran 4, menunggu keputusan produk) | 12/12 node terlihat |

## (b) Regresi TV / WebGIS desktop: **LULUS (identik)**
| Layar | Putaran 4 | Putaran 5 |
|---|---|---|
| TV `/iot/widget-builder` 1920 fs | 4 kartu, posisi `147:500,221:569,36:309,36:302`, ukuran 284×114/284×164/184×58/173×58, font 15,6/14,2/17,1/11,4 px | **sama persis**, 0 tumpukan, 0 perubahan 10 s — `qa-r5-tv-wb-1920-fs.png` |
| TV `/monitor` 1920 fs | 5 kartu `110:622,184:520,36:330,36:324,73:574` | **sama persis** — `qa-r5-tv-mon-1920-fs.png` |
| WebGIS desktop 1920 | 12 kartu, posisi & ukuran, font 9/8/10 | **sama persis**; zoom-out ×2 & "Fit to All Layers": 0 tumpukan terlihat (11 kartu) — `qa-r5-webgis-1920*.png` |
Restyle mobile tidak bocor ke TV/desktop (font, ukuran kartu, layout identik).

## (c) Fungsi (semua LULUS)
- Toggle Sensor/Node: default Sensor, juga setelah kembali dari node. Mode Node: 0 kartu, label "52 dtk lalu" berwarna `#3cd2a5`, marker offline di atas ("111 hari lalu" `#ff6060`).
- Chip & filter: Tebo 12/11/0/1, Merangin 2/2. Marker & kartu ikut tersaring; muncul pesan "Tidak ada node berstatus terlambat".
- Sheet: Rute (`google.com/maps/dir/...`), Salin (toast "Disalin"), Bagikan (`navigator.share`), Tren (`…/channels/<cid>`), Buka node (`…/nodes/<nid>/nilai`). Chooser Merangin "2 node di titik ini" → pilih. Tap kosong menutup. Landscape: sheet x 0–560 tidak menutupi rail.
- Rail: +1/−2/Seluruh area; Lokasi saya (−1,4853/102,1112 z15); layar penuh native.
- Refresh / error: blokir nilai → strip "GAGAL MEMUAT · COBA LAGI", rail "Ulang" → Coba lagi → "DIPERBARUI 10:51", 12 node (`qa-r5-err-*.png`).
- Console: hanya 500 `/api/activity/track` (bukan dari peta).

## Temuan
1. **[P1] · format nilai kartu & sheet (`labelFormat` / `sortSheetChannels` + `formatIdNumber(num, 2)` di `project-map.component.ts`) · presisi palsu.** Volume 2 desimal, diameter ditampilkan. Perbaikan: desimal per metrik (volume 0, debit/tekanan/kecepatan 2), dan sembunyikan konstanta (Diameter) dari kartu.
2. **[P1] · `project-map.component.ts` (`legendOpen` default) + `.pm-legend` · Legenda terbuka sejak awal di landscape/820 dan menutupi kartu & marker.** Perbaikan: default tertutup di semua ukuran (atau hanya terbuka bila tinggi peta ≥ 600 px), dan masukkan tinggi legenda ke `labelInsets` bawah saat terbuka.
3. **[P1] · kartu gabungan multi-node (sensor-labels, varian mobile) · baris memakai "<alamat node> · <metrik>" sehingga metrik terpotong; node kedua yang berimpit kehilangan tekanannya** (landscape Merangin). Perbaikan: di kartu grup, kelompokkan per node (judul alamat + baris metrik), atau pertahankan dua kartu terpisah seperti di portrait.
4. **[P2] · `.pm-chips` di 820 · chip "Offline" terpotong.** Perbaikan: pakai chip ringkas (LED + angka) di bawah lebar tertentu, atau biarkan toolbar melebar sampai ke rail.
5. **[P3]** Format jam strip "10:50" → "10.50" agar sama dengan Ringkasan dan spesifikasi §4. Lebar chip ringkas 35–39 px → `min-width: 44px`. Tinggi tombol rail 42 → 44.
