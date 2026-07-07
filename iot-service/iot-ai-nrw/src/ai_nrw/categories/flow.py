"""Kategori DEBIT / ALIRAN (dok 04 §8; detail penuh menyusul kategori/debit.md).

Detektor khusus (P2): MNF (Minimum Night Flow), pola konsumsi tak wajar (pencurian),
reverse-flow, burst-rate — akan @register di modul ini tanpa mengubah pipeline.
"""

from __future__ import annotations

from ai_nrw.categories.base import Category, register_category

CATEGORY = register_category(
    Category(
        key="flow",
        label="Debit/Aliran",
        group_names=("Debit/Aliran", "Debit", "Aliran", "Flow"),
        preset={
            "A1_invalid": {"allow_negative": True},   # flow balik boleh negatif (reverse)
            "A3_high": {"sustain_T": "15m"},
            "A5_flatline": {"eps_flat": 0.01, "n": 10},
            "A7_nodata": {"no_data_timeout": "10m"},
            # P2: "MNF": {"window": "02:00-04:00"}, "theft": {...}, "reverse_flow": {...}
        },
        meanings={
            "A1_invalid": "Nilai debit tak valid — sensor/flowmeter bermasalah.",
            "A2_low": "Debit rendah berkelanjutan — suplai turun / valve tertutup.",
            "A3_high": "Debit tinggi berkelanjutan — indikasi burst / kebocoran / pemakaian tak wajar.",
            "A5_flatline": "Debit datar — meter macet (indikasi apparent loss).",
            "A7_nodata": "Flowmeter tak mengirim data — node/sensor offline.",
            "A8_persistent": "Debit di luar batas menetap — eskalasi (persisten).",
        },
    )
)
