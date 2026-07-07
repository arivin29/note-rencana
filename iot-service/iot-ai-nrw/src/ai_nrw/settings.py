"""Konfigurasi runtime service (via .env) — koneksi & default cadence.

Bukan config analisa (itu di tabel ai_config, dibaca Config Loader). Ini setting
infrastruktur worker. Ref: dok 05 (arsitektur), dok 06 (model data).
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="AINRW_", extra="ignore")

    # --- Postgres (ai_* : config, event, baseline, forecast, recurrence) ---
    pg_dsn: str = "postgresql+psycopg://postgres:postgres@localhost:5432/iot"

    # --- ClickHouse (telemetry, read-only) ---
    ch_host: str = "localhost"
    ch_port: int = 8123
    ch_database: str = "iot"
    ch_user: str = "default"
    ch_password: str = ""

    # --- Cadence default (dok 05 §4) — bisa di-override per target di ai_config ---
    cadence_anomaly_sec: int = 300      # 5 menit (data ingest tetap 2 menit)
    cadence_forecast_cron: str = "0 2 * * *"   # harian, dini hari
    cadence_recurrence_cron: str = "0 * * * *" # tiap jam

    # --- Sharding (dok 05 §6) — worker ini menangani tenant mana ---
    tenant_ids: list[str] | None = None   # None = semua tenant (skala kecil)

    # --- Observability ---
    log_level: str = "INFO"


settings = Settings()
