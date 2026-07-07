"""Tes registry detektor + terjemahan arti per kategori — PURE STDLIB."""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ai_nrw import categories
from ai_nrw.detectors import core, registry
from ai_nrw.detectors.base import Sample
from ai_nrw.detectors.engine import analyze_channel

NOW = datetime(2026, 7, 7, 3, 0, 0)


def make_samples(values, end=NOW, step_min=2):
    n = len(values)
    return [Sample(ts=end - timedelta(minutes=step_min * (n - 1 - i)), value=v) for i, v in enumerate(values)]


def cfg(group, analyses, mn=2.0, mx=5.0):
    return SimpleNamespace(analyses=analyses, min_threshold=mn, max_threshold=mx, group_name=group)


def test_registry_has_core_codes():
    for code in (core.A1, core.A2, core.A3, core.A5, core.A7, core.A8):
        assert registry.get(code) is not None, f"{code} harus terdaftar di registry"


def test_for_group_case_insensitive():
    assert categories.for_group("Tekanan") is not None
    assert categories.for_group("tekanan") is not None, "case-insensitive"
    assert categories.for_group("Debit/Aliran") is not None
    assert categories.for_group("EntahApa") is None, "kategori tak dikenal → None"


def test_pressure_meaning_applied():
    c = cfg("Tekanan", {core.A2: {"sustain_T": "15m"}})
    sigs = analyze_channel(c, make_samples([1.0] * 10), NOW, last_ts=NOW)
    assert sigs and sigs[0].analysis_type == core.A2
    assert "Tekanan rendah" in sigs[0].meaning, "arti harus versi tekanan"


def test_flow_meaning_differs_from_pressure():
    c = cfg("Debit/Aliran", {core.A3: {"sustain_T": "15m"}})
    sigs = analyze_channel(c, make_samples([9.0] * 10), NOW, last_ts=NOW)
    assert sigs and sigs[0].analysis_type == core.A3
    assert "burst" in sigs[0].meaning.lower(), "arti A3 debit menyebut burst (beda dari tekanan)"


def test_unknown_group_keeps_generic_meaning():
    c = cfg(None, {core.A2: {"sustain_T": "15m"}})
    sigs = analyze_channel(c, make_samples([1.0] * 10), NOW, last_ts=NOW)
    assert sigs and sigs[0].meaning, "tanpa kategori → arti generik tetap ada (tidak kosong)"


def test_category_preset_exists():
    for group in ("Tekanan", "Debit/Aliran", "Level", "Listrik/Pompa", "Volume"):
        cat = categories.for_group(group)
        assert cat is not None and cat.preset, f"{group} harus punya preset"


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
    print("Menjalankan tes kategori + registry (stdlib):")
    raise SystemExit(1 if _run_all() else 0)
