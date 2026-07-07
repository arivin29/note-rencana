# Roadmap — Mobile Project Detail

Halaman: `/mobile/projects/:id` (shell) → tab **Detail · Peta · Node · Channel · SCADA**.
Tujuan bisnis: jadi "ringkasan sehat/tidaknya sebuah project" yang bisa dibaca teknisi
lapangan sekilas — mendukung target menekan NRW (Non-Revenue Water) PDAM.

## Kondisi sekarang (per 2026-07-05)

| Tab | Status | Catatan |
|-----|--------|---------|
| **Detail** | ✅ baru diperkaya | Sebelumnya cuma nama+status+3 stat. Sekarang: header+health bar, KPI 2×2 (Perangkat/Online/Bermasalah/Sensor), aksi cepat ke tab lain, daftar "Perlu perhatian" (node offline, tap→node), kartu Owner (tel/email), info lengkap (lokasi, sinkron terakhir, dibuat). |
| **Peta** | ✅ jalan | OpenLayers + CARTO dark, toggle Node/Sensor, layer operasional, popup. |
| **Node** | ✅ jalan | Reuse `mobile-nodes-list` ter-scope project. |
| **Channel** | ✅ jalan | Filter mirip desktop `/iot/telemetry-channels`. |
| **SCADA** | ✅ jalan | List diagram → embed viewer (view-only). |

Data yang **sudah tersedia** dari `projectsControllerFindOneDetailed`:
`{ name, status, areaType, createdAt, lastSync/lastDataAt, owner:{name,industry,email,phone},
stats:{totalNodes,activeNodes,totalSensors,totalLocations}, nodes:[], locations:[] }`.
Plus `nodesControllerFindAll({idProject})`, modul alerts, telemetry/channels.

## Backlog fitur (prioritas)

### P0 — sudah bisa dikerjakan dengan data yang ada
1. **Kartu "Perlu perhatian"** ✅ (sudah dibuat) — node offline/bermasalah, tap ke detail.
2. **Health bar % online** ✅ (sudah dibuat).
3. **Alert aktif per project** — panggil endpoint alerts difilter `idProject`, tampilkan
   badge jumlah + list ringkas (severity chip), tap → detail alert. *(cek apakah alerts
   API sudah dukung filter idProject; kalau belum → P1 backend.)*
4. **Pull-to-refresh & auto-refresh** — sudah terhubung `RefreshBusService`/`AutoRefreshService`.

### P1 — perlu sedikit endpoint / agregasi
5. **Ringkasan telemetry / tren konsumsi** — sparkline flow/pressure agregat project
   (mis. total flow 24 jam terakhir). Butuh endpoint agregasi time-series per project
   (ClickHouse) — belum ada; sedang. Envelope `{ data:[{ts,value}], meta }`.
6. **NRW / MNF ringkas per project** — indikator utama bisnis: inflow vs outflow, MNF
   (Minimum Night Flow) untuk deteksi kebocoran per DMA. Butuh modul analitik backend
   (kemungkinan besar belum ada) — kompleks. Lihat memory `ai-analytics-features`.
7. **Health score gabungan** — skor 0–100 dari konektivitas + baterai + data staleness
   + alert. Bisa dihitung client-side dari nodes dulu (sederhana), atau backend (konsisten).

### P2 — nice to have
8. **Peta mini di tab Detail** — thumbnail statis lokasi node (tap → tab Peta penuh).
9. **Aksi cepat lanjutan** — "Kirim laporan", export PDF ringkasan project, share link.
10. **Timeline aktivitas** — event terakhir (node join/leave, alert, perintah device).
11. **Filter periode** pada tren (24j / 7h / 30h).

## Dampak kontrak API (bila endpoint baru dibuat)
- Tetap camelCase; list `{ data, meta:{total,page,limit,totalPages} }`, single item langsung.
- Scoping wajib: `admin` semua, `tenant` hanya `idOwner` project-nya (enforce di service layer).
- Kandidat endpoint baru: `GET /projects/:id/telemetry-summary?range=24h`,
  `GET /projects/:id/alerts`, `GET /projects/:id/health`, `GET /projects/:id/nrw`.

## Rencana bertahap
1. **(selesai)** Perkaya tab Detail dengan data existing (P0 #1,#2 + info lengkap).
2. Alert aktif per project (P0 #3) — cek filter idProject di alerts API dulu.
3. Health score client-side (P1 #7) — cepat, tanpa backend.
4. Endpoint telemetry-summary + sparkline (P1 #5).
5. NRW/MNF (P1 #6) — butuh desain modul analitik terpisah.

> Catatan: dokumen ini idealnya di-generate/diperbarui oleh agen **feature-designer**
> (model Fable 5) setelah restart Claude Code agar agennya ter-registrasi.
