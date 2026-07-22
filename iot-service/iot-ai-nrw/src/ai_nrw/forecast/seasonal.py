"""Forecaster Tier-0 — seasonal-naive dari grid musiman. PURE stdlib (uji offline).

Ide: grid sudah menyimpan median/MAD per (weekday, slot 10 menit). Ramalan = "hari serupa
berperilaku serupa": nilai harapan pada jam-X hari-Y = median slot (Y, X). Murah, tak butuh
training terpisah, jadi baseline pembanding tier lebih tinggi. Ref: dok 07 §4.

Dua resolusi:
  - forecast_slots() — DEFAULT. Satu titik per slot (10 mnt) → bentuk profil harian terjaga.
  - forecast_daily() — LEGACY. Satu titik per hari (median antar-slot) → profil hilang, garis rata.
"""

from __future__ import annotations

import statistics
from datetime import date, datetime, timedelta

from ai_nrw.baseline.grid import SlotStat, slot_key
from ai_nrw.forecast.base import DailyForecast, ForecastPoint, to_epoch_ms

TIER = "tier-0"

# Resolusi bawaan keluaran forecast (menit). Sama dengan slot grid baseline.
DEFAULT_STEP_MIN = 10


def _weekday_stats(grid: dict[tuple[int, int], SlotStat], weekday: int) -> list[SlotStat]:
    return [st for (wd, _b), st in grid.items() if wd == weekday]


def _band(
    p50: float, sig: float, k: float, min_band_frac: float, clamp_min: float | None
) -> tuple[float, float]:
    """median ± k·sigma, dengan lantai lebar pita = min_band_frac · |p50|.

    `clamp_min` diterapkan ke KEDUA batas. Kalau hanya `lo` yang diangkat, channel yang
    baseline-nya negatif (sensor mengambang di sekitar nol) menghasilkan lo > hi — pita
    terbalik, dan chart menggambar batas bawah di atas batas atas.
    """
    half = max(k * sig, (min_band_frac / 2.0) * abs(p50))
    lo, hi = p50 - half, p50 + half
    if clamp_min is not None:
        lo = max(lo, clamp_min)
        hi = max(hi, lo)
    return lo, hi


def snap_step(step_min: int | None, slot_size_min: int) -> int:
    """Langkah efektif: kelipatan slot grid, minimal 1 slot.

    Forecast tak bisa lebih halus dari grid yang melatihnya — meminta 1 menit dari grid
    10 menit hanya akan meleset ke slot yang tak pernah ada. Bukan-kelipatan dibulatkan ke bawah.
    """
    if not step_min or step_min < slot_size_min:
        return slot_size_min
    return (step_min // slot_size_min) * slot_size_min


def forecast_slots(
    grid: dict[tuple[int, int], SlotStat],
    start: datetime,
    horizon_days: int = 7,
    slot_size_min: int = DEFAULT_STEP_MIN,
    step_min: int | None = None,
    k: float = 1.5,
    clamp_min: float | None = 0.0,
    min_band_frac: float = 0.20,
) -> list[ForecastPoint]:
    """Ramalan ber-timestamp tiap `step_min` menit, sepanjang `horizon_days` dari `start`.

    `slot_size_min` WAJIB sama dengan resolusi grid (ai_baseline.slot_size_min); kalau tidak,
    `slot_key` menghasilkan bucket yang tak ada di grid dan hasilnya kosong.
    `step_min` > slot grid → slot-slot yang tercakup digabung (median antar-slot).

    Slot yang belum terisi di grid dilewati — output bisa lebih pendek dari horizon.
    `min_band_frac` = lebar pita minimum sebagai fraksi |p50| (0.20 = ±10%), supaya pita tak
    mengempis jadi satu garis saat sigma≈0.
    """
    step = snap_step(step_min, slot_size_min)
    sub_slots = step // slot_size_min
    total = (horizon_days * 24 * 60) // step

    out: list[ForecastPoint] = []
    for i in range(total):
        t = start + timedelta(minutes=i * step)
        # Slot-slot yang dicakup langkah ini, dihitung dari timestamp absolut — jadi lintas
        # tengah-malam / ganti weekday tetap benar walau step tak membagi habis 1440.
        stats = [
            st
            for j in range(sub_slots)
            if (st := grid.get(slot_key(t + timedelta(minutes=j * slot_size_min), slot_size_min)))
        ]
        if not stats:
            continue
        p50 = statistics.median([st.median for st in stats])
        sig = statistics.median([st.sigma for st in stats])
        lo, hi = _band(p50, sig, k, min_band_frac, clamp_min)
        out.append(ForecastPoint(ts=to_epoch_ms(t), p50=p50, lo=lo, hi=hi, n=len(stats)))
    return out


def forecast_daily(
    grid: dict[tuple[int, int], SlotStat],
    start: date,
    horizon_days: int = 7,
    k: float = 1.5,
    clamp_min: float | None = 0.0,
    min_band_frac: float = 0.20,
) -> list[DailyForecast]:
    """LEGACY — satu titik per hari (median antar-slot weekday). Pakai forecast_slots().

    Hari tanpa slot weekday-nya (grid belum lengkap) dilewati — output bisa < horizon.
    """
    out: list[DailyForecast] = []
    for d in range(horizon_days):
        day = start + timedelta(days=d)
        stats = _weekday_stats(grid, day.weekday())
        if not stats:
            continue
        p50 = statistics.median([st.median for st in stats])
        sig = statistics.median([st.sigma for st in stats])
        lo, hi = _band(p50, sig, k, min_band_frac, clamp_min)
        out.append(DailyForecast(d=d, p50=p50, lo=lo, hi=hi, n=len(stats)))
    return out
