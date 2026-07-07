"""Akses PostgreSQL (tabel ai_* + baca metadata channel/sensor_type platform).

Engine SQLAlchemy tunggal dari settings.pg_dsn. Helper baca/tulis ringan. Ref: dok 06.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any, Mapping, Sequence

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from ai_nrw.settings import settings


@lru_cache(maxsize=1)
def engine() -> Engine:
    """Engine Postgres (psycopg3 sync). pool_pre_ping agar tahan koneksi mati."""
    return create_engine(settings.pg_dsn, pool_pre_ping=True, future=True)


def fetch_all(sql: str, params: Mapping[str, Any] | None = None) -> list[dict[str, Any]]:
    with engine().connect() as conn:
        result = conn.execute(text(sql), params or {})
        return [dict(row._mapping) for row in result]


def fetch_one(sql: str, params: Mapping[str, Any] | None = None) -> dict[str, Any] | None:
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: Mapping[str, Any] | Sequence[Mapping[str, Any]] | None = None) -> None:
    """Tulis (INSERT/UPDATE). Terima satu dict atau list dict (executemany)."""
    with engine().begin() as conn:
        conn.execute(text(sql), params or {})


def execute_returning(sql: str, params: Mapping[str, Any] | None = None) -> list[dict[str, Any]]:
    """Tulis + RETURNING (mis. INSERT ... RETURNING id). Commit di dalam transaksi."""
    with engine().begin() as conn:
        result = conn.execute(text(sql), params or {})
        return [dict(row._mapping) for row in result]
