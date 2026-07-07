"""Engine deteksi — satu pipeline generik untuk SEMUA kategori.

Dispatch tiap kode analisa yang ON (dari ai_config) lewat registry, lalu terapkan
terjemahan **arti PDAM** dari kategori channel. Menambah detektor/kategori tidak
mengubah fungsi ini. Ref: dok tekanan §11 (template), dok 07 §9.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from ai_nrw import categories
from ai_nrw.detectors import core  # noqa: F401  (import = registrasi detektor core)
from ai_nrw.detectors import registry
from ai_nrw.detectors.base import DetectionContext, Sample, Signal

if TYPE_CHECKING:
    from ai_nrw.config.loader import ChannelConfig


def analyze_channel(
    cfg: "ChannelConfig",
    samples: list[Sample],
    now: datetime,
    last_ts: datetime | None,
) -> list[Signal]:
    """Jalankan semua detektor yang ON untuk channel, kembalikan Signal ber-arti kategori."""
    signals: list[Signal] = []
    for code, params in cfg.analyses.items():
        fn = registry.get(code)
        if fn is None:
            continue  # 'baseline'/'forecast' dll bukan detektor per-siklus
        ctx = DetectionContext(
            samples=samples,
            now=now,
            last_ts=last_ts,
            min_threshold=cfg.min_threshold,
            max_threshold=cfg.max_threshold,
            params=params or {},
            group_name=cfg.group_name,
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
