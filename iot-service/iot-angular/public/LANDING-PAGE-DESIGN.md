# DEVETEK HELIOS — Dokumen Desain Website Produk

> **Status:** Draft v3 — Aligned with devetek-iot.web.app  
> **Target:** `iot-angular/public/` (Static HTML, terpisah dari Angular app)  
> **Deploy:** Firebase Hosting (`devetek-helios`)  
> **Referensi Utama:** [devetek-iot.web.app](https://devetek-iot.web.app) (existing hardware landing page)  
> **Referensi Kompetitor:** ThingsBoard.io, Ubidots.com, Losant.com, Blynk.io, TagoIO.com  
> **Bahasa:** Full Bahasa Indonesia  
> **Brand:** DEVETEK HELIOS (standalone)  
> **Approach:** Evolusi dari devetek-iot — DNA sama, Helios lebih modern/premium  
> **Company:** PT. COMON CIPTA INOVASI (parent), Devetek (brand)  
> **Partner:** PT Bakti Air Indonesia

---

## KEPUTUSAN DESAIN

| Aspek | Keputusan | Alasan |
|-------|-----------|--------|
| **Style** | Evolusi dari devetek-iot — base DNA sama, Helios lebih premium | Satu brand family, tapi Helios terasa lebih canggih |
| **Bahasa** | Full Bahasa Indonesia | Target market sama: PDAM, industri Indonesia |
| **Struktur** | Full multi-page (22 halaman) | Konten Helios lebih banyak, SEO-friendly |
| **Brand** | DEVETEK HELIOS standalone | Navbar sendiri, independent dari devetek-iot |
| **Cross-link** | devetek-iot ↔ devetek-helios saling terhubung | Visitor bisa navigasi antar hardware & platform |

---

## DESIGN DNA — Inherited dari devetek-iot.web.app

### Yang SAMA (inherited):
| Element | Detail |
|---------|--------|
| **Dark theme** | Background gelap navy/hitam |
| **Badge/Pill labels** | Monospace uppercase: `LAPANGAN`, `NODE HARDWARE`, `DEVETEK-HELIOS CLOUD` |
| **Card style** | Border subtle, background sedikit lebih terang dari bg, hover glow |
| **Color accent** | Teal/hijau untuk primary, biru untuk secondary |
| **Gradient lines** | Garis gradient warna-warni sebagai divider (merah-kuning-hijau-biru) |
| **Icon style** | Outlined icons, putih/light |
| **Flow diagrams** | Vertikal flow dengan connecting dots/lines ($\bullet$ → $\bullet$) |
| **Badge tags** | Pill tags warna-warni di card footer (e.g. `PDAM` `Type B` `Pressure`) |
| **FAQ accordion** | Expandable questions |
| **WhatsApp CTA** | Green WA button as primary contact |
| **Footer style** | Dark, multi-column, logo + links |
| **Navbar** | Sticky top, clean, CTA button di kanan |

### Yang BERBEDA (evolusi untuk Helios):
| Element | devetek-iot | HELIOS (evolusi) |
|---------|------------|------------------|
| **Hero** | Teks + 4 stat badges | Teks + floating screenshot mockup + particle effect |
| **Cards** | Flat cards, border | Cards dengan glassmorphism effect (blur, transparency) |
| **Typography** | Sans-serif standar | Plus Jakarta Sans (heading), Inter (body) — lebih premium |
| **Animations** | Minimal (fade) | Scroll-triggered fade+slide, count-up, stagger |
| **Sections** | Dense, informasi padat | Lebih spacious, breathing room antar section |
| **Shadows** | Flat | Subtle glow shadows (teal glow, blue glow) |
| **Buttons** | Solid buttons | Solid + ghost buttons + gradient shimmer hover |
| **Gradient** | Line dividers | Gradient pada CTA background + card borders |
| **Gallery** | Inline images | Lightbox gallery dengan navigation |
| **Stats** | Static | Animated count-up on scroll |

---

## DAFTAR ISI

1. [Sitemap & Struktur Halaman](#1-sitemap--page-structure)
2. [Halaman — Beranda (Landing)](#2-home-landing)
3. [Halaman — Fitur](#3-fitur-ikhtisar)
4. [Halaman — Sub-Fitur (6)](#4-halaman-sub-fitur-6-halaman)
5. [Halaman — Solusi / Studi Kasus](#5-solusi--studi-kasus-ikhtisar)
6. [Halaman — Sub-Solusi (4)](#6-halaman-sub-solusi-4-halaman)
7. [Halaman — Galeri Screenshot](#7-galeri-screenshot)
8. [Halaman — Harga](#8-harga)
9. [Halaman — Dokumentasi (link)](#9-dokumentasi-link-saja)
10. [Halaman — Tentang Kami](#10-tentang-kami)
11. [Halaman — Kontak / Minta Demo](#11-kontak--minta-demo)
12. [Halaman — Blog (Opsional Fase 2)](#12-blog)
13. [**BARU** — Demo Langsung / Sandbox](#13-demo-langsung--sandbox--new)
14. [**BARU** — Integrasi & API](#14-integrasi--api--new)
15. [**BARU** — Keamanan & Kepatuhan](#15-keamanan--kepatuhan--new)
16. [**BARU** — Halaman Legal](#16-halaman-legal--new)
17. [**BARU** — Halaman 404](#17-halaman-404--new)
18. [Komponen Bersama](#18-komponen-bersama)
19. [Design Tokens & Style Guide](#19-design-tokens--style-guide)
20. [Strategi Responsif](#20-strategi-responsif)
21. [Animasi & Interaksi](#21-animasi--interaksi)
22. [SEO & Strategi Meta](#22-seo--strategi-meta)
23. [Struktur File](#23-struktur-file)
24. [Fase Implementasi](#24-fase-implementasi)
25. [Checklist Konten](#25-checklist-konten)
26. [**BARU** — Analisis Gap Review](#26-analisis-gap-review--new)
27. [**BARU** — Strategi Cross-Link](#strategi-cross-link)

---

## 1. SITEMAP & PAGE STRUCTURE

```
devetek-helios.web.app/
│
├── index.html                          ← HOME (Landing Page)
├── features.html                       ← FEATURES (Overview semua fitur)
│   ├── features/dashboard.html         ← Deep-dive: Dashboard & Widget Builder
│   ├── features/webgis.html            ← Deep-dive: WebGIS & Mapping
│   ├── features/alerts.html            ← Deep-dive: Smart Alerts & Monitoring
│   ├── features/reports.html           ← Deep-dive: Report & Export
│   ├── features/ml-analytics.html      ← Deep-dive: ML & AI Analytics
│   └── features/device-management.html ← Deep-dive: Device & Sensor Management
│
├── solutions.html                      ← SOLUTIONS (Overview industri)
│   ├── solutions/water-utility.html    ← Use Case: PDAM / Water Utility
│   ├── solutions/energy.html           ← Use Case: Energy & Power
│   ├── solutions/industrial.html       ← Use Case: Industrial IoT
│   └── solutions/smart-agriculture.html← Use Case: Smart Agriculture
│
├── screenshots.html                    ← GALLERY / SCREENSHOTS
├── pricing.html                        ← PRICING PLANS
├── about.html                          ← ABOUT US / Company
├── contact.html                        ← CONTACT / REQUEST DEMO
├── demo.html                           ← LIVE DEMO / SANDBOX ACCESS ★ NEW
├── integrations.html                   ← INTEGRATIONS & API ★ NEW
├── security.html                       ← SECURITY & COMPLIANCE ★ NEW
├── privacy.html                        ← PRIVACY POLICY ★ NEW
├── terms.html                          ← TERMS OF SERVICE ★ NEW
├── 404.html                            ← NOT FOUND PAGE ★ NEW
│
├── css/
│   ├── style.css                       ← Main stylesheet
│   └── animations.css                  ← Scroll & hover animations
├── js/
│   ├── main.js                         ← Navbar, scroll, lightbox
│   └── form.js                         ← Contact form handler
├── img/
│   ├── logo.svg                        ← Devetek Helios logo
│   ├── hero/                           ← Hero images per page
│   ├── features/                       ← Feature illustrations (SVG)
│   ├── solutions/                      ← Industry illustrations
│   ├── screenshots/                    ← App screenshots (dari mockup existing)
│   └── team/                           ← Team photos (opsional)
└── favicon.ico
```

**Total: 22 halaman** (1 Home + 1 Features + 6 Sub + 1 Solutions + 4 Sub + 1 Gallery + 1 Pricing + 1 About + 1 Contact + 1 Demo + 1 Integrations + 1 Security + 1 Privacy + 1 Terms + 1 404)

---

## 2. HOME (Landing Page)

**URL:** `/index.html`  
**Purpose:** First impression, overview platform, convert visitor → demo/contact  
**Target:** C-level, technical decision makers, operations managers

### Sections (top → bottom):

#### 2.1 NAVBAR (Sticky)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [D] DEVETEK HELIOS       Fitur ▾  Solusi ▾  Integrasi                 │
│                           Harga  Galeri  Tentang                       │
│                                       [Coba Demo]  [Minta Demo →]     │
└─────────────────────────────────────────────────────────────────────────┘
```
- Logo: `[D]` monogram + "DEVETEK HELIOS" (mirip gaya `[D] DEVETEK` di devetek-iot)
- Dropdown **Fitur**: 6 sub-items + "Semua Fitur" link
- Dropdown **Solusi**: 4 industri items + "Semua Solusi" link
- **2 CTA buttons**: "Coba Demo" (ghost/outline) + "Minta Demo" (solid primary)
- Mobile: hamburger → full-screen overlay menu
- Scroll: transparent → `rgba(10,14,23,0.95)` backdrop-blur

#### 2.2 HERO SECTION
```
┌─────────────────────────────────────────────────────────────────┐
│                         `PLATFORM IOT`                          │
│                                                                 │
│         Monitor. Analisa. Kendalikan.                           │
│                                                                 │
│         Platform monitoring IoT end-to-end untuk                │
│         industri air, energi, dan infrastruktur kritis.         │
│                                                                 │
│         [🚀 Minta Demo]  [▶ Coba Demo]  [📖 Dokumentasi]       │
│                                                                 │
│               ╔══════════════════════════╗                      │
│               ║   Dashboard Screenshot   ║ ← floating, tilted  │
│               ║   with glow effect       ║   perspective        │
│               ╚══════════════════════════╝                      │
│                                                                 │
│   ▽ Jelajahi lebih lanjut                                      │
└─────────────────────────────────────────────────────────────────┘
```
- Badge pill di atas heading: `PLATFORM IOT` (monospace, gaya devetek-iot)
- Tagline utama: "Monitor. Analisa. Kendalikan." (terinspirasi devetek-iot: "Monitor. Analisa. Kendalikan.")
- Background: dark gradient + animated mesh/grid pattern (CSS only)
- Screenshot: `mockup-1.jpg` dengan CSS 3D perspective + box-shadow glow
- **3 CTA buttons**: Minta Demo (primary), Coba Demo (ghost → sandbox), Dokumentasi (text link)
- Stats bar di bawah hero:
  ```
  30+ Fitur  |  6+ Tipe Widget  |  34 Entitas  |  3 Arsitektur Layanan
  ```

#### 2.3 DIPERCAYA OLEH
```
────────── Dipercaya oleh organisasi terkemuka ──────────
[Logo 1]   [Logo 2]   [Logo 3]   [Logo 4]   [Logo 5]
```
- Grayscale logos, hover: color
- Auto-scroll infinite marquee (CSS animation)
- Placeholder: "Logo Anda di sini" boxes
- Contoh: PT Bakti Air Indonesia, PDAM [nama], dsb.

#### 2.4 IKHTISAR PLATFORM (3 Kolom)
```
          `TIGA PILAR`

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  [Icon: Monitor]  │  │  [Icon: Shield]   │  │  [Icon: Puzzle]   │
│                   │  │                   │  │                   │
│  Pantau           │  │  Analisa          │  │  Bertindak        │
│  Segalanya        │  │  Secara Cerdas    │  │  Seketika         │
│                   │  │                   │  │                   │
│  Data real-time   │  │  Deteksi anomali  │  │  Alert otomatis,  │
│  dari sensor,     │  │  berbasis ML &    │  │  perintah device, │
│  node & gateway   │  │  prediksi untuk   │  │  dan pembuatan    │
│  dalam satu       │  │  wawasan          │  │  laporan untuk    │
│  dashboard.       │  │  prediktif.       │  │  respons cepat.   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```
- Badge pill "TIGA PILAR" di atas (mirip "Dua Pilar" di devetek-iot)

#### 2.5 FITUR UNGGULAN (6 Card → link ke /features/*.html)
```
          `FITUR PLATFORM`

┌─────────┐  ┌─────────┐  ┌─────────┐
│ 📊      │  │ 🗺️      │  │ ⚠️      │
│Dashboard│  │ WebGIS  │  │ Smart   │
│& Widget │  │ Mapping │  │ Alert   │
│ Builder │  │         │  │         │
│         │  │         │  │         │
│[Detail→]│  │[Detail→]│  │[Detail→]│
└─────────┘  └─────────┘  └─────────┘
┌─────────┐  ┌─────────┐  ┌─────────┐
│ 📈      │  │ 🤖      │  │ 🔧      │
│Laporan &│  │ ML      │  │Manajemen│
│ Ekspor  │  │Analitik │  │ Device  │
│         │  │         │  │         │
│[Detail→]│  │[Detail→]│  │[Detail→]│
└─────────┘  └─────────┘  └─────────┘
```
- Grid 3×2 desktop, 2×3 tablet, 1×6 mobile
- Hover: card lift + gradient border glow
- Each card links to respective `/features/*.html`

#### 2.6 PREVIEW SCREENSHOT (Galeri Mini)
```
┌─────────────────────────────────────────────────────────────────┐
│          `TAMPILAN PLATFORM`                                   │
│  Lihat Helios Beraksi                                          │
│                                                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                       │
│  │mock-1│  │mock-2│  │mock-3│  │mock-4│                       │
│  └──────┘  └──────┘  └──────┘  └──────┘                       │
│                                                                 │
│                  [Lihat Semua Screenshot →]                     │
└─────────────────────────────────────────────────────────────────┘
```
- 4 thumbnails (dari mockup existing), click → lightbox
- "View All" link ke `/screenshots.html`

#### 2.7 PREVIEW SOLUSI INDUSTRI
```
          `SOLUSI INDUSTRI`

Dibangun untuk Industri Kritis

┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  💧             │  │  ⚡             │  │  🏭             │  │  🌾             │
│  PDAM /         │  │  Energi &      │  │  IoT            │  │  Pertanian     │
│  Utilitas Air   │  │  Kelistrikan   │  │  Industri       │  │  Cerdas        │
│                 │  │                │  │                │  │                │
│  [Jelajahi →]   │  │  [Jelajahi →]  │  │  [Jelajahi →]  │  │  [Jelajahi →]  │
└────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘
```

#### 2.8 CARA KERJA ★ NEW
```
          `CARA KERJA`

Dari Sensor ke Insight dalam 4 Langkah

  ①                    ②                     ③                    ④
  HUBUNGKAN            KUMPULKAN             ANALISA              BERTINDAK
  ───────              ───────               ───────              ───────
  Hubungkan sensor     Data masuk secara     Dashboard, alert     Terima notifikasi,
  & node via MQTT      real-time ke          rule, ML anomaly     kirim command,
  atau TCP. Auto-      ClickHouse &          & forecast           export laporan,
  discovery untuk      PostgreSQL.           memproses data       kontrol relay
  device baru.         Zero data loss.       otomatis.            dari mana saja.

  [Icon: Plug]         [Icon: Database]      [Icon: Brain]        [Icon: Zap]

                ─────→              ─────→              ─────→
```
- Layout mirip "Alur Implementasi" di devetek-iot (flow vertikal → horizontal)
- **Horizontal stepper** dengan connecting line
- Icon besar di atas, numbered circle
- Mobile: vertical stack
- Each step fade-in on scroll with stagger

#### 2.9 BAR LOGO INTEGRASI ★ NEW
```
          `INTEGRASI`

Terintegrasi dengan Infrastruktur yang Sudah Ada

[ESP32]  [Teltonika]  [MQTT]  [PostgreSQL]  [ClickHouse]  [Firebase]
[REST API]  [Webhooks]  [SHP/GeoJSON]  [XLSX]  [CSV]
```
- 2 row logo/badge strip
- Grayscale → color on hover
- Link ke `/integrations.html`

#### 2.10 ANGKA PERFORMA ★ NEW
```
          `PERFORMA`

Angka yang Berbicara

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   < 500ms    │  │   10K+       │  │   99.9%      │  │   24/7       │
│   Rata-rata  │  │   Data Point │  │   Uptime     │  │   Monitoring │
│   Respons    │  │   /detik     │  │   SLA        │  │   Real-Time  │
│   API        │  │              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```
- Count-up animation on scroll
- Membangun kredibilitas teknis untuk pengambil keputusan
- Angka bisa disesuaikan setelah benchmarking

#### 2.11 TESTIMONIAL / SOCIAL PROOF
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  "Devetek Helios membantu kami memantau 200+ node              │
│   tersebar di 5 DMA dengan real-time dashboard                  │
│   yang intuitif dan alert system yang responsif."               │
│                                                                 │
│           — [Nama], [Jabatan], [Perusahaan]                    │
│                                                                 │
│  ● ○ ○  (carousel dots)                                        │
└─────────────────────────────────────────────────────────────────┘
```
- Carousel 3 testimonial (placeholder text, bisa diisi nanti)
- Auto-rotate setiap 5 detik

#### 2.12 BANNER CTA
```
┌─────────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓ gradient background ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│                                                                 │
│          Siap Mentransformasi Operasi IoT Anda?                 │
│                                                                 │
│          [🚀 Minta Demo]    [📧 Hubungi Tim Kami]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.13 FOOTER
```
┌─────────────────────────────────────────────────────────────────┐
│  [D] DEVETEK HELIOS                                            │
│  Platform IoT untuk Infrastruktur Kritis                        │
│                                                                 │
│  PRODUK            SOLUSI            PERUSAHAAN     SUMBER DAYA │
│  Fitur             PDAM / Air        Tentang Kami   Dokumentasi │
│  Dashboard         Energi            Kontak         Referensi API│
│  WebGIS            Industri          Harga          Blog        │
│  Alert             Pertanian         Karir ★        Changelog ★ │
│  Laporan                                                        │
│  ML Analitik       HUBUNGI           LEGAL                      │
│  Widget Builder    Email             Kebijakan Privasi ★        │
│  Integrasi ★       WhatsApp          Syarat & Ketentuan ★       │
│                    LinkedIn          Keamanan ★                  │
│                    GitHub                                        │
│                                                                 │
│  ────── DEVETEK HARDWARE ──────                                 │
│  Lihat produk hardware IoT kami → devetek-iot.web.app           │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  © 2026 PT. COMON CIPTA INOVASI. Semua hak dilindungi.         │
└─────────────────────────────────────────────────────────────────┘
```
- ★ = penambahan baru vs draft sebelumnya
- 5 kolom di desktop, collapsed accordion di mobile
- **Cross-link ke devetek-iot.web.app** di footer (section "DEVETEK HARDWARE")
- Copyright: PT. COMON CIPTA INOVASI (bukan Devetek)

---

## 3. FITUR (Ikhtisar)

**URL:** `/features.html`  
**Tujuan:** Showcase semua fitur platform secara ringkas, arahkan visitor ke deep-dive page  

### Sections:

#### 3.1 HERO (Compact)
```
          `FITUR PLATFORM`

Fitur Platform
Jelajahi toolkit lengkap yang menjadikan Devetek Helios
platform IoT paling komprehensif.
```
- Background: subtle gradient, no screenshot
- Breadcrumb: `Beranda > Fitur`

#### 3.2 GRID FITUR (6 Card Besar)
Masing-masing card berisi:
- **Icon** (SVG)
- **Judul**
- **Deskripsi singkat**
- **3-4 bullet points** highlight
- **Screenshot thumbnail** kecil
- **[Selengkapnya →]** link ke sub-page

```
┌────────────────────────────────────────────┐
│  [Icon]  Dashboard & Widget Builder        │
│                                            │
│  Bangun dashboard sesuai kebutuhan operasi │
│                                            │
│  ✓ 6+ widget types                        │
│  ✓ Dual data source (PG + ClickHouse)     │
│  ✓ SQL editor & template wizard           │
│  ✓ 10 dashboard categories                │
│                                            │
│  ┌──────────────┐     [Selengkapnya →]    │
│  │  [thumbnail] │                          │
│  └──────────────┘                          │
└────────────────────────────────────────────┘
```

#### 3.3 TABEL PERBANDINGAN
```
Feature                    | Helios | Competitor A | Competitor B
─────────────────────────────────────────────────────────────────
Real-time Dashboard        |   ✅   |      ✅      |     ✅
Custom Widget Builder      |   ✅   |      ❌      |     ⚠️
WebGIS Mapping             |   ✅   |      ❌      |     ❌
ML Anomaly Detection       |   ✅   |      ⚠️      |     ❌
Multi-sheet XLSX Export    |   ✅   |      ❌      |     ✅
Spatial File Upload        |   ✅   |      ❌      |     ❌
Device Auto-Discovery      |   ✅   |      ✅      |     ❌
Multi-Tenant Architecture  |   ✅   |      ✅      |     ⚠️
MQTT + TCP (Teltonika)     |   ✅   |      ⚠️      |     ❌
ClickHouse Time-Series     |   ✅   |      ❌      |     ❌
```
- Nama competitor bisa diganti "Platform A / B" atau di-blur
- Tujuan: highlight keunggulan Helios

#### 3.4 DIAGRAM ARSITEKTUR
```
┌─────────┐     MQTT/TCP      ┌─────────────┐
│ Devices │ ─────────────────→ │  IoT Gateway │
│ Sensors │                    │  (NestJS)    │
│ Nodes   │                    └──────┬───────┘
└─────────┘                           │
                                      ▼
                              ┌───────────────┐
                              │  Message Queue │
                              │  (MQTT Broker) │
                              └───────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                  ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │  PostgreSQL  │  │  ClickHouse  │  │  ML Engine   │
            │  (Metadata)  │  │  (TimeSeries)│  │  (Analytics) │
            └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                   │                 │                  │
                   └─────────────────┼──────────────────┘
                                     ▼
                              ┌──────────────┐
                              │  Backend API │
                              │  (NestJS)    │
                              └──────┬───────┘
                                     ▼
                              ┌──────────────┐
                              │   Frontend   │
                              │  (Angular)   │
                              └──────────────┘
```
- Render as SVG illustration atau animated diagram
- Tujuan: tunjukkan kapabilitas teknis ke audience teknis

#### 3.5 CTA
```
Ingin melihat fitur ini beraksi?
[Minta Demo Langsung →]
```

---

## 4. HALAMAN SUB-FITUR (6 Halaman)

Setiap sub-page punya **template yang sama** dengan konten berbeda:

### Template Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Beranda > Fitur > [Nama Fitur]                    │
│                                                                 │
│  HERO: Judul + Subjudul + Screenshot full-width                │
│                                                                 │
│  SECTION 1: Paragraf ikhtisar (2-3 paragraf)                   │
│                                                                 │
│  SECTION 2: Kapabilitas Utama (4-6 item, icon+judul+deskripsi) │
│                                                                 │
│  SECTION 3: Alternating gambar+teks (2-3 blok)                 │
│                                                                 │
│  SECTION 4: Spesifikasi Teknis (tabel/list)                    │
│                                                                 │
│  SECTION 5: Fitur Terkait (3 card link ke halaman lain)        │
│                                                                 │
│  CTA: "Lihat beraksi → Minta Demo"                            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.1 `/features/dashboard.html` — Dashboard & Widget Builder

**Hero Image:** Dashboard overview screenshot  
**Tagline:** *"Bangun Dashboard Sesuai Kebutuhan Operasi Anda"*

**Key Capabilities:**
| # | Capability | Description |
|---|-----------|-------------|
| 1 | Drag & Drop Layout | Susun widget dalam grid layout yang fleksibel |
| 2 | 6+ Widget Types | Bar chart, line chart, gauge, pie chart, stat card, table |
| 3 | SQL Query Editor | Tulis query langsung untuk data kustom |
| 4 | Dual Data Source | Pilih PostgreSQL (metadata) atau ClickHouse (time-series) |
| 5 | Template Wizard | Mulai dari template siap pakai, sesuaikan sesuai kebutuhan |
| 6 | 10 Dashboard Categories | Overview, Alarm, Node Health, Pressure, Flow, Power, DMA, KPI, ML |

**Deep-Dive Blocks:**
1. **Widget Types Gallery** — Visual showcase setiap widget type dengan contoh data
2. **Dashboard Categories** — Grid of 10 categories dengan thumbnail preview
3. **Super Admin Dashboard** — Showcase 8 embedded widgets (KPI, health, telemetry, leaderboard, etc.)

**Tech Specs:**
- Real-time data refresh: configurable 5s–60s
- Max widgets per dashboard: unlimited
- Export: PNG chart capture
- Data sources: PostgreSQL, ClickHouse
- Aggregation: raw, 5m, 15m, 1h, 1d, 1M

---

### 4.2 `/features/webgis.html` — WebGIS & Pemetaan Spasial

**Hero Image:** WebGIS map view screenshot  
**Tagline:** *"Aset Anda di Peta, Secara Real-Time"*

**Key Capabilities:**
| # | Kapabilitas | Deskripsi |
|---|-----------|-------------|
| 1 | OpenLayers Map Engine | Interaktif, cepat, support berbagai basemap |
| 2 | Core IoT Layers | Sensor, Node, Alert, Anomaly, Network Topology — auto-generated |
| 3 | Custom Layer Upload | Upload SHP, GeoJSON, KML, CSV — parsed & rendered otomatis |
| 4 | Feature Popups | Click aset → live data, status, last reading, trend mini-chart |
| 5 | DMA Boundary | Visualisasi zona distribusi (District Metered Area) |
| 6 | Layer Panel | Toggle visibility, reorder, style editing per layer |

**Deep-Dive Blocks:**
1. **Layer Types** — Core vs Operational vs Custom layers, masing-masing dengan contoh
2. **Spatial Upload Pipeline** — Step-by-step: Upload → Parse → Map Fields → Preview → Publish
3. **Live Data on Map** — Feature popup with sensor readings, threshold status, mini trend chart

---

### 4.3 `/features/alerts.html` — Smart Alert & Monitoring

**Hero Image:** Alert center screenshot  
**Tagline:** *"Tahu Sebelum Terjadi Masalah"*

**Key Capabilities:**
| # | Kapabilitas | Deskripsi |
|---|-----------|-------------|
| 1 | Configurable Rules | Set threshold min/max per sensor channel |
| 2 | Severity Levels | Critical, Warning, Info — visual color coding |
| 3 | Real-Time Detection | Alert checker runs continuously on incoming data |
| 4 | Alert Center | Centralized view semua alert aktif, history, acknowledgment |
| 5 | Notification System | In-app notification dropdown, badge count |
| 6 | Device Commands | Trigger relay ON/OFF/PULSE via alert action (MQTT) |

**Deep-Dive Blocks:**
1. **Alert Rule Configuration** — Visual of rule setup UI
2. **Alert Center Dashboard** — Alert list, severity filters, timeline view
3. **Auto-Response** — Alert → Device Command flow (e.g., threshold exceeded → relay OFF)

---

### 4.4 `/features/reports.html` — Laporan & Ekspor

**Hero Image:** Report preview screenshot  
**Tagline:** *"Dari Data Mentah ke Laporan Eksekutif dalam Hitungan Menit"*

**Key Capabilities:**
| # | Kapabilitas | Deskripsi |
|---|-----------|-------------|
| 1 | Hierarchical Filter | Owner → Project → Node → Sensor → Channel cascading filter |
| 2 | Aggregation Modes | Raw, 10 min, 1 hour, 1 day — pilih granularitas data |
| 3 | Preview Table | Lihat data sebelum export, dengan pagination |
| 4 | XLSX Multi-Sheet Export | Setiap sensor channel = 1 sheet, dengan header metadata |
| 5 | Chart Visualization | Line chart terintegrasi di preview |
| 6 | Report Templates | Simpan konfigurasi filter sebagai template untuk reuse |

**Deep-Dive Blocks:**
1. **Filter Flow** — Visual step-by-step cascading filter
2. **Export Preview** — Screenshot tabel + chart preview
3. **Template System** — Save, load, share report configurations

---

### 4.5 `/features/ml-analytics.html` — ML & AI Analitik

**Hero Image:** ML dashboard screenshot  
**Tagline:** *"Wawasan Berbasis AI untuk Operasi Prediktif"*

**Key Capabilities:**
| # | Kapabilitas | Deskripsi |
|---|-----------|-------------|
| 1 | Anomaly Detection | Deteksi otomatis pola tidak normal pada data sensor |
| 2 | Forecasting | Prediksi nilai sensor ke depan berdasarkan historical data |
| 3 | ML Dashboard | Visualisasi hasil anomaly & forecast dalam satu tampilan |
| 4 | Notification Integration | Alert otomatis saat anomaly terdeteksi |
| 5 | Deduplication | Smart dedup supaya alert tidak spam |
| 6 | Daily Summary | Rangkuman harian hasil ML via notification |

**Deep-Dive Blocks:**
1. **Anomaly Detection Flow** — Data → ML Engine → Score → Alert
2. **Forecast Visualization** — Actual vs predicted chart
3. **ML + Alert Integration** — Automated pipeline dari detection ke notification

---

### 4.6 `/features/device-management.html` — Manajemen Device & Sensor

**Hero Image:** Node list/detail screenshot  
**Tagline:** *"Setiap Device, Setiap Sensor, Dalam Kendali"*

**Key Capabilities:**
| # | Kapabilitas | Deskripsi |
|---|-----------|-------------|
| 1 | Node CRUD | Full management: create, edit, delete, 18+ filter parameters |
| 2 | Sensor Channels | Multi-channel sensor configuration per node |
| 3 | Auto-Discovery | Unpaired device detection dari MQTT/TCP traffic |
| 4 | Pairing Workspace | Visual pairing: unpaired device → registered node |
| 5 | Node Models Catalog | Hardware model database (ESP32, Teltonika, etc.) |
| 6 | Health Monitoring | Online/Offline/Degraded status, connectivity tracking |
| 7 | Relay Control | Send ON/OFF/PULSE commands via REST → MQTT |
| 8 | Multi-Protocol | MQTT (ESP32) + TCP (Teltonika FM125) |

**Deep-Dive Blocks:**
1. **Node Lifecycle** — Discovery → Pairing → Configuration → Monitoring
2. **Sensor Configuration** — Channel types, metric codes, calibration
3. **Gateway Architecture** — MQTT broker + TCP adapter + ClickHouse ingestion

---

## 5. SOLUSI / STUDI KASUS (Ikhtisar)

**URL:** `/solutions.html`  
**Tujuan:** Mapping fitur Helios ke kebutuhan industri spesifik

### Sections:

#### 5.1 HERO
```
          `SOLUSI INDUSTRI`

Solusi untuk Setiap Industri

Devetek Helios beradaptasi dengan kebutuhan monitoring 
dan kontrol unik setiap industri Anda.
```

#### 5.2 GRID INDUSTRI (4 Card Besar)
```
┌─────────────────────────┐  ┌─────────────────────────┐
│  💧 PDAM / Utilitas Air  │  │  ⚡ Energi & Kelistrikan   │
│                          │  │                          │
│  Monitoring DMA, deteksi │  │  Monitoring VSD, konsumsi│
│  kebocoran, tekanan &    │  │  daya, prediktif         │
│  debit, visualisasi      │  │  maintenance, monitoring │
│  jaringan pipa           │  │  grid                    │
│                          │  │                          │
│  [Jelajahi Solusi →]     │  │  [Jelajahi Solusi →]     │
└─────────────────────────┘  └─────────────────────────┘
┌─────────────────────────┐  ┌─────────────────────────┐
│  🏭 IoT Industri          │  │  🌾 Pertanian Cerdas       │
│                          │  │                          │
│  Monitoring pabrik,      │  │  Kelembaban tanah,       │
│  telemetri produksi,     │  │  stasiun cuaca, kontrol  │
│  kontrol kualitas,       │  │  irigasi, monitoring     │
│  prediktif maintenance   │  │  tanaman                 │
│                          │  │                          │
│  [Jelajahi Solusi →]     │  │  [Jelajahi Solusi →]     │
└─────────────────────────┘  └─────────────────────────┘
```

#### 5.3 KEUNGGULAN LINTAS INDUSTRI
```
Berlaku untuk Semua Industri:

[Icon] Multi-Tenant     → Kelola banyak klien/project dalam 1 platform
[Icon] Real-Time        → Data real-time dari lapangan ke dashboard
[Icon] Scalable         → Dari 10 node sampai 10.000+ node
[Icon] Aman             → Role-based access, audit logs, JWT auth
[Icon] API-First        → Swagger docs, OpenAPI SDK auto-generation
[Icon] Cloud-Ready      → Firebase hosting, PM2 production deployment
```

---

## 6. HALAMAN SUB-SOLUSI (4 Halaman)

### Template Layout (sama untuk semua):
```
┌─────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Beranda > Solusi > [Industri]                     │
│                                                                 │
│  HERO: Judul industri + ilustrasi + tagline                    │
│                                                                 │
│  SECTION 1: Tantangan Industri (3-4 pain points)               │
│                                                                 │
│  SECTION 2: Bagaimana Helios Menyelesaikannya (mapping fitur)  │
│                                                                 │
│  SECTION 3: Contoh Layout Dashboard (mockup/wireframe)         │
│                                                                 │
│  SECTION 4: Metrik Utama yang Dipantau (tabel/cards)           │
│                                                                 │
│  SECTION 5: Testimoni (spesifik industri, placeholder)         │
│                                                                 │
│  CTA: "Lihat bagaimana Helios bekerja untuk [Industri] → Minta Demo"  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.1 `/solutions/water-utility.html` — PDAM / Utilitas Air

**Challenges:**
1. Kehilangan air (NRW) tinggi tanpa data real-time
2. Tekanan tidak merata di zona distribusi
3. Kebocoran terdeteksi terlambat
4. Laporan manual, lambat, error-prone

**Helios Solution Mapping:**
| Challenge | Helios Feature |
|-----------|---------------|
| NRW Monitoring | Flow sensor telemetry + Report aggregation |
| Pressure Management | Real-time dashboard + Threshold alerts |
| Leak Detection | ML anomaly detection on flow/pressure |
| DMA Visualization | WebGIS with DMA boundary + pipe network |
| Automated Reports | Report templates + scheduled XLSX export |
| Remote Control | Valve relay command via MQTT |

**Key Metrics:** Flow rate, Pressure, NRW%, DMA inlet/outlet, Chlorine level

---

### 6.2 `/solutions/energy.html` — Energi & Kelistrikan

**Challenges:**
1. Pemantauan konsumsi energi tidak terpusat
2. Downtime akibat kerusakan mendadak
3. Optimasi VSD/motor sulit tanpa data historis
4. Compliance reporting manual

**Helios Solution Mapping:**
| Challenge | Helios Feature |
|-----------|---------------|
| Centralized Monitoring | Multi-tenant dashboard per plant |
| Predictive Maintenance | ML forecasting + anomaly alerts |
| VSD Optimization | Telemetry trends + aggregated reports |
| Compliance | Automated XLSX reports with templates |

**Key Metrics:** kWh, Power factor, Voltage, Current, VSD frequency, Temperature

---

### 6.3 `/solutions/industrial.html` — IoT Industri

**Challenges:**
1. Banyak sensor tersebar di area pabrik luas
2. Kualitas produksi tidak terpantau real-time
3. Troubleshooting lambat tanpa historical data
4. Integrasi device heterogen

**Helios Solution Mapping:**
| Challenge | Helios Feature |
|-----------|---------------|
| Asset Mapping | WebGIS for factory floor layout |
| Quality Control | Alert rules on quality parameters |
| Root Cause Analysis | Historical telemetry + ML anomaly |
| Multi-Protocol | MQTT + TCP + auto-discovery |

**Key Metrics:** Temperature, Humidity, Vibration, RPM, Production count, Quality score

---

### 6.4 `/solutions/smart-agriculture.html` — Pertanian Cerdas

**Challenges:**
1. Irigasi tidak efisien (over/under watering)
2. Data cuaca & tanah tidak terhubung
3. Area pertanian luas, sulit dipantau
4. Keputusan berdasarkan feeling, bukan data

**Helios Solution Mapping:**
| Challenge | Helios Feature |
|-----------|---------------|
| Smart Irrigation | Soil moisture sensor + relay command |
| Weather Integration | Multi-sensor node (temp, humidity, rain, wind) |
| Area Monitoring | WebGIS with field boundary layers |
| Data-Driven Decision | Dashboard + Report + ML forecast |

**Key Metrics:** Soil moisture, Temperature, Humidity, Rainfall, Wind speed, Light intensity

---

## 7. GALERI SCREENSHOT

**URL:** `/screenshots.html`  
**Tujuan:** Showcase visual platform, bangun kepercayaan sebelum demo

### Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│          `GALERI`                                              │
│  Screenshot & Galeri                                           │
│  Lihat Helios Beraksi                                          │
│                                                                 │
│  TAB FILTER:                                                   │
│  [Semua] [Dashboard] [WebGIS] [Alert] [Laporan] [Device]      │
│                                                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                       │
│  │      │  │      │  │      │  │      │                       │
│  │  01  │  │  02  │  │  03  │  │  04  │                       │
│  │      │  │      │  │      │  │      │                       │
│  └──────┘  └──────┘  └──────┘  └──────┘                       │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                       │
│  │      │  │      │  │      │  │      │                       │
│  │  05  │  │  06  │  │  07  │  │  08  │                       │
│  │      │  │      │  │      │  │      │                       │
│  └──────┘  └──────┘  └──────┘  └──────┘                       │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                       │
│  │      │  │      │  │      │  │      │                       │
│  │  09  │  │  10  │  │  11  │  │  12  │                       │
│  │      │  │      │  │      │  │      │                       │
│  └──────┘  └──────┘  └──────┘  └──────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

**Fitur:**
- Masonry grid layout (4 kolom desktop, 2 kolom tablet, 1 kolom mobile)
- Tab filtering berdasarkan kategori (frontend JS filter, tanpa reload)
- Click → lightbox with:
  - Full-size image
  - Caption (feature name + brief description)
  - Navigation arrows (prev/next)
  - Keyboard support (←→, Esc)
- Use existing mockup images: `mockup-1.jpg` through `mockup-12.jpg`
- Thumbnails: `mockup-*-thumb.jpg`

**Screenshot Mapping (proposed):**
| # | Mockup | Category | Caption |
|---|--------|----------|---------|
| 1 | mockup-1 | Dashboard | IoT Overview Dashboard |
| 2 | mockup-2 | Dashboard | Super Admin Dashboard |
| 3 | mockup-3 | Dashboard | Widget Builder |
| 4 | mockup-4 | WebGIS | WebGIS Map View |
| 5 | mockup-5 | WebGIS | Layer Management Panel |
| 6 | mockup-6 | Alerts | Alert Center |
| 7 | mockup-7 | Reports | Report Preview & Export |
| 8 | mockup-8 | Devices | Node Management |
| 9 | mockup-9 | Devices | Sensor Channel Detail |
| 10 | mockup-10 | Dashboard | Telemetry Trends Chart |
| 11 | mockup-11 | Reports | ML Anomaly Dashboard |
| 12 | mockup-12 | Dashboard | DMA Operator Dashboard |

---

## 8. HARGA

**URL:** `/pricing.html`  
**Tujuan:** Transparansi harga, konversi ke contact/demo

### Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│          `PAKET LANGGANAN`                                     │
│  Harga Sederhana dan Transparan                                │
│                                                                 │
│  [Monthly ○]  [Annual ● Save 20%]                              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   STARTER    │  │  BUSINESS    │  │  ENTERPRISE  │          │
│  │              │  │  ★ Popular   │  │              │          │
│  │  Rp X.XXX   │  │  Rp XX.XXX  │  │  Custom      │          │
│  │  /node/bulan │  │  /node/bulan │  │  Contact Us  │          │
│  │              │  │              │  │              │          │
│  │  Up to 50    │  │  Up to 500   │  │  Unlimited   │          │
│  │  nodes       │  │  nodes       │  │  nodes       │          │
│  │              │  │              │  │              │          │
│  │  ✓ Dashboard │  │  ✓ All       │  │  ✓ All      │          │
│  │  ✓ Alerts    │  │    Starter   │  │    Business  │          │
│  │  ✓ Telemetry │  │  ✓ WebGIS   │  │  ✓ On-Prem  │          │
│  │  ✓ Reports   │  │  ✓ ML/AI    │  │  ✓ Custom   │          │
│  │  ✗ WebGIS   │  │  ✓ Widget   │  │    Dev       │          │
│  │  ✗ ML/AI    │  │    Builder  │  │  ✓ SLA      │          │
│  │              │  │  ✓ API Access│  │  ✓ Training │          │
│  │              │  │              │  │  ✓ Dedicated│          │
│  │  [Get       ]│  │  [Get       ]│  │    Support  │          │
│  │  [Started   ]│  │  [Started   ]│  │              │          │
│  │              │  │              │  │ [Contact Us] │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ─── FEATURE COMPARISON TABLE ───                              │
│                                                                 │
│  Feature              Starter  Business  Enterprise            │
│  ────────────────────────────────────────────────              │
│  Nodes                50       500       Unlimited             │
│  Users                5        25        Unlimited             │
│  Dashboard            ✅       ✅        ✅                     │
│  Widget Builder       3 types  All       All + Custom         │
│  WebGIS               ❌       ✅        ✅ + Custom Layers    │
│  Alert Rules          10       100       Unlimited             │
│  ML Analytics         ❌       ✅        ✅ + Custom Models    │
│  Report Templates     5        50        Unlimited             │
│  Data Retention       30 days  1 year    Custom               │
│  API Access           ❌       ✅        ✅ + Webhooks        │
│  Support              Email    Priority  Dedicated            │
│  On-Premise Deploy    ❌       ❌        ✅                     │
│  SLA                  ❌       99.5%     99.9%                │
│                                                                 │
│  ─── FAQ ───                                                   │
│                                                                 │
│  ▸ Apakah ada free trial?                                      │
│  ▸ Bagaimana cara menghitung jumlah node?                      │
│  ▸ Apakah bisa custom deployment?                              │
│  ▸ Metode pembayaran apa saja yang diterima?                   │
│  ▸ Bagaimana jika melebihi batas node?                         │
│  ▸ Apakah ada diskon untuk volume besar?                       │
└─────────────────────────────────────────────────────────────────┘
```

> **Note:** Angka pricing placeholder, bisa disesuaikan nanti. Yang penting struktur halaman-nya.

---

## 9. DOKUMENTASI (Link Saja)

**Tidak buat halaman baru** — langsung link ke:
- App documentation: `/iot/document` (sudah ada di Angular app)
- API docs: `/api` (Swagger)

Di navbar & footer, link "Docs" arahkan ke:
```
https://devetek-helios.web.app/iot/document
```

---

## 10. TENTANG KAMI

**URL:** `/about.html`  
**Tujuan:** Bangun kepercayaan, kredibilitas perusahaan, showcase tim

### Sections:

#### 10.1 HERO
```
          `TENTANG KAMI`

Tentang Devetek
Membangun Masa Depan Infrastruktur IoT
```

#### 10.2 CERITA PERUSAHAAN
```
Devetek didirikan dengan misi menjadikan manajemen infrastruktur IoT 
mudah diakses, cerdas, dan andal bagi organisasi yang mengelola 
infrastruktur kritis.

PT. COMON CIPTA INOVASI, melalui brand Devetek, berfokus pada 
pengembangan solusi IoT end-to-end untuk pasar Indonesia.

[2-3 paragraf tentang visi, misi, dan perjalanan perusahaan]
```

#### 10.3 MISI & NILAI (3-4 Card)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 🎯 Misi       │  │ 🔍 Akurasi   │  │ ⚡ Kecepatan │  │ 🤝 Kepercayaan│
│               │  │               │  │               │  │               │
│ Demokratisasi │  │ Setiap data   │  │ Real-time    │  │ Partner      │
│ IoT untuk     │  │ point         │  │ selalu,      │  │ terpercaya   │
│ infrastruktur │  │ penting       │  │ di mana saja │  │ untuk        │
│ kritis        │  │               │  │               │  │ operasi Anda │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

#### 10.4 TIM (Opsional)
```
Tim Kami

┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│ foto │  │ foto │  │ foto │  │ foto │
│      │  │      │  │      │  │      │
│ Nama │  │ Nama │  │ Nama │  │ Nama │
│ Peran│  │ Peran│  │ Peran│  │ Peran│
└──────┘  └──────┘  └──────┘  └──────┘
```
- Placeholder foto, bisa diisi nanti

#### 10.5 ANGKA / MILESTONE
```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   30+    │  │   3      │  │   34     │  │  2024    │
│  Fitur   │  │ Layanan  │  │ Entitas  │  │ Didirikan│
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

#### 10.6 BADGE TECH STACK
```
Dibangun Dengan:
[Angular] [NestJS] [PostgreSQL] [ClickHouse] [MQTT] [OpenLayers] [ECharts] [Firebase]
```
- Badge-style pills dengan logo/icon

---

## 11. CONTACT / REQUEST DEMO

**URL:** `/contact.html`  
**Purpose:** Lead generation, demo scheduling

### Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│  Get in Touch / Hubungi Kami                                   │
│                                                                 │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │                          │  │                          │    │
│  │  📧 Request a Demo       │  │  CONTACT FORM            │    │
│  │                          │  │                          │    │
│  │  Schedule a personalized │  │  Name:    [__________]   │    │
│  │  demo with our team.     │  │  Email:   [__________]   │    │
│  │                          │  │  Company: [__________]   │    │
│  │  ─────────────────────   │  │  Phone:   [__________]   │    │
│  │                          │  │  Industry:[dropdown  ▾]  │    │
│  │  📍 Location              │  │  Nodes:  [dropdown  ▾]  │    │
│  │  Jakarta, Indonesia       │  │           (1-50, 50-500,│    │
│  │                          │  │            500+)         │    │
│  │  📧 Email                 │  │  Message: [__________]  │    │
│  │  hello@devetek.com        │  │           [__________]  │    │
│  │                          │  │           [__________]  │    │
│  │  💬 WhatsApp              │  │                          │    │
│  │  +62 xxx-xxxx-xxxx       │  │  [📧 Send Message]       │    │
│  │                          │  │                          │    │
│  │  🕐 Response Time         │  │  atau                    │    │
│  │  Within 24 hours          │  │                          │    │
│  │                          │  │  [💬 Chat via WhatsApp]   │    │
│  │                          │  │                          │    │
│  └──────────────────────────┘  └──────────────────────────┘    │
│                                                                 │
│  ─── FAQ ───                                                   │
│                                                                 │
│  ▸ Berapa lama proses demo?                                    │
│  ▸ Apakah demo gratis?                                         │
│  ▸ Apakah bisa demo on-site?                                   │
│  ▸ Dokumen apa yang perlu disiapkan?                           │
└─────────────────────────────────────────────────────────────────┘
```

**Form Handling Options:**
1. **Option A:** mailto link (simplest)
2. **Option B:** Google Forms embed
3. **Option C:** Backend API endpoint `/api/contact` (bisa dibuat)
4. **Option D:** Third-party (Formspree, Netlify Forms)

---

## 12. BLOG (Phase 2 — Opsional)

**URL:** `/blog.html` + `/blog/*.html`  
**Purpose:** SEO, thought leadership, content marketing

### Rencana Artikel:
| # | Judul | Kategori |
|---|-------|----------|
| 1 | Apa itu IoT Platform dan Mengapa Bisnis Membutuhkannya? | Education |
| 2 | Mengurangi NRW dengan Monitoring Real-Time | Water Utility |
| 3 | WebGIS untuk Manajemen Aset Infrastruktur | Technology |
| 4 | Predictive Maintenance dengan ML di IoT | AI/ML |
| 5 | Studi Kasus: Monitoring DMA dengan Devetek Helios | Case Study |

> **Note:** Blog bisa diimplementasi di Phase 2 setelah landing page live.

---

## 13. DEMO LANGSUNG / SANDBOX ★ NEW

**URL:** `/demo.html`  
**Tujuan:** Biarkan visitor mencoba platform tanpa perlu sign up / contact sales dulu. Ini **conversion driver terkuat** — semua IoT platform besar punya ini (ThingsBoard Demo, Ubidots Demo, Blynk Demo).

### Strategy Options:

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| **A. Read-Only Sandbox Account** | Visitor bisa login dengan demo credential, lihat dashboard asli dengan data simulasi | Perlu maintain data simulasi, risk security | Medium |
| **B. Guided Interactive Tour** | Step-by-step walkthrough screenshot/video per fitur, tidak perlu real account | Kurang immersive | Low |
| **C. Iframe Embed** | Embed Angular app dalam iframe (read-only pages) | CORS/security issues | High |

### Recommended: **Option A + B Hybrid**

### Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│  Try Devetek Helios — Live Demo                                │
│  Coba platform secara langsung, tanpa registrasi               │
│                                                                 │
│  ┌─────────────────────────────┐                                │
│  │                             │                                │
│  │  ACCESS LIVE DEMO           │                                │
│  │                             │                                │
│  │  Experience the full        │                                │
│  │  platform with sample       │                                │
│  │  IoT data.                  │                                │
│  │                             │                                │
│  │  Demo Credentials:          │                                │
│  │  Email: demo@devetek.com    │                                │
│  │  Pass:  demo2026            │                                │
│  │                             │                                │
│  │  [🚀 Launch Demo →]         │                                │
│  │  Opens in new tab           │                                │
│  │                             │                                │
│  └─────────────────────────────┘                                │
│                                                                 │
│  ─── OR TAKE A GUIDED TOUR ───                                 │
│                                                                 │
│  Step 1: Dashboard Overview    [Screenshot + Description]      │
│  Step 2: Navigate to Nodes     [Screenshot + Description]      │
│  Step 3: View Telemetry        [Screenshot + Description]      │
│  Step 4: Check Alerts          [Screenshot + Description]      │
│  Step 5: Open WebGIS Map       [Screenshot + Description]      │
│  Step 6: Generate Report       [Screenshot + Description]      │
│                                                                 │
│  ─── PRODUCT VIDEO ───                                         │
│                                                                 │
│  [▶ Embedded YouTube/Vimeo video placeholder]                  │
│  2-3 minute product walkthrough                                │
│                                                                 │
│  CTA: "Ready for your own instance? → Request Demo"           │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Setup Needed:
- Create demo user account (read-only role)
- Populate demo data (sample owner, project, nodes, sensors, telemetry)
- Auto-reset demo data setiap 24 jam (cron job)
- Rate limiting pada demo account

---

## 14. INTEGRASI & API ★ NEW

**URL:** `/integrations.html`  
**Tujuan:** Technical buyers & developers ingin tahu integrasi apa saja yang didukung. Semua platform IoT besar punya halaman ini.

### Sections:

#### 14.1 HERO
```
          `INTEGRASI`

Integrasi & API
Hubungkan Helios dengan infrastruktur yang sudah ada
```

#### 14.2 PROTOCOL SUPPORT (Grid Cards)
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  [MQTT Icon]     │  │  [TCP Icon]      │  │  [REST Icon]     │
│                  │  │                  │  │                  │
│  MQTT Protocol   │  │  TCP/IP          │  │  REST API        │
│                  │  │  (Teltonika)     │  │                  │
│  ESP32, custom   │  │  FM125, FM36xx   │  │  OpenAPI/Swagger │
│  devices, any    │  │  series GPS      │  │  auto-generated  │
│  MQTT client     │  │  trackers        │  │  SDK (Angular)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

#### 14.3 HARDWARE COMPATIBILITY
```
Supported Hardware:

IoT Controllers         GPS Trackers          Sensors
─────────────────       ─────────────         ───────────
✓ ESP32                 ✓ Teltonika FM125     ✓ Temperature
✓ ESP8266               ✓ Teltonika FMB series✓ Pressure
✓ Arduino (via MQTT)    ✓ Any TCP GPS device  ✓ Flow meter
✓ Raspberry Pi                                ✓ Level sensor
✓ Custom hardware                             ✓ Humidity
  (any MQTT client)                           ✓ Any analog/digital
```

#### 14.4 DATA EXPORT & FORWARDING
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  📊 XLSX Export  │  │  📋 CSV Export   │  │  🔗 Webhooks     │
│                  │  │                  │  │                  │
│  Multi-sheet     │  │  Telemetry data  │  │  Forward data to │
│  reports with    │  │  export with     │  │  external systems│
│  charts & meta   │  │  aggregation     │  │  in real-time    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  🗄 DB Forward   │  │  🗺 Spatial I/O  │  │  📡 Auto SDK     │
│                  │  │                  │  │                  │
│  Forward to      │  │  Import SHP,     │  │  Auto-generated  │
│  external DB     │  │  GeoJSON, KML,   │  │  Angular SDK     │
│  (owner-level)   │  │  CSV. Export map  │  │  from OpenAPI    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

#### 14.5 API DOCUMENTATION PREVIEW
```
REST API — Full Swagger Documentation

Endpoints: 100+ across 20 modules
Auth: JWT Bearer Token
Format: JSON
Docs: Interactive Swagger UI at /api

Example:
  GET  /api/sensor-logs?limit=100&startDate=2026-01-01
  POST /api/nodes
  GET  /api/sensor-logs/export?aggregation=1h

[📖 View Full API Docs →]  (link ke /api Swagger)
```

#### 14.6 TECHNOLOGY STACK
```
Built With Industry-Leading Technologies

Frontend:  Angular 18 • Bootstrap 5 • Apache ECharts • OpenLayers
Backend:   NestJS • TypeORM • Express
Database:  PostgreSQL + TimescaleDB • ClickHouse
Protocol:  MQTT • TCP/IP
AI/ML:     Custom anomaly detection & forecasting
Deploy:    Firebase Hosting • PM2 • Docker-ready
```
- Tech logos in badge/pill format
- Click on tech → external doc link

---

## 15. KEAMANAN & KEPATUHAN ★ NEW

**URL:** `/security.html`  
**Tujuan:** Klien enterprise dan BUMN **pasti tanya soal keamanan**. Tanpa halaman ini, mereka ragu.

### Sections:

#### 15.1 HERO
```
          `KEAMANAN`

Keamanan & Kepatuhan
Perlindungan data Anda adalah prioritas kami
```

#### 15.2 SECURITY FEATURES
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ 🔐 Authentication    │  │ 🛡 Authorization      │  │ 📋 Audit Trail      │
│                      │  │                      │  │                      │
│ • JWT token-based    │  │ • Role-based access  │  │ • Complete audit     │
│ • Bcrypt password    │  │   (Admin, Tenant)    │  │   logging            │
│   hashing            │  │ • Owner-scoped data  │  │ • User action        │
│ • Token refresh      │  │   isolation          │  │   tracking           │
│ • Session management │  │ • API-level guards   │  │ • IP logging         │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ 🌐 Network Security  │  │ 💾 Data Protection   │  │ 🏢 Multi-Tenancy     │
│                      │  │                      │  │                      │
│ • HTTPS everywhere   │  │ • Data encryption    │  │ • Complete data      │
│ • CORS protection    │  │   at rest & transit  │  │   isolation per      │
│ • Rate limiting      │  │ • Automated backups  │  │   owner              │
│ • Input validation   │  │ • Data retention     │  │ • No cross-tenant    │
│ • SQL injection      │  │   policies           │  │   data leakage       │
│   prevention         │  │ • GDPR-ready         │  │ • Owner-level config │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

#### 15.3 INFRASTRUCTURE SECURITY
```
Infrastructure:
• Firebase Hosting with SSL (Google Cloud infrastructure)
• PostgreSQL with encrypted connections
• ClickHouse secured access
• MQTT broker with authentication
• Environment-based configuration (no hardcoded secrets)
```

#### 15.4 COMPLIANCE READINESS
```
Compliance Standards We Support:

✓ GDPR — Data protection & right to deletion
✓ ISO 27001 — Information security (framework-ready)
✓ SNI — Standar Nasional Indonesia (applicable standards)
✓ SOC 2 — Security & availability (roadmap)
```

#### 15.5 RESPONSIBLE DISCLOSURE
```
Found a vulnerability?
Contact our security team: security@devetek.com
We take all reports seriously and respond within 48 hours.
```

---

## 16. HALAMAN LEGAL ★ NEW

### 16.1 Kebijakan Privasi (`/privacy.html`)
```
Sections:
1. Information We Collect
2. How We Use Your Information
3. Data Sharing & Third Parties
4. Data Retention
5. Your Rights (access, correction, deletion)
6. Cookies & Tracking
7. Security Measures
8. Children's Privacy
9. Changes to This Policy
10. Contact Us
```
- **Wajib** jika ada contact form (collect personal data)
- **Wajib** jika pasang Google Analytics
- Basic template, bisa disempurnakan oleh legal team

### 16.2 Syarat & Ketentuan (`/terms.html`)
```
Sections:
1. Acceptance of Terms
2. Description of Service
3. User Accounts & Responsibilities
4. Intellectual Property
5. Acceptable Use Policy
6. Service Availability & SLA
7. Limitation of Liability
8. Indemnification
9. Termination
10. Governing Law (Indonesian law)
11. Contact Information
```

---

## 17. HALAMAN 404 ★ NEW

**URL:** `/404.html`  
**Tujuan:** Jangan biarkan visitor stuck di halaman error jelek. Ubah 404 jadi conversion opportunity.

### Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    ╔════════════════╗                            │
│                    ║      404       ║                            │
│                    ╚════════════════╝                            │
│                                                                 │
│              Halaman Tidak Ditemukan                            │
│                                                                 │
│    Halaman yang Anda cari tidak ada                             │
│    atau telah dipindahkan.                                      │
│                                                                 │
│    [🏠 Kembali ke Beranda]  [📧 Hubungi Kami]  [🔍 Cari]        │
│                                                                 │
│    Halaman Populer:                                             │
│    • Ikhtisar fitur                                             │
│    • Minta demo                                                 │
│    • Solusi utilitas air                                        │
│    • Galeri screenshot                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
- Animated illustration (SVG satellites/nodes floating)
- Search bar (optional, simple JS filter against sitemap)
- Quick links to popular pages
- Firebase Hosting: configure 404 in `firebase.json`

---

## 18. KOMPONEN BERSAMA

### 18.1 NAVBAR (Semua Halaman)
- Logo: `[D]` monogram + "DEVETEK HELIOS"
- Menu: Fitur (dropdown), Solusi (dropdown), Integrasi, Harga, Galeri, Tentang
- Tombol CTA: "Coba Demo" (ghost) + "Minta Demo" (solid)
- Mobile hamburger menu
- Indikator halaman aktif
- Transparent → solid on scroll (home only), solid di inner pages

### 18.2 FOOTER (Semua Halaman)
- Layout 4 kolom: Produk, Solusi, Perusahaan, Hubungi
- Logo + tagline
- Copyright: PT. COMON CIPTA INOVASI
- Link sosial: LinkedIn, GitHub, Instagram
- Cross-link ke devetek-iot.web.app

### 18.3 BANNER CTA (Reusable)
- Gradient background
- Judul + subjudul + 2 tombol
- Digunakan di: Beranda, Fitur, Solusi, Tentang

### 18.4 BREADCRUMB (Halaman Inner Saja)
```
Beranda > Fitur > Dashboard & Widget Builder
```

### 18.5 TOMBOL KEMBALI KE ATAS
- Fixed bottom-right
- Muncul setelah scroll 300px
- Smooth scroll ke atas

### 18.6 TOMBOL MELAYANG WHATSAPP ★ NEW
```
                                        ┌──────────────┐
                                        │ 💬 Chat      │
                                        │    dengan kami│
                                        └──────┬───────┘
                                               │
                                        ┌──────┴───────┐
                                        │  [WA Icon]   │
                                        └──────────────┘
```
- Fixed bottom-right (di atas tombol back-to-top)
- Icon WhatsApp hijau (brand color #25D366)
- Hover: tooltip "Chat dengan kami"
- Click: buka `wa.me/6285623022229` di tab baru
- **Wajib untuk pasar Indonesia** — WhatsApp = channel komunikasi #1
- Di mobile: touch target lebih besar (56px)
- Pulse animation saat pertama kali berkunjung (menarik perhatian)

### 18.7 BANNER PERSETUJUAN COOKIE ★ NEW
```
┌─────────────────────────────────────────────────────────────────┐
│ 🍪 Kami menggunakan cookie untuk meningkatkan pengalaman Anda.  │
│    Baca [Kebijakan Privasi] kami.                              │
│                          [Terima Semua]  [Hanya yang Perlu]    │
└─────────────────────────────────────────────────────────────────┘
```
- Fixed bottom bar
- Wajib jika menggunakan Google Analytics
- Simpan preferensi di localStorage
- Minimal, tidak mengganggu

---

## 19. DESIGN TOKENS & STYLE GUIDE

> **Catatan:** Token warna diambil dari devetek-iot.web.app sebagai base,
> kemudian di-evolusi untuk kesan lebih premium pada Helios.

### Colors — Inherited dari devetek-iot
| Token | Value | Sumber | Catatan |
|-------|-------|--------|---------|
| `--color-bg` | `#0a0e17` | ✅ devetek-iot | Dark navy, identik |
| `--color-bg-alt` | `#060a12` | ✅ devetek-iot | Alternating section, lebih gelap |
| `--color-surface` | `#111827` | ✅ devetek-iot | Card background |
| `--color-surface-hover` | `#1a2332` | 🔄 evolusi | Sedikit lebih terang untuk hover |
| `--color-border` | `#1e293b` | ✅ devetek-iot | Border subtle |
| `--color-primary` | `#249d79` | ✅ devetek-iot | Teal hijau — SAMA persis |
| `--color-primary-light` | `#2ec499` | 🔄 evolusi | Lighter teal untuk hover |
| `--color-primary-glow` | `rgba(36,157,121,0.15)` | 🆕 Helios | Glow effect (tdk ada di devetek-iot) |
| `--color-accent` | `#0271ff` | ✅ devetek-iot | Blue accent — SAMA persis |
| `--color-accent-light` | `#3d94ff` | 🔄 evolusi | Lighter blue untuk hover |
| `--color-text` | `#f1f5f9` | ✅ devetek-iot | Heading text, putih keabu-abuan |
| `--color-text-body` | `#cbd5e1` | ✅ devetek-iot | Body text |
| `--color-text-muted` | `#64748b` | ✅ devetek-iot | Muted/secondary |
| `--color-danger` | `#e00000` | ✅ devetek-iot | Error/danger |
| `--color-warning` | `#ff9f0c` | ✅ devetek-iot | Warning — amber |
| `--color-success` | `#249d79` | ✅ devetek-iot | Success = primary teal |
| `--gradient-primary` | `linear-gradient(135deg, #249d79, #0271ff)` | ✅ devetek-iot | Gradient teal→blue di card borders |
| `--gradient-dark` | `linear-gradient(180deg, #0a0e17, #060a12)` | ✅ devetek-iot | Section backgrounds |
| `--gradient-rainbow` | `linear-gradient(90deg, #e00, #ff9f0c, #249d79, #0271ff)` | ✅ devetek-iot | Garis horizontal divider warna-warni |

### Colors — BARU untuk Helios (tidak ada di devetek-iot)
| Token | Value | Catatan |
|-------|-------|---------|
| `--color-glass` | `rgba(17,24,39,0.6)` | Glassmorphism card background |
| `--color-glass-border` | `rgba(255,255,255,0.08)` | Glassmorphism card border |
| `--color-accent-glow` | `rgba(2,113,255,0.15)` | Blue glow (baru) |
| `--color-whatsapp` | `#25D366` | WhatsApp brand color |
| `--gradient-glass` | `linear-gradient(135deg, rgba(36,157,121,0.1), rgba(2,113,255,0.1))` | Background section accent |

### Typography
| Element | Font | Size | Weight | Catatan |
|---------|------|------|--------|---------|
| H1 (Hero) | Plus Jakarta Sans | 56px / 3.5rem | 800 | Evolusi — devetek-iot pakai sans-serif standar |
| H2 (Section) | Plus Jakarta Sans | 40px / 2.5rem | 700 | |
| H3 (Card Title) | Plus Jakarta Sans | 24px / 1.5rem | 600 | |
| H4 (Sub-heading) | Plus Jakarta Sans | 20px / 1.25rem | 600 | |
| Body | Inter | 16px / 1rem | 400 | |
| Body Small | Inter | 14px / 0.875rem | 400 | |
| Caption | Inter | 12px / 0.75rem | 400 | |
| Button | Inter | 14px / 0.875rem | 600 | |
| Nav Link | Inter | 15px / 0.9375rem | 500 | |
| **Badge/Pill** | **JetBrains Mono** | **11px / 0.69rem** | **600** | **✅ devetek-iot DNA — monospace uppercase** |

### Badge/Pill Component (inherited dari devetek-iot)
```css
/* DNA dari devetek-iot.web.app — badge monospace uppercase */
.badge-pill {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.69rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 4px 12px;
  border-radius: 9999px;
  background: rgba(36, 157, 121, 0.15);
  color: #249d79;
  border: 1px solid rgba(36, 157, 121, 0.3);
}

/* Variasi warna */
.badge-pill--accent  { background: rgba(2,113,255,0.15); color: #3d94ff; border-color: rgba(2,113,255,0.3); }
.badge-pill--warning { background: rgba(255,159,12,0.15); color: #ff9f0c; border-color: rgba(255,159,12,0.3); }
.badge-pill--neutral { background: rgba(100,116,139,0.15); color: #94a3b8; border-color: rgba(100,116,139,0.3); }
```
- Digunakan untuk: section label di atas heading, tag pada card, category marker
- Contoh devetek-iot: `TOPOLOGI SISTEM`, `LAPANGAN`, `NODE HARDWARE`, `4G LTE`
- Contoh Helios: `DASHBOARD`, `WEBGIS`, `ALERT SYSTEM`, `ML ANALYTICS`, `PDAM`

### Spacing
| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |
| `--space-3xl` | 64px |
| `--space-4xl` | 96px |
| `--section-padding` | 96px 0 (desktop), 64px 0 (mobile) |

### Borders & Radius
| Token | Value |
|-------|-------|
| `--radius-sm` | 8px |
| `--radius-md` | 12px |
| `--radius-lg` | 16px |
| `--radius-xl` | 24px |
| `--radius-full` | 9999px |

### Shadows
| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.3)` |
| `--shadow-lg` | `0 8px 30px rgba(0,0,0,0.4)` |
| `--shadow-glow` | `0 0 40px rgba(36,157,121,0.15)` |
| `--shadow-glow-accent` | `0 0 40px rgba(2,113,255,0.15)` |

### Container
| Breakpoint | Max-Width |
|------------|-----------|
| Default | 1200px |
| Narrow | 800px (for text-heavy pages) |
| Wide | 1400px (for gallery) |

---

## 20. STRATEGI RESPONSIF

| Breakpoint | Nama | Grid | Nav |
|------------|------|------|-----|
| ≥ 1200px | Desktop | 3-4 kolom | Full horizontal |
| 992–1199px | Laptop | 3 kolom | Full horizontal (compact) |
| 768–991px | Tablet | 2 kolom | Hamburger menu |
| < 768px | Mobile | 1 kolom | Hamburger + fullscreen overlay |

### Perilaku Responsif Utama:
- **Cards:** 3 col → 2 col → 1 col
- **Feature deep-dive:** Alternating L/R → stacked (image on top)
- **Pricing:** 3 col → horizontal scroll / stacked
- **Screenshots:** 4 col → 2 col → 1 col
- **Hero text:** 56px → 40px → 32px
- **Section padding:** 96px → 64px → 48px
- **Navbar:** horizontal → hamburger at 768px
- **Footer:** 4 col → 2×2 → 1 col

---

## 21. ANIMASI & INTERAKSI

### Animasi Scroll (IntersectionObserver)
| Element | Animation | Trigger |
|---------|-----------|---------|
| Section headings | fade-in + slide-up (20px) | Enters viewport |
| Cards | fade-in + slide-up, staggered 100ms | Enters viewport |
| Screenshots | fade-in + scale(0.95→1) | Enters viewport |
| Stats numbers | Count-up from 0 | Enters viewport |
| Architecture diagram | Draw-in effect | Enters viewport |

### Animasi Hover
| Element | Effect |
|---------|--------|
| Feature cards | translateY(-4px) + box-shadow increase |
| CTA buttons | gradient shimmer sweep |
| Nav links | underline slide-in from left |
| Screenshots | scale(1.03) + glow shadow |
| Social icons | color → primary |
| Pricing cards | border-color → gradient |

### Transisi
| Property | Duration | Easing |
|----------|----------|--------|
| Default | 300ms | ease |
| Hover lift | 200ms | ease-out |
| Fade-in | 600ms | ease |
| Slide-up | 600ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Count-up | 2000ms | ease-out |

### Pemuatan
- Tidak ada loading screen (static HTML, render instan)
- Gambar: lazy loading (`loading="lazy"`)
- Font: `font-display: swap`

---

## 22. SEO & STRATEGI META

### Meta Tags Per Halaman
```html
<!-- Beranda -->
<title>DEVETEK HELIOS — Platform IoT untuk Infrastruktur Kritis</title>
<meta name="description" content="Platform monitoring IoT end-to-end dengan dashboard real-time, pemetaan WebGIS, alert cerdas, analitik ML, dan laporan komprehensif. Dibangun untuk utilitas air, energi, dan IoT industri.">

<!-- Fitur -->
<title>Fitur — DEVETEK HELIOS Platform IoT</title>
<meta name="description" content="Jelajahi 30+ fitur: dashboard dinamis, pemetaan WebGIS, alert cerdas, deteksi anomali ML, ekspor laporan, dan manajemen device.">

<!-- Solusi > Air -->
<title>Solusi IoT Utilitas Air — DEVETEK HELIOS</title>
<meta name="description" content="Monitoring IoT untuk PDAM: manajemen DMA, deteksi kebocoran, monitoring tekanan, pengurangan NRW dengan dashboard real-time dan WebGIS.">
```

### Open Graph (Semua Halaman)
```html
<meta property="og:type" content="website">
<meta property="og:site_name" content="DEVETEK HELIOS">
<meta property="og:image" content="/img/og-image.jpg"> <!-- 1200x630 -->
<meta property="og:locale" content="id_ID">
```

### Schema.org (Halaman Beranda)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "DEVETEK HELIOS",
  "applicationCategory": "IoT Platform",
  "operatingSystem": "Web",
  "description": "Platform monitoring IoT end-to-end untuk infrastruktur kritis",
  "provider": {
    "@type": "Organization",
    "name": "PT. COMON CIPTA INOVASI",
    "brand": "Devetek"
  }
}
</script>
```

### SEO Teknis
- Semantic HTML5: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- Alt text gambar (Bahasa Indonesia)
- `robots.txt` — allow all
- `sitemap.xml` — daftar otomatis semua 22 halaman
- Canonical URLs
- Performance: < 3s LCP, < 100ms FID

---

## 23. STRUKTUR FILE

```
public/
├── index.html                      ← Home / Landing
├── features.html                   ← Features overview
├── solutions.html                  ← Solutions overview
├── screenshots.html                ← Gallery
├── pricing.html                    ← Pricing
├── about.html                      ← About us
├── contact.html                    ← Contact / Demo request
├── demo.html                       ← Live Demo / Sandbox ★ NEW
├── integrations.html               ← Integrations & API ★ NEW
├── security.html                   ← Security & Compliance ★ NEW
├── privacy.html                    ← Privacy Policy ★ NEW
├── terms.html                      ← Terms of Service ★ NEW
├── 404.html                        ← Not Found page ★ NEW
│
├── features/
│   ├── dashboard.html
│   ├── webgis.html
│   ├── alerts.html
│   ├── reports.html
│   ├── ml-analytics.html
│   └── device-management.html
│
├── solutions/
│   ├── water-utility.html
│   ├── energy.html
│   ├── industrial.html
│   └── smart-agriculture.html
│
├── css/
│   ├── style.css                   ← Main styles (tokens, layout, components)
│   └── animations.css              ← Scroll & hover animations
│
├── js/
│   ├── main.js                     ← Navbar, scroll, back-to-top, lightbox
│   ├── form.js                     ← Contact form handler
│   └── cookie-consent.js           ← Cookie banner logic ★ NEW
│
├── img/
│   ├── logo.svg                    ← Devetek Helios logo (SVG)
│   ├── logo-white.svg              ← White variant
│   ├── favicon.ico
│   ├── og-image.jpg                ← Open Graph image (1200x630)
│   │
│   ├── hero/
│   │   ├── home-hero.jpg           ← Dashboard mockup for hero
│   │   ├── features-hero.jpg
│   │   └── solutions-hero.jpg
│   │
│   ├── features/                   ← Feature illustrations (SVG preferred)
│   │   ├── icon-dashboard.svg
│   │   ├── icon-webgis.svg
│   │   ├── icon-alerts.svg
│   │   ├── icon-reports.svg
│   │   ├── icon-ml.svg
│   │   └── icon-devices.svg
│   │
│   ├── solutions/                  ← Industry illustrations
│   │   ├── water.svg
│   │   ├── energy.svg
│   │   ├── industrial.svg
│   │   └── agriculture.svg
│   │
│   ├── screenshots/                ← Symlink or copy from assets/img/landing/
│   │   ├── mockup-1.jpg
│   │   ├── mockup-1-thumb.jpg
│   │   ├── ... (mockup 1-12 + thumbs)
│   │   └── cover.jpg
│   │
│   ├── integrations/               ← Protocol & hardware logos ★ NEW
│   │   ├── mqtt.svg
│   │   ├── esp32.svg
│   │   ├── teltonika.svg
│   │   └── ...
│   │
│   ├── tech/                       ← Tech stack logos
│   │   ├── angular.svg
│   │   ├── nestjs.svg
│   │   ├── postgresql.svg
│   │   ├── clickhouse.svg
│   │   └── ...
│   │
│   └── team/                       ← Team photos (optional)
│       ├── member-1.jpg
│       └── ...
│
├── robots.txt
└── sitemap.xml
```

---

## 24. FASE IMPLEMENTASI

### Phase 1 — Core (MVP Landing) ⏱️ ~2-3 hari
| # | Task | Pages |
|---|------|-------|
| 1 | Setup: CSS tokens, shared components (navbar, footer, CTA, WhatsApp, cookie) | — |
| 2 | Home (index.html) — semua 13 sections | 1 page |
| 3 | Features overview (features.html) | 1 page |
| 4 | Contact / Request Demo (contact.html) | 1 page |
| 5 | Screenshots gallery (screenshots.html) | 1 page |
| 6 | 404 page (404.html) | 1 page |
| **Total Phase 1** | | **5 pages + shared** |

### Phase 2 — Feature Deep-Dive ⏱️ ~1-2 hari
| # | Task | Pages |
|---|------|-------|
| 7 | Dashboard deep-dive | 1 page |
| 8 | WebGIS deep-dive | 1 page |
| 9 | Alerts deep-dive | 1 page |
| 10 | Reports deep-dive | 1 page |
| 11 | ML Analytics deep-dive | 1 page |
| 12 | Device Management deep-dive | 1 page |
| **Total Phase 2** | | **6 pages** |

### Phase 3 — Solutions, Company & Trust ⏱️ ~2-3 hari
| # | Task | Pages |
|---|------|-------|
| 13 | Solutions overview | 1 page |
| 14 | Water Utility solution | 1 page |
| 15 | Energy solution | 1 page |
| 16 | Industrial IoT solution | 1 page |
| 17 | Smart Agriculture solution | 1 page |
| 18 | About Us | 1 page |
| 19 | Pricing | 1 page |
| 20 | Integrations & API | 1 page |
| 21 | Security & Compliance | 1 page |
| **Total Phase 3** | | **9 pages** |

### Phase 4 — Demo & Legal ⏱️ ~1 hari
| # | Task | Pages |
|---|------|-------|
| 22 | Live Demo page + backend demo user setup | 1 page |
| 23 | Privacy Policy | 1 page |
| 24 | Terms of Service | 1 page |
| **Total Phase 4** | | **3 pages** |

### Phase 5 — Polish & Launch ⏱️ ~1 hari
| # | Task |
|---|------|
| 25 | SEO: meta tags, OG, schema.org, sitemap.xml, robots.txt |
| 26 | Performance: image optimization, lazy loading, WebP conversion |
| 27 | Cross-browser testing (Chrome, Safari, Firefox, Edge) |
| 28 | Mobile responsive QA (iPhone, Android, iPad) |
| 29 | Firebase hosting config (404 redirect, caching headers) |
| 30 | Firebase deploy |

### Phase 6 — Post-Launch (Opsional)
| # | Task |
|---|------|
| 31 | Blog system |
| 32 | Language toggle (EN/ID) full i18n |
| 33 | Analytics integration (GA4) |
| 34 | A/B testing CTA buttons |
| 35 | Real testimonials + client logos |
| 36 | Product video (YouTube/Vimeo embed) |
| 37 | Changelog / Release Notes page |
| 38 | Case Study pages (detailed) |

---

## 25. CHECKLIST KONTEN

### Text Content Needed (sebelum coding):
| Page | Content | Status |
|------|---------|--------|
| Home | Hero tagline & subtitle | ✅ Drafted |
| Home | Platform overview text | ✅ Drafted |
| Home | Feature card descriptions | ✅ Drafted |
| Home | How It Works steps | ✅ Drafted |
| Home | Performance numbers | ⬜ Need benchmarking |
| Home | Testimonial quotes (3) | ⬜ Need real/placeholder |
| Features | All 6 feature descriptions | ✅ Drafted |
| Features | Comparison table data | ⬜ Need competitor research |
| Solutions | 4 industry descriptions | ✅ Drafted |
| Solutions | Challenge → Solution mapping | ✅ Drafted |
| Pricing | Plan names, prices, features | ⬜ Need pricing decision |
| About | Company story, mission | ⬜ Need from founder |
| About | Team member info | ⬜ Need photos + bios |
| Contact | Email, phone, address | ⬜ Need real contact info |
| Contact | WhatsApp number | ⬜ Need from sales |
| Demo | Demo credentials setup | ⬜ Need backend setup |
| Demo | Guided tour steps | ✅ Drafted |
| Integrations | Protocol & hardware list | ✅ Drafted |
| Security | Security features list | ✅ Drafted |
| Privacy | Privacy policy text | ⬜ Need legal review |
| Terms | Terms of service text | ⬜ Need legal review |
| All | Client/partner logos | ⬜ Need permissions |

### Image Assets Needed:
| Asset | Status |
|-------|--------|
| App screenshots (mockup-1..12) | ✅ Existing |
| Logo SVG | ⬜ Need vector version |
| OG Image (1200x630) | ⬜ Need to create |
| Feature icons (6 SVGs) | ⬜ Will create inline SVG |
| Industry illustrations (4 SVGs) | ⬜ Will create or source |
| Integration/protocol logos | ⬜ Will source (open-source logos) |
| Hardware photos (ESP32, Teltonika) | ⬜ Stock or product photos |
| Tech stack logos | ⬜ Easy to source (open) |
| Team photos | ⬜ Need from team |
| Client logos | ⬜ Need from partnerships |
| 404 illustration | ⬜ Will create SVG |
| Product video (2-3 min) | ⬜ Need to record/edit |

---

## 26. ANALISIS GAP REVIEW ★ NEW

### Apa yang ditambahkan di v2 dan kenapa:

| # | Gap di v1 | Solusi di v2 | Kenapa Penting |
|---|-----------|-------------|----------------|
| 1 | **Tidak ada Live Demo** | Tambah `/demo.html` dengan sandbox account + guided tour | ThingsBoard, Ubidots, Losant SEMUA punya live demo. Ini conversion driver #1 — visitor bisa langsung rasakan platform |
| 2 | **Tidak ada halaman Integrations** | Tambah `/integrations.html` dengan protocol, hardware, API docs | Technical buyers & developers PASTI cari ini. "What devices does it support? Is there an API?" |
| 3 | **Tidak ada Security page** | Tambah `/security.html` dengan auth, encryption, compliance | Enterprise & BUMN **WAJIB** tahu soal keamanan sebelum procure. Tanpa ini = instant rejection |
| 4 | **Tidak ada Legal pages** | Tambah `/privacy.html` + `/terms.html` | **Wajib hukum** jika collect data via form. Juga syarat Google Analytics & profesionalisme |
| 5 | **Tidak ada 404 page** | Tambah `/404.html` yang branded + helpful links | Visitor yang masuk dari Google ke broken link = lost forever tanpa proper 404 |
| 6 | **Tidak ada WhatsApp floating** | Tambah WhatsApp widget di shared components | **Pasar Indonesia**: WhatsApp = channel komunikasi #1. Semua product website Indo punya ini |
| 7 | **Tidak ada Cookie Consent** | Tambah cookie banner component | Wajib jika pasang analytics. GDPR compliance |
| 8 | **Tidak ada "How It Works"** | Tambah section di Home (4 steps) | Visitor perlu tahu flow: Connect → Collect → Analyze → Act. Mengurangi friction |
| 9 | **Tidak ada Performance Numbers** | Tambah stats section (response time, throughput, uptime) | Technical credibility. Angka konkret > kata-kata marketing |
| 10 | **Tidak ada Integration Logos** | Tambah logo bar (ESP32, Teltonika, MQTT, etc.) | Quick visual proof bahwa platform work with real hardware |
| 11 | **Hero hanya 2 CTA** | Tambah 3 CTA: Request Demo + Try Live Demo + Docs | Multiple entry points = higher conversion rate |
| 12 | **Footer terlalu sederhana** | Tambah kolom Resources + Legal dengan all new pages | Complete footer = professional & good SEO (internal links) |
| 13 | **Navbar hanya 1 CTA** | Tambah 2 CTA: "Try Demo" (ghost) + "Request Demo" (solid) | Dual CTA = 2 conversion paths (self-service vs sales-assisted) |

### Hal yang BELUM ada tapi bisa dipertimbangkan (Phase 6+):

| # | Item | Priority | Note |
|---|------|----------|------|
| 1 | **Product Video** | High | 2-3 min walkthrough, bisa YouTube/Vimeo embed |
| 2 | **Changelog / Release Notes** | Medium | Menunjukkan active development → builds trust |
| 3 | **Case Study pages** | High | Detailed story: problem → solution → result. Paling kuat untuk closing |
| 4 | **ROI Calculator** | Low | "Berapa penghematan jika pakai Helios?" — nice to have |
| 5 | **Webinar / Event page** | Low | Jika ada marketing events |
| 6 | **Partner Program page** | Low | Jika buka reseller/integrator program |
| 7 | **Status Page** (uptime) | Medium | status.devetek.com — build trust operasional |
| 8 | **Multi-language (ID/EN toggle)** | Medium | Full i18n, bukan hanya subtitle |
| 9 | **Careers page** | Low | Jika hiring |
| 10 | **Mobile App announcement** | Low | Jika ada rencana mobile app |

---

## RINGKASAN

| Metrik | v1 | v2 | v3 (Sekarang) |
|--------|-----|-----|---------------|
| Total Halaman | 16 | 22 | **22** |
| Section Beranda | 10 | 13 | **13** |
| Komponen Bersama | 5 | 7 | **7** |
| File CSS | 2 | 2 | 2 |
| File JS | 2 | 3 | **3** |
| Fase Implementasi | 5 | 6 | **6** |
| Estimasi Waktu Dev | ~5-8 hari | ~7-10 hari | **~7-10 hari** |
| Dependencies | 0 | 0 | 0 |
| Font Eksternal | 2 | 2 | **3** (+JetBrains Mono) |
| Bahasa | EN/ID mix | EN/ID mix | **Full Bahasa Indonesia** |
| Brand Style | Custom | Custom | **Evolusi devetek-iot** |

### Perubahan v3 vs v2:
| Aspek | v2 | v3 |
|-------|-----|-----|
| **Bahasa** | Campuran EN/ID | Full Bahasa Indonesia |
| **Brand** | "Devetek Helios" | "DEVETEK HELIOS" standalone, logo `[D]` |
| **Style DNA** | Custom dark theme | Evolusi dari devetek-iot.web.app |
| **Badge/Pill** | Tidak ada | Monospace uppercase badges (dari devetek-iot) |
| **Glassmorphism** | Tidak ada | Card glassmorphism effect |
| **Font** | 2 (Plus Jakarta + Inter) | 3 (+JetBrains Mono untuk badges) |
| **Cross-link** | Tidak ada | Footer link ke devetek-iot.web.app |
| **Contact info** | Placeholder | koko@devetek.com, +62 856-2302-229 |
| **Company** | "Devetek" | PT. COMON CIPTA INOVASI |

### Halaman Baru (dari v2):
| Halaman | Tipe | Fase |
|---------|------|------|
| `/demo.html` | Demo Langsung / Sandbox | Fase 4 |
| `/integrations.html` | Integrasi & API | Fase 3 |
| `/security.html` | Keamanan & Kepatuhan | Fase 3 |
| `/privacy.html` | Kebijakan Privasi | Fase 4 |
| `/terms.html` | Syarat & Ketentuan | Fase 4 |
| `/404.html` | Halaman Tidak Ditemukan | Fase 1 |

### Komponen Bersama Baru (dari v2):
| Komponen | Tujuan |
|----------|--------|
| Tombol Melayang WhatsApp | Standar pasar Indonesia, kontak instan |
| Banner Persetujuan Cookie | Kepatuhan hukum, prasyarat analytics |

---

## STRATEGI CROSS-LINK

### devetek-iot.web.app → devetek-helios.web.app
| Lokasi di devetek-iot | Link Target | Teks |
|----------------------|-------------|------|
| Section "HELIOS Cloud" | devetek-helios.web.app | "Jelajahi HELIOS Platform →" |
| Navbar | devetek-helios.web.app | "HELIOS Cloud" |
| Footer | devetek-helios.web.app | "Platform HELIOS" |
| Subscription section | devetek-helios.web.app/pricing.html | "Lihat Paket Langganan →" |

### devetek-helios.web.app → devetek-iot.web.app
| Lokasi di Helios | Link Target | Teks |
|------------------|-------------|------|
| Footer → "DEVETEK HARDWARE" | devetek-iot.web.app | "Lihat produk hardware IoT kami →" |
| Integrasi page → Hardware | devetek-iot.web.app/#produk | "Lihat spesifikasi hardware →" |
| Solusi pages → Hardware | devetek-iot.web.app | "Perangkat yang didukung →" |

### Shared Branding:
- Logo `[D]` sama di kedua site
- Color palette compatible (same teal/navy base)
- Footer structure mirip
- WhatsApp number sama: +62 856-2302-229

---

> **Status:** Draft v3 — Aligned with devetek-iot.web.app, Full Bahasa Indonesia  
> **Langkah Selanjutnya:** Final approval dari kamu, lalu mulai coding Fase 1.
