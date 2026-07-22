"""Konfigurasi runtime service (via .env) — koneksi & default cadence.

Bukan config analisa (itu di tabel ai_config, dibaca Config Loader). Ini setting
infrastruktur worker. Ref: dok 05 (arsitektur), dok 06 (model data).
"""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# .env dijangkar ke ROOT PROJECT (folder pyproject.toml), bukan CWD — supervisor/
# Vito/pm2 tidak menjamin working dir; env_file relatif membuat worker diam-diam
# jalan pakai default localhost saat CWD meleset. parents[2] = src/ai_nrw → root.
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_prefix="AINRW_", extra="ignore")

    # --- Postgres (ai_* : config, event, baseline, forecast, recurrence) ---
    # NOTE: pakai psycopg2 (bukan psycopg3) — server via pooler mengembalikan version()
    # sebagai bytes → psycopg3 crash di deteksi versi SQLAlchemy. client_encoding=utf8
    # WAJIB (teks makna detektor pakai em-dash). Override via AINRW_PG_DSN di .env.
    pg_dsn: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/iot?client_encoding=utf8"

    # --- ClickHouse (telemetry, read-only) ---
    ch_host: str = "localhost"
    ch_port: int = 8123
    ch_database: str = "iot"
    ch_user: str = "default"
    ch_password: str = ""

    # --- Cadence default (dok 05 §4) — bisa di-override per target di ai_config ---
    cadence_anomaly_sec: int = 300      # 5 menit (data ingest tetap 2 menit)
    cadence_jobs_sec: int = 15          # poll antrean job manual (hitung-ulang on-demand)
    cadence_baseline_cron: str = "30 2 * * *"  # learn grid musiman (A9), harian dini hari
    cadence_forecast_cron: str = "0 2 * * *"   # harian, dini hari
    cadence_recurrence_cron: str = "0 * * * *" # tiap jam

    # --- Sharding (dok 05 §6) — worker ini menangani tenant mana ---
    tenant_ids: list[str] | None = None   # None = semua tenant (skala kecil)

    # --- Observability ---
    log_level: str = "INFO"


settings = Settings()
