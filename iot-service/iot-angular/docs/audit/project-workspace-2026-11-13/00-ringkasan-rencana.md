# Audit Workspace Project — Ringkasan & Rencana Perbaikan (13 Nov 2026)

Sumber: `01-pdam-operator.md` (persona pengguna, sonnet) · `02-enterprise-ux.md` (UI/UX, opus) · `03-senior-dev.md` (developer, opus).
Temuan yang muncul di ≥2 laporan ditandai ★ (konsensus). Path relatif ke `src/app/pages/iot/` kecuali disebut lain.

## Gelombang 1 — Kejujuran data & link rusak (P0) · frontend
| # | Temuan | Lokasi | Sumber |
|---|---|---|---|
| 1.1 ★ | `generateDummyData()` (150 baris `Math.random`) tampil sebagai data asli, juga di mode embedded; ikut ke KPI & Export CSV; Refresh menumpuk +150 | `nodes/nodes-detail/sensor-chanel-detail/sensor-chanel-detail.ts:235,299,363,414-451` | 01·02·03 |
| 1.2 ★ | Ambang kosong jadi "MIN 0 / MAX 100 · Auto alert" → 282 bacaan negatif berlabel Error palsu | `sensor-chanel-detail.ts:172-173,277-278` · `.html:83-86` | 01·02·03 |
| 1.3 ★ | Status per bacaan memakai Online/Offline/Error (istilah koneksi) untuk nilai vs ambang; rumus warning salah utk ambang 0/negatif | `sensor-chanel-detail.ts:186-201` | 01·02 |
| 1.4 ★ | Kolom "Kualitas" (100/70%) & "Frame ID" rekaan | `sensor-chanel-detail.ts:214` | 01·02·03 |
| 1.5 ★ | Tabel & "Last sample" menampilkan data TERLAMA (backend `ORDER BY ts ASC`) | `sensor_channel_service.go:213` · `.html:49` | 03 |
| 1.6 ★ | Rentang waktu salah: akhir selalu "now" (Kemarin/Bulan lalu), "Sampai" diabaikan, "Dari" dibaca UTC | `sensor-chanel-detail.ts:147,372-409` | 01·02·03 |
| 1.7 ★ | Overview: uptime/latency `Math.random` & latency=interval×2; grid dipotong 8; "All Systems Operational" saat 0 device; "Streaming·MQTT/Retention 30 days" hardcode | `projects/project-workspace/pages/overview-page/*` | 01·02 |
| 1.8 ★ | Link keluar workspace / route mati: channel di Node detail → `/iot/nodes/...`; hapus channel → `/iot/nodes`; Config "View Sensors" → `/iot/sensors` (tidak ada) | `nodes-detail.html:267` · `sensor-chanel-detail.ts:654` · `config-page.component.html:36` | 01·02·03 |
| 1.9 | Tab Nodes "78 total nodes" untuk project 12 node (statistik tanpa filter project) | `nodes/nodes-list/nodes-list.ts:141` + SDK stats | 03 |

## Gelombang 2 — Struktur workspace & konsistensi
| # | Temuan | Sumber |
|---|---|---|
| 2.1 ★ | Satu route dua jenis ID (tree kirim sensor id, tab Sensors kirim channel id) → 404 lalu fallback, hanya `channels[0]` → **route = sensor id + `?channel=`** + pemilih channel | 01·02·03 |
| 2.2 ★ | Tidak ada header workspace bersama; tiap tab h1/h2/h4 sendiri; nav aktif hilang di detail node/sensor → komponen `workspace-page-header` (breadcrumb, judul=alamat, meta, aksi; **tombol Panduan** paling kiri grup aksi) | 01·02 |
| 2.3 ★ | 3 definisi status perangkat (5/30 mnt absolut, relatif interval, nilai vs ambang) → satu util `deviceFreshness(lastSeen, interval)` | 01·02·03 |
| 2.4 ★ | Muat ganda: sensor detail 2× (ngOnChanges+ngOnInit), node detail 3× (~15 req), nodes-list 2×; tree N+1 (12× `/nodes/{id}/sensors`) → `ProjectWorkspaceStore` + `/sensors?idProject` + switchMap/destroy$ | 03 |
| 2.5 | Aturan label alamat belum di: judul detail sensor, judul node detail ("Node {kode}") | 01·02 |
| 2.6 | Delete Channel: menghapus target salah (sensor id → 404 / hanya channels[0]), `confirm()` Inggris, sejajar Export | 01·02·03 |
| 2.7 | Node detail embedded: tidak bisa edit, label salah ("Industry"=telepon, "Installed"=maintenance), "View Telemetry Graph" mati | 02 |
| 2.8 | SCADA tidak bisa kembali dari diagram; path `analytics` berlabel SCADA | 01 |

## Gelombang 3 — Fitur detail sensor (yang dibutuhkan operator)
- Grafik tren (ApexCharts sudah ada di `nodes.module.ts`), KPI nilai terkini besar + min/avg/max + penanda lubang data.
- Tabel bacaan server-side paging (terbaru dulu), CSV di-escape & zona waktu konsisten (WIB).
- Pemilih channel untuk sensor multi-channel.

## Gelombang 4 — Backend (paralel dengan G2/G3)
- `GetReadings`: implementasi `aggregation`, `order`, paging + `meta`, batas rentang raw (sekarang 30 hari = 1,95 MB).
- alert-events: filter `idProject` (kartu Alerts overview).
- Endpoint ringkasan telemetry per project + uptime/latency NYATA (ganti Math.random).
- `/sensors` & `projects/{id}/detailed` kembali ke kontrak (`meta`, camelCase).
- Verifikasi FK cascade saat delete channel.
- SDK manual: `projectId` di nodes statistics, `order/page/limit` readings, `idProject` alert-events.

## Gelombang 5 — Panduan (setelah halaman beres)
Infrastruktur drawer (`docs/design/page-guide.md`) dipasang di `workspace-page-header` (G2.2) → `guide-writer` menulis panduan per tab berdasarkan perilaku SETELAH perbaikan + bahan "Hal yang perlu dijelaskan di Panduan" dari `01-pdam-operator.md` → `check-guides` + aturan CLAUDE.md.

## Alur kerja tim per gelombang
implementasi → `senior-dev-auditor` review diff → `enterprise-ux-auditor` cek konsistensi → `pdam-operator` uji tugas harian → `guide-writer` update panduan.
