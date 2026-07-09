"""Forecaster Tier-0 — seasonal-naive dari grid musiman. PURE stdlib (uji offline).

Ide: grid sudah menyimpan median/MAD per (weekday, slot). Ramalan harian = agregasi slot
per weekday: nilai harapan hari-X = median antar-slot untuk weekday itu, band dari sigma.
Murah, tak butuh training terpisah, jadi baseline pembanding tier lebih tinggi. Ref: dok 07 §4.
"""

from __future__ import annotations

import statistics
from datetime import date, timedelta

from ai_nrw.baseline.grid import SlotStat
from ai_nrw.forecast.base import DailyForecast

TIER = "tier-0"


def _weekday_stats(grid: dict[tuple[int, int], SlotStat], weekday: int) -> list[SlotStat]:
    return [st for (wd, _b), st in grid.items() if wd == weekday]


def forecast_daily(
    grid: dict[tuple[int, int], SlotStat],
    start: date,
    horizon_days: int = 7,
    k: float = 1.5,
    clamp_min: float | None = 0.0,
    min_band_frac: float = 0.20,
) -> list[DailyForecast]:
    """Ramalan `horizon_days` hari dari `start` (offset 0 = hari `start`).

    Hari tanpa slot weekday-nya (grid belum lengkap) dilewati — output bisa < horizon.

    `min_band_frac` = lebar band minimum sebagai fraksi |p50| (default 0.20 = ±10%).
    Untuk data sangat stabil (sigma≈0) band tidak mengempis jadi 1 garis; tetap ada
    ruang toleransi yang berguna sebagai ambang peringatan "di luar forecast".
    """
    out: list[DailyForecast] = []
    for d in range(horizon_days):
        day = start + timedelta(days=d)
        stats = _weekday_stats(grid, day.weekday())
        if not stats:
            continue
        medians = [st.median for st in stats]
        sigmas = [st.sigma for st in stats]
        p50 = statistics.median(medians)
        sig = statistics.median(sigmas)
        half = k * sig
        # lantai: setengah-lebar minimal = min_band_frac/2 · |p50| → (hi-lo) ≥ min_band_frac·|p50|
        min_half = (min_band_frac / 2.0) * abs(p50)
        half = max(half, min_half)
        lo, hi = p50 - half, p50 + half
        if clamp_min is not None:
            lo = max(lo, clamp_min)
        out.append(DailyForecast(d=d, p50=p50, lo=lo, hi=hi, n=len(stats)))
    return out
