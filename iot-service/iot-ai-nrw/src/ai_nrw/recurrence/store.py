"""Persistensi & query rekurensi (ai_event history → ai_recurrence).

Menyapu (target, analysis) yang punya event dalam jendela, hitung via analyzer, upsert.
Ref: dok 06 §7.
"""

from __future__ import annotations

import json
from datetime import datetime

from ai_nrw.recurrence.analyzer import RecurrenceStat
from ai_nrw.store import db


def targets_with_events(since: datetime) -> list[dict]:
    """Pasangan (id_owner, target_id, analysis_type) yang punya event sejak `since`.

    'superseded' diabaikan (bukan insiden nyata, hanya penggantian dedup).
    """
    return db.fetch_all(
        """
        SELECT DISTINCT id_owner::text AS id_owner, target_id::text AS target_id, analysis_type
        FROM ai_event
        WHERE started_at >= :since AND status <> 'superseded'
        """,
        {"since": since},
    )


def started_ats(target_id: str, analysis_type: str, since: datetime) -> list[datetime]:
    rows = db.fetch_all(
        """
        SELECT started_at FROM ai_event
        WHERE target_id = CAST(:tid AS uuid) AND analysis_type = :atype
          AND started_at >= :since AND status <> 'superseded'
        ORDER BY started_at
        """,
        {"tid": target_id, "atype": analysis_type, "since": since},
    )
    return [r["started_at"] for r in rows]


def save(
    id_owner: str,
    target_id: str,
    analysis_type: str,
    window_days: int,
    stat: RecurrenceStat,
) -> None:
    """Upsert satu baris ai_recurrence (unik per target+analysis)."""
    db.execute(
        """
        INSERT INTO ai_recurrence (
          id_owner, target_id, analysis_type, window_days, count, trend, typical_hour, escalated
        ) VALUES (
          CAST(:o AS uuid), CAST(:t AS uuid), :atype, :wd, :cnt, :trend, CAST(:th AS jsonb), :esc
        )
        ON CONFLICT (target_id, analysis_type)
        DO UPDATE SET window_days = EXCLUDED.window_days,
                      count = EXCLUDED.count,
                      trend = EXCLUDED.trend,
                      typical_hour = EXCLUDED.typical_hour,
                      escalated = EXCLUDED.escalated,
                      updated_at = now()
        """,
        {
            "o": id_owner,
            "t": target_id,
            "atype": analysis_type,
            "wd": window_days,
            "cnt": stat.count,
            "trend": stat.trend,
            "th": json.dumps(stat.typical_hour),
            "esc": stat.escalated,
        },
    )
