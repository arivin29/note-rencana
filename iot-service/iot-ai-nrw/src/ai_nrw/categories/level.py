"""Kategori LEVEL (reservoir/tandon) — dok 04 §8.

Terbatas 0–max, bergerak lambat. Forecast (kosong/luap) bernilai tinggi → di-enable
lebih awal saat P1. Detektor khusus (P1): early-warning level habis/luap dari forecast.
"""

from __future__ import annotations

from ai_nrw.categories.base import Category, register_category

CATEGORY = register_category(
    Category(
        key="level",
        label="Level",
        group_names=("Level", "Ketinggian"),
        preset={
            "A2_low": {"sustain_T": "30m"},
            "A3_high": {"sustain_T": "30m"},
            "A5_flatline": {"eps_flat": 0.01, "n": 15},
            "A7_nodata": {"no_data_timeout": "10m"},
            # P1: "forecast": {"horizon_days": 7}, early-warning kosong/luap
        },
        meanings={
            "A1_invalid": "Nilai level tak valid — sensor bermasalah.",
            "A2_low": "Level rendah berkelanjutan — risiko reservoir kosong / layanan mati.",
            "A3_high": "Level tinggi berkelanjutan — risiko luapan (rugi air).",
            "A5_flatline": "Level datar — sensor macet atau aliran nol.",
            "A7_nodata": "Sensor level tak mengirim data — offline.",
            "A8_persistent": "Level di luar batas menetap — eskalasi.",
        },
    )
)
