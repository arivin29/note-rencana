"""Kategori LISTRIK / POMPA (power meter, arus, RPM pompa) — dok 04 §8.

Karakter **cyclic/actuated** (pompa on/off = normal) → jangan alarm fluktuasinya.
Detektor khusus (P2): profil cyclic, tren degradasi/boros (power vs baseline), efisiensi
(power vs flow, butuh L2). Preset menonaktifkan A2/A3 statis (fluktuasi wajar).
"""

from __future__ import annotations

from ai_nrw.categories.base import Category, register_category

CATEGORY = register_category(
    Category(
        key="power",
        label="Listrik/Pompa",
        group_names=("Listrik/Pompa", "Listrik", "Pompa", "Power", "RPM"),
        preset={
            "A5_flatline": {"eps_flat": 0.1, "n": 15},   # mati total / macet
            "A7_nodata": {"no_data_timeout": "10m"},
            # P2: "cyclic_degradation": {...}, "pump_efficiency": {...} (behavior_profile=cyclic)
        },
        meanings={
            "A1_invalid": "Nilai daya/RPM tak valid — sensor bermasalah.",
            "A5_flatline": "Daya/RPM datar saat seharusnya bervariasi — pompa mati atau sensor macet.",
            "A7_nodata": "Meter listrik/pompa tak mengirim data — offline.",
            "A8_persistent": "Daya/RPM di luar batas menetap — indikasi beban/aus abnormal.",
        },
    )
)
