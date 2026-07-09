"""Analisa rekurensi kambuh-pulih — PURE stdlib (uji offline).

Event yang berulang di target+analisa yang sama = **sinyal NRW kuat**: masalah kronis yang
"selalu balik" (mis. tekanan malam turun tiap hari) lebih penting dari satu insiden. Auto-close
menyimpan history justru agar pola ini terbaca. Ref: dok 06 §7, dok tekanan §11.4.

`analyze` menerima daftar event (started_at) dalam jendela → hitung count, tren (naik/stabil/
turun), jam tipikal, dan flag eskalasi. Persistensi & query DB di store.py.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta


@dataclass(slots=True)
class RecurrenceStat:
    count: int
    trend: str | None                       # 'naik' | 'stabil' | 'turun' | None (<2 event)
    typical_hour: dict = field(default_factory=dict)  # {"peak": h, "histogram": {h: n}}
    escalated: bool = False


def _trend(first_half: int, second_half: int) -> str | None:
    """Bandingkan separuh-awal vs separuh-akhir jendela. Butuh ≥2 event total."""
    if first_half + second_half < 2:
        return None
    if second_half > first_half * 1.2:
        return "naik"
    if second_half < first_half * 0.8:
        return "turun"
    return "stabil"


def analyze(
    started_ats: list[datetime],
    now: datetime,
    window_days: int = 14,
    escalate_at: int = 3,
) -> RecurrenceStat:
    """Hitung statistik rekurensi dari waktu-mulai event dalam jendela `window_days`."""
    since = now - timedelta(days=window_days)
    in_window = [t for t in started_ats if t >= since]
    count = len(in_window)

    mid = now - timedelta(days=window_days / 2)
    first = sum(1 for t in in_window if t < mid)
    second = count - first

    hist: dict[int, int] = {}
    for t in in_window:
        hist[t.hour] = hist.get(t.hour, 0) + 1
    peak = max(hist, key=hist.get) if hist else None

    return RecurrenceStat(
        count=count,
        trend=_trend(first, second),
        typical_hour={"peak": peak, "histogram": hist} if hist else {},
        escalated=count >= escalate_at,
    )
