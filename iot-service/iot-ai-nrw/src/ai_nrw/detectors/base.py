"""Tipe dasar detektor + util (pure stdlib, tanpa dependency berat).

Signal = hasil satu detektor pada satu evaluasi. Event Manager (Slice 3) yang mengubah
Signal jadi ai_event berlifecycle. Ref: dok 07 §2, dok tekanan §5-6.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

# Severity: info (pengingat) < warning < critical (dok tekanan §6).
INFO = "info"
WARNING = "warning"
CRITICAL = "critical"


@dataclass(slots=True)
class Sample:
    """Satu titik terbersih untuk deteksi (nilai utama = eng_value)."""

    ts: datetime
    value: float | None


@dataclass(slots=True)
class Signal:
    """Sinyal anomali mentah dari satu detektor."""

    analysis_type: str          # kode: A1_invalid, A2_low, …
    severity: str               # INFO|WARNING|CRITICAL
    ts: datetime                # waktu evaluasi / titik pemicu
    value: float | None
    meaning: str                # arti operasional (generik; kamus per-kategori nanti)
    context: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class DetectionContext:
    """Semua yang dibutuhkan SATU detektor untuk satu channel — signature seragam.

    Membuat semua detektor (core/generik & khusus-kategori) berbentuk sama
    `fn(ctx) -> list[Signal]` sehingga bisa didaftarkan di registry & di-dispatch
    lewat satu pipeline. `params` = knob untuk kode analisa yang sedang dijalankan.
    """

    samples: list[Sample]          # window terbersih (terurut waktu)
    now: datetime
    last_ts: datetime | None       # titik data terakhir (untuk A7 no-data)
    min_threshold: float | None    # batas layanan channel (sensor_channels.min_threshold)
    max_threshold: float | None
    params: dict[str, Any]         # param analisa ini (dari ai_config.params)
    group_name: str | None = None  # kategori metric (Tekanan/Debit/…)
    baseline: Any = None           # grid/state (P1: A9/A10)
    forecast: list[dict] | None = None  # titik ai_forecast tersimpan (early-warning)


_DUR_RE = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*([smhd]?)\s*$", re.IGNORECASE)
_UNIT_SEC = {"": 1, "s": 1, "m": 60, "h": 3600, "d": 86400}


def parse_duration(v: str | int | float, default_sec: float) -> timedelta:
    """Parse '15m'/'4h'/'30s'/'2d' atau angka (detik) → timedelta.

    Nilai tak dikenali → default_sec. Dipakai untuk sustain_T, no_data_timeout, dll.
    """
    if isinstance(v, (int, float)):
        return timedelta(seconds=float(v))
    if isinstance(v, str):
        m = _DUR_RE.match(v)
        if m:
            return timedelta(seconds=float(m.group(1)) * _UNIT_SEC[m.group(2).lower()])
    return timedelta(seconds=default_sec)


def window_since(samples: list[Sample], now: datetime, span: timedelta) -> list[Sample]:
    """Sub-window: titik dengan ts >= now - span, terurut."""
    cutoff = now - span
    return [s for s in samples if s.ts >= cutoff]


def consecutive_steps(samples: list[Sample], max_gap: timedelta) -> list[tuple[Sample, float, float]]:
    """Pasangan titik berurutan yang layak dinilai → (titik akhir, Δnilai, Δdetik).

    Titik kosong memutus pasangan, dan jeda > `max_gap` dibuang: setelah node offline,
    titik sebelum dan sesudah lubang data hampir selalu berbeda jauh — itu jeda kirim,
    bukan perubahan nyata. Dipakai A4 (spike) & A6 (volatilitas).
    """
    out: list[tuple[Sample, float, float]] = []
    prev: Sample | None = None
    for s in samples:
        if s.value is None:
            prev = None
            continue
        if prev is not None:
            dt = (s.ts - prev.ts).total_seconds()
            if 0 < dt <= max_gap.total_seconds():
                out.append((s, float(s.value) - float(prev.value), dt))
        prev = s
    return out


def span_seconds(samples: list[Sample]) -> float:
    """Rentang waktu (detik) antara titik pertama & terakhir."""
    if len(samples) < 2:
        return 0.0
    return (samples[-1].ts - samples[0].ts).total_seconds()
