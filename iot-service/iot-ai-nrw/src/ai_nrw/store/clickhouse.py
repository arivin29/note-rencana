"""Akses ClickHouse (read-only) untuk telemetry `iot.sensor_telemetry`.

Kolom real (dok 06 §8): event_time (DateTime UTC), channel_id (UUID),
eng_value (Float64, nilai utama), raw_value (Float64). Tak ada kolom owner/node.
"""

from __future__ import annotations

from functools import lru_cache

import clickhouse_connect
from clickhouse_connect.driver.client import Client

from ai_nrw.settings import settings


@lru_cache(maxsize=1)
def client() -> Client:
    """Client ClickHouse HTTP (port 8123 default, sesuai stack platform)."""
    return clickhouse_connect.get_client(
        host=settings.ch_host,
        port=settings.ch_port,
        database=settings.ch_database,
        username=settings.ch_user,
        password=settings.ch_password,
    )
