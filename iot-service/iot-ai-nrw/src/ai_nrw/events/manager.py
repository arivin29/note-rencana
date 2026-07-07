"""Event Manager — persistensi lifecycle ke Postgres (ai_event + ai_event_log).

Alur per channel: load event aktif → reconcile (lifecycle.py, murni) → terapkan Action.
Dedup dijaga DB (partial-unique uq_ai_event_active) → OPEN pakai ON CONFLICT DO NOTHING
sebagai jaring race antar-worker. Ref: dok 06 §4-5, dok tekanan §11.3.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import TYPE_CHECKING

from ai_nrw.detectors.base import Signal
from ai_nrw.events import lifecycle as lc
from ai_nrw.store import db

if TYPE_CHECKING:
    from ai_nrw.config.loader import ChannelConfig

DEFAULT_CLEAR_CYCLES = 2  # pulih 2 siklus berturut → auto-close (configurable nanti)


def load_active_events(target_id: str) -> dict[str, lc.ActiveEvent]:
    """Event aktif channel (per analysis_type) dari ai_event."""
    rows = db.fetch_all(
        """
        SELECT id::text AS id, analysis_type, severity, started_at, peak_magnitude,
               COALESCE((context->>'clear_streak')::int, 0) AS clear_streak
        FROM ai_event
        WHERE target_id = CAST(:tid AS uuid)
          AND status IN ('baru','ditinjau','ditindak')
        """,
        {"tid": target_id},
    )
    return {
        r["analysis_type"]: lc.ActiveEvent(
            id=r["id"],
            analysis_type=r["analysis_type"],
            severity=r["severity"],
            started_at=r["started_at"],
            peak_magnitude=(None if r["peak_magnitude"] is None else float(r["peak_magnitude"])),
            clear_streak=r["clear_streak"],
        )
        for r in rows
    }


def process_channel(
    cfg: "ChannelConfig",
    signals: list[Signal],
    now: datetime,
    clear_cycles: int = DEFAULT_CLEAR_CYCLES,
) -> dict[str, int]:
    """Rekonsiliasi + tulis. Return ringkas hitungan aksi (untuk logging/observability)."""
    active = load_active_events(cfg.target_id)
    actions = lc.reconcile(active, signals, now, clear_cycles)

    counts = {"open": 0, "update": 0, "clearing": 0, "close": 0}
    for a in actions:
        if isinstance(a, lc.OpenEvent):
            _open(cfg, a, now)
            counts["open"] += 1
        elif isinstance(a, lc.UpdateEvent):
            _update(a)
            counts["update"] += 1
        elif isinstance(a, lc.ClearingEvent):
            _clearing(a)
            counts["clearing"] += 1
        elif isinstance(a, lc.CloseEvent):
            _close(a)
            counts["close"] += 1
    return counts


# --- penerap Action ---
def _open(cfg: "ChannelConfig", a: lc.OpenEvent, now: datetime) -> None:
    sig = a.signal
    context = dict(sig.context)
    context["clear_streak"] = 0
    rows = db.execute_returning(
        """
        INSERT INTO ai_event (
          id_owner, target_type, target_id, analysis_type, status, severity,
          started_at, last_seen_at, peak_magnitude, meaning, context
        ) VALUES (
          CAST(:id_owner AS uuid), 'sensor_channel', CAST(:target_id AS uuid), :atype,
          'baru', :severity, :started_at, :now, :peak, :meaning, CAST(:context AS jsonb)
        )
        ON CONFLICT (target_id, analysis_type) WHERE status IN ('baru','ditinjau','ditindak')
        DO NOTHING
        RETURNING id::text AS id
        """,
        {
            "id_owner": cfg.id_owner,
            "target_id": cfg.target_id,
            "atype": sig.analysis_type,
            "severity": sig.severity,
            "started_at": sig.ts,
            "now": now,
            "peak": a.magnitude,
            "meaning": sig.meaning,
            "context": json.dumps(context),
        },
    )
    if rows:  # None bila kalah race (event aktif sudah ada) → tak perlu log
        _log(rows[0]["id"], None, "baru", note="event dibuka otomatis")


def _update(a: lc.UpdateEvent) -> None:
    db.execute(
        """
        UPDATE ai_event
        SET severity = :severity,
            peak_magnitude = :peak,
            last_seen_at = :now,
            context = jsonb_set(context, '{clear_streak}', '0'::jsonb)
        WHERE id = CAST(:id AS uuid)
        """,
        {"id": a.event_id, "severity": a.severity, "peak": a.peak_magnitude, "now": a.last_seen_at},
    )


def _clearing(a: lc.ClearingEvent) -> None:
    db.execute(
        """
        UPDATE ai_event
        SET last_seen_at = :now,
            context = jsonb_set(context, '{clear_streak}', to_jsonb(CAST(:streak AS int)))
        WHERE id = CAST(:id AS uuid)
        """,
        {"id": a.event_id, "now": a.last_seen_at, "streak": a.clear_streak},
    )


def _close(a: lc.CloseEvent) -> None:
    rows = db.execute_returning(
        """
        UPDATE ai_event
        SET status = :reason, resolved_at = :resolved, last_seen_at = :resolved,
            duration_sec = :dur
        WHERE id = CAST(:id AS uuid)
          AND status IN ('baru','ditinjau','ditindak')
        RETURNING status
        """,
        {"id": a.event_id, "reason": a.reason, "resolved": a.resolved_at, "dur": a.duration_sec},
    )
    if rows:
        _log(a.event_id, None, a.reason, note="pulih sendiri — auto-close")


def _log(event_id: str, from_status: str | None, to_status: str, note: str) -> None:
    db.execute(
        """
        INSERT INTO ai_event_log (event_id, from_status, to_status, actor_kind, note)
        VALUES (CAST(:eid AS uuid), :from_status, :to_status, 'system', :note)
        """,
        {"eid": event_id, "from_status": from_status, "to_status": to_status, "note": note},
    )
