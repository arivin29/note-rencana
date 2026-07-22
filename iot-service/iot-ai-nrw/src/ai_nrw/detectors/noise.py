"""A6 — erratic / noise (volatilitas naik dibanding kebiasaan). Pure stdlib, STATELESS.

Menangkap sinyal yang mulai BERGETAR walau rata-ratanya masih normal: kabel longgar,
grounding buruk, transmitter mulai rusak, atau kavitasi/udara terperangkap di pipa.
A9 tak melihatnya (nilainya masih di dalam band), A5 kebalikannya (terlalu diam).

Yang diukur **selisih-kedua** (median |Δ dari Δ|) — seberapa sering arah berbalik,
bukan seberapa jauh nilainya bergerak. Dua saringan sekaligus: channel yang naik mulus
2→4 bar punya sebaran nilai lebar TAPI selisih-kedua ≈ 0 (itu perubahan level), dan
satu lompatan tunggal pun tak terbaca noise karena median tahan pencilan.

Pembandingnya channel itu sendiri: jendela pendek terakhir vs sisa window lookback.
Jadi tak perlu ambang absolut per sensor. Bila bagian pembanding terlalu tenang
(volatilitas ≈ 0) detektor DIAM — rasio terhadap nol tak bermakna.
Ref: dok 07 §2 (A6), dok 04 §2.
"""

from __future__ import annotations

import statistics
from datetime import datetime, timedelta

from ai_nrw.detectors.base import (
    CRITICAL,
    WARNING,
    DetectionContext,
    Sample,
    Signal,
    consecutive_steps,
    parse_duration,
    window_since,
)
from ai_nrw.detectors.registry import register

A6 = "A6_noise"

_MEAN = "Sinyal jauh lebih bergetar dari biasanya — indikasi sensor/kabel bermasalah atau aliran tak stabil."

# Volatilitas pembanding di bawah ini dianggap tak bisa dijadikan acuan rasio.
VOL_FLOOR = 1e-9


def volatility(samples: list[Sample], max_gap: timedelta) -> float | None:
    """Median |Δ²| — perubahan antar-langkah yang berdampingan. None bila tak cukup data.

    Dua langkah dianggap berdampingan bila jarak titik akhirnya masih dalam `max_gap`;
    langkah yang terpisah lubang data tak dipasangkan.
    """
    steps = consecutive_steps(samples, max_gap)
    jumps = [
        abs(steps[i + 1][1] - steps[i][1])
        for i in range(len(steps) - 1)
        if (steps[i + 1][0].ts - steps[i][0].ts) <= max_gap
    ]
    return statistics.median(jumps) if jumps else None


def a6_noise(
    samples: list[Sample],
    now: datetime,
    *,
    short_window: timedelta = timedelta(minutes=30),
    factor: float = 3.0,
    min_points: int = 8,
    max_gap: timedelta = timedelta(minutes=15),
) -> Signal | None:
    """Fire bila volatilitas jendela pendek ≥ `factor` × volatilitas periode pembanding.

    Butuh `min_points` titik di kedua sisi; kurang dari itu → diam (data tipis mudah
    melahirkan rasio ekstrem). Severity naik ke critical pada ≥ 2× `factor`.
    """
    valued = [s for s in samples if s.value is not None]
    if len(valued) < 2 * min_points:
        return None

    cutoff = now - short_window
    recent = window_since(valued, now, short_window)
    baseline = [s for s in valued if s.ts < cutoff]
    if len(recent) < min_points or len(baseline) < min_points:
        return None

    v_recent = volatility(recent, max_gap)
    v_base = volatility(baseline, max_gap)
    if v_recent is None or v_base is None or v_base < VOL_FLOOR:
        return None

    ratio = v_recent / v_base
    if ratio < factor:
        return None

    last = recent[-1]
    return Signal(
        A6,
        CRITICAL if ratio >= 2 * factor else WARNING,
        last.ts,
        last.value,
        _MEAN,
        {
            "ratio": round(ratio, 3),
            "factor": factor,
            "volatility_recent": round(v_recent, 4),
            "volatility_baseline": round(v_base, 4),
            "n_recent": len(recent),
            "n_baseline": len(baseline),
        },
    )


@register(A6)
def _det_a6(ctx: DetectionContext) -> list[Signal]:
    sig = a6_noise(
        ctx.samples,
        ctx.now,
        short_window=parse_duration(ctx.params.get("short_window", "30m"), 1800),
        factor=float(ctx.params.get("factor", 3.0)),
        min_points=int(ctx.params.get("min_points", 8)),
        max_gap=parse_duration(ctx.params.get("max_gap", "15m"), 900),
    )
    return [sig] if sig else []
