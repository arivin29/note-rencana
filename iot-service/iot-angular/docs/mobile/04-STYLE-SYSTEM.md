# 04 — Mobile Style System & Isolation

Tujuan: tampilan mobile punya **identitas visual sendiri**, terisolasi dari tema desktop (HUD Angular / SeanTheme), dan **hemat ruang** untuk layar kecil. Baca [02-DESIGN.md](./02-DESIGN.md) dulu.

---

## 1. Kenyataan teknis (penting)

- Global style = **HUD Angular** di `src/scss/styles.scss`: Bootstrap penuh + `_variables.scss` (76KB) + `_reboot.scss` (reset elemen **global**) + `_root.scss` (CSS vars di `:root`). Di-load global via `angular.json`.
- Komponen Angular pakai **ViewEncapsulation.Emulated** (default) → CSS *komponen* ter-scope, tapi CSS **global tetap menembus**.
- Kesimpulan: isolasi dicapai dengan **teknik**, bukan otomatis.

## 2. Strategi isolasi (dipilih: Namespaced Scope)

Semua UI mobile hidup di bawah root class **`.m-app`** (dipasang di `MobileLayoutComponent`). Di dalamnya:

1. **Token sendiri** — definisikan CSS custom properties baru pada `.m-app` (warna, spacing, radius, tipografi, elevasi). **Tidak** mewarisi `--bs-theme` / token desktop.
2. **Reset scoped** — `_mobile-reset.scss` menetralkan warisan desktop yang mengganggu (margin heading, line-height, link color, dll) **hanya** di dalam `.m-app`.
3. **Primitive sendiri** — bangun `m-card`, `m-list`, `m-pill`, `m-appbar`, `m-bottomnav`, dll. **Dilarang** memakai class komponen Color Admin (`.card`, `.app-sidebar`, dsb) di mobile.
4. **Minim Bootstrap** — boleh pakai sedikit utility netral (`d-flex`, `gap-*`) bila perlu, tapi tata letak utama pakai primitive/CSS sendiri. Hindari grid & komponen Bootstrap berat.

> Bila kelak butuh isolasi hermetik, opsi `ViewEncapsulation.ShadowDom` di shell mobile bisa diaktifkan — tapi berbiaya (re-import font/icon per shadow root, ng-bootstrap/dropdown global bisa pecah). Tidak dipakai fase ini.

## 3. Struktur file style mobile

```
src/scss/mobile/
  _tokens.scss      # CSS vars (warna, spacing, radius, type, z-index, nav heights)
  _reset.scss       # reset scoped di .m-app
  _primitives.scss  # m-card, m-list, m-pill, m-stat, m-appbar, m-bottomnav, m-sheet ...
  _utilities.scss   # utility ringkas khusus mobile (mu-*) bila perlu
  mobile.scss       # entry: @use semua di atas, dibungkus .m-app { ... }
```

Dua opsi loading (pilih saat implementasi):
- **(A)** Tambah `src/scss/mobile/mobile.scss` ke `angular.json > styles` (global, tapi semua selektor sudah di-scope `.m-app`). Sederhana.
- **(B)** Import via `styleUrls` di `MobileLayoutComponent`. Lebih "lazy", tapi karena Emulated tetap menempel ke komponen — selektor turunan bisa perlu `::ng-deep`. (A) lebih bersih untuk design-system global ber-namespace.

Rekomendasi: **(A)** — file SCSS mobile terpisah total, tidak meng-`@import` `_variables.scss` desktop.

## 4. Design tokens (draft awal — silakan disesuaikan)

```scss
.m-app {
  /* Warna — fresh, bukan turunan desktop. Brand primary dipertahankan utk recognition. */
  --m-primary:      #0271ff;   /* brand (boleh diganti bila ingin 100% baru) */
  --m-primary-ink:  #ffffff;
  --m-bg:           #f5f7fb;   /* canvas */
  --m-surface:      #ffffff;   /* kartu */
  --m-surface-2:    #eef1f6;   /* inset */
  --m-text:         #0f172a;
  --m-text-muted:   #64748b;
  --m-border:       #e2e8f0;
  --m-success:      #16a34a;
  --m-warning:      #f59e0b;
  --m-danger:       #ef4444;
  --m-info:         #0ea5e9;

  /* Spacing — basis 4px, rapat utk layar kecil */
  --m-space-1: 4px;  --m-space-2: 8px;  --m-space-3: 12px;
  --m-space-4: 16px; --m-space-5: 20px; --m-space-6: 24px;

  /* Radius & elevasi */
  --m-radius:    14px;  --m-radius-sm: 10px;  --m-radius-pill: 999px;
  --m-shadow:    0 1px 2px rgba(15,23,42,.06), 0 2px 8px rgba(15,23,42,.06);

  /* Tipografi — skala ringkas */
  --m-fs-xs: 11px; --m-fs-sm: 13px; --m-fs-md: 15px; --m-fs-lg: 18px; --m-fs-xl: 22px;
  --m-fw-med: 600; --m-fw-bold: 700;

  /* Layout chrome */
  --m-appbar-h:    52px;
  --m-bottomnav-h: 60px;
  --m-tap-min:     44px;   /* target sentuh minimum */
  --m-z-appbar: 1000; --m-z-bottomnav: 1000; --m-z-sheet: 1100;
}
.m-app[data-theme="dark"] {
  --m-bg:#0b1220; --m-surface:#111a2e; --m-surface-2:#0e1626;
  --m-text:#e5edf9; --m-text-muted:#94a3b8; --m-border:#1e2a44;
}
```

> **Keputusan terbuka:** pertahankan brand `#0271ff` sebagai `--m-primary` (recognition), atau ganti total demi tampilan benar-benar baru? Default draft: dipertahankan.

## 5. Prinsip hemat ruang (mobile-first density)

- **Full-bleed canvas**, kartu rapat: padding `--m-space-3/4`, jarak antar kartu `--m-space-2`.
- **AppBar tipis** (52px) sticky atas; **BottomNav** (60px) sticky bawah; konten scroll di antaranya (`100dvh - appbar - bottomnav`).
- **List = card stack**, bukan tabel. Satu baris = info esensial saja (nama, status, 1–2 metrik). Detail di tap.
- **Progressive disclosure:** sembunyikan detail sekunder di balik tap / bottom-sheet, bukan tampil semua.
- **Angka dominan, label kecil** (`--m-fs-xl` untuk nilai, `--m-fs-xs` muted untuk label).
- **Status = pill warna** (bukan teks panjang). Ikon FontAwesome 6 ukuran kecil.
- **Sticky section header** saat scroll list panjang.
- **Hindari** horizontal scroll, modal besar, grid multi-kolom rumit.

## 6. Primitive (kontrak komponen visual)

| Primitive | Class | Fungsi |
|-----------|-------|--------|
| App bar | `.m-appbar` | header tipis: back/title/aksi + tombol switch |
| Bottom nav | `.m-bottomnav` / `.m-bottomnav__item` | 4 tab maks, indikator aktif `--m-primary` |
| Card | `.m-card` | kontainer surface + radius + shadow |
| List item | `.m-list__item` | baris tap-able, min-height `--m-tap-min` |
| Status pill | `.m-pill` (`--success/--warning/--danger`) | indikator status |
| Stat | `.m-stat` (`__value` `__label`) | kartu angka ringkas |
| Sheet | `.m-sheet` | bottom-sheet utk aksi/detail sekunder |
| Empty/Skeleton | `.m-empty` / `.m-skel` | state kosong & loading |

Semua hanya **presentational** (lihat aturan reuse di 02 §6); tanpa logika domain.

## 7. Wireframe awal (mockup low-fi)

> Ini mockup tekstual untuk menyepakati layout & densitas sebelum bikin mockup hi-fi / coding. Lebar acuan ~390px.

### Shell (semua layar)
```
┌───────────────────────────────┐  ← .m-appbar (52px), sticky
│ ‹  Judul Halaman        🖥  ⋮ │     (back) (title)  (switch)(menu)
├───────────────────────────────┤
│                               │
│        KONTEN (scroll)        │  ← 100dvh - appbar - bottomnav
│                               │
├───────────────────────────────┤  ← .m-bottomnav (60px), sticky
│  📊        📡        🔔     👤 │
│ Dashboard Perangkat Alert  Profil│
└───────────────────────────────┘
```

### Dashboard (`/mobile/dashboard`)
```
┌───────────────────────────────┐
│ ┌─────────┐ ┌─────────┐       │  ← .m-stat (grid 2 kol rapat)
│ │  128    │ │   12    │       │
│ │ Online  │ │ Offline │       │
│ └─────────┘ └─────────┘       │
│ ┌─────────┐ ┌─────────┐       │
│ │   5     │ │   43    │       │
│ │ Alert ● │ │ Project │       │
│ └─────────┘ └─────────┘       │
│ Perlu Perhatian               │  ← section header sticky
│ ┌───────────────────────────┐ │
│ │ NODE-014  ● Offline   2j   │ │  ← .m-list__item
│ │ NODE-022  ⚠ Suhu tinggi    │ │
│ │ NODE-007  ● Offline  15m   │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

### Nodes list (`/mobile/nodes`)
```
┌───────────────────────────────┐
│ 🔍 Cari perangkat…            │  ← search sticky bawah appbar
│ ┌───────────────────────────┐ │
│ │ NODE-014        ● Online   │ │  ← .m-card / list item
│ │ Pump House · last 12s      │ │
│ ├───────────────────────────┤ │
│ │ NODE-015        ● Offline  │ │
│ │ Tank A · last 3j           │ │
│ ├───────────────────────────┤ │
│ │ NODE-016        ● Online   │ │
│ │ Inlet · last 8s            │ │
│ └───────────────────────────┘ │
│        ⟳ Muat lebih           │
└───────────────────────────────┘
```

### Node detail (`/mobile/nodes/:id`)
```
┌───────────────────────────────┐
│ ‹ NODE-014                 🖥 │
│ ● Online · last seen 12s      │  ← status header
│ FW 3.0.0 · SIM7600 · DevKit   │
│ ── Channels ───────────────── │
│ ┌───────────────────────────┐ │
│ │ Suhu            72.4 °C    │ │  ← value besar, unit kecil
│ │ Tekanan          3.1 bar   │ │
│ │ Flow            128 L/min  │ │
│ └───────────────────────────┘ │
│ ── Telemetry (1j) ─────────── │
│ ╭─────── sparkline ────────╮  │  ← opsional, lib ringan
│ ╰──────────────────────────╯  │
│ [ Acknowledge ] [ Detail ▾ ]  │
└───────────────────────────────┘
```

### Alerts (`/mobile/alerts`)
```
┌───────────────────────────────┐
│ [ Aktif ]  Semua              │  ← filter pill
│ ┌───────────────────────────┐ │
│ │ ⚠ Suhu tinggi   NODE-022   │ │
│ │ 78°C > 75°C · 5m  [Ack]    │ │
│ ├───────────────────────────┤ │
│ │ ● Offline       NODE-014   │ │
│ │ tidak lapor · 2j  [Ack]    │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

## 8. Definition of Done (style)
- [ ] Semua selektor mobile di bawah `.m-app` (tidak ada style mobile yang bocor global).
- [ ] Tidak memakai class komponen Color Admin di template mobile.
- [ ] Hanya pakai token `--m-*` (tidak hard-code warna/spacing acak).
- [ ] Dark mode via `.m-app[data-theme="dark"]`.
- [ ] Target sentuh ≥ `--m-tap-min` (44px).
- [ ] Tidak ada horizontal scroll; konten muat di 360–430px.
- [ ] Desktop tidak teregresi (cek tidak ada selektor global tak ber-namespace).

## 9. Keputusan terbuka (perlu jawaban)
1. **Brand color:** pertahankan `#0271ff` atau ganti palet 100% baru? (default: dipertahankan)
2. **Aesthetic arah:** clean/airy (banyak putih) vs dense/data-first (rapat, kontras tinggi)? Mempengaruhi spacing & ukuran.
3. **Dark mode:** ikut preferensi OS, ikut toggle desktop, atau toggle sendiri di mobile?
4. **Mockup hi-fi:** mau saya buatkan **prototipe HTML/CSS statis** (bisa dibuka & dirasakan di HP) sebelum coding Angular?
</content>
