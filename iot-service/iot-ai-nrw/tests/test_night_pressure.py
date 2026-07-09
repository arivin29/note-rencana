"""Tes night_pressure (analog MNF tekanan malam §5.11). PURE STDLIB.

Jalankan: `python3 tests/test_night_pressure.py` (kompatibel pytest juga).
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ai_nrw.baseline.bundle import Baseline
from ai_nrw.detectors.base import CRITICAL, WARNING, Sample
from ai_nrw.detectors.engine import analyze_channel
from ai_nrw.detectors.night_pressure import NIGHT, night_pressure

DAY = datetime(2026, 7, 7)  # Selasa
AFTER = DAY.replace(hour=5)  # jam 05:00 → jendela malam 00:00-04:00 sudah lengkap


def night_samples(values: list[float], day: datetime = DAY, start_hour: int = 0, step_min: int = 30) -> list[Sample]:
    """Sampel di jendela malam `day` mulai `start_hour`, jarak `step_min`."""
    base = day.replace(hour=start_hour, minute=0)
    return [Sample(ts=base + timedelta(minutes=step_min * i), value=v) for i, v in enumerate(values)]


def hist(vals: list[float]) -> dict:
    """night_state dgn riwayat malam-malam sebelumnya."""
    return {"history": [{"d": f"2026-07-0{i+1}", "v": v} for i, v in enumerate(vals)], "last_night": None}


def kw(**over):
    base = dict(start_min=0, end_min=240, agg="median", min_points=6,
               drop_frac=0.15, history_days=7, min_history=3)
    base.update(over)
    return base


# ---------------- pure ----------------
def test_night_fires_on_drop():
    st = hist([3.4, 3.4, 3.3])          # baseline malam ~3.4
    s = night_pressure(night_samples([2.5] * 8), AFTER, st, **kw())
    assert s and s.analysis_type == NIGHT, "tekanan malam anjlok → fire"
    assert s.severity == WARNING, "drop 0.26 (<2·0.15) → warning"
    assert st["last_night"] == "2026-07-07", "malam ini tercatat"


def test_night_critical_on_big_drop():
    st = hist([3.4, 3.4, 3.3])
    s = night_pressure(night_samples([2.0] * 8), AFTER, st, **kw())
    assert s and s.severity == CRITICAL, "drop 0.41 (>=2·0.15) → critical"


def test_night_quiet_when_normal():
    st = hist([3.4, 3.4, 3.3])
    assert night_pressure(night_samples([3.4] * 8), AFTER, st, **kw()) is None, "tekanan normal → diam"


def test_night_waits_until_window_complete():
    st = hist([3.4, 3.4, 3.3])
    early = DAY.replace(hour=3)  # 03:00 < end 04:00
    assert night_pressure(night_samples([2.5] * 8), early, st, **kw()) is None, "jendela belum lengkap → tunggu"
    assert st.get("last_night") is None, "belum dicatat karena belum dievaluasi"


def test_night_needs_min_history():
    st = {"history": [{"d": "x", "v": 3.4}, {"d": "y", "v": 3.4}], "last_night": None}  # cuma 2 malam
    s = night_pressure(night_samples([2.5] * 8), AFTER, st, **kw(min_history=3))
    assert s is None, "riwayat < min_history → tak simpulkan"
    assert len(st["history"]) == 3, "tapi malam ini tetap dicatat (belajar)"


def test_night_idempotent_same_night():
    st = hist([3.4, 3.4, 3.3])
    st["last_night"] = "2026-07-07"  # sudah dievaluasi malam ini
    before = list(st["history"])
    assert night_pressure(night_samples([2.5] * 8), AFTER, st, **kw()) is None, "sudah dicatat → skip"
    assert st["history"] == before, "riwayat tak berubah saat replay malam sama"


def test_night_needs_min_points():
    st = hist([3.4, 3.4, 3.3])
    s = night_pressure(night_samples([2.5, 2.5, 2.5]), AFTER, st, **kw(min_points=6))  # cuma 3 titik
    assert s is None, "data malam kurang → tak fire & tak catat"
    assert st.get("last_night") is None


def test_night_history_trims():
    st = {"history": [{"d": f"d{i}", "v": 3.4} for i in range(7)], "last_night": None}
    night_pressure(night_samples([3.4] * 8), AFTER, st, **kw(history_days=7))
    assert len(st["history"]) == 7, "riwayat dipangkas ke history_days"
    assert st["history"][-1]["d"] == "2026-07-07", "malam terbaru di ujung"


# ---------------- engine dispatch ----------------
def test_engine_dispatches_night_with_baseline():
    cfg = SimpleNamespace(
        analyses={NIGHT: {"night_end": "04:00", "drop_frac": 0.15}},
        min_threshold=1.0, max_threshold=6.0, group_name="Tekanan",
    )
    bl = Baseline(night_state=hist([3.4, 3.4, 3.3]))
    codes = {s.analysis_type for s in analyze_channel(cfg, night_samples([2.5] * 8), AFTER, last_ts=AFTER, baseline=bl)}
    assert NIGHT in codes, "night_pressure muncul lewat engine saat baseline disuntik"


def test_engine_night_silent_without_baseline():
    cfg = SimpleNamespace(analyses={NIGHT: {}}, min_threshold=1.0, max_threshold=6.0, group_name="Tekanan")
    codes = {s.analysis_type for s in analyze_channel(cfg, night_samples([2.5] * 8), AFTER, last_ts=AFTER, baseline=None)}
    assert NIGHT not in codes, "tanpa baseline → diam (tak crash)"


def test_night_registered_via_category_import():
    import ai_nrw.categories  # noqa: F401  (memicu import pressure → night_pressure)
    from ai_nrw.detectors import registry
    assert NIGHT in registry.registered_codes(), "night_pressure terdaftar via modul kategori"


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
    print("Menjalankan tes night_pressure (stdlib):")
    raise SystemExit(1 if _run_all() else 0)
