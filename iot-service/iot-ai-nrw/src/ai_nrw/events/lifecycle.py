"""Event lifecycle — state machine MURNI (tanpa DB, bisa dites offline).

Merekonsiliasi sinyal siklus ini dengan event AKTIF channel → daftar Action
(open/update/clearing/close). Aturan dedup: satu kondisi = satu event aktif.
Auto-close saat pulih `clear_cycles` siklus berturut. Ref: dok 06 §4, dok tekanan §11.3.

Persistensi (tulis ai_event/ai_event_log) ada di events/manager.py.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ai_nrw.detectors.base import Signal

ACTIVE_STATUSES = ("baru", "ditinjau", "ditindak")
_SEV_RANK = {"info": 0, "warning": 1, "critical": 2}


def sev_max(a: str, b: str) -> str:
    return a if _SEV_RANK.get(a, 0) >= _SEV_RANK.get(b, 0) else b


@dataclass(slots=True)
class ActiveEvent:
    """Cuplikan event aktif (dari ai_event) yang dibutuhkan rekonsiliasi."""

    id: str
    analysis_type: str
    severity: str
    started_at: datetime
    peak_magnitude: float | None = None
    clear_streak: int = 0  # dari context: berapa siklus berturut sinyal absen


# --- Action (apa yang harus ditulis manager) ---
@dataclass(slots=True)
class OpenEvent:
    signal: Signal
    magnitude: float | None


@dataclass(slots=True)
class UpdateEvent:
    event_id: str
    signal: Signal
    severity: str          # hasil eskalasi (max)
    peak_magnitude: float | None
    last_seen_at: datetime


@dataclass(slots=True)
class ClearingEvent:
    """Sinyal absen tapi belum cukup lama → event tetap aktif, streak naik."""

    event_id: str
    clear_streak: int
    last_seen_at: datetime


@dataclass(slots=True)
class CloseEvent:
    event_id: str
    resolved_at: datetime
    duration_sec: int
    reason: str = "auto_closed"


Action = OpenEvent | UpdateEvent | ClearingEvent | CloseEvent


def magnitude(sig: Signal) -> float | None:
    """|pelanggaran| relatif ambang, bila context punya `threshold`. Else None."""
    thr = sig.context.get("threshold")
    if thr in (None, 0) or sig.value is None:
        return None
    return abs(sig.value - thr) / abs(thr)


def reconcile(
    active: dict[str, ActiveEvent],
    signals: list[Signal],
    now: datetime,
    clear_cycles: int = 2,
) -> list[Action]:
    """Bandingkan sinyal siklus ini dengan event aktif (per analysis_type) → Action.

    - sinyal ada, tak ada event  → OpenEvent
    - sinyal ada, event ada       → UpdateEvent (severity max, peak max, streak reset)
    - sinyal absen, event ada     → streak+1; ClearingEvent bila < clear_cycles,
                                    CloseEvent bila mencapai clear_cycles (pulih)
    - sinyal absen, tak ada event → tak ada aksi
    """
    by_type: dict[str, Signal] = {s.analysis_type: s for s in signals}
    actions: list[Action] = []

    for atype in set(active) | set(by_type):
        ev = active.get(atype)
        sig = by_type.get(atype)

        if sig is not None and ev is None:
            actions.append(OpenEvent(signal=sig, magnitude=magnitude(sig)))
        elif sig is not None and ev is not None:
            mag = magnitude(sig)
            peak = _max_opt(ev.peak_magnitude, mag)
            actions.append(
                UpdateEvent(
                    event_id=ev.id,
                    signal=sig,
                    severity=sev_max(ev.severity, sig.severity),
                    peak_magnitude=peak,
                    last_seen_at=now,
                )
            )
        elif sig is None and ev is not None:
            streak = ev.clear_streak + 1
            if streak >= clear_cycles:
                actions.append(
                    CloseEvent(
                        event_id=ev.id,
                        resolved_at=now,
                        duration_sec=int((now - ev.started_at).total_seconds()),
                    )
                )
            else:
                actions.append(ClearingEvent(event_id=ev.id, clear_streak=streak, last_seen_at=now))
    return actions


def _max_opt(a: float | None, b: float | None) -> float | None:
    if a is None:
        return b
    if b is None:
        return a
    return max(a, b)
