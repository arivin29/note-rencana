"""Early-warning lewat-ambang — alarm dari MASA DEPAN forecast, bukan dari data.

Janji utama fitur forecast (dok 09 P1, dok 04 §A4): garis prakiraan yang memotong
batas layanan harus MEMBUNYIKAN sesuatu, bukan cuma tampil di chart. "Tekanan
diprakirakan di bawah minimum layanan dalam ±X jam" memberi operator waktu
bertindak sebelum A2/A3 benar-benar menyala.

Terdaftar di kode 'forecast' (baris ai_config yang sama dengan job forecast), jadi
dievaluasi TIAP SIKLUS ANOMALI (5 menit) — bukan di siklus forecast harian. Alasannya
lifecycle: reconcile menutup event yang sinyalnya absen 2 siklus; event yang hanya
di-refresh oleh job harian akan ditutup siklus anomali dalam 10 menit. Dengan menumpang
siklus anomali, sinyal hadir selama prediksi pelanggaran masih ada, dan auto-close
terjadi tepat saat forecast baru tak lagi memprediksi pelanggaran.

Sinyalnya ber-analysis_type 'forecast_breach' (bukan 'forecast') supaya event punya
identitas sendiri di inbox. Ambang acuan = batas layanan channel (min/max_threshold).
Hanya memahami titik ber-`ts` (format baru); baris legacy per-hari diabaikan.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from ai_nrw.detectors.base import CRITICAL, WARNING, DetectionContext, Signal, parse_duration
from ai_nrw.detectors.registry import register

FORECAST = "forecast"
BREACH = "forecast_breach"

_MEAN_BELOW = "Diprakirakan turun di bawah batas minimum layanan — bertindaklah sebelum terjadi."
_MEAN_ABOVE = "Diprakirakan naik di atas batas maksimum layanan — bertindaklah sebelum terjadi."


def _epoch_ms(dt: datetime) -> int:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def first_breach(
    points: list[dict],
    now: datetime,
    thr_min: float | None,
    thr_max: float | None,
    *,
    lead_max: timedelta,
    min_breach_points: int = 2,
) -> dict | None:
    """Pelanggaran pertama pada titik masa depan, atau None.

    Syarat fire: `min_breach_points` titik BERTURUT melewati ambang yang sama —
    satu titik nyelonong (riak di ekor forecast) bukan dasar membangunkan orang.
    Pelanggaran pertama yang memenuhi syarat menang, walau lewat-min dan lewat-max
    dua-duanya ada di horizon.
    """
    now_ms = _epoch_ms(now)
    horizon_ms = now_ms + int(lead_max.total_seconds() * 1000)

    future = sorted(
        (p for p in points if p.get("ts") is not None and p.get("p50") is not None
         and now_ms < int(p["ts"])),
        key=lambda p: int(p["ts"]),
    )

    streak_dir: str | None = None
    streak: list[dict] = []
    for p in future:
        v = float(p["p50"])
        if thr_min is not None and v < thr_min:
            d = "below"
        elif thr_max is not None and v > thr_max:
            d = "above"
        else:
            streak_dir, streak = None, []
            continue
        if d != streak_dir:
            streak_dir, streak = d, []
        streak.append(p)
        if len(streak) >= min_breach_points:
            head = streak[0]
            if int(head["ts"]) > horizon_ms:
                return None  # pelanggaran pertama pun di luar jangkauan peringatan
            return {
                "direction": streak_dir,
                "cross_ts": int(head["ts"]),
                "predicted": float(head["p50"]),
                "threshold": thr_min if streak_dir == "below" else thr_max,
            }
    return None


@register(FORECAST)
def _det_early_warning(ctx: DetectionContext) -> list[Signal]:
    """Kode config 'forecast' → sinyal 'forecast_breach'. Job forecast tetap terpisah."""
    if not ctx.forecast:
        return []
    if not bool(ctx.params.get("early_warning", True)):
        return []
    if ctx.min_threshold is None and ctx.max_threshold is None:
        return []  # tak ada batas layanan = tak ada yang bisa dilanggar

    lead_max = parse_duration(ctx.params.get("lead_max", "48h"), 48 * 3600)
    hit = first_breach(
        ctx.forecast,
        ctx.now,
        ctx.min_threshold,
        ctx.max_threshold,
        lead_max=lead_max,
        min_breach_points=int(ctx.params.get("min_breach_points", 2)),
    )
    if hit is None:
        return []

    lead_sec = max(0, hit["cross_ts"] // 1000 - int(_epoch_ms(ctx.now) / 1000))
    lead_critical = parse_duration(ctx.params.get("lead_critical", "6h"), 6 * 3600)
    return [
        Signal(
            BREACH,
            CRITICAL if lead_sec <= lead_critical.total_seconds() else WARNING,
            ctx.now,  # event dimulai saat prediksi dibuat; waktu pelanggaran di context
            hit["predicted"],
            _MEAN_BELOW if hit["direction"] == "below" else _MEAN_ABOVE,
            {
                "cross_ts": hit["cross_ts"],
                "lead_sec": lead_sec,
                "lead_hours": round(lead_sec / 3600, 1),
                "threshold": hit["threshold"],
                "predicted": hit["predicted"],
                "direction": hit["direction"],
            },
        )
    ]
