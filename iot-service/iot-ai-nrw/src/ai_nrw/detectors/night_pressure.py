"""night_pressure — analisa tekanan malam (analog MNF). Detektor KHUSUS kategori tekanan.

Logika PDAM: saat malam permintaan turun → rugi-gesek kecil → tekanan mestinya NAIK & stabil.
Bila tekanan malam justru RENDAH / turun menetap dari malam-malam sebelumnya, air "lolos" terus
walau tak ada pemakaian → **indikasi kuat kebocoran** (dok tekanan §5.11).

Beda dari A9/A10: ini agregat SATU nilai per malam (median/min jendela malam), di-track lintas
HARI. Self-calibrating (banding vs median malam-malam terakhir) — tak butuh grid/threshold.
STATEFUL: riwayat malam disimpan di `ai_baseline.night_state`, dimutasi in-place; dicatat sekali
per malam (idempoten). Didaftarkan dari modul kategori tekanan → contoh "detektor kategori = 1 file".
"""

from __future__ import annotations

import statistics
from datetime import datetime

from ai_nrw.detectors.base import CRITICAL, WARNING, DetectionContext, Sample, Signal
from ai_nrw.detectors.registry import register

NIGHT = "night_pressure"

_MEAN = "Tekanan malam turun dari pola biasanya — indikasi kuat kebocoran (air lolos saat tanpa pakai)."


def _hhmm_to_min(v: str, default: int) -> int:
    try:
        h, m = str(v).split(":")
        return int(h) * 60 + int(m)
    except (ValueError, AttributeError):
        return default


def _tod_min(ts: datetime) -> int:
    return ts.hour * 60 + ts.minute


def night_pressure(
    samples: list[Sample],
    now: datetime,
    night_state: dict,
    *,
    start_min: int,
    end_min: int,
    agg: str = "median",
    min_points: int = 6,
    drop_frac: float = 0.15,
    history_days: int = 7,
    min_history: int = 3,
) -> Signal | None:
    """Evaluasi tekanan malam TADI (sekali per malam). MUTASI `night_state`.

    Jendela malam = [start_min, end_min) menit-dalam-hari (tak lintas tengah malam). Baru
    dievaluasi setelah jendela lengkap (`now` sudah lewat end). Fire bila nilai malam ini
    < median malam-malam sebelumnya × (1 − drop_frac).
    """
    if _tod_min(now) < end_min:
        return None  # jendela malam ini belum lengkap → tunggu
    today: str = now.date().isoformat()
    if night_state.get("last_night") == today:
        return None  # sudah dicatat malam ini

    def _in_window(s: Sample) -> bool:
        return (
            s.value is not None
            and s.ts.date() == now.date()
            and start_min <= _tod_min(s.ts) < end_min
        )

    vals = [s.value for s in samples if _in_window(s)]
    if len(vals) < min_points:
        return None  # data malam kurang → jangan simpulkan

    tonight = statistics.median(vals) if agg == "median" else min(vals)

    history: list[dict] = list(night_state.get("history", []))
    prev = [h["v"] for h in history]

    signal: Signal | None = None
    if len(prev) >= min_history:
        baseline = statistics.median(prev)
        if baseline > 0 and tonight < baseline * (1 - drop_frac):
            drop = (baseline - tonight) / baseline
            sev = CRITICAL if drop >= 2 * drop_frac else WARNING
            signal = Signal(
                NIGHT, sev, now, tonight, _MEAN,
                {"tonight": round(tonight, 4), "baseline": round(baseline, 4),
                 "drop_frac": round(drop, 3), "nights": len(prev)},
            )

    history.append({"d": today, "v": tonight})
    night_state["history"] = history[-history_days:]
    night_state["last_night"] = today
    return signal


@register(NIGHT)
def _det_night(ctx: DetectionContext) -> list[Signal]:
    bl = ctx.baseline
    if bl is None:
        return []  # butuh bundle utk simpan night_state; cycle menyuntik saat ON
    p = ctx.params
    sig = night_pressure(
        ctx.samples,
        ctx.now,
        bl.night_state,
        start_min=_hhmm_to_min(p.get("night_start", "00:00"), 0),
        end_min=_hhmm_to_min(p.get("night_end", "04:00"), 240),
        agg=str(p.get("agg", "median")),
        min_points=int(p.get("min_points", 6)),
        drop_frac=float(p.get("drop_frac", 0.15)),
        history_days=int(p.get("history_days", 7)),
        min_history=int(p.get("min_history", 3)),
    )
    return [sig] if sig else []
