"""Tes early-warning lewat-ambang (forecast_breach). PURE STDLIB.

Jalankan tanpa install apa pun: `python3 tests/test_early_warning.py`
(kompatibel pytest juga).
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ai_nrw.detectors.base import CRITICAL, WARNING, Sample
from ai_nrw.detectors.early_warning import BREACH, first_breach
from ai_nrw.detectors.engine import analyze_channel

NOW = datetime(2026, 7, 21, 10, 0, tzinfo=timezone.utc)
MS = 60_000


def ms(dt: datetime) -> int:
    return int(dt.timestamp() * 1000)


def points(values: list[float], start: datetime = NOW, step_min: int = 10) -> list[dict]:
    """Titik forecast format baru: ts absolut, mulai `start` + 1 langkah."""
    return [
        {"ts": ms(start) + (i + 1) * step_min * MS, "p50": v, "lo": v - 0.3, "hi": v + 0.3}
        for i, v in enumerate(values)
    ]


LEAD_48H = timedelta(hours=48)


# --- first_breach ---------------------------------------------------------
def test_fires_on_sustained_below_min():
    pts = points([2.0, 1.9, 0.8, 0.7, 0.6])
    hit = first_breach(pts, NOW, 1.0, 4.0, lead_max=LEAD_48H)
    assert hit is not None and hit["direction"] == "below"
    assert hit["cross_ts"] == pts[2]["ts"]  # pelanggaran mulai di titik ke-3
    assert hit["threshold"] == 1.0


def test_silent_when_forecast_stays_inside_band():
    assert first_breach(points([2.0, 2.5, 3.0, 3.5]), NOW, 1.0, 4.0, lead_max=LEAD_48H) is None


def test_single_stray_point_is_not_a_breach():
    """Satu titik nyelonong di ekor forecast tak boleh membangunkan orang."""
    pts = points([2.0, 0.9, 2.0, 2.1, 2.0])
    assert first_breach(pts, NOW, 1.0, 4.0, lead_max=LEAD_48H, min_breach_points=2) is None


def test_streak_must_be_same_direction():
    """Lewat-min lalu lewat-max berselang-seling bukan streak."""
    pts = points([0.9, 4.5, 0.8, 4.6])
    assert first_breach(pts, NOW, 1.0, 4.0, lead_max=LEAD_48H, min_breach_points=2) is None


def test_above_max_detected():
    hit = first_breach(points([3.0, 4.2, 4.4]), NOW, 1.0, 4.0, lead_max=LEAD_48H)
    assert hit is not None and hit["direction"] == "above" and hit["threshold"] == 4.0


def test_breach_beyond_lead_max_ignored():
    pts = points([0.5] * 10, start=NOW + timedelta(hours=72))
    assert first_breach(pts, NOW, 1.0, None, lead_max=LEAD_48H) is None


def test_past_points_ignored():
    """Forecast basi: titik sebelum `now` tak dinilai."""
    pts = points([0.5, 0.4], start=NOW - timedelta(hours=6))
    assert first_breach(pts, NOW, 1.0, None, lead_max=LEAD_48H) is None


def test_legacy_daily_rows_without_ts_ignored():
    legacy = [{"d": 0, "p50": 0.5}, {"d": 1, "p50": 0.4}]
    assert first_breach(legacy, NOW, 1.0, None, lead_max=LEAD_48H) is None


def test_no_thresholds_no_breach():
    assert first_breach(points([0.1, 0.1]), NOW, None, None, lead_max=LEAD_48H) is None


# --- integrasi engine -----------------------------------------------------
def _cfg() -> SimpleNamespace:
    return SimpleNamespace(analyses={"forecast": {}}, min_threshold=1.0, max_threshold=4.0,
                           group_name="Tekanan", target_id="t", id_owner="o")


def _samples() -> list[Sample]:
    return [Sample(ts=NOW - timedelta(minutes=2 * i), value=2.0) for i in range(5)][::-1]


def test_engine_emits_forecast_breach_with_category_meaning():
    fc = points([2.0, 0.8, 0.7])
    sigs = analyze_channel(_cfg(), _samples(), NOW, NOW, forecast=fc)
    assert len(sigs) == 1 and sigs[0].analysis_type == BREACH
    assert "Tekanan diprakirakan" in sigs[0].meaning  # arti kategori, bukan generik
    assert sigs[0].context["lead_hours"] > 0


def test_engine_severity_critical_when_imminent():
    soon = points([0.8, 0.7], step_min=10)                      # lewat dalam ~20 mnt
    far = points([0.8] * 3, start=NOW + timedelta(hours=24))    # lewat besok
    assert analyze_channel(_cfg(), _samples(), NOW, NOW, forecast=soon)[0].severity == CRITICAL
    assert analyze_channel(_cfg(), _samples(), NOW, NOW, forecast=far)[0].severity == WARNING


def test_engine_early_warning_can_be_disabled():
    cfg = _cfg()
    cfg.analyses["forecast"] = {"early_warning": False}
    assert analyze_channel(cfg, _samples(), NOW, NOW, forecast=points([0.5, 0.5])) == []


def test_engine_no_forecast_loaded_is_silent():
    assert analyze_channel(_cfg(), _samples(), NOW, NOW, forecast=None) == []


if __name__ == "__main__":
    passed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed += 1
            print(f"  ok  {name}")
    print(f"\n{passed} tes lolos.")
