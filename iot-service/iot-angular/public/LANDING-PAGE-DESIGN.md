# DEVETEK HELIOS — Product Website Design Document

> **Status:** Draft v2 — Review Complete  
> **Target:** `iot-angular/public/` (Static HTML, terpisah dari Angular app)  
> **Deploy:** Firebase Hosting (`devetek-helios`)  
> **Reference Sites:** ThingsBoard.io, Ubidots.com, Losant.com, Blynk.io, TagoIO.com, Particle.io

---

## TABLE OF CONTENTS

1. [Sitemap & Page Structure](#1-sitemap--page-structure)
2. [Page Detail — Home (Landing)](#2-home-landing)
3. [Page Detail — Features](#3-features)
4. [Page Detail — Features Sub-Pages (6)](#4-features-sub-pages)
5. [Page Detail — Solutions / Use Cases](#5-solutions--use-cases)
6. [Page Detail — Solutions Sub-Pages (4)](#6-solutions-sub-pages)
7. [Page Detail — Screenshots / Gallery](#7-screenshots--gallery)
8. [Page Detail — Pricing](#8-pricing)
9. [Page Detail — Documentation (link)](#9-documentation)
10. [Page Detail — About Us](#10-about-us)
11. [Page Detail — Contact / Request Demo](#11-contact--request-demo)
12. [Page Detail — Blog (Opsional Phase 2)](#12-blog)
13. [**NEW** — Live Demo / Sandbox](#13-live-demo--sandbox)
14. [**NEW** — Integrations & API](#14-integrations--api)
15. [**NEW** — Security & Compliance](#15-security--compliance)
16. [**NEW** — Legal Pages](#16-legal-pages)
17. [**NEW** — 404 Page](#17-404-page)
18. [Shared Components](#18-shared-components)
19. [Design Tokens & Style Guide](#19-design-tokens--style-guide)
20. [Responsive Strategy](#20-responsive-strategy)
21. [Animation & Interaction](#21-animation--interaction)
22. [SEO & Meta Strategy](#22-seo--meta-strategy)
23. [File Structure](#23-file-structure)
24. [Implementation Phases](#24-implementation-phases)
25. [Content Checklist](#25-content-checklist)
26. [**NEW** — Review Gap Analysis](#26-review-gap-analysis)

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
│ [Logo] Devetek Helios    Features ▾  Solutions ▾  Integrations         │
│                          Pricing  Screenshots  About                   │
│                                       [Try Demo]  [Request Demo →]     │
└─────────────────────────────────────────────────────────────────────────┘
```
- Dropdown **Features**: 6 sub-items + "All Features" link
- Dropdown **Solutions**: 4 industry items + "All Solutions" link
- **2 CTA buttons**: "Try Demo" (ghost/outline) + "Request Demo" (solid primary)
- Mobile: hamburger → full-screen overlay menu
- Scroll: transparent → `rgba(10,14,23,0.95)` backdrop-blur

#### 2.2 HERO SECTION
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│         Your IoT Infrastructure,                                │
│         Unified & Intelligent.                                  │
│                                                                 │
│         Platform monitoring IoT end-to-end untuk                │
│         industri air, energi, dan infrastruktur kritis.         │
│                                                                 │
│         [🚀 Request Demo]  [▶ Try Live Demo]  [📖 Docs]        │
│                                                                 │
│               ╔══════════════════════════╗                      │
│               ║   Dashboard Screenshot   ║ ← floating, tilted  │
│               ║   with glow effect       ║   perspective        │
│               ╚══════════════════════════╝                      │
│                                                                 │
│   ▽ Scroll to explore                                          │
└─────────────────────────────────────────────────────────────────┘
```
- Background: dark gradient + animated mesh/grid pattern (CSS only)
- Screenshot: `mockup-1.jpg` dengan CSS 3D perspective + box-shadow glow
- **3 CTA buttons**: Request Demo (primary), Try Live Demo (ghost → link ke sandbox), Docs (text link)
- Stats bar di bawah hero:
  ```
  30+ Features  |  6+ Widget Types  |  34 Entities  |  3 Service Architecture
  ```

#### 2.3 TRUSTED BY
```
────────── Trusted by leading organizations ──────────
[Logo 1]   [Logo 2]   [Logo 3]   [Logo 4]   [Logo 5]
```
- Grayscale logos, hover: color
- Auto-scroll infinite marquee (CSS animation)
- Placeholder: "Your Logo Here" boxes

#### 2.4 PLATFORM OVERVIEW (3 Columns)
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  [Icon: Monitor]  │  │  [Icon: Shield]   │  │  [Icon: Puzzle]   │
│                   │  │                   │  │                   │
│  Monitor          │  │  Analyze          │  │  Act              │
│  Everything       │  │  Intelligently    │  │  Immediately      │
│                   │  │                   │  │                   │
│  Real-time data   │  │  ML-powered       │  │  Configurable     │
│  from sensors,    │  │  anomaly          │  │  alerts, auto     │
│  nodes & gateways │  │  detection &      │  │  commands, and    │
│  in one unified   │  │  forecasting for  │  │  report generation│
│  dashboard.       │  │  predictive       │  │  for rapid        │
│                   │  │  insight.         │  │  response.        │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

#### 2.5 FEATURE HIGHLIGHTS (6 Cards → link ke /features/*.html)
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│ 📊      │  │ 🗺️      │  │ ⚠️      │
│Dashboard│  │ WebGIS  │  │ Smart   │
│& Widget │  │ Mapping │  │ Alerts  │
│ Builder │  │         │  │         │
│         │  │         │  │         │
│[Learn→] │  │[Learn→] │  │[Learn→] │
└─────────┘  └─────────┘  └─────────┘
┌─────────┐  ┌─────────┐  ┌─────────┐
│ 📈      │  │ 🤖      │  │ 🔧      │
│Report & │  │ ML      │  │ Device  │
│ Export  │  │Analytics│  │ Mgmt    │
│         │  │         │  │         │
│[Learn→] │  │[Learn→] │  │[Learn→] │
└─────────┘  └─────────┘  └─────────┘
```
- Grid 3×2 desktop, 2×3 tablet, 1×6 mobile
- Hover: card lift + gradient border glow
- Each card links to respective `/features/*.html`

#### 2.6 SCREENSHOT PREVIEW (Mini Gallery)
```
┌─────────────────────────────────────────────────────────────────┐
│  See Helios in Action                                          │
│                                                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                       │
│  │mock-1│  │mock-2│  │mock-3│  │mock-4│                       │
│  └──────┘  └──────┘  └──────┘  └──────┘                       │
│                                                                 │
│                  [View All Screenshots →]                       │
└─────────────────────────────────────────────────────────────────┘
```
- 4 thumbnails (dari mockup existing), click → lightbox
- "View All" link ke `/screenshots.html`

#### 2.7 USE CASES PREVIEW
```
Built for Critical Industries
Dibangun untuk industri-industri kritis

┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  💧             │  │  ⚡             │  │  🏭             │  │  🌾             │
│  Water Utility  │  │  Energy &      │  │  Industrial    │  │  Smart         │
│  / PDAM         │  │  Power         │  │  IoT           │  │  Agriculture   │
│                 │  │                │  │                │  │                │
│  [Explore →]    │  │  [Explore →]   │  │  [Explore →]   │  │  [Explore →]   │
└────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘
```

#### 2.8 HOW IT WORKS ★ NEW
```
How It Works — From Sensor to Insight in 4 Steps
Cara Kerja — Dari Sensor ke Insight dalam 4 Langkah

  ①                    ②                     ③                    ④
  CONNECT              COLLECT               ANALYZE              ACT
  ───────              ───────               ───────              ───────
  Hubungkan sensor     Data masuk secara     Dashboard, alert     Terima notifikasi,
  & node via MQTT      real-time ke          rule, ML anomaly     kirim command,
  atau TCP. Auto-      ClickHouse &          & forecast           export report,
  discovery untuk      PostgreSQL.           memproses data       kontrol relay
  device baru.         Zero data loss.       otomatis.            dari mana saja.

  [Icon: Plug]         [Icon: Database]      [Icon: Brain]        [Icon: Zap]

                ─────→              ─────→              ─────→
```
- **Horizontal stepper** dengan connecting line
- Icon besar di atas, numbered circle
- Mobile: vertical stack
- Each step fade-in on scroll with stagger

#### 2.9 INTEGRATION LOGOS BAR ★ NEW
```
Works With Your Existing Infrastructure
Terintegrasi dengan infrastruktur yang sudah ada

[ESP32]  [Teltonika]  [MQTT]  [PostgreSQL]  [ClickHouse]  [Firebase]
[REST API]  [Webhooks]  [SHP/GeoJSON]  [XLSX]  [CSV]
```
- 2 row logo/badge strip
- Grayscale → color on hover
- Link ke `/integrations.html`

#### 2.10 PERFORMANCE NUMBERS ★ NEW
```
Platform Performance
Angka yang berbicara

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   < 500ms    │  │   10K+       │  │   99.9%      │  │   24/7       │
│   Avg API    │  │   Data Points│  │   Uptime     │  │   Real-Time  │
│   Response   │  │   /second    │  │   SLA        │  │   Monitoring │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```
- Count-up animation on scroll
- Builds credibility for technical decision makers
- Angka bisa disesuaikan after benchmarking

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

#### 2.12 CTA BANNER
```
┌─────────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓ gradient background ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│                                                                 │
│          Ready to Transform Your IoT Operations?                │
│          Siap mentransformasi operasi IoT Anda?                 │
│                                                                 │
│          [🚀 Request Demo]    [📧 Contact Sales]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.13 FOOTER
```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] Devetek Helios                                         │
│  IoT Platform for Critical Infrastructure                       │
│                                                                 │
│  PRODUCT          SOLUTIONS         COMPANY        RESOURCES    │
│  Features         Water Utility     About Us       Documentation│
│  Dashboard        Energy            Contact        API Reference│
│  WebGIS           Industrial        Pricing        Blog         │
│  Alerts           Agriculture       Careers ★      Changelog ★  │
│  Reports                                                        │
│  ML Analytics     CONNECT           LEGAL                       │
│  Widget Builder   Email             Privacy Policy ★            │
│  Integrations ★   WhatsApp          Terms of Service ★          │
│                   LinkedIn          Security ★                  │
│                   GitHub                                        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  © 2026 Devetek. All rights reserved.      [ID 🇮🇩] [EN 🇬🇧]  │
└─────────────────────────────────────────────────────────────────┘
```
- ★ = new additions vs previous draft
- 5 columns on desktop, collapsed accordion on mobile

---

## 3. FEATURES (Overview)

**URL:** `/features.html`  
**Purpose:** Showcase semua fitur platform secara ringkas, arahkan visitor ke deep-dive page  

### Sections:

#### 3.1 HERO (Compact)
```
Platform Features
Explore the complete toolkit that makes Devetek Helios 
the most comprehensive IoT platform.
```
- Background: subtle gradient, no screenshot
- Breadcrumb: `Home > Features`

#### 3.2 FEATURE GRID (6 Large Cards)
Masing-masing card berisi:
- **Icon** (SVG)
- **Title** (EN)
- **Subtitle** (ID)
- **3-4 bullet points** highlights
- **Screenshot thumbnail** kecil
- **[Read More →]** link ke sub-page

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
│  ┌──────────────┐     [Explore →]         │
│  │  [thumbnail] │                          │
│  └──────────────┘                          │
└────────────────────────────────────────────┘
```

#### 3.3 COMPARISON TABLE
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
- Competitor names bisa diganti "Platform A / B" atau di-blur
- Purpose: highlight keunggulan Helios

#### 3.4 ARCHITECTURE DIAGRAM
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
- Purpose: show technical capability to technical audience

#### 3.5 CTA
```
Want to see these features in action?
[Request a Live Demo →]
```

---

## 4. FEATURES SUB-PAGES (6 Pages)

Setiap sub-page punya **template yang sama** dengan konten berbeda:

### Template Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Home > Features > [Feature Name]                  │
│                                                                 │
│  HERO: Title + Subtitle + Full-width Screenshot                │
│                                                                 │
│  SECTION 1: Overview paragraph (2-3 paragraf)                  │
│                                                                 │
│  SECTION 2: Key Capabilities (4-6 items, icon+title+desc)      │
│                                                                 │
│  SECTION 3: Alternating image+text blocks (2-3 blocks)         │
│                                                                 │
│  SECTION 4: Technical Specs (table/list)                       │
│                                                                 │
│  SECTION 5: Related Features (3 cards linking to other pages)  │
│                                                                 │
│  CTA: "See it in action → Request Demo"                        │
└─────────────────────────────────────────────────────────────────┘
```

### 4.1 `/features/dashboard.html` — Dashboard & Widget Builder

**Hero Image:** Dashboard overview screenshot  
**Tagline:** *"Build Dashboards That Match Your Operations"*  
**Subtitle ID:** *Bangun dashboard yang sesuai dengan operasi Anda*

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

### 4.2 `/features/webgis.html` — WebGIS & Spatial Mapping

**Hero Image:** WebGIS map view screenshot  
**Tagline:** *"Your Assets on the Map, In Real Time"*  
**Subtitle ID:** *Aset Anda di peta, secara real-time*

**Key Capabilities:**
| # | Capability | Description |
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

### 4.3 `/features/alerts.html` — Smart Alerts & Monitoring

**Hero Image:** Alert center screenshot  
**Tagline:** *"Know Before It Breaks"*  
**Subtitle ID:** *Tahu sebelum terjadi masalah*

**Key Capabilities:**
| # | Capability | Description |
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

### 4.4 `/features/reports.html` — Report & Export

**Hero Image:** Report preview screenshot  
**Tagline:** *"From Raw Data to Executive Reports in Minutes"*  
**Subtitle ID:** *Dari data mentah ke laporan eksekutif dalam hitungan menit*

**Key Capabilities:**
| # | Capability | Description |
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

### 4.5 `/features/ml-analytics.html` — ML & AI Analytics

**Hero Image:** ML dashboard screenshot  
**Tagline:** *"AI-Powered Insights for Predictive Operations"*  
**Subtitle ID:** *Wawasan berbasis AI untuk operasi prediktif*

**Key Capabilities:**
| # | Capability | Description |
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

### 4.6 `/features/device-management.html` — Device & Sensor Management

**Hero Image:** Node list/detail screenshot  
**Tagline:** *"Every Device, Every Sensor, Under Control"*  
**Subtitle ID:** *Setiap device, setiap sensor, dalam kendali*

**Key Capabilities:**
| # | Capability | Description |
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

## 5. SOLUTIONS / USE CASES (Overview)

**URL:** `/solutions.html`  
**Purpose:** Mapping fitur Helios ke kebutuhan industri spesifik

### Sections:

#### 5.1 HERO
```
Solutions for Every Industry
Solusi untuk setiap industri

Devetek Helios adapts to your industry's unique 
monitoring and control requirements.
```

#### 5.2 INDUSTRY GRID (4 Large Cards)
```
┌─────────────────────────┐  ┌─────────────────────────┐
│  💧 Water Utility / PDAM │  │  ⚡ Energy & Power       │
│                          │  │                          │
│  DMA monitoring, leak    │  │  VSD monitoring, power   │
│  detection, pressure &   │  │  consumption, predictive │
│  flow analysis, pipe     │  │  maintenance, grid       │
│  network visualization   │  │  monitoring              │
│                          │  │                          │
│  [Explore Solution →]    │  │  [Explore Solution →]    │
└─────────────────────────┘  └─────────────────────────┘
┌─────────────────────────┐  ┌─────────────────────────┐
│  🏭 Industrial IoT       │  │  🌾 Smart Agriculture    │
│                          │  │                          │
│  Factory monitoring,     │  │  Soil moisture, weather  │
│  production telemetry,   │  │  station, irrigation     │
│  quality control,        │  │  control, crop           │
│  predictive maintenance  │  │  monitoring              │
│                          │  │                          │
│  [Explore Solution →]    │  │  [Explore Solution →]    │
└─────────────────────────┘  └─────────────────────────┘
```

#### 5.3 CROSS-INDUSTRY BENEFITS
```
Applicable Across All Industries:

[Icon] Multi-Tenant     → Kelola banyak klien/project dalam 1 platform
[Icon] Real-Time        → Data real-time dari lapangan ke dashboard
[Icon] Scalable         → Dari 10 node sampai 10.000+ node
[Icon] Secure           → Role-based access, audit logs, JWT auth
[Icon] API-First        → Swagger docs, OpenAPI SDK auto-generation
[Icon] Cloud-Ready      → Firebase hosting, PM2 production deployment
```

---

## 6. SOLUTIONS SUB-PAGES (4 Pages)

### Template Layout (sama untuk semua):
```
┌─────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Home > Solutions > [Industry]                     │
│                                                                 │
│  HERO: Industry title + illustration + tagline                 │
│                                                                 │
│  SECTION 1: Industry Challenges (3-4 pain points)              │
│                                                                 │
│  SECTION 2: How Helios Solves It (feature mapping)             │
│                                                                 │
│  SECTION 3: Example Dashboard Layout (mockup/wireframe)        │
│                                                                 │
│  SECTION 4: Key Metrics Monitored (table/cards)                │
│                                                                 │
│  SECTION 5: Testimonial (industry-specific, placeholder)       │
│                                                                 │
│  CTA: "See how Helios works for [Industry] → Request Demo"    │
└─────────────────────────────────────────────────────────────────┘
```

### 6.1 `/solutions/water-utility.html` — PDAM / Water Utility

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

### 6.2 `/solutions/energy.html` — Energy & Power

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

### 6.3 `/solutions/industrial.html` — Industrial IoT

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

### 6.4 `/solutions/smart-agriculture.html` — Smart Agriculture

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

## 7. SCREENSHOTS / GALLERY

**URL:** `/screenshots.html`  
**Purpose:** Visual showcase platform, build confidence sebelum demo

### Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│  Screenshots & Gallery                                         │
│  Lihat Helios beraksi                                          │
│                                                                 │
│  FILTER TABS:                                                  │
│  [All] [Dashboard] [WebGIS] [Alerts] [Reports] [Devices]     │
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

**Features:**
- Masonry grid layout (4 col desktop, 2 col tablet, 1 col mobile)
- Tab filtering by category (frontend JS filter, no reload)
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

## 8. PRICING

**URL:** `/pricing.html`  
**Purpose:** Transparansi harga, konversi ke contact/demo

### Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│  Simple, Transparent Pricing                                   │
│  Harga yang sederhana dan transparan                           │
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

## 9. DOCUMENTATION (Link Only)

**Tidak buat halaman baru** — langsung link ke:
- App documentation: `/iot/document` (sudah ada di Angular app)
- API docs: `/api` (Swagger)

Di navbar & footer, link "Docs" arahkan ke:
```
https://devetek-helios.web.app/iot/document
```

---

## 10. ABOUT US

**URL:** `/about.html`  
**Purpose:** Build trust, company credibility, team showcase

### Sections:

#### 10.1 HERO
```
About Devetek
Building the Future of IoT Infrastructure
Membangun masa depan infrastruktur IoT
```

#### 10.2 COMPANY STORY
```
Devetek was founded with a mission to make IoT infrastructure 
management accessible, intelligent, and reliable for organizations 
managing critical infrastructure.

[2-3 paragraf tentang visi, misi, dan perjalanan perusahaan]
```

#### 10.3 MISSION & VALUES (3-4 Cards)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 🎯 Mission    │  │ 🔍 Accuracy  │  │ ⚡ Speed     │  │ 🤝 Trust     │
│               │  │               │  │               │  │               │
│ Democratize   │  │ Every data    │  │ Real-time    │  │ Reliable     │
│ IoT for       │  │ point         │  │ always,      │  │ partners    │
│ critical      │  │ matters       │  │ everywhere   │  │ for your    │
│ infrastructure│  │               │  │               │  │ operations  │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

#### 10.4 TEAM (Opsional)
```
Meet Our Team

┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│ foto │  │ foto │  │ foto │  │ foto │
│      │  │      │  │      │  │      │
│ Nama │  │ Nama │  │ Nama │  │ Nama │
│ Role │  │ Role │  │ Role │  │ Role │
└──────┘  └──────┘  └──────┘  └──────┘
```
- Placeholder foto, bisa diisi nanti

#### 10.5 NUMBERS / MILESTONES
```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   30+    │  │   3      │  │   34     │  │  2024    │
│ Features │  │ Services │  │ Entities │  │ Founded  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

#### 10.6 TECH STACK BADGES
```
Built With:
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

## 13. LIVE DEMO / SANDBOX ★ NEW

**URL:** `/demo.html`  
**Purpose:** Biarkan visitor mencoba platform tanpa perlu sign up / contact sales dulu. Ini **conversion driver terkuat** — semua IoT platform besar punya ini (ThingsBoard Demo, Ubidots Demo, Blynk Demo).

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

## 14. INTEGRATIONS & API ★ NEW

**URL:** `/integrations.html`  
**Purpose:** Technical buyers & developers ingin tahu integrasi apa saja yang didukung. Semua platform IoT besar punya halaman ini.

### Sections:

#### 14.1 HERO
```
Integrations & API
Connect Helios with your existing infrastructure
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

## 15. SECURITY & COMPLIANCE ★ NEW

**URL:** `/security.html`  
**Purpose:** Enterprise clients dan BUMN **pasti tanya soal keamanan**. Tanpa halaman ini, mereka ragu.

### Sections:

#### 15.1 HERO
```
Security & Compliance
Your data protection is our priority
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

## 16. LEGAL PAGES ★ NEW

### 16.1 Privacy Policy (`/privacy.html`)
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

### 16.2 Terms of Service (`/terms.html`)
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

## 17. 404 PAGE ★ NEW

**URL:** `/404.html`  
**Purpose:** Jangan biarkan visitor stuck di halaman error jelek. Ubah 404 jadi conversion opportunity.

### Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    ╔════════════════╗                            │
│                    ║      404       ║                            │
│                    ╚════════════════╝                            │
│                                                                 │
│              Page Not Found                                     │
│              Halaman tidak ditemukan                             │
│                                                                 │
│    The page you're looking for doesn't exist                    │
│    or has been moved.                                           │
│                                                                 │
│    [🏠 Back to Home]    [📧 Contact Us]    [🔍 Search]          │
│                                                                 │
│    Popular Pages:                                               │
│    • Features overview                                          │
│    • Request a demo                                             │
│    • Water utility solution                                     │
│    • Screenshots gallery                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
- Animated illustration (SVG satellites/nodes floating)
- Search bar (optional, simple JS filter against sitemap)
- Quick links to popular pages
- Firebase Hosting: configure 404 in `firebase.json`

---

## 18. SHARED COMPONENTS

### 18.1 NAVBAR (All Pages)
- Logo + brand text
- Menu: Features (dropdown), Solutions (dropdown), Integrations, Pricing, Screenshots, About
- CTA Buttons: "Try Demo" (ghost) + "Request Demo" (solid)
- Mobile hamburger menu
- Active page indicator
- Transparent → solid on scroll (home only), solid on inner pages

### 18.2 FOOTER (All Pages)
- 4 column layout: Product, Solutions, Company, Connect
- Logo + tagline
- Copyright
- Social links: LinkedIn, GitHub, Instagram
- Language toggle (EN/ID) — Phase 2

### 18.3 CTA BANNER (Reusable)
- Gradient background
- Title + subtitle + 2 buttons
- Used on: Home, Features, Solutions, About

### 18.4 BREADCRUMB (Inner Pages Only)
```
Home > Features > Dashboard & Widget Builder
```

### 18.5 BACK-TO-TOP BUTTON
- Fixed bottom-right
- Appears after scrolling 300px
- Smooth scroll to top

### 18.6 WHATSAPP FLOATING BUTTON ★ NEW
```
                                        ┌──────────────┐
                                        │ 💬 Chat with │
                                        │    us        │
                                        └──────┬───────┘
                                               │
                                        ┌──────┴───────┐
                                        │  [WA Icon]   │
                                        └──────────────┘
```
- Fixed bottom-right (above back-to-top)
- Green WhatsApp icon (brand color #25D366)
- Hover: tooltip "Chat with us"
- Click: open `wa.me/62xxx` in new tab
- **Wajib untuk pasar Indonesia** — WhatsApp is #1 communication channel
- On mobile: larger touch target (56px)
- Pulse animation on first visit (draw attention)

### 18.7 COOKIE CONSENT BANNER ★ NEW
```
┌─────────────────────────────────────────────────────────────────┐
│ 🍪 We use cookies to improve your experience.                  │
│    Read our [Privacy Policy].                                  │
│                          [Accept All]  [Necessary Only]        │
└─────────────────────────────────────────────────────────────────┘
```
- Fixed bottom bar
- Required if using Google Analytics
- Stores preference in localStorage
- Minimal, non-intrusive

---

## 19. DESIGN TOKENS & STYLE GUIDE

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0a0e17` | Page background |
| `--color-bg-alt` | `#060a12` | Alternating section bg |
| `--color-surface` | `#111827` | Card background |
| `--color-surface-hover` | `#1a2332` | Card hover |
| `--color-border` | `#1e293b` | Card/section borders |
| `--color-primary` | `#249d79` | Primary (teal/theme) |
| `--color-primary-light` | `#2ec499` | Primary hover |
| `--color-primary-glow` | `rgba(36,157,121,0.15)` | Glow effects |
| `--color-accent` | `#0271ff` | Accent (blue) |
| `--color-accent-light` | `#3d94ff` | Accent hover |
| `--color-text` | `#f1f5f9` | Heading text |
| `--color-text-body` | `#cbd5e1` | Body text |
| `--color-text-muted` | `#64748b` | Muted/secondary text |
| `--color-danger` | `#e00000` | Error/danger |
| `--color-warning` | `#ff9f0c` | Warning |
| `--color-success` | `#249d79` | Success |
| `--gradient-primary` | `linear-gradient(135deg, #249d79, #0271ff)` | CTA, hero accents |
| `--gradient-dark` | `linear-gradient(180deg, #0a0e17, #060a12)` | Section backgrounds |

### Typography
| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 (Hero) | Plus Jakarta Sans | 56px / 3.5rem | 800 |
| H2 (Section) | Plus Jakarta Sans | 40px / 2.5rem | 700 |
| H3 (Card Title) | Plus Jakarta Sans | 24px / 1.5rem | 600 |
| H4 (Sub-heading) | Plus Jakarta Sans | 20px / 1.25rem | 600 |
| Body | Inter | 16px / 1rem | 400 |
| Body Small | Inter | 14px / 0.875rem | 400 |
| Caption | Inter | 12px / 0.75rem | 400 |
| Button | Inter | 14px / 0.875rem | 600 |
| Nav Link | Inter | 15px / 0.9375rem | 500 |

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

## 20. RESPONSIVE STRATEGY

| Breakpoint | Name | Grid | Nav |
|------------|------|------|-----|
| ≥ 1200px | Desktop | 3-4 col | Full horizontal |
| 992–1199px | Laptop | 3 col | Full horizontal (compact) |
| 768–991px | Tablet | 2 col | Hamburger menu |
| < 768px | Mobile | 1 col | Hamburger + fullscreen overlay |

### Key Responsive Behaviors:
- **Cards:** 3 col → 2 col → 1 col
- **Feature deep-dive:** Alternating L/R → stacked (image on top)
- **Pricing:** 3 col → horizontal scroll / stacked
- **Screenshots:** 4 col → 2 col → 1 col
- **Hero text:** 56px → 40px → 32px
- **Section padding:** 96px → 64px → 48px
- **Navbar:** horizontal → hamburger at 768px
- **Footer:** 4 col → 2×2 → 1 col

---

## 21. ANIMATION & INTERACTION

### Scroll Animations (IntersectionObserver)
| Element | Animation | Trigger |
|---------|-----------|---------|
| Section headings | fade-in + slide-up (20px) | Enters viewport |
| Cards | fade-in + slide-up, staggered 100ms | Enters viewport |
| Screenshots | fade-in + scale(0.95→1) | Enters viewport |
| Stats numbers | Count-up from 0 | Enters viewport |
| Architecture diagram | Draw-in effect | Enters viewport |

### Hover Animations
| Element | Effect |
|---------|--------|
| Feature cards | translateY(-4px) + box-shadow increase |
| CTA buttons | gradient shimmer sweep |
| Nav links | underline slide-in from left |
| Screenshots | scale(1.03) + glow shadow |
| Social icons | color → primary |
| Pricing cards | border-color → gradient |

### Transitions
| Property | Duration | Easing |
|----------|----------|--------|
| Default | 300ms | ease |
| Hover lift | 200ms | ease-out |
| Fade-in | 600ms | ease |
| Slide-up | 600ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Count-up | 2000ms | ease-out |

### Loading
- No loading screen (static HTML, instant render)
- Images: lazy loading (`loading="lazy"`)
- Fonts: `font-display: swap`

---

## 22. SEO & META STRATEGY

### Per-Page Meta Tags
```html
<!-- Home -->
<title>Devetek Helios — IoT Platform for Critical Infrastructure</title>
<meta name="description" content="End-to-end IoT monitoring platform with real-time dashboard, WebGIS mapping, smart alerts, ML analytics, and comprehensive reporting. Built for water utility, energy, and industrial IoT.">

<!-- Features -->
<title>Features — Devetek Helios IoT Platform</title>
<meta name="description" content="Explore 30+ features: dynamic dashboards, WebGIS mapping, smart alerts, ML anomaly detection, report export, and device management.">

<!-- Solutions > Water -->
<title>Water Utility IoT Solution — Devetek Helios</title>
<meta name="description" content="IoT monitoring for PDAM: DMA management, leak detection, pressure monitoring, NRW reduction with real-time dashboard and WebGIS.">
```

### Open Graph (All Pages)
```html
<meta property="og:type" content="website">
<meta property="og:site_name" content="Devetek Helios">
<meta property="og:image" content="/img/og-image.jpg"> <!-- 1200x630 -->
<meta property="og:locale" content="en_US">
<meta property="og:locale:alternate" content="id_ID">
```

### Schema.org (Home Page)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Devetek Helios",
  "applicationCategory": "IoT Platform",
  "operatingSystem": "Web",
  "description": "End-to-end IoT monitoring platform..."
}
</script>
```

### Technical SEO
- Semantic HTML5: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- Image alt texts
- `robots.txt` — allow all
- `sitemap.xml` — auto-generated list of all 16 pages
- Canonical URLs
- Performance: < 3s LCP, < 100ms FID

---

## 23. FILE STRUCTURE

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

## 24. IMPLEMENTATION PHASES

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

## 25. CONTENT CHECKLIST

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

## 26. REVIEW GAP ANALYSIS ★ NEW

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

## SUMMARY

| Metric | v1 | v2 (Current) |
|--------|-----|--------------|
| Total Pages | 16 | **22** (+6) |
| Home Sections | 10 | **13** (+3) |
| Shared Components | 5 | **7** (+2) |
| CSS Files | 2 | 2 |
| JS Files | 2 | **3** (+1) |
| Implementation Phases | 5 | **6** |
| Estimated Dev Time | ~5-8 hari | **~7-10 hari** |
| Dependencies | 0 | 0 |
| External Fonts | 2 | 2 |

### New Pages Summary:
| Page | Type | Phase |
|------|------|-------|
| `/demo.html` | Live Demo / Sandbox | Phase 4 |
| `/integrations.html` | Integrations & API | Phase 3 |
| `/security.html` | Security & Compliance | Phase 3 |
| `/privacy.html` | Privacy Policy | Phase 4 |
| `/terms.html` | Terms of Service | Phase 4 |
| `/404.html` | Not Found | Phase 1 |

### New Shared Components:
| Component | Purpose |
|-----------|---------|
| WhatsApp Floating Button | Indonesian market standard, instant contact |
| Cookie Consent Banner | Legal compliance, analytics prerequisite |

---

> **Status:** Draft v2 — Review Complete  
> **Next Step:** Final approval dari kamu, lalu mulai coding Phase 1.
