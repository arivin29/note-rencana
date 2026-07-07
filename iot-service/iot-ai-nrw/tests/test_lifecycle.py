"""Tes state machine event lifecycle — PURE STDLIB (`python3 tests/test_lifecycle.py`)."""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ai_nrw.detectors.base import CRITICAL, WARNING, Signal
from ai_nrw.events import lifecycle as lc

NOW = datetime(2026, 7, 7, 9, 0, 0)


def sig(atype: str, sev: str = WARNING, value: float = 1.0, threshold: float | None = 2.0) -> Signal:
    ctx = {} if threshold is None else {"threshold": threshold}
    return Signal(atype, sev, NOW, value, "x", ctx)


def active(atype: str, sev: str = WARNING, streak: int = 0, started_min_ago: int = 30) -> lc.ActiveEvent:
    return lc.ActiveEvent(
        id=f"ev-{atype}",
        analysis_type=atype,
        severity=sev,
        started_at=NOW - timedelta(minutes=started_min_ago),
        clear_streak=streak,
    )


def test_open_when_new_signal():
    acts = lc.reconcile({}, [sig("A2_low")], NOW)
    assert len(acts) == 1 and isinstance(acts[0], lc.OpenEvent), "sinyal baru → OpenEvent"
    assert acts[0].magnitude is not None, "magnitude dihitung dari threshold di context"


def test_update_escalates_severity():
    acts = lc.reconcile({"A2_low": active("A2_low", WARNING)}, [sig("A2_low", CRITICAL)], NOW)
    assert len(acts) == 1 and isinstance(acts[0], lc.UpdateEvent)
    assert acts[0].severity == CRITICAL, "severity harus naik ke critical (max)"
    assert acts[0].last_seen_at == NOW, "last_seen di-refresh"


def test_update_does_not_downgrade_severity():
    acts = lc.reconcile({"A2_low": active("A2_low", CRITICAL)}, [sig("A2_low", WARNING)], NOW)
    assert acts[0].severity == CRITICAL, "severity tidak turun (tetap puncak)"


def test_clearing_increments_streak_not_close():
    acts = lc.reconcile({"A2_low": active("A2_low", streak=0)}, [], NOW, clear_cycles=2)
    assert len(acts) == 1 and isinstance(acts[0], lc.ClearingEvent)
    assert acts[0].clear_streak == 1, "streak naik ke 1, belum close"


def test_close_when_streak_reaches_threshold():
    acts = lc.reconcile({"A2_low": active("A2_low", streak=1, started_min_ago=60)}, [], NOW, clear_cycles=2)
    assert len(acts) == 1 and isinstance(acts[0], lc.CloseEvent)
    assert acts[0].reason == "auto_closed"
    assert acts[0].duration_sec == 3600, "durasi = now - started_at (60 menit)"


def test_no_action_when_nothing():
    assert lc.reconcile({}, [], NOW) == [], "tak ada sinyal & tak ada event → tak ada aksi"


def test_independent_types():
    # A2 aktif tapi sinyalnya hilang (clear_cycles=1 → langsung close), A3 sinyal baru
    acts = lc.reconcile({"A2_low": active("A2_low", streak=0)}, [sig("A3_high", CRITICAL, 9.0, 5.0)], NOW, clear_cycles=1)
    kinds = {type(a).__name__ for a in acts}
    assert "CloseEvent" in kinds, "A2 tanpa sinyal (clear_cycles=1) → close"
    assert "OpenEvent" in kinds, "A3 sinyal baru → open"


def test_dedup_single_active_per_type():
    # dua sinyal tipe sama dalam satu siklus tak boleh bikin dua open (by_type overwrite)
    acts = lc.reconcile({}, [sig("A2_low"), sig("A2_low", value=0.5)], NOW)
    assert len([a for a in acts if isinstance(a, lc.OpenEvent)]) == 1, "satu tipe → satu event"


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
    print("Menjalankan tes event lifecycle (stdlib):")
    raise SystemExit(1 if _run_all() else 0)
