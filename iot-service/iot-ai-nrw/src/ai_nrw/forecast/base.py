"""Kontrak Forecaster tool-agnostic + tipe hasil (dok 07 §4).

Satu antarmuka; implementasi bertingkat:
  - Tier-0 seasonal-naive (seasonal.py) — dari grid musiman, PURE, tanpa dependensi.
  - Tier-1 StatsForecast (statsf.py, opsional) — AutoETS/AutoARIMA saat lib terpasang.
  - Tier-2 NeuralForecast — opt-in skala besar (menyusul).
Menambah tier = 1 modul yang menghasilkan `list[DailyForecast]`, cycle & store tak berubah.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class DailyForecast:
    """Ramalan satu hari ke depan (offset hari dari generated_at)."""

    d: int          # offset hari (0 = besok)
    p50: float      # nilai tengah harapan
    lo: float       # batas bawah (band)
    hi: float       # batas atas (band)
    n: int = 0      # jumlah slot pendukung (kepercayaan)

    def as_dict(self) -> dict:
        return {"d": self.d, "p50": round(self.p50, 4), "lo": round(self.lo, 4),
                "hi": round(self.hi, 4), "n": self.n}
