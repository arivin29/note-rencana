"""Tes detektor core + baseline — PURE STDLIB (bisa `python3 tests/test_core_detectors.py`
tanpa install dependency). Kompatibel pytest juga (fungsi test_*).
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ai_nrw.baseline import grid
from ai_nrw.detectors import core
from ai_nrw.detectors.engine import analyze_channel
from ai_nrw.detectors.base import CRITICAL, Sample

NOW = datetime(2026, 7, 7, 3, 0, 0)  # jam malam (relevan tekanan)


def make_samples(values: list[float | None], end: datetime = NOW, step_min: int = 2) -> list[Sample]:
    """Deret Sample menaik, titik terakhir di `end`, jarak `step_min`."""
    n = len(values)
    return [Sample(ts=end - timedelta(minutes=step_min * (n - 1 - i)), value=v) for i, v in enumerate(values)]


# ---------------- A1 ----------------
def test_a1_negatif_fires():
    w = make_samples([2.0, 2.1, -0.5])
    s = core.a1_invalid(w[-1])
    assert s and s.analysis_type == core.A1 and s.severity == CRITICAL, "A1 harus fire pada nilai negatif"


def test_a1_null_fires():
    w = make_samples([2.0, None])
    s = core.a1_invalid(w[-1])
    assert s and s.context["reason"] == "null", "A1 harus fire pada null"


def test_a1_normal_none():
    assert core.a1_invalid(Sample(NOW, 2.5)) is None, "A1 tidak boleh fire nilai wajar"


def test_a1_allow_negative():
    assert core.a1_invalid(Sample(NOW, -0.3), allow_negative=True) is None, "allow_negative → tak fire"


# ---------------- A2 / A3 ----------------
def test_a2_low_sustained_fires():
    w = make_samples([1.0] * 10)  # 18 menit, semua < 2.0
    s = core.a2_low(w, thr_min=2.0, sustain=timedelta(minutes=15), now=NOW)
    assert s and s.analysis_type == core.A2, "A2 harus fire saat rendah berkelanjutan"


def test_a2_not_fire_when_normal():
    w = make_samples([3.0] * 10)
    assert core.a2_low(w, thr_min=2.0, sustain=timedelta(minutes=15), now=NOW) is None


def test_a2_not_fire_when_too_short():
    w = make_samples([1.0, 1.0])  # cuma 2 menit
    assert core.a2_low(w, thr_min=2.0, sustain=timedelta(minutes=15), now=NOW) is None, "durasi kurang → tak fire"


def test_a3_high_sustained_fires():
    w = make_samples([9.0] * 10)
    s = core.a3_high(w, thr_max=5.0, sustain=timedelta(minutes=15), now=NOW)
    assert s and s.analysis_type == core.A3 and s.severity == CRITICAL, "A3 fire & critical (>50% breach)"


# ---------------- A5 ----------------
def test_a5_flatline_fires():
    w = make_samples([3.0] * 6)
    s = core.a5_flatline(w, eps=0.01, n=5, now=NOW)
    assert s and s.analysis_type == core.A5, "A5 harus fire saat datar"


def test_a5_not_fire_when_varies():
    w = make_samples([3.0, 3.2, 2.9, 3.1, 3.3, 2.8])
    assert core.a5_flatline(w, eps=0.01, n=5, now=NOW) is None


# ---------------- A7 ----------------
def test_a7_nodata_fires():
    s = core.a7_nodata(last_ts=NOW - timedelta(minutes=20), now=NOW, timeout=timedelta(minutes=10))
    assert s and s.analysis_type == core.A7, "A7 fire saat gap > timeout"


def test_a7_not_fire_when_fresh():
    assert core.a7_nodata(NOW - timedelta(minutes=3), NOW, timedelta(minutes=10)) is None


# ---------------- A8 ----------------
def test_a8_persistent_fires():
    w = make_samples([6.0] * 20, step_min=15)  # ~4.75 jam, semua > max 3.0
    s = core.a8_persistent(w, thr_min=1.0, thr_max=3.0, persist=timedelta(hours=4), now=NOW)
    assert s and s.analysis_type == core.A8 and s.severity == CRITICAL, "A8 fire & critical"


# ---------------- engine dispatch ----------------
def test_engine_selects_enabled():
    cfg = SimpleNamespace(
        analyses={
            core.A1: {},
            core.A2: {"sustain_T": "15m"},
            core.A5: {"eps_flat": 0.01, "n": 5},
        },
        min_threshold=2.0,
        max_threshold=5.0,
        group_name=None,
    )
    w = make_samples([1.0] * 10)  # rendah & datar → A2 + A5 (A1 tak fire, 1.0 valid)
    codes = {s.analysis_type for s in analyze_channel(cfg, w, NOW, last_ts=NOW)}
    assert core.A2 in codes, "A2 harus muncul"
    assert core.A5 in codes, "A5 harus muncul (nilai datar)"
    assert core.A1 not in codes, "A1 tak boleh (1.0 valid)"
    assert core.A3 not in codes, "A3 tak di-enable → tak muncul"


# ---------------- baseline ----------------
def test_baseline_grid_median_mad():
    base = datetime(2026, 7, 6, 3, 0, 0)  # Senin 03:00
    samples = [(base + timedelta(days=7 * w), 3.0 + (w % 2) * 0.2) for w in range(6)]
    g = grid.compute_grid(samples, slot_size_min=10, min_samples=3)
    slot = grid.slot_key(base, 10)
    assert slot in g, "slot Senin-03:00 harus ada di grid"
    st = g[slot]
    assert 2.9 < st.median < 3.3 and st.sigma >= 0.0, "median/sigma masuk akal"
    lo, hi = grid.band(st, k=1.5)
    assert lo <= st.median <= hi and lo >= 0.0, "band mengurung median & clamp >=0"


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
    print("Menjalankan tes detektor core + baseline (stdlib):")
    raise SystemExit(1 if _run_all() else 0)
