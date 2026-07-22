"""Engine deteksi — satu pipeline generik untuk SEMUA kategori.

Dispatch tiap kode analisa yang ON (dari ai_config) lewat registry, lalu terapkan
terjemahan **arti PDAM** dari kategori channel. Menambah detektor/kategori tidak
mengubah fungsi ini. Ref: dok tekanan §11 (template), dok 07 §9.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from ai_nrw import categories
# import = registrasi detektor lewat @register
# (core A1/A2/A3/A5/A7/A8, A4 spike, A6 noise, A9 deviasi, A10 drift,
#  early_warning: kode 'forecast' → sinyal 'forecast_breach')
from ai_nrw.detectors import core, deviation, drift, early_warning, noise, spike  # noqa: F401
from ai_nrw.detectors import registry, schedule
from ai_nrw.detectors.base import DetectionContext, Sample, Signal

if TYPE_CHECKING:
    from ai_nrw.baseline.bundle import Baseline
    from ai_nrw.config.loader import ChannelConfig


def analyze_channel(
    cfg: "ChannelConfig",
    samples: list[Sample],
    now: datetime,
    last_ts: datetime | None,
    baseline: "Baseline | None" = None,
    forecast: list[dict] | None = None,
) -> list[Signal]:
    """Jalankan semua detektor yang ON untuk channel, kembalikan Signal ber-arti kategori.

    `baseline` (grid + online_state) disuntik saat A9/A10 ON; detektor stateful (A10)
    memutasi baseline.online_state in-place → pemanggil bertanggung jawab menyimpannya.
    """
    # active_schedule: jam mati → suppress A1/A2/A5 (nol/datar normal saat pompa mati);
    # hari libur → relaxed, bungkam detektor adaptif (pola demand memang beda).
    sched = schedule.evaluate(cfg.analyses.get(schedule.ACTIVE_SCHEDULE), now)

    signals: list[Signal] = []
    for code, params in cfg.analyses.items():
        if code in sched.suppressed:
            continue
        fn = registry.get(code)
        if fn is None:
            # 'baseline'/'active_schedule' dll bukan detektor per-siklus. ('forecast'
            # KINI terdaftar — early_warning menilai forecast tersimpan tiap siklus;
            # job PENGHASIL forecast tetap terpisah di run_forecast_cycle.)
            continue
        ctx = DetectionContext(
            samples=samples,
            now=now,
            last_ts=last_ts,
            min_threshold=cfg.min_threshold,
            max_threshold=cfg.max_threshold,
            params=params or {},
            group_name=cfg.group_name,
            baseline=baseline,
            forecast=forecast,
        )
        signals.extend(fn(ctx))

    # terjemahan arti PDAM per kategori (mis. A2 tekanan ≠ A2 debit)
    cat = categories.for_group(cfg.group_name)
    if cat is not None:
        for s in signals:
            m = cat.meaning(s.analysis_type)
            if m:
                s.meaning = m
    return signals
