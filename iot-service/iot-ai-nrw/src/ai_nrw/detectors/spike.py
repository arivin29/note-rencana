"""A4 — spike / rate-of-change mendadak. Pure stdlib, STATELESS.

Beda dengan A2/A3 (level bertahan lama) dan A10 (geseran perlahan): A4 menangkap
LONCATAN SATU LANGKAH — water hammer, valve dihentak, burst, atau transmitter yang
melompat. Yang dinilai selisih antar-titik berurutan, bukan nilainya.

Ambang default **otomatis dari kebiasaan channel itu sendiri**: skala = median |Δ|
historis, batas = `k × skala`. Jadi sensor tekanan halus dan sensor debit kasar tak
perlu tuning terpisah (sejalan standarisasi A10). `spike_limit` boleh diisi untuk
memaksa batas absolut.

Dua penjaga penting:
  - Pasangan titik yang jaraknya > `max_gap` dilewati. Setelah node offline, titik
    sebelum dan sesudah jeda hampir selalu berbeda jauh — itu jeda data, bukan spike.
  - Bila riwayat terlalu datar (skala ≈ 0) detektor DIAM, bukan menuduh. Batas dari
    skala nol akan menjadikan riak sekecil apa pun sebagai spike. Kasus datar sudah
    ditangani A5. Ref: dok 07 §2 (A4), dok 04 §2.
"""

from __future__ import annotations

import statistics
from datetime import timedelta

from ai_nrw.detectors.base import (
    CRITICAL,
    WARNING,
    DetectionContext,
    Sample,
    Signal,
    consecutive_steps,
    parse_duration,
)
from ai_nrw.detectors.registry import register

A4 = "A4_spike"

_MEAN_UP = "Lonjakan naik mendadak — indikasi water hammer / hentakan valve / burst."
_MEAN_DOWN = "Terjunan turun mendadak — indikasi pipa pecah / pompa berhenti / valve tertutup."

# Skala di bawah ini dianggap "tak punya kebiasaan" → detektor diam.
SCALE_FLOOR = 1e-9


def a4_spike(
    samples: list[Sample],
    *,
    k: float = 6.0,
    spike_limit: float | None = None,
    direction: str = "both",
    min_points: int = 10,
    max_gap: timedelta = timedelta(minutes=15),
) -> Signal | None:
    """Nilai HANYA langkah terakhir; langkah lama sudah dinilai di siklus sebelumnya.

    `spike_limit` (absolut) mengesampingkan ambang otomatis. Tanpa itu, dibutuhkan
    `min_points` langkah historis untuk mengukur skala. Severity naik ke critical
    saat lompatan ≥ 2× batas.
    """
    steps = consecutive_steps(samples, max_gap)
    if not steps:
        return None

    sample, dv, dt = steps[-1]
    if direction == "up" and dv <= 0:
        return None
    if direction == "down" and dv >= 0:
        return None

    if spike_limit is not None:
        limit, basis = abs(float(spike_limit)), "limit"
    else:
        history = [abs(d) for _s, d, _dt in steps[:-1]]
        if len(history) < min_points:
            return None
        scale = statistics.median(history)
        if scale < SCALE_FLOOR:
            return None  # riwayat datar → tak bisa dinilai, jangan tebak
        limit, basis = k * scale, "auto"

    if abs(dv) < limit:
        return None

    return Signal(
        A4,
        CRITICAL if abs(dv) >= 2 * limit else WARNING,
        sample.ts,
        sample.value,
        _MEAN_UP if dv > 0 else _MEAN_DOWN,
        {
            "delta": round(dv, 4),
            "rate_per_min": round(dv / (dt / 60.0), 4),
            "limit": round(limit, 4),
            "basis": basis,
            "direction": "up" if dv > 0 else "down",
            "gap_sec": round(dt, 1),
        },
    )


@register(A4)
def _det_a4(ctx: DetectionContext) -> list[Signal]:
    limit = ctx.params.get("spike_limit")
    sig = a4_spike(
        ctx.samples,
        k=float(ctx.params.get("k", 6.0)),
        spike_limit=None if limit in (None, "") else float(limit),
        direction=str(ctx.params.get("direction", "both")),
        min_points=int(ctx.params.get("min_points", 10)),
        max_gap=parse_duration(ctx.params.get("max_gap", "15m"), 900),
    )
    return [sig] if sig else []
