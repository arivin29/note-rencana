"""A9 — deviasi terhadap baseline musiman (z-score per slot). Pure stdlib.

Beda dgn A2/A3 (ambang STATIS min/max_threshold), A9 memakai band ADAPTIF dari grid
median/MAD per slot (weekday×jam). Menangkap "tak biasa untuk jam segini" walau masih
di dalam batas layanan — mis. tekanan 2.6 bar jam 03:00 yang normalnya 3.4 bar.

Butuh `ctx.baseline.grid`. Bila grid kosong / belum learn → detektor diam (return []).
Ref: dok 07 §2 (A9), dok tekanan §2-3.
"""

from __future__ import annotations

from datetime import datetime

from ai_nrw.baseline import grid as gridmod
from ai_nrw.baseline.grid import SlotStat
from ai_nrw.detectors.base import CRITICAL, WARNING, DetectionContext, Sample, Signal
from ai_nrw.detectors.registry import register

A9 = "A9_deviation"

_MEAN = "Menyimpang dari pola biasanya (baseline musiman) — tak wajar untuk jam ini."


def _valued(samples: list[Sample]) -> list[Sample]:
    return [s for s in samples if s.value is not None]


def a9_deviation(
    samples: list[Sample],
    grid: dict[tuple[int, int], SlotStat],
    slot_size_min: int,
    now: datetime,
    k: float = 3.0,
    min_points: int = 3,
    sigma_floor: float = 1e-6,
) -> Signal | None:
    """Fire bila `min_points` titik terakhir SEMUA di luar band median±k·sigma, arah sama.

    Butuh tiap titik punya slot terisi & sigma di atas floor (hindari bagi-nol pada slot
    yang datar). Severity: warning; critical bila |z| terburuk ≥ 2k.
    """
    if not grid:
        return None
    recent = _valued(samples)[-min_points:]
    if len(recent) < min_points:
        return None

    zs: list[float] = []
    for s in recent:
        st = gridmod.lookup(grid, s.ts, slot_size_min)
        if st is None or st.sigma < sigma_floor:
            return None  # tak bisa dinilai → jangan tebak
        zs.append((s.value - st.median) / st.sigma)

    if all(z >= k for z in zs):
        direction = "above"
    elif all(z <= -k for z in zs):
        direction = "below"
    else:
        return None

    worst = max(zs, key=abs)
    last = recent[-1]
    st_last = gridmod.lookup(grid, last.ts, slot_size_min)
    sev = CRITICAL if abs(worst) >= 2 * k else WARNING
    return Signal(
        A9, sev, last.ts, last.value, _MEAN,
        {
            "z": round(worst, 3),
            "k": k,
            "direction": direction,
            "expected_median": None if st_last is None else round(st_last.median, 4),
            "n": len(recent),
        },
    )


@register(A9)
def _det_a9(ctx: DetectionContext) -> list[Signal]:
    bl = ctx.baseline
    if bl is None or not getattr(bl, "grid", None):
        return []
    sig = a9_deviation(
        ctx.samples,
        bl.grid,
        bl.slot_size_min,
        ctx.now,
        k=float(ctx.params.get("k", 3.0)),
        min_points=int(ctx.params.get("min_points", 3)),
        sigma_floor=float(ctx.params.get("sigma_floor", 1e-6)),
    )
    return [sig] if sig else []
