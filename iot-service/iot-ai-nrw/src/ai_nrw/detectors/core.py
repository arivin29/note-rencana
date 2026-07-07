"""Detektor core P0 — hand-code, pure stdlib (dok 07 §2).

A1 invalid/negatif · A2 low sustained · A3 high sustained · A5 flatline · A7 no-data ·
A8 persistent out-of-range. Ambang memakai batas layanan channel (min/max_threshold);
band AI (baseline) & A9/A10 menyusul. Tiap fungsi mengembalikan Signal|None; orkestrator
`run_core_detectors` menjalankan yang enabled di ai_config. Ref: dok tekanan §5.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from ai_nrw.detectors.base import (
    CRITICAL,
    WARNING,
    DetectionContext,
    Sample,
    Signal,
    parse_duration,
    span_seconds,
    window_since,
)
from ai_nrw.detectors.registry import register

# Kode analisa (selaras ai_config.analysis_type, dok 06)
A1, A2, A3, A5, A7, A8 = (
    "A1_invalid",
    "A2_low",
    "A3_high",
    "A5_flatline",
    "A7_nodata",
    "A8_persistent",
)

_MEAN = {
    A1: "Nilai negatif/kosong — indikasi sensor atau transmitter rusak.",
    A2: "Nilai rendah berkelanjutan di bawah batas layanan.",
    A3: "Nilai tinggi berkelanjutan di atas batas layanan.",
    A5: "Nilai datar tak berubah — indikasi sensor macet/beku.",
    A7: "Tidak mengirim data — node/sensor kemungkinan offline.",
    A8: "Di luar batas menetap (persisten) — eskalasi dari rendah/tinggi.",
}


def _valued(samples: list[Sample]) -> list[Sample]:
    return [s for s in samples if s.value is not None]


def _sev_breach(value: float, threshold: float) -> str:
    """Warning default; critical bila pelanggaran > 50% relatif ambang."""
    denom = abs(threshold) if threshold else 1.0
    return CRITICAL if abs(value - threshold) / denom > 0.5 else WARNING


# --- A1 -------------------------------------------------------------------
def a1_invalid(latest: Sample, allow_negative: bool = False) -> Signal | None:
    v = latest.value
    if v is None or (not allow_negative and v < 0):
        return Signal(A1, CRITICAL, latest.ts, v, _MEAN[A1], {"reason": "null" if v is None else "negatif"})
    return None


# --- A2 / A3 --------------------------------------------------------------
def a2_low(window: list[Sample], thr_min: float | None, sustain: timedelta, now: datetime) -> Signal | None:
    if thr_min is None:
        return None
    recent = _valued(window_since(window, now, sustain))
    if not recent or span_seconds(recent) < 0.9 * sustain.total_seconds():
        return None
    if all(s.value < thr_min for s in recent):
        worst = min(recent, key=lambda s: s.value)
        return Signal(A2, _sev_breach(worst.value, thr_min), worst.ts, worst.value, _MEAN[A2],
                      {"threshold": thr_min, "duration_sec": span_seconds(recent), "n": len(recent)})
    return None


def a3_high(window: list[Sample], thr_max: float | None, sustain: timedelta, now: datetime) -> Signal | None:
    if thr_max is None:
        return None
    recent = _valued(window_since(window, now, sustain))
    if not recent or span_seconds(recent) < 0.9 * sustain.total_seconds():
        return None
    if all(s.value > thr_max for s in recent):
        worst = max(recent, key=lambda s: s.value)
        return Signal(A3, _sev_breach(worst.value, thr_max), worst.ts, worst.value, _MEAN[A3],
                      {"threshold": thr_max, "duration_sec": span_seconds(recent), "n": len(recent)})
    return None


# --- A5 -------------------------------------------------------------------
def a5_flatline(window: list[Sample], eps: float, n: int, now: datetime) -> Signal | None:
    valued = _valued(window)[-n:]
    if len(valued) < n:
        return None
    vals = [s.value for s in valued]
    if (max(vals) - min(vals)) < eps:
        last = valued[-1]
        return Signal(A5, WARNING, last.ts, last.value, _MEAN[A5],
                      {"span": max(vals) - min(vals), "eps": eps, "n": n})
    return None


# --- A7 -------------------------------------------------------------------
def a7_nodata(last_ts: datetime | None, now: datetime, timeout: timedelta) -> Signal | None:
    if last_ts is None:
        return None
    gap = now - last_ts
    if gap > timeout:
        return Signal(A7, WARNING, now, None, _MEAN[A7],
                      {"gap_sec": gap.total_seconds(), "timeout_sec": timeout.total_seconds()})
    return None


# --- A8 -------------------------------------------------------------------
def a8_persistent(window: list[Sample], thr_min: float | None, thr_max: float | None,
                  persist: timedelta, now: datetime) -> Signal | None:
    recent = _valued(window_since(window, now, persist))
    if not recent or span_seconds(recent) < 0.9 * persist.total_seconds():
        return None

    def out_of_range(v: float) -> bool:
        return (thr_min is not None and v < thr_min) or (thr_max is not None and v > thr_max)

    if all(out_of_range(s.value) for s in recent):
        last = recent[-1]
        return Signal(A8, CRITICAL, last.ts, last.value, _MEAN[A8],
                      {"duration_sec": span_seconds(recent), "n": len(recent)})
    return None


# --- adapter ctx + registrasi (dispatch lewat registry, bukan if/elif) --------
# Tiap adapter berbentuk seragam fn(ctx)->list[Signal] dan didaftarkan ke registry.


def _one(s: Signal | None) -> list[Signal]:
    return [s] if s else []


@register(A1)
def _det_a1(ctx: DetectionContext) -> list[Signal]:
    if not ctx.samples:
        return []
    return _one(a1_invalid(ctx.samples[-1], bool(ctx.params.get("allow_negative", False))))


@register(A2)
def _det_a2(ctx: DetectionContext) -> list[Signal]:
    sustain = parse_duration(ctx.params.get("sustain_T", "15m"), 900)
    return _one(a2_low(ctx.samples, ctx.min_threshold, sustain, ctx.now))


@register(A3)
def _det_a3(ctx: DetectionContext) -> list[Signal]:
    sustain = parse_duration(ctx.params.get("sustain_T", "15m"), 900)
    return _one(a3_high(ctx.samples, ctx.max_threshold, sustain, ctx.now))


@register(A5)
def _det_a5(ctx: DetectionContext) -> list[Signal]:
    return _one(a5_flatline(ctx.samples, float(ctx.params.get("eps_flat", 0.01)),
                            int(ctx.params.get("n", 10)), ctx.now))


@register(A7)
def _det_a7(ctx: DetectionContext) -> list[Signal]:
    timeout = parse_duration(ctx.params.get("no_data_timeout", "10m"), 600)
    return _one(a7_nodata(ctx.last_ts, ctx.now, timeout))


@register(A8)
def _det_a8(ctx: DetectionContext) -> list[Signal]:
    persist = parse_duration(ctx.params.get("persist_window", "4h"), 14400)
    return _one(a8_persistent(ctx.samples, ctx.min_threshold, ctx.max_threshold, persist, ctx.now))
