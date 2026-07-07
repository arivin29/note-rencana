"""Kategori TEKANAN (reference implementation, dok kategori/tekanan.md).

Detektor khusus (night_pressure §5.11, A9/A10) didaftarkan di sini saat P1.
"""

from __future__ import annotations

from ai_nrw.categories.base import Category, register_category

CATEGORY = register_category(
    Category(
        key="pressure",
        label="Tekanan",
        group_names=("Tekanan",),
        preset={
            "A1_invalid": {"allow_negative": False},
            "A2_low": {"sustain_T": "15m"},
            "A3_high": {"sustain_T": "15m"},
            "A5_flatline": {"eps_flat": 0.01, "n": 10},
            "A7_nodata": {"no_data_timeout": "10m"},
            "A8_persistent": {"persist_window": "4h"},
            # P1: "A9_deviation": {...}, "A10_drift": {...}, "night_pressure": {...}
        },
        meanings={
            "A1_invalid": "Nilai negatif/kosong — sensor/transmitter tekanan rusak.",
            "A2_low": "Tekanan rendah berkelanjutan — suplai kurang / kebocoran hulu / pompa mati.",
            "A3_high": "Tekanan tinggi berkelanjutan — pompa berlebih / valve tertutup (perlu pressure management).",
            "A5_flatline": "Tekanan datar — sensor macet/beku atau valve tertutup total.",
            "A7_nodata": "Sensor tekanan tak mengirim data — node/sensor offline.",
            "A8_persistent": "Tekanan di luar batas menetap — eskalasi (persisten).",
        },
    )
)
