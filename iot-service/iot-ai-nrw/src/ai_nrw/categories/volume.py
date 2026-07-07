"""Kategori VOLUME (totalizer) — dok 04 §8.

LOGIKA BEDA: nilai MONOTON naik → analisa pada **delta/inkremen**, bukan nilai mentah.
Detektor khusus (P2): delta-flatline (=tak ada konsumsi), reset/rollback (turun),
plus preprocessing delta. Preset sengaja minim sampai detektor delta siap.
"""

from __future__ import annotations

from ai_nrw.categories.base import Category, register_category

CATEGORY = register_category(
    Category(
        key="volume",
        label="Volume",
        group_names=("Volume", "Totalizer"),
        preset={
            "A7_nodata": {"no_data_timeout": "10m"},
            # P2: "delta_flatline": {...}, "totalizer_rollback": {...} (+ preprocess delta)
            # CATATAN: A2/A3/band absolut TIDAK cocok untuk totalizer (selalu naik).
        },
        meanings={
            "A7_nodata": "Meter volume tak mengirim data — offline.",
        },
    )
)
