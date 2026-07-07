# migrations — Alembic (OWNER skema `ai_*`)

Repo **iot-ai-nrw** adalah **pemilik tunggal** tabel `ai_*` di PostgreSQL
(`ai_config`, `ai_baseline`, `ai_event`, `ai_event_log`, `ai_forecast`, `ai_recurrence`).
Skema konkret ada di [`../docs/06-model-data.md`](../docs/06-model-data.md).

## Aturan kepemilikan (kontrak antar-repo — dok 05 §10)
- **iot-ai-nrw** membuat & mengubah tabel `ai_*` **hanya di sini** (Alembic).
- **iot-backend-go** memperlakukan `ai_*` sebagai **read-only external** — GORM cuma
  baca, **TIDAK** membuat migrasi untuk tabel ini (hindari dua repo migrasi tabel sama).
- **ClickHouse** (telemetry) milik platform; AI-NRW hanya **baca**, tak migrasi.

## Inisialisasi (saat P0, dok 09)
```bash
alembic init -t async migrations      # sekali, generate env.py + alembic.ini
# lalu tulis revisi pertama sesuai dok 06 (6 tabel ai_*)
alembic revision -m "create ai_* tables"
alembic upgrade head
```

> Placeholder folder `versions/` sudah disiapkan. `env.py`/`alembic.ini` di-generate
> saat P0 (belum di-commit agar tak mengunci pilihan sync/async lebih awal).
