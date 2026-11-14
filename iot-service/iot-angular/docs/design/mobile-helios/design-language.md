# Helios Mobile — Design Language

> Status: **usulan desain** (14 Nov 2026). Belum ada perubahan kode produksi.
> Prototipe statis: [`prototype.html`](./prototype.html) — buka langsung di browser.
> Menggantikan arah di [`docs/mobile/04-STYLE-SYSTEM.md`](../../mobile/04-STYLE-SYSTEM.md) §2 butir 1 ("token sendiri, **tidak** mewarisi `--bs-theme`") — keputusan itulah akar masalah "kelihatan dibuat AI".

**Prinsip satu kalimat:** mobile bukan aplikasi baru, tapi *konsol HUD Helios yang dilipat ke saku* — panel transparan berbingkai siku, garis tipis, teal tunggal, huruf teknis berjarak, angka besar tabular. Kalau ditaruh di samping layar web, orang harus langsung tahu itu produk yang sama.

---

## 1. DNA Helios web (diekstrak dari kode)

| # | Ciri | Bukti di kode |
|---|------|---------------|
| 1 | **Gelap secara default**, mode diatur lewat `data-bs-theme` | `src/index.html:2` (`data-bs-theme="dark"`), `src/app/service/app-settings.service.ts:7` (`appMode = 'dark'`) |
| 2 | **Satu aksen: teal** `#3cd2a5` (`$teal-dark`), dipakai sebagai `--bs-theme`. Di dark mode `success` = warna yang sama | `src/scss/_variables-dark.scss` (`$teal-dark`, `$theme-dark: $teal-dark`, `$success-dark: $teal-dark`); `_variables.scss` `$theme: $teal`; `index.html` `theme-color #00acac`; theme panel "Default = theme-teal" `components/theme-panel/theme-panel.component.ts:39` |
| 3 | **Panel transparan berbingkai HUD**: kartu tanpa latar (`$card-bg: transparent`), tepinya garis 1px `rgba(fg,.3)` yang **putus 15px di tiap sudut**, lalu sudut diisi **braket L 10×10 px tebal 2px** `rgba(fg,.75)` | `src/scss/_variables.scss` (`$card-bg: transparent`, §38); `src/scss/ui/_card.scss:79-174`; markup braket `src/app/components/card/card.component.html` (`.card-arrow-top-left` dst.) |
| 4 | **Strip kepala panel**: `card-header` diberi `bg-inverse bg-opacity-10` (putih 10%) + ikon teal + badge status | `pages/iot/projects/project-workspace/pages/overview-page/overview-page.component.html:21-33, 89-102` |
| 5 | **Tipografi teknis**: `'Chakra Petch'`, body weight **300** di dark, **letter-spacing +0.75px**, bold maks 600 | `_variables.scss:335-344` (font & weight), `_variables-dark.scss` (`$body-font-weight-dark: 300`, `$body-letter-spacing-dark: rem(.75px)`), `_root.scss` + `_reboot.scss:36-38` |
| 6 | **Label kapital kecil**: 10–11px, uppercase, `letter-spacing .04em`, putih 50–70% | `pages/iot/dashboard/iot-dashboard.scss:38-40, 118-123, 144-150`; `overview-page.component.html` (`text-uppercase text-muted small` untuk Owner/Deployment/Devices) |
| 7 | **Latar berlapis**: `#1d2835` + gradien `rgba(50,70,80,.9) → #0d101b` di atas cover "globe & sirkuit" biru, plus pola titik putih sangat tipis (tile 75px) | `_variables-dark.scss` (`$body-bg-dark`, `$body-bg-gradient-dark`, `$body-bg-cover-dark: cover-dark.jpg`, `$body-bg-image-dark: pattern-dark.png`); `_reboot.scss:1-57` |
| 8 | **Chrome tipis & tembus pandang**: header 52px `rgba(29,40,53,.95)`, burger 3 garis 1px, brand "D" teal + "Devetek Helios" letter-spacing 2px; menu sidebar abu → putih saat aktif dengan ikon teal | `_variables.scss:486` (`$app-header-height`), `_variables-dark.scss` (`$app-header-bg-dark`), `scss/app/_app-header.scss` (`.bar` 1px, `.brand-logo letter-spacing 2px`), `components/header/header.component.html:21-28`, `scss/app/_app-sidebar.scss:86-94`, `_variables.scss:506` |
| 9 | **Status = badge subtle**, bukan pil berpendar: `bg-success-subtle text-success`, dsb. Radius 4px | `shared/utils/telemetry-freshness.ts:52-57`; `_variables.scss` `$badge-border-radius: $border-radius` (4px), `$border-radius: 4px` |
| 10 | **Ikon Bootstrap Icons garis** untuk navigasi & chrome (FontAwesome hanya isi halaman lama) | `service/app-menus.service.ts:11-26` (`bi bi-speedometer2`, `bi-diagram-3`, `bi-hdd-stack`, `bi-broadcast-pin`, `bi-bell`…), `header.component.html` (`bi-search`, `bi-grid-3x3-gap`); `src/styles.css:2-3` memuat keduanya |

**Temuan sampingan (penting):** `src/scss/font.scss` (import Google Fonts *Chakra Petch*) **tidak di-import di mana pun** — `angular.json` styles hanya memuat `styles.css`, `scss/styles.scss`, `scss/mobile/mobile.scss`. Akibatnya web pun kemungkinan besar merender *fallback* `sans-serif`, kecuali font terpasang di mesin pengguna. Perbaikan 1 baris (import `font.scss` di `scss/styles.scss`) akan menguatkan identitas **web dan mobile sekaligus**. Prototipe memuat Chakra Petch dari Google Fonts agar tampil seperti yang dimaksud desain.

---

## 2. Diagnosis: kenapa mobile terlihat "dibuat AI"

Mobile sengaja dibuat terisolasi dari tema web (`scss/mobile/mobile.scss:1-9`: *"Tidak meng-import variabel tema desktop. Token & primitive sendiri"*). Hasilnya adalah kumpulan pola default "dashboard SaaS generik":

| Tanda generik | Lokasi |
|---|---|
| **Gradien aqua→biru tua** sebagai warna merek (cyan `#22d3ee` → `#0369a1`) — bukan teal Helios | `scss/mobile/mobile.scss:13-19` |
| **Kotak ikon bergradien + glow** di setiap KPI (tanda AI paling kentara) | `mobile.scss:199-207`; dipakai `projects/tabs/project-summary/project-summary.component.html:47,52,57,67` |
| **Kartu solid navy, radius 8, border + bayangan lembut** — web justru transparan, tanpa bayangan, dengan braket sudut | `mobile.scss:22-31, 40, 165, 188-194` |
| **Pil pastel berpendar** (`box-shadow 0 0 7px currentColor`, radius pill) untuk status | `mobile.scss:179-184, 288-289` |
| **Huruf "startup"**: weight 700–800 dan letter-spacing **negatif** (`-.01em/-.02em`) — kebalikan web (300/600, +0.75px). Chakra Petch tidak punya weight 800 → dipalsukan browser | `mobile.scss:74, 84, 171, 214, 277, 286, 296, 298`; `shared/mobile-ia.scss:65, 113` |
| **Angka tidak tabular** di root: `font-feature-settings:"tnum" 0` | `mobile.scss:52` |
| **Brand palsu**: tetes air dalam kotak gradien + "Helio**s**" dengan huruf `s` bergradien — tidak sama dengan brand web "D / Devetek Helios" | `mobile.scss:77-88`; `layout/mobile-header/mobile-header.component.html:6,10` |
| **Tab & chip aktif = blok gradien berpendar**, radius campur aduk (8 / 10 / 14 / 99px) | `mobile.scss:230, 372-378`; `mobile.scss:39` vs `373-374` vs `140` |
| **Bottom-nav "pil + lampu neon"** di atas ikon aktif | `mobile.scss:127-138` |
| **Empty state tengah** dengan ikon besar pudar | `mobile.scss:244-245`; contoh `nodes/mobile-nodes-list/mobile-nodes-list.component.html:34-36` |
| **Label seksi dengan bar gradien** di kiri | `mobile.scss:163-164` |
| **Health bar & status bar bulat penuh bergradien** | `mobile.scss:144-148`; `shared/mobile-ia.scss:46-51` |
| **Ikon FontAwesome solid** di semua chrome (web memakai Bootstrap Icons garis) | `projects/project-shell/mobile-project-shell.component.ts:31-36`, `layout/mobile-bottom-nav/mobile-bottom-nav.component.html` |
| Sparkline 72×20 tanpa konteks (tanpa baseline, tanpa rentang) | `shared/mobile-ia.scss:83-84`, `shared/channel-list/mobile-channel-list.component.html:17-19` |

Yang **sudah benar** dan dipertahankan: IA (Ringkasan · Perangkat · Channel · Peta · Peringatan), alamat di atas kode perangkat (`mobile-nodes-list.component.html:42-45`), glosarium status Indonesia satu sumber (`shared/labels.ts`, `shared/utils/channel-verdict.ts:41-46`), target sentuh 44px (`--m-tap`), tombol telepon PIC.

---

## 3. Token (`--m-*` dipetakan ke web)

Semua token mobile **diturunkan dari tema web**, bukan nilai bebas. Saat implementasi, `.m-app` cukup mengambil `var(--bs-theme)`, `var(--bs-body-color)` dst. — sehingga bila klien memilih tema lain (mis. `theme-info`) mobile ikut.

| Token mobile | Nilai dark (default) | Sumber web |
|---|---|---|
| `--m-theme` | `#3cd2a5` | `--bs-theme` (`$teal-dark`) |
| `--m-theme-rgb` | `60,210,165` | `--bs-theme-rgb` |
| `--m-bg` | `#1d2835` | `$body-bg-dark` |
| `--m-bg-grad` | `linear-gradient(180deg, rgba(50,70,80,.9), #0d101b)` | `$body-bg-gradient-dark` |
| `--m-bg-dots` | titik putih α≈.05, grid 15px | `pattern-dark.png` @ 75px |
| `--m-chrome` | `rgba(29,40,53,.95)` | `$app-header-bg-dark` / `$app-top-nav-bg-dark` |
| `--m-fg-rgb` | `255,255,255` | `--bs-body-color-rgb` (dipakai `.card` untuk garis) |
| `--m-text` | `rgba(255,255,255,.75)` | `$body-color-dark` |
| `--m-text-strong` | `#ffffff` | `$headings-color-dark` / `$emphasis-color-dark` |
| `--m-text-muted` | `rgba(255,255,255,.56)` | `$body-secondary-color-dark` (.75×.75) |
| `--m-text-dim` | `rgba(255,255,255,.40)` — **hanya** dekorasi/teks ≥ 14px | `$body-tertiary-color-dark` |
| `--m-line` | `rgba(255,255,255,.30)` | garis `.card:before/:after` (`ui/_card.scss:89-98`) |
| `--m-bracket` | `rgba(255,255,255,.75)` | `.card-arrow-*` (`ui/_card.scss:125,132`) |
| `--m-border` | `rgba(255,255,255,.25)` | `$border-color-dark` |
| `--m-hair` | `rgba(255,255,255,.10)` | pemisah baris dalam panel |
| `--m-strip` | `rgba(255,255,255,.10)` | `card-header.bg-inverse.bg-opacity-10` |
| `--m-ok` | `#3cd2a5` | `$success-dark` (= teal) |
| `--m-warn` | `#ff9f0c` | `$warning-dark` |
| `--m-danger` | `#ff6060` | `$danger-dark` |
| `--m-info` | `#30beff` | `$info-dark` |
| `--m-off` | `#8b9ca5` | `$gray-400` (`text-secondary`) |
| `--m-radius` | `4px` | `$border-radius` |
| `--m-radius-sm` | `2px` | `$border-radius-sm` |
| `--m-appbar-h` | `52px` | `$app-header-height` |
| `--m-tap` | `44px` | (tetap) |
| `--m-font` | `'Chakra Petch', system-ui, sans-serif` | `$font-family-base` |
| `--m-track` | `.75px` | `$body-letter-spacing-dark` |

**Varian terang** (`[data-bs-theme=light]`, opsional, bukan default): `--m-theme #249d79`, `--m-bg #fff` + gradien `rgba(255,255,255,.9→.99)`, `--m-fg-rgb 0,0,0`, `--m-text rgba(0,0,0,.75)`, `--m-line rgba(0,0,0,.3)`, `--m-bracket rgba(0,0,0,.75)`, `--m-chrome #fff`, status pakai nilai `$teal/$orange/$red/$cyan` terang; body weight 400. Konstruksi panel identik — hanya warna `fg` yang dibalik.

Yang **dihapus** dari token lama: `--m-grad`, `--m-grad-soft`, `--m-glow`, `--m-shadow`, `--m-aqua`, `--m-primary-deep`, `--m-surface-*` (diganti layer transparan), `--m-pill`.

---

## 4. Tipografi (ponsel)

Satu keluarga: **Chakra Petch** (300/400/500/600). Tidak ada 700/800. Letter-spacing **selalu positif**.

| Peran | Ukuran / weight / spacing | Contoh |
|---|---|---|
| Display angka (nilai channel, KPI) | 28–34px / 500 / `.02em`, `tabular-nums`, `lining-nums` | `26,32` |
| Satuan | 12px / 400 / `.06em`, `--m-text-muted`, baseline sejajar angka | `L/s` |
| Judul layar (app bar) | 15px / 600 / `.08em` UPPERCASE | `IPA BELANAG MAN` |
| Judul baris (alamat) | 15px / 500 / `.02em` | `MAN Debit & Tekanan` |
| Label panel (strip) | 11px / 600 / `.14em` UPPERCASE | `STATUS PERANGKAT` |
| Label kecil / caption | 11px / 500 / `.08em` UPPERCASE, `--m-text-muted` | `PERANGKAT`, `24 JAM` |
| Body | 13–14px / 300 (dark) – 400 (light) / `.75px` | kalimat penjelas |
| Kode perangkat | 12px / 400 / `.06em`, `--m-text-muted`, `font-variant-numeric: tabular-nums` | `HELIO-354002393536022` |

Angka memakai format **id-ID**: koma desimal, titik ribuan (`2.685`, `26,32`), selalu `tabular-nums` agar digit tidak "menari" saat refresh. Jumlah desimal mengikuti channel (debit 2, tekanan 2, volume 0). Waktu relatif: `1 mnt lalu`, `2 jam lalu`; absolut `14 Nov 2026 · 09.42` (titik jam ala id-ID).

---

## 5. Panel HUD mobile (`m-panel`)

Pengganti `m-card`. Konstruksi persis `ui/_card.scss`, dengan inset sudut disesuaikan ke ponsel (12px, bukan 15px):

```css
.m-panel{ position:relative; background:transparent; }        /* tanpa fill, tanpa shadow, tanpa radius */
.m-panel::before{ content:''; position:absolute; inset:0 12px;  /* garis atas/bawah, putus di sudut */
  border-top:1px solid var(--m-line); border-bottom:1px solid var(--m-line); pointer-events:none; }
.m-panel::after{ content:''; position:absolute; inset:12px 0;   /* garis kiri/kanan, putus di sudut */
  border-left:1px solid var(--m-line); border-right:1px solid var(--m-line); pointer-events:none; }
.m-panel > .m-br{ position:absolute; width:10px; height:10px; pointer-events:none; }
.m-panel > .m-br::before{ content:''; position:absolute; width:2px; height:8px; background:var(--m-bracket); }
.m-panel > .m-br::after { content:''; position:absolute; width:10px; height:2px; background:var(--m-bracket); }
/* + posisi tl/tr/bl/br seperti .card-arrow-* (before: top/bottom 2px) */
```

Markup: `<section class="m-panel"> <header class="m-panel__strip">…</header> … <i class="m-br tl"></i><i class="m-br tr"></i><i class="m-br bl"></i><i class="m-br br"></i></section>` — di Angular jadi satu komponen `<m-panel>` yang menyisipkan 4 braket, sama seperti `<card>`.

- **Strip kepala** (`m-panel__strip`): tinggi 36px, `background: var(--m-strip)`, label 11px/600/`.14em` UPPERCASE, ikon garis teal 14px di kiri, aksi/indikator di kanan (mis. `3 / 4 AKTIF`). Tanpa garis bawah — kontras latar yang memisahkan.
- **Varian aksen** (`m-panel--theme`): `--m-line` & `--m-bracket` memakai `rgba(var(--m-theme-rgb),.3/.75)` — padanan `.card.border-theme` (`ui/_card.scss:15-17`). Dipakai untuk satu panel paling penting per layar (mis. status perangkat).
- **Varian bahaya** (`m-panel--danger`): sama, pakai `--m-danger`. Hanya untuk panel "Perlu perhatian" yang berisi item kritis.
- Isi panel tidak diberi latar. Bila perlu kontras ekstra (di atas peta), pakai `rgba(13,16,27,.72)` + `backdrop-filter: blur(6px)`.
- KPI **bukan** 4 kartu bertumpuk, melainkan **satu panel dibagi grid 2×2 dengan garis rambut** (`--m-hair`) — lebih HUD, lebih rapat.

---

## 6. Sistem status (semantik sama dengan web)

Sumber kebenaran: `shared/utils/telemetry-freshness.ts` + `channel-verdict.ts` + `mobile/shared/labels.ts`.

| Status | Label ID | Warna | Penanda |
|---|---|---|---|
| fresh | **Aktif** | `--m-ok` `#3cd2a5` | kotak 6×6 **terisi** |
| stale | **Terlambat** | `--m-warn` `#ff9f0c` | kotak 6×6 terisi |
| offline | **Offline** | `--m-danger` `#ff6060` | kotak 6×6 terisi |
| nodata | **Belum ada data** | `--m-off` | kotak 6×6 **garis saja** |
| out-of-range | **Di luar ambang** | `--m-danger` | nilai angka ikut merah + tag `▲ BATAS ATAS 3,00` / `▼ BATAS BAWAH` |
| no-threshold | **Ambang belum diatur** | `--m-text-muted` | teks kecil, garis putus-putus di sparkline tidak ada |

Bentuk badge = padanan `bg-*-subtle text-*` web: latar `rgba(status,.14)`, teks status, **radius 2px**, 10px/600/`.1em` UPPERCASE, padding `3px 6px`, **tanpa glow, tanpa dot bulat**. Penanda kotak kecil (bukan lingkaran) memberi rasa instrumen/LED panel. Status tidak boleh hanya warna: selalu ada teks label (aksesibilitas buta warna).

Bar status proyek: segmen **lurus, tinggi 6px, celah 2px antar segmen, radius 0**, dengan skala tik 4 titik di bawahnya (seperti gauge), legend dalam grid 2×2: kotak · label · angka tabular.

---

## 7. Tampilan angka

- Nilai utama kanan-atas baris, 28px/500, `tabular-nums`; satuan menempel di kanan bawah (`26,32` `L/s`).
- Nilai di luar ambang: angka `--m-danger`, satuan tetap muted.
- Data basi (stale/offline): angka tetap tampil tetapi **opacity .55** + teks `data 3 jam lalu` — jangan pernah menyembunyikan nilai terakhir.
- Tidak ada nilai: `—` (em dash) muted, bukan `0`.
- KPI ringkasan: 30px/500 dengan label UPPERCASE di atas angka (bukan di bawah) — pola `text-uppercase text-muted small` di atas `fs-3` dari `overview-page.component.html:131-133`.

---

## 8. Anatomi baris

**Perangkat (daftar):**
```
[▪ AKTIF]                                   kirim 2 mnt
MAN Debit & Tekanan                        (alamat = judul, 15/500)
F9YUN-7C6C2113CFD0                         (kode, 12px muted, tabular)
───────────────────────────────────────────
DATA TERAKHIR 1 mnt lalu   ·  5 CHANNEL     [☎]  [›]
```
- Baris setinggi ≥ 72px, pemisah `--m-hair`, area tap seluruh baris; tombol telepon 44×44 di kanan dengan garis pemisah vertikal (`m-callbtn` tetap).
- Status di **kiri atas** sebagai badge kotak — mata memindai kolom status lurus ke bawah.

**Channel (Nilai):**
```
DEBIT                         [▪ AKTIF]
26,32 L/s                    ╱╲_╱‾╲__╱   (sparkline 24 jam, 132×36)
MIN 18,40  ·  MAKS 31,05  ·  1 mnt lalu
Ambang belum diatur
```
- Nama metrik sebagai label UPPERCASE di atas (bukan judul tebal), angka besar di kiri, sparkline di kanan sejajar angka.
- Sparkline: garis 1.5px teal (atau warna status), area isi gradien teal α .18→0, baseline putus-putus `--m-hair`, titik akhir kotak 3×3. Bila ada ambang: pita merah tipis di posisi ambang.
- Baris statistik min/maks 24 jam di bawah — memberi konteks pada garis.

---

## 9. App bar, bottom nav, latar

**App bar** (52px, `--m-chrome`, garis bawah `--m-hair`):
- Kiri: tombol kembali = chevron garis 20px **tanpa kotak latar**, area tap 44px. Di root: brand **kotak 26px berisi huruf "D" teal** + wordmark `HELIOS` 13px/600/letter-spacing 2px — sama dengan `header.component.html:21-28`.
- Tengah: judul UPPERCASE `.08em` + sub-judul 11px muted (`5 PERANGKAT · DIPERBARUI 09.42`).
- Kanan: ikon garis (Bootstrap Icons) 20px tanpa latar.
- Di bawah app bar: **garis teal 1px selebar 32px** di kiri sebagai penanda layar aktif (pengganti glow).

**Bottom nav proyek** (Ringkasan · Perangkat · Channel · Peta · Peringatan):
- Latar `--m-chrome` + garis atas `--m-hair`, tinggi 60px + safe-area.
- Item: ikon garis 20px + label 10px/600/`.08em` UPPERCASE. Non-aktif `rgba(255,255,255,.5)`.
- Aktif: ikon & label **teal**, **garis teal 2px di tepi atas item** (lebar ikon) — meniru `menu-link.active` web (warna berubah, ikon teal), tanpa pil, tanpa glow.
- Badge peringatan: kotak radius 2px `--m-danger`, angka 10px tabular.

**Latar:** tiga lapis seperti `_reboot.scss` — `--m-bg` → gradien `--m-bg-grad` → pola titik 15px α .05. Opsional: siluet sirkuit cover-dark pada α .06 di 30% atas layar (prototipe menggambarnya dengan SVG). Tidak ada radial glow cyan.

---

## 10. Ikonografi

- **Bootstrap Icons** (sudah terpasang, `src/styles.css:3`) dalam bentuk **garis**, 18–20px, stroke setara 1.5px — sama dengan sidebar/header web. Pemetaan: Ringkasan `bi-speedometer2`, Perangkat `bi-hdd-stack`, Channel `bi-broadcast-pin`, Peta `bi-map`, Peringatan `bi-bell`, SCADA `bi-diagram-3`, telepon `bi-telephone`, kembali `bi-chevron-left`.
- FontAwesome **tidak dipakai** di chrome mobile; boleh tersisa di dalam konten lama sampai dimigrasi.
- Tidak ada ikon di dalam kotak berwarna. Ikon berdiri sendiri, teal bila aktif/informatif, muted bila sekunder.

---

## 11. Gerak

- Durasi 120–200ms, `ease-out`; tidak ada scale-bounce (`transform: scale(.97)` dihapus).
- Tap: latar baris berubah ke `rgba(var(--m-theme-rgb),.08)` + garis kiri teal 2px selama ditekan.
- Refresh data: angka yang berubah berkedip singkat (teks teal 400ms → kembali), bukan shimmer.
- Skeleton: blok `--m-hair` statis dengan braket panel sudah tampil (rangka HUD muncul dulu, isi menyusul).
- Hormati `prefers-reduced-motion`.

---

## 12. Aksesibilitas

- Kontras: `--m-text` (≈ #c4c6c9) di atas latar ≈ #121925 → **≈ 11:1**; `--m-text-muted` (α .56) → **≈ 6:1**; teal `#3cd2a5` → **≈ 9:1**; `--m-warn` ≈ 8:1; `--m-danger #ff6060` ≈ 5,5:1. `--m-text-dim` (α .40, ≈ 3,6:1) **hanya** untuk dekorasi atau teks ≥ 18px.
- Garis panel (α .30) bersifat dekoratif — informasi tidak boleh hanya tersampaikan lewat garis.
- Target sentuh ≥ 44×44 px (baris, tab, tombol telepon, ikon app bar).
- Status selalu teks + warna + bentuk (kotak terisi vs garis).
- Sparkline punya `aria-label` ringkas: "Debit 24 jam, min 18,40 maks 31,05 L/s".
- Ukuran teks minimum 11px untuk label UPPERCASE (dengan tracking lebar), 13px untuk kalimat.

---

## 13. Yang harus dihapus (daftar "tanda AI")

1. `--m-grad` / gradien aqua→biru di mana pun (brand mark, tombol, chip aktif, tab aktif, bar kesehatan, label seksi).
2. Kotak ikon bergradien + glow di KPI (`.m-stat__ic*`).
3. Kartu solid navy + `box-shadow` + radius 8 (`.m-card`, `.m-stat`) → ganti panel HUD transparan.
4. Pil status berpendar dengan titik bulat (`.m-pill .dot`, `.m-dot` glow) → badge kotak subtle radius 2px.
5. Weight 700/800 dan letter-spacing negatif → 500/600 dan tracking positif.
6. `font-feature-settings:"tnum" 0` → `tabular-nums` di semua angka.
7. Brand tetes air + "Helio**s**" bergradien → "D" teal + `HELIOS` / `Devetek Helios`.
8. Bottom-nav pil + lampu neon → garis teal di tepi atas.
9. Segmented tab radius 14px bergradien → tab garis bawah teal (gaya `nav-tabs` web).
10. Empty state tengah dengan ikon raksasa → baris rata kiri di dalam panel: label UPPERCASE + kalimat + aksi.
11. Radial glow cyan di latar `.m-app` → latar berlapis web.
12. Ikon FontAwesome solid di chrome → Bootstrap Icons garis.

---

## 14. Langkah implementasi (usulan, belum dikerjakan)

1. Import `font.scss` di `scss/styles.scss` (berdampak ke web juga — cek visual web).
2. Ganti blok token `.m-app` di `scss/mobile/mobile.scss:11-58` dengan token §3 yang membaca `var(--bs-*)`.
3. Buat komponen `<m-panel>` (NgModule, `standalone:false`) di `mobile/shared/`, migrasi `m-card` → `m-panel` per layar: Ringkasan → Perangkat → Nilai → Channel → Peringatan.
4. Ganti `m-pill`/`m-dot` dengan `m-badge` + `m-sq` (kotak status) — tetap dari `FRESHNESS_TONE`.
5. Ganti ikon chrome ke Bootstrap Icons (`mobile-project-shell.component.ts:31-36`, bottom-nav, header).
6. Sparkline baru (132×36 + area + baseline + min/maks).
7. QA: tampilkan berdampingan dengan web di tablet; cek kontras dengan alat ukur.

---
## Kendala implementasi (koordinasi sesi scada, 14 Nov 2026)
Peta mobile (`src/app/mobile/projects/tabs/project-map/**`, milik sesi scada) memakai token berikut — **semuanya WAJIB tetap terdefinisi** setelah restyle (nama sama, nilai baru boleh):
`--m-text`, `--m-text-muted`, `--m-text-dim`, `--m-border`, `--m-border-soft`, `--m-surface`, `--m-surface-2`, `--m-surface-3`, token spasi `--m-xs/sm/md/lg/2/3`, `--m-tap`, `--m-radius-sm`, `--m-round`, `--m-shadow`, `--m-warning`, `--m-danger`, `--m-success`, `--m-aqua`, `--m-grad`, `--m-glow`.
Pemetaan datar Helios: `--m-grad: var(--m-theme)` · `--m-glow: none` · `--m-aqua: var(--m-theme)` · `--m-shadow: none` (atau sangat tipis). Aturan peta di `mobile.scss` (`.m-ol-popup*`, penghapusan `.ol-zoom`, tinggi `.m-olmap`) tidak diubah. Setelah restyle di-commit, sesi scada mengonversi ±24 warna/radius hard-code di peta ke token dan menjadikan bottom sheet panel HUD.
