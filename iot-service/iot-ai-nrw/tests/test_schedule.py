"""Tes active_schedule (jam aktif + kalender libur). PURE STDLIB.

Jalankan tanpa install apa pun: `python3 tests/test_schedule.py`
(kompatibel pytest juga).
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ai_nrw.detectors.base import Sample
from ai_nrw.detectors.engine import analyze_channel
from ai_nrw.detectors.schedule import (
    ACTIVE_SCHEDULE,
    evaluate,
    in_windows,
    is_holiday,
    parse_windows,
)

# 20:00 UTC = 03:00 WIB (+7) hari berikutnya — dini hari, jam pompa mati.
UTC_NIGHT_WIB = datetime(2026, 7, 20, 20, 0, tzinfo=timezone.utc)
# 03:00 UTC = 10:00 WIB — jam kerja.
UTC_DAY_WIB = datetime(2026, 7, 21, 3, 0, tzinfo=timezone.utc)

SCHED_20H = {"windows": ["04:00-24:00"], "tz": "Asia/Jakarta"}


# --- parsing --------------------------------------------------------------
def test_parse_windows_basic_and_2400():
    assert parse_windows(["04:00-24:00"]) == [(240, 1440)]


def test_parse_windows_accepts_comma_string_from_ui():
    """Input teks UI menyimpan array sebagai string ber-koma."""
    assert parse_windows("04:00-12:00, 16:00-22:00") == [(240, 720), (960, 1320)]


def test_parse_windows_skips_garbage_and_empty_span():
    assert parse_windows(["ngawur", "08:00-08:00", "04:00-06:00"]) == [(240, 360)]


def test_in_windows_cross_midnight():
    win = parse_windows(["22:00-06:00"])
    assert in_windows(23 * 60, win)
    assert in_windows(3 * 60, win)
    assert not in_windows(12 * 60, win)


# --- evaluate: jam aktif --------------------------------------------------
def test_off_hours_in_local_tz_suppresses_defaults():
    st = evaluate(SCHED_20H, UTC_NIGHT_WIB)
    assert st.off_hours
    assert st.suppressed == {"A1_invalid", "A2_low", "A5_flatline"}


def test_active_hours_suppresses_nothing():
    st = evaluate(SCHED_20H, UTC_DAY_WIB)
    assert not st.off_hours and st.suppressed == frozenset()


def test_suppress_off_override():
    """Node ikut dimatikan malam → operator boleh menambah A7 ke daftar."""
    st = evaluate({**SCHED_20H, "suppress_off": ["A2_low", "A7_nodata"]}, UTC_NIGHT_WIB)
    assert st.suppressed == {"A2_low", "A7_nodata"}


def test_no_schedule_row_means_always_on():
    assert evaluate(None, UTC_NIGHT_WIB).suppressed == frozenset()


def test_empty_windows_means_24h_channel():
    assert not evaluate({"windows": [], "tz": "Asia/Jakarta"}, UTC_NIGHT_WIB).off_hours


def test_bad_tz_falls_back_to_utc_not_dead():
    """tz salah ketik tak boleh mematikan deteksi; 20:00 UTC masih di jendela 04-24."""
    st = evaluate({**SCHED_20H, "tz": "Asia/Ngawur"}, UTC_NIGHT_WIB)
    assert not st.off_hours


# --- evaluate: kalender libur ---------------------------------------------
def test_holiday_exact_date_relaxes_adaptive_detectors():
    st = evaluate({**SCHED_20H, "holidays": ["2026-07-21"]}, UTC_DAY_WIB)
    assert st.holiday and not st.off_hours
    assert st.suppressed == {"A6_noise", "A9_deviation", "A10_drift", "night_pressure"}


def test_holiday_uses_local_date_not_utc():
    """20:00 UTC 20 Jul = 03:00 WIB 21 Jul — tanggal libur dinilai di tz lokal."""
    st = evaluate({"windows": [], "tz": "Asia/Jakarta", "holidays": ["2026-07-21"]}, UTC_NIGHT_WIB)
    assert st.holiday


def test_holiday_recurring_mmdd():
    assert is_holiday(datetime(2027, 12, 25, 10, 0), ["12-25"])
    assert not is_holiday(datetime(2027, 12, 24, 10, 0), ["12-25"])


def test_holiday_keeps_static_thresholds_running():
    st = evaluate({**SCHED_20H, "holidays": ["2026-07-21"]}, UTC_DAY_WIB)
    for kept in ("A2_low", "A3_high", "A4_spike", "A7_nodata", "A8_persistent"):
        assert kept not in st.suppressed


def test_off_hours_and_holiday_union():
    st = evaluate({**SCHED_20H, "holidays": ["2026-07-21"]}, UTC_NIGHT_WIB)
    assert st.off_hours and st.holiday
    assert "A2_low" in st.suppressed and "A9_deviation" in st.suppressed


# --- integrasi engine -----------------------------------------------------
def _cfg(analyses: dict) -> SimpleNamespace:
    return SimpleNamespace(analyses=analyses, min_threshold=1.0, max_threshold=4.0,
                           group_name="Tekanan", target_id="t", id_owner="o")


def _flat_zero(end: datetime, n: int = 20) -> list[Sample]:
    return [Sample(ts=end - timedelta(minutes=2 * (n - 1 - i)), value=0.0) for i in range(n)]


def test_engine_silences_a2_a5_during_off_hours():
    """Tekanan nol saat pompa mati = normal → tanpa alarm."""
    analyses = {"A2_low": {}, "A5_flatline": {}, ACTIVE_SCHEDULE: SCHED_20H}
    sigs = analyze_channel(_cfg(analyses), _flat_zero(UTC_NIGHT_WIB), UTC_NIGHT_WIB, None)
    assert sigs == []


def test_engine_same_data_fires_during_active_hours():
    """Data identik di jam aktif HARUS bunyi — pembandingnya tes di atas."""
    analyses = {"A2_low": {}, "A5_flatline": {}, ACTIVE_SCHEDULE: SCHED_20H}
    sigs = analyze_channel(_cfg(analyses), _flat_zero(UTC_DAY_WIB), UTC_DAY_WIB, None)
    assert {s.analysis_type for s in sigs} == {"A2_low", "A5_flatline"}


def test_engine_without_schedule_row_unchanged():
    analyses = {"A2_low": {}, "A5_flatline": {}}
    sigs = analyze_channel(_cfg(analyses), _flat_zero(UTC_NIGHT_WIB), UTC_NIGHT_WIB, None)
    assert {s.analysis_type for s in sigs} == {"A2_low", "A5_flatline"}


if __name__ == "__main__":
    passed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed += 1
            print(f"  ok  {name}")
    print(f"\n{passed} tes lolos.")
