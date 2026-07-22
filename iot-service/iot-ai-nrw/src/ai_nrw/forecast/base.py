"""Kontrak Forecaster tool-agnostic + tipe hasil (dok 07 §4).

Satu antarmuka; implementasi bertingkat:
  - Tier-0 seasonal-naive (seasonal.py) — dari grid musiman, PURE, tanpa dependensi.
  - Tier-1 StatsForecast (statsf.py, opsional) — AutoETS/AutoARIMA saat lib terpasang.
  - Tier-2 NeuralForecast — opt-in skala besar (menyusul).
Menambah tier = 1 modul yang menghasilkan `list[ForecastPoint]`, cycle & store tak berubah.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(slots=True)
class DailyForecast:
    """Ramalan satu hari ke depan (offset hari dari generated_at).

    LEGACY — resolusi harian. Dipertahankan untuk membaca baris `ai_forecast` lama;
    keluaran baru memakai `ForecastPoint` (lihat seasonal.forecast_slots).
    """

    d: int          # offset hari (0 = besok)
    p50: float      # nilai tengah harapan
    lo: float       # batas bawah (band)
    hi: float       # batas atas (band)
    n: int = 0      # jumlah slot pendukung (kepercayaan)

    def as_dict(self) -> dict:
        return {"d": self.d, "p50": round(self.p50, 4), "lo": round(self.lo, 4),
                "hi": round(self.hi, 4), "n": self.n}


@dataclass(slots=True)
class ForecastPoint:
    """Ramalan pada satu titik waktu absolut (resolusi = slot grid baseline, default 10 mnt).

    `ts` disimpan sebagai epoch milidetik UTC, bukan offset. Alasannya: konsumen (chart)
    tak perlu tahu langkah waktu maupun zona waktu — cukup plot apa adanya. Ini yang
    dulu bikin chart salah: offset hari di-asumsikan `i × 86.400.000 ms`.
    """

    ts: int         # epoch milidetik UTC
    p50: float      # nilai tengah harapan
    lo: float       # batas bawah (band)
    hi: float       # batas atas (band)
    n: int = 0      # jumlah slot pendukung (kepercayaan)

    def as_dict(self) -> dict:
        return {"ts": self.ts, "p50": round(self.p50, 4), "lo": round(self.lo, 4),
                "hi": round(self.hi, 4), "n": self.n}


def to_epoch_ms(dt: datetime) -> int:
    """datetime → epoch ms UTC. Naive dianggap UTC (konvensi ingest & grid)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)
