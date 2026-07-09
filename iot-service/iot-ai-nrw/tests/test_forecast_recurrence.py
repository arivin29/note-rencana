"""Tes forecast Tier-0 seasonal-naive + rekurensi kambuh-pulih. PURE STDLIB.

Jalankan: `python3 tests/test_forecast_recurrence.py` (kompatibel pytest juga).
"""

from __future__ import annotations

import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ai_nrw.baseline.grid import SlotStat
from ai_nrw.forecast import seasonal
from ai_nrw.recurrence.analyzer import analyze

NOW = datetime(2026, 7, 7, 12, 0, 0)


def weekday_grid(sigma: float = 0.2) -> dict:
    """Grid: tiap weekday punya median beda (3.0 + wd·0.1), 6 slot/weekday."""
    return {
        (wd, b): SlotStat(median=3.0 + wd * 0.1, sigma=sigma, n=20)
        for wd in range(7)
        for b in range(6)
    }


# ---------------- forecast seasonal ----------------
def test_forecast_produces_horizon_days():
    g = weekday_grid()
    start = date(2026, 7, 8)  # Rabu
    out = seasonal.forecast_daily(g, start, horizon_days=7)
    assert len(out) == 7, "grid lengkap → 7 hari terisi"
    assert out[0].d == 0 and out[-1].d == 6, "offset hari 0..6"


def test_forecast_p50_matches_weekday_median():
    g = weekday_grid()
    start = date(2026, 7, 8)  # weekday() == 2 (Rabu)
    out = seasonal.forecast_daily(g, start, horizon_days=1)
    assert abs(out[0].p50 - (3.0 + 2 * 0.1)) < 1e-9, "p50 = median slot weekday itu"
    assert out[0].lo < out[0].p50 < out[0].hi, "band mengurung p50"
    assert out[0].n == 6, "n = jumlah slot pendukung weekday"


def test_forecast_band_clamps_min():
    g = {(d, 0): SlotStat(median=0.5, sigma=1.0, n=10) for d in range(7)}
    out = seasonal.forecast_daily(g, date(2026, 7, 8), horizon_days=1, k=1.5, clamp_min=0.0)
    assert out[0].lo == 0.0, "lo di-clamp ke 0 (tekanan tak negatif)"


def test_forecast_skips_missing_weekday():
    # hanya weekday 0 (Senin) yang punya slot → hanya hari Senin di horizon yang keluar
    g = {(0, b): SlotStat(median=3.0, sigma=0.1, n=10) for b in range(4)}
    start = date(2026, 7, 7)  # Selasa (wd=1)
    out = seasonal.forecast_daily(g, start, horizon_days=7)
    assert all(d.d in (6,) for d in out), "hanya Senin (offset 6 dari Selasa) yang terisi"
    assert len(out) == 1


def test_forecast_empty_grid_gives_nothing():
    assert seasonal.forecast_daily({}, date(2026, 7, 8), horizon_days=7) == []


# ---------------- recurrence ----------------
def test_recurrence_counts_within_window():
    ts = [NOW - timedelta(days=d) for d in (1, 3, 5, 20)]  # 20 hari di luar jendela 14
    stat = analyze(ts, NOW, window_days=14)
    assert stat.count == 3, "hanya event dalam 14 hari dihitung"


def test_recurrence_escalates():
    ts = [NOW - timedelta(days=d) for d in (1, 2, 3)]
    stat = analyze(ts, NOW, window_days=14, escalate_at=3)
    assert stat.escalated, "count >= escalate_at → escalated"


def test_recurrence_trend_naik():
    # semua di separuh-akhir jendela (baru-baru ini) → naik
    ts = [NOW - timedelta(days=d) for d in (1, 2, 3, 4)]
    stat = analyze(ts, NOW, window_days=14)
    assert stat.trend == "naik", "menumpuk di paruh akhir → tren naik"


def test_recurrence_trend_turun():
    # semua di separuh-awal (lama) → turun
    ts = [NOW - timedelta(days=d) for d in (10, 11, 12, 13)]
    stat = analyze(ts, NOW, window_days=14)
    assert stat.trend == "turun", "menumpuk di paruh awal → tren turun"


def test_recurrence_typical_hour_peak():
    ts = [NOW.replace(hour=3), NOW.replace(hour=3) - timedelta(days=1), NOW.replace(hour=10) - timedelta(days=2)]
    stat = analyze(ts, NOW, window_days=14)
    assert stat.typical_hour["peak"] == 3, "jam 03:00 paling sering → peak"


def test_recurrence_empty():
    stat = analyze([], NOW, window_days=14)
    assert stat.count == 0 and stat.trend is None and stat.typical_hour == {} and not stat.escalated


def _run_all() -> int:
    tests = [(n, f) for n, f in globals().items() if n.startswith("test_") and callable(f)]
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"  ✅ {name}")
        except AssertionError as e:
            failed += 1
            print(f"  ❌ {name}: {e}")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"  💥 {name}: {type(e).__name__}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} lulus.")
    return failed


if __name__ == "__main__":
    print("Menjalankan tes forecast + rekurensi (stdlib):")
    raise SystemExit(1 if _run_all() else 0)
