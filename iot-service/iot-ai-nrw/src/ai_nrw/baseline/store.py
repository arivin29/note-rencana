"""Persistensi ai_baseline — checkpoint `last_ts` (P0) + grid & online_state (P1).

Grid musiman (A9) & online_state CUSUM (A10) disimpan sebagai jsonb. Ref: dok 06 §3.
"""

from __future__ import annotations

import json
from datetime import datetime

from ai_nrw.baseline import grid as gridmod
from ai_nrw.baseline.bundle import Baseline, from_row
from ai_nrw.store import db


def get_last_ts(target_id: str) -> datetime | None:
    row = db.fetch_one(
        "SELECT last_ts FROM ai_baseline WHERE target_id = CAST(:tid AS uuid)",
        {"tid": target_id},
    )
    return row["last_ts"] if row else None


def load_baseline(target_id: str) -> Baseline:
    """Muat bundle (grid + online_state) untuk A9/A10. Kosong bila baris belum ada."""
    row = db.fetch_one(
        """
        SELECT slot_size_min, grid, online_state, night_state, learn_ready
        FROM ai_baseline WHERE target_id = CAST(:tid AS uuid)
        """,
        {"tid": target_id},
    )
    return from_row(row)


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


def save_online_state(target_id: str, id_owner: str, online_state: dict) -> None:
    """Simpan state detektor stateful (A10 CUSUM). Baris dibuat bila belum ada."""
    db.execute(
        """
        INSERT INTO ai_baseline (id_owner, target_id, online_state)
        VALUES (CAST(:o AS uuid), CAST(:t AS uuid), CAST(:st AS jsonb))
        ON CONFLICT (target_id)
        DO UPDATE SET online_state = EXCLUDED.online_state, updated_at = now()
        """,
        {"o": id_owner, "t": target_id, "st": json.dumps(online_state)},
    )


def save_night_state(target_id: str, id_owner: str, night_state: dict) -> None:
    """Simpan riwayat malam (night_pressure §5.11). Baris dibuat bila belum ada."""
    db.execute(
        """
        INSERT INTO ai_baseline (id_owner, target_id, night_state)
        VALUES (CAST(:o AS uuid), CAST(:t AS uuid), CAST(:st AS jsonb))
        ON CONFLICT (target_id)
        DO UPDATE SET night_state = EXCLUDED.night_state, updated_at = now()
        """,
        {"o": id_owner, "t": target_id, "st": json.dumps(night_state)},
    )


def save_grid(target_id: str, id_owner: str, bl: Baseline) -> None:
    """Simpan grid musiman hasil learn (A9). Baris dibuat bila belum ada."""
    db.execute(
        """
        INSERT INTO ai_baseline (id_owner, target_id, slot_size_min, grid, learn_ready)
        VALUES (CAST(:o AS uuid), CAST(:t AS uuid), :ssm, CAST(:g AS jsonb), :ready)
        ON CONFLICT (target_id)
        DO UPDATE SET slot_size_min = EXCLUDED.slot_size_min,
                      grid = EXCLUDED.grid,
                      learn_ready = EXCLUDED.learn_ready,
                      updated_at = now()
        """,
        {
            "o": id_owner,
            "t": target_id,
            "ssm": bl.slot_size_min,
            "g": json.dumps(gridmod.grid_to_json(bl.grid)),
            "ready": bl.learn_ready,
        },
    )
