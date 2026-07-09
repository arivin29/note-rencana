"""Tes P1 — A9 deviasi baseline + A10 drift CUSUM + serialisasi grid. PURE STDLIB.

Jalankan tanpa install apa pun: `python3 tests/test_p1_deviation_drift.py`
(kompatibel pytest juga).
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ai_nrw.baseline import grid as gridmod
from ai_nrw.baseline.bundle import Baseline, from_row
from ai_nrw.baseline.builder import build_grid
from ai_nrw.detectors import drift
from ai_nrw.detectors.base import CRITICAL, Sample
from ai_nrw.detectors.deviation import A9, a9_deviation
from ai_nrw.detectors.drift import A10, update_drift
from ai_nrw.detectors.engine import analyze_channel

NOW = datetime(2026, 7, 7, 3, 0, 0)  # Selasa 03:00 (jam malam)


def Point(ts, value, raw=None):  # stand-in ringan (ingestor.Point menarik clickhouse)
    return SimpleNamespace(ts=ts, value=value, raw=raw)


def make_samples(values: list[float | None], end: datetime = NOW, step_min: int = 2) -> list[Sample]:
    n = len(values)
    return [Sample(ts=end - timedelta(minutes=step_min * (n - 1 - i)), value=v) for i, v in enumerate(values)]


def flat_grid(median: float, sigma: float, slot_size_min: int = 10) -> dict:
    """Grid dgn SlotStat sama utk SEMUA slot (uji A9 tanpa peduli slot spesifik)."""
    return {
        (wd, b): gridmod.SlotStat(median=median, sigma=sigma, n=30)
        for wd in range(7)
        for b in range(24 * 60 // slot_size_min)
    }


# ---------------- serialisasi grid ----------------
def test_grid_json_roundtrip():
    g = {(0, 18): gridmod.SlotStat(3.4, 0.2, 30), (2, 100): gridmod.SlotStat(2.9, 0.15, 12)}
    back = gridmod.grid_from_json(gridmod.grid_to_json(g))
    assert back.keys() == g.keys(), "kunci slot harus lestari lewat JSON"
    st = back[(0, 18)]
    assert abs(st.median - 3.4) < 1e-9 and st.n == 30, "nilai SlotStat harus lestari"


def test_grid_lookup_by_time():
    g = flat_grid(3.0, 0.2)
    st = gridmod.lookup(g, NOW, 10)
    assert st is not None and st.median == 3.0, "lookup harus temukan slot utk NOW"


def test_build_grid_learn_ready_flag():
    # 5 slot × 4 titik/slot: titik jam-sama & weekday-sama (beda MINGGU) → slot sama.
    base = datetime(2026, 6, 1, 0, 0, 0)
    pts = [
        Point(ts=base + timedelta(days=7 * w, hours=h), value=3.0 + (w % 3) * 0.1)
        for h in range(5)
        for w in range(4)
    ]
    bl = build_grid(pts, slot_size_min=10, min_samples=3, min_slots_ready=3)
    assert bl.grid, "grid harus terisi"
    assert bl.learn_ready, "learn_ready true saat slot cukup"


# ---------------- A9 deviasi ----------------
def test_a9_fires_below_band():
    g = flat_grid(3.4, 0.2)  # normal 3.4 ± 0.2 → band 3-sigma = [2.8, 4.0]
    w = make_samples([2.0, 2.0, 2.0])  # z = (2.0-3.4)/0.2 = -7 → |z| >= 2k(=6)
    s = a9_deviation(w, g, 10, NOW, k=3.0, min_points=3)
    assert s and s.analysis_type == A9, "A9 harus fire saat 3 titik di bawah band"
    assert s.context["direction"] == "below", "arah harus below"
    assert s.severity == CRITICAL, "|z|>=2k → critical"


def test_a9_not_fire_within_band():
    g = flat_grid(3.4, 0.2)
    w = make_samples([3.4, 3.5, 3.3])  # normal
    assert a9_deviation(w, g, 10, NOW, k=3.0, min_points=3) is None, "dalam band → tak fire"


def test_a9_not_fire_mixed_direction():
    g = flat_grid(3.4, 0.2)
    w = make_samples([2.5, 4.5, 2.5])  # bolak-balik → tak konsisten satu arah
    assert a9_deviation(w, g, 10, NOW, k=3.0, min_points=3) is None, "arah campur → tak fire"


def test_a9_silent_without_grid():
    w = make_samples([2.5, 2.5, 2.5])
    assert a9_deviation(w, {}, 10, NOW, k=3.0, min_points=3) is None, "grid kosong → diam"


def test_a9_skips_zero_sigma_slot():
    g = flat_grid(3.4, 0.0)  # sigma nol (slot datar) → tak bisa dinilai
    w = make_samples([2.5, 2.5, 2.5])
    assert a9_deviation(w, g, 10, NOW, k=3.0, min_points=3) is None, "sigma<floor → tak bagi-nol"


# ---------------- A10 drift ----------------
def _feed(state: dict, values: list[float], start: datetime, step_min: int = 5, **kw):
    """Lipat deret nilai (ts menaik) ke update_drift; return list arah alarm."""
    alarms = []
    for i, v in enumerate(values):
        s = Sample(ts=start + timedelta(minutes=step_min * i), value=v)
        direction, _ = update_drift(state, [s], **kw)
        if direction:
            alarms.append(direction)
    return alarms


def test_a10_fires_on_downward_drift():
    state = drift._fresh_state()
    start = datetime(2026, 7, 1, 0, 0, 0)
    # 60 titik stabil ~3.4 lalu turun perlahan ke ~2.6 (slow leak)
    stable = [3.4 + ((i % 5) - 2) * 0.02 for i in range(60)]
    ramp = [3.4 - 0.02 * i for i in range(60)]
    alarms = _feed(state, stable + ramp, start)
    assert "down" in alarms, "drift menurun perlahan harus memicu A10 'down'"


def test_a10_quiet_on_stationary():
    state = drift._fresh_state()
    start = datetime(2026, 7, 1, 0, 0, 0)
    stationary = [3.4 + ((i % 7) - 3) * 0.03 for i in range(200)]  # noise, no drift
    alarms = _feed(state, stationary, start)
    assert not alarms, "deret stasioner tak boleh memicu drift"


def test_a10_idempotent_on_replay():
    """Melipat ulang titik lama (ts <= last_ts) tak boleh menggeser state."""
    state = drift._fresh_state()
    start = datetime(2026, 7, 1, 0, 0, 0)
    samples = make_samples([3.4, 3.5, 3.3, 3.4], end=start + timedelta(minutes=6), step_min=2)
    update_drift(state, samples)
    snapshot = dict(state)
    update_drift(state, samples)  # replay window yang sama
    assert state["n"] == snapshot["n"], "n tak boleh naik saat replay titik lama"
    assert state["last_ts"] == snapshot["last_ts"], "last_ts stabil saat replay"


# ---------------- engine dispatch (A9+A10 lewat pipeline generik) ----------------
def test_engine_dispatches_a9_with_baseline():
    cfg = SimpleNamespace(
        analyses={A9: {"k": 3.0, "min_points": 3}},
        min_threshold=1.0,
        max_threshold=6.0,
        group_name="Tekanan",
    )
    bl = Baseline(grid=flat_grid(3.4, 0.2), slot_size_min=10)
    w = make_samples([2.5, 2.5, 2.5])
    codes = {s.analysis_type for s in analyze_channel(cfg, w, NOW, last_ts=NOW, baseline=bl)}
    assert A9 in codes, "A9 harus muncul lewat engine saat baseline disuntik"


def test_engine_a10_mutates_online_state():
    cfg = SimpleNamespace(
        analyses={A10: {}},
        min_threshold=1.0,
        max_threshold=6.0,
        group_name="Tekanan",
    )
    bl = Baseline()
    w = make_samples([3.4, 3.4, 3.4], step_min=2)
    analyze_channel(cfg, w, NOW, last_ts=NOW, baseline=bl)
    assert A10 in bl.online_state, "A10 harus menaruh state di online_state (persist tiap siklus)"
    assert bl.online_state[A10]["n"] >= 1, "state harus terisi setelah melipat titik"


def test_engine_a9_silent_without_baseline():
    cfg = SimpleNamespace(analyses={A9: {}}, min_threshold=1.0, max_threshold=6.0, group_name="Tekanan")
    w = make_samples([2.5, 2.5, 2.5])
    codes = {s.analysis_type for s in analyze_channel(cfg, w, NOW, last_ts=NOW, baseline=None)}
    assert A9 not in codes, "tanpa baseline, A9 harus diam (tak crash)"


def test_from_row_none_gives_empty_bundle():
    bl = from_row(None)
    assert bl.grid == {} and bl.online_state == {} and not bl.learn_ready


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
    print("Menjalankan tes P1 (A9 deviasi + A10 drift + grid serde) — stdlib:")
    raise SystemExit(1 if _run_all() else 0)
