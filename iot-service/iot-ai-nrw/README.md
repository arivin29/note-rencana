# iot-ai-nrw

**Worker analitik AI-NRW untuk PDAM** — service Python mandiri yang membantu menekan
**NRW (Non-Revenue Water)** lewat deteksi anomali, forecasting, dan early-warning yang
*actionable*.

> **Status: fase desain selesai (dok 01–09), implementasi belum mulai (P0).**
> Ini repo **baru & terpisah**, sibling dari `iot-angular` / `iot-backend-go` / `iot-scada`.

## Kenapa repo terpisah
- **Bahasa/runtime beda** (Python worker vs Go API) → toolchain bersih.
- **Unit deploy & scaling beda** (worker per-tenant vs API server).
- **Coupling nol di level kode** — integrasi hanya lewat **shared DB**.
- Konsisten dengan pola workspace (tiap service = repo sendiri).

Lihat keputusan lengkap di [`docs/05-arsitektur.md`](./docs/05-arsitektur.md) §10 (Topologi Repo).

## Peran & batas (kontrak antar-repo)
```
iot-ai-nrw (ini)  → OWNER tabel ai_* di Postgres (via Alembic). Menulis event/forecast.
                    Membaca telemetry ClickHouse (read-only).
iot-backend-go    → read-only atas ai_*; serve ke Angular (dok 08). TIDAK migrasi ai_*.
iot-angular       → 4 layar AI (AI Settings, Event Inbox, Detail, Analytics).
ClickHouse        → milik platform; AI-NRW hanya baca.
```

## Arsitektur singkat (dok 05)
Worker micro-batch: **Scheduler → Config Loader → Ingestor → Baseline → Detectors →
Event Manager → (Forecaster harian)**. Stateless via checkpoint. Cadence anomali **5 menit**
(ingest data 2 menit), forecast **harian**. Target footprint **2 vCPU / 2 GB**.

## Struktur
```
docs/                 desain 01–09 + kategori/tekanan (reference) + tooling-opensource
src/ai_nrw/
  config/             baca ai_config (opt-in, params)
  ingest/             baca ClickHouse borongan per-tenant
  baseline/           grid median/MAD + online_state (CUSUM/EWMA)
  detectors/          A1–A10 (hand-code + River/ADTK)
  forecast/           Tier-0/1/2 (StatsForecast)
  events/             lifecycle event (buat/update/auto-close/rekurensi)
  recurrence/         pola kambuh-pulih
  scheduler/          APScheduler (cadence)
  store/              Postgres + ClickHouse access
  worker.py           entrypoint
migrations/           Alembic — OWNER skema ai_* (dok 06)
tests/
```

## Setup (nanti, saat P0)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -e .            # core deps (dok 07 §10)
cp .env.example .env        # isi koneksi Postgres/ClickHouse
alembic upgrade head        # buat tabel ai_*
python -m ai_nrw.worker     # jalankan worker
```

## Baca dulu
- [`docs/README.md`](./docs/README.md) — indeks desain 01–09.
- Urutan: 01 (kebutuhan) → 05 (arsitektur) → 06 (model data) → 07 (metode/tool) →
  08 (API) → 09 (roadmap). Kategori pertama **Tekanan** = pondasi/template.
