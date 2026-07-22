"""Kategori TEKANAN (reference implementation, dok kategori/tekanan.md).

Import `detectors.night_pressure` = side-effect registrasi detektor khusus kategori
(§5.11) — contoh pola "detektor kategori = 1 file + register dari modul kategorinya".
"""

from __future__ import annotations

from ai_nrw.categories.base import Category, register_category
from ai_nrw.detectors import night_pressure as _night  # noqa: F401  (registrasi via import)

CATEGORY = register_category(
    Category(
        key="pressure",
        label="Tekanan",
        group_names=("Tekanan",),
        preset={
            "A1_invalid": {"allow_negative": False},
            "A2_low": {"sustain_T": "15m"},
            "A3_high": {"sustain_T": "15m"},
            # ambang spike otomatis dari kebiasaan channel (k × median |Δ|)
            "A4_spike": {"k": 6.0, "direction": "both", "min_points": 10},
            "A5_flatline": {"eps_flat": 0.01, "n": 10},
            "A6_noise": {"factor": 3.0, "short_window": "30m"},
            "A7_nodata": {"no_data_timeout": "10m"},
            "A8_persistent": {"persist_window": "4h"},
            "A9_deviation": {"k": 3.0, "min_points": 3},
            "A10_drift": {"delta": 0.5, "lambda": 5.0, "min_instances": 30},
            "night_pressure": {"night_start": "00:00", "night_end": "04:00",
                               "agg": "median", "drop_frac": 0.15},
            "forecast": {"horizon_days": 7},   # Tier-0 seasonal-naive dari grid
            # default no-op (24 jam, tanpa libur) — jaringan "nyala 20 jam" tinggal
            # mengubah windows, mis. ["04:00-24:00"]; holidays: ["2026-03-31", "12-25"]
            "active_schedule": {"windows": ["00:00-24:00"], "tz": "Asia/Jakarta",
                                "holidays": []},
        },
        meanings={
            "A1_invalid": "Nilai negatif/kosong — sensor/transmitter tekanan rusak.",
            "A2_low": "Tekanan rendah berkelanjutan — suplai kurang / kebocoran hulu / pompa mati.",
            "A3_high": "Tekanan tinggi berkelanjutan — pompa berlebih / valve tertutup (perlu pressure management).",
            "A4_spike": "Tekanan melonjak/terjun mendadak — water hammer, hentakan valve, atau pipa pecah.",
            "A5_flatline": "Tekanan datar — sensor macet/beku atau valve tertutup total.",
            "A6_noise": "Tekanan bergetar tak wajar — kabel/transmitter bermasalah atau udara terperangkap di pipa.",
            "A7_nodata": "Sensor tekanan tak mengirim data — node/sensor offline.",
            "A8_persistent": "Tekanan di luar batas menetap — eskalasi (persisten).",
            "A9_deviation": "Tekanan menyimpang dari pola biasanya untuk jam ini — indikasi dini gangguan.",
            "A10_drift": "Tekanan menurun perlahan menetap — indikasi kuat kebocoran merambat (slow leak).",
            "night_pressure": "Tekanan malam lebih rendah dari biasanya — indikasi kebocoran (air lolos saat tanpa pemakaian).",
            "active_schedule": "Jam operasi channel + kalender libur — di luar jam aktif, alarm nol/datar dibungkam.",
        },
    )
)
