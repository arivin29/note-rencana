"""Pembangun baseline musiman (grid median/MAD) dari jendela belajar historis.

Dipisah dari siklus anomali karena iramanya beda: grid di-*learn* jarang (harian),
anomali tiap 5 menit. Grid jadi fondasi A9 (deviasi). Ref: dok 07 §3 (training/retraining).

`build_grid` = pure (uji offline). `learn_channel` = I/O (ingest + simpan).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from ai_nrw.baseline import grid as gridmod
from ai_nrw.baseline.bundle import Baseline
from ai_nrw.baseline.grid import SlotStat

if TYPE_CHECKING:  # hindari tarik clickhouse saat uji stdlib; hanya butuh .ts/.value
    from ai_nrw.ingest.ingestor import Point

# Default learn: 28 hari, slot 10 menit, min 5 sampel/slot, siap bila ≥ 30% slot terisi.
LEARN_DAYS = 28
SLOT_SIZE_MIN = 10
MIN_SAMPLES = 5
MIN_SLOTS_READY = 300  # ~30% dari 1008 slot (7 hari × 144)


def build_grid(
    points: "list[Point]",
    slot_size_min: int = SLOT_SIZE_MIN,
    min_samples: int = MIN_SAMPLES,
    min_slots_ready: int = MIN_SLOTS_READY,
) -> Baseline:
    """Bangun Baseline(grid, learn_ready) dari titik historis (nilai valid saja)."""
    pairs: list[tuple[datetime, float]] = [(p.ts, p.value) for p in points if p.value is not None]
    grid: dict[tuple[int, int], SlotStat] = gridmod.compute_grid(pairs, slot_size_min, min_samples)
    return Baseline(
        grid=grid,
        slot_size_min=slot_size_min,
        learn_ready=len(grid) >= min_slots_ready,
    )


def learn_channel(
    target_id: str,
    id_owner: str,
    now: datetime,
    fetch,
    learn_days: int = LEARN_DAYS,
) -> Baseline:
    """Ingest jendela belajar → bangun grid → simpan ke ai_baseline. Return bundle.

    `fetch(channel_ids, since)` disuntik (ingestor.fetch_new_points) agar mudah diuji.
    """
    from ai_nrw.baseline import store as baseline_store  # lazy: hindari DB saat uji build_grid

    since = now - timedelta(days=learn_days)
    windows = fetch([target_id], since)
    points = windows.get(target_id, [])
    bl = build_grid(points)
    baseline_store.save_grid(target_id, id_owner, bl)
    return bl
