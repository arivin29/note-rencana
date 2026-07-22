"""Tes A4 spike + A6 noise. PURE STDLIB.

Jalankan tanpa install apa pun: `python3 tests/test_spike_noise.py`
(kompatibel pytest juga).
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ai_nrw.detectors.base import CRITICAL, WARNING, Sample, consecutive_steps
from ai_nrw.detectors.noise import A6, a6_noise, volatility
from ai_nrw.detectors.spike import A4, a4_spike

NOW = datetime(2026, 7, 21, 10, 0, 0)


def samples(values: list[float | None], end: datetime = NOW, step_min: int = 2) -> list[Sample]:
    n = len(values)
    return [Sample(ts=end - timedelta(minutes=step_min * (n - 1 - i)), value=v) for i, v in enumerate(values)]


def wobble(n: int, base: float, amp: float) -> list[float]:
    """Riak kecil deterministik (ganti-tanda) — memberi channel 'kebiasaan' terukur."""
    return [base + (amp if i % 2 else -amp) for i in range(n)]


# --- A4 -------------------------------------------------------------------
def test_a4_fires_on_sudden_jump():
    sig = a4_spike(samples(wobble(20, 3.0, 0.02) + [5.0]))
    assert sig is not None and sig.analysis_type == A4
    assert sig.context["direction"] == "up"
    assert sig.context["basis"] == "auto"


def test_a4_silent_on_normal_wobble():
    assert a4_spike(samples(wobble(24, 3.0, 0.02))) is None


def test_a4_severity_escalates():
    # riak |Δ| = 0.2 → batas = 6 × 0.2 = 1.2; titik terakhir bertolak dari 3.1
    mild = a4_spike(samples(wobble(20, 3.0, 0.1) + [4.5]))     # Δ 1.4 → antara 1x dan 2x batas
    huge = a4_spike(samples(wobble(20, 3.0, 0.1) + [9.0]))     # Δ 5.9 → jauh di atas 2x batas
    assert mild is not None and mild.severity == WARNING
    assert huge is not None and huge.severity == CRITICAL


def test_a4_direction_filter():
    drop = samples(wobble(20, 3.0, 0.02) + [1.0])
    assert a4_spike(drop, direction="down") is not None
    assert a4_spike(drop, direction="up") is None


def test_a4_ignores_jump_across_data_gap():
    """Titik sesudah node offline tak boleh dibaca sebagai spike."""
    hist = samples(wobble(20, 3.0, 0.02))
    after_gap = Sample(ts=NOW + timedelta(hours=2), value=5.0)
    assert a4_spike(hist + [after_gap], max_gap=timedelta(minutes=15)) is None


def test_a4_silent_when_history_is_flat():
    """Skala nol → batas nol → apa pun jadi spike. Harus diam (A5 yang urus datar)."""
    assert a4_spike(samples([3.0] * 20 + [3.0001])) is None


def test_a4_explicit_limit_overrides_auto():
    flat_then_jump = samples([3.0] * 20 + [4.0])
    assert a4_spike(flat_then_jump) is None                      # auto: diam
    assert a4_spike(flat_then_jump, spike_limit=0.5) is not None  # eksplisit: bunyi


def test_a4_needs_enough_history():
    assert a4_spike(samples([3.0, 3.02, 9.0]), min_points=10) is None


def test_a4_null_breaks_the_pair():
    assert a4_spike(samples(wobble(20, 3.0, 0.02) + [None, 5.0])) is None


# --- A6 -------------------------------------------------------------------
def test_a6_fires_when_recent_window_gets_jittery():
    calm = wobble(60, 3.0, 0.01)          # 2 jam tenang
    jitter = wobble(16, 3.0, 0.30)        # 32 menit bergetar
    sig = a6_noise(samples(calm + jitter), NOW)
    assert sig is not None and sig.analysis_type == A6
    assert sig.context["ratio"] >= 3.0


def test_a6_silent_when_uniformly_noisy():
    """Channel yang memang selalu berisik bukan anomali."""
    assert a6_noise(samples(wobble(80, 3.0, 0.30)), NOW) is None


def test_a6_ignores_smooth_level_change():
    """Naik mulus 2→4 bar: sebaran nilai lebar, volatilitas kecil — bukan noise."""
    calm = wobble(60, 2.0, 0.01)
    ramp = [2.0 + 0.125 * i for i in range(1, 17)]
    assert a6_noise(samples(calm + ramp), NOW) is None


def test_a6_silent_when_baseline_is_perfectly_flat():
    """Rasio terhadap nol tak bermakna → diam, bukan alarm."""
    assert a6_noise(samples([3.0] * 60 + wobble(16, 3.0, 0.2)), NOW) is None


def test_a6_needs_points_on_both_sides():
    assert a6_noise(samples(wobble(6, 3.0, 0.01) + wobble(6, 3.0, 0.5)), NOW) is None


def test_a6_severity_escalates():
    calm = wobble(60, 3.0, 0.01)
    wild = a6_noise(samples(calm + wobble(16, 3.0, 1.0)), NOW)
    assert wild is not None and wild.severity == CRITICAL


# --- util bersama ---------------------------------------------------------
def test_consecutive_steps_drops_gaps_and_nulls():
    s = [
        Sample(ts=NOW - timedelta(minutes=30), value=1.0),
        Sample(ts=NOW - timedelta(minutes=28), value=2.0),   # dipakai
        Sample(ts=NOW - timedelta(minutes=26), value=None),  # memutus
        Sample(ts=NOW - timedelta(minutes=24), value=3.0),
        Sample(ts=NOW, value=4.0),                           # jeda 24 mnt > max_gap
    ]
    steps = consecutive_steps(s, timedelta(minutes=15))
    assert len(steps) == 1 and steps[0][1] == 1.0


def test_volatility_is_zero_for_a_straight_ramp():
    """Selisih-kedua: gerak lurus konstan = tak bergetar sama sekali."""
    assert volatility(samples([1.0, 2.0, 3.0, 4.0]), timedelta(minutes=15)) == 0.0


def test_volatility_counts_direction_reversal():
    """Zigzag ±0.5 → tiap langkah berbalik sebesar 1.0."""
    assert volatility(samples([3.0, 3.5, 3.0, 3.5, 3.0]), timedelta(minutes=15)) == 1.0


if __name__ == "__main__":
    passed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed += 1
            print(f"  ok  {name}")
    print(f"\n{passed} tes lolos.")
