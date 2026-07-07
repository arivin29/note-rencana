"""Persistensi ai_baseline — untuk P0 cukup checkpoint `last_ts` (worker stateless).

Grid median/MAD + online_state (A9/A10) menyusul di P1. Ref: dok 06 §3.
"""

from __future__ import annotations

from datetime import datetime

from ai_nrw.store import db


def get_last_ts(target_id: str) -> datetime | None:
    row = db.fetch_one(
        "SELECT last_ts FROM ai_baseline WHERE target_id = CAST(:tid AS uuid)",
        {"tid": target_id},
    )
    return row["last_ts"] if row else None


def save_checkpoint(target_id: str, id_owner: str, last_ts: datetime) -> None:
    """Upsert checkpoint (idempotent). Baris dibuat bila belum ada."""
    db.execute(
        """
        INSERT INTO ai_baseline (id_owner, target_id, last_ts)
        VALUES (CAST(:o AS uuid), CAST(:t AS uuid), :ts)
        ON CONFLICT (target_id)
        DO UPDATE SET last_ts = EXCLUDED.last_ts, updated_at = now()
        """,
        {"o": id_owner, "t": target_id, "ts": last_ts},
    )
