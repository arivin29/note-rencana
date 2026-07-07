"""Baseline musiman robust (median/MAD per slot) — pure stdlib.

Slot = (hari_dalam_minggu, bucket_waktu). sigma = 1.4826 × MAD (≈ std pada distribusi
normal). Grid ini fondasi ambang adaptif (A2/A3) & deviasi (A9). Ref: dok tekanan §2.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from datetime import datetime

# 1.4826 = konstanta agar MAD setara std pada distribusi normal.
MAD_TO_SIGMA = 1.4826


def slot_key(ts: datetime, slot_size_min: int = 10) -> tuple[int, int]:
    """(weekday 0=Senin, bucket) — bucket = indeks slot dalam hari.

    Contoh slot_size_min=10 → 144 bucket/hari; 08:15 → bucket 49.
    """
    minutes_of_day = ts.hour * 60 + ts.minute
    return ts.weekday(), minutes_of_day // slot_size_min


def median(values: list[float]) -> float:
    return statistics.median(values)


def mad(values: list[float], med: float | None = None) -> float:
    """Median Absolute Deviation."""
    if not values:
        return 0.0
    m = statistics.median(values) if med is None else med
    return statistics.median([abs(v - m) for v in values])


def sigma_from_mad(values: list[float], med: float | None = None) -> float:
    return MAD_TO_SIGMA * mad(values, med)


@dataclass(slots=True)
class SlotStat:
    median: float
    sigma: float
    n: int


def compute_grid(
    samples: list[tuple[datetime, float]],
    slot_size_min: int = 10,
    min_samples: int = 3,
) -> dict[tuple[int, int], SlotStat]:
    """Bangun grid {slot: SlotStat} dari (ts, value). Slot < min_samples dilewati.

    Inkremental/rolling window diterapkan pemanggil (batasi `samples` ke learn_window).
    """
    buckets: dict[tuple[int, int], list[float]] = {}
    for ts, value in samples:
        buckets.setdefault(slot_key(ts, slot_size_min), []).append(value)

    grid: dict[tuple[int, int], SlotStat] = {}
    for slot, vals in buckets.items():
        if len(vals) < min_samples:
            continue
        med = statistics.median(vals)
        grid[slot] = SlotStat(median=med, sigma=sigma_from_mad(vals, med), n=len(vals))
    return grid


def band(stat: SlotStat, k: float = 1.5, clamp_min: float | None = 0.0) -> tuple[float, float]:
    """Ambang adaptif AI: median ± k·sigma (dok tekanan §3)."""
    lo = stat.median - k * stat.sigma
    hi = stat.median + k * stat.sigma
    if clamp_min is not None:
        lo = max(lo, clamp_min)
    return lo, hi


def lookup(grid: dict[tuple[int, int], SlotStat], ts: datetime, slot_size_min: int = 10) -> SlotStat | None:
    """SlotStat untuk waktu `ts` (None bila slot belum terisi)."""
    return grid.get(slot_key(ts, slot_size_min))


# --- serialisasi grid <-> jsonb (kunci tuple harus jadi string di JSON) ---------
def _slot_to_str(slot: tuple[int, int]) -> str:
    return f"{slot[0]}:{slot[1]}"


def _slot_from_str(s: str) -> tuple[int, int]:
    wd, bucket = s.split(":")
    return int(wd), int(bucket)


def grid_to_json(grid: dict[tuple[int, int], SlotStat]) -> dict[str, dict[str, float]]:
    """{(wd,bucket): SlotStat} → {"wd:bucket": {median,sigma,n}} untuk disimpan di jsonb."""
    return {
        _slot_to_str(slot): {"median": st.median, "sigma": st.sigma, "n": st.n}
        for slot, st in grid.items()
    }


def grid_from_json(d: dict[str, dict]) -> dict[tuple[int, int], SlotStat]:
    """Kebalikan grid_to_json — muat grid dari jsonb ai_baseline.grid."""
    return {
        _slot_from_str(k): SlotStat(median=float(v["median"]), sigma=float(v["sigma"]), n=int(v["n"]))
        for k, v in d.items()
    }
