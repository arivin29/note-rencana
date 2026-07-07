"""Siklus micro-batch anomali — rangkaian end-to-end P0 (dok 05 §3).

config → ingest window → detektor core → event manager → checkpoint.
P0: hanya detektor core (A1–A8, pakai min/max_threshold). A9/A10 + baseline grid = P1.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import structlog

from ai_nrw.baseline import store as baseline_store
from ai_nrw.config.loader import load_channel_configs
from ai_nrw.detectors.base import Sample
from ai_nrw.detectors.engine import analyze_channel
from ai_nrw.events.manager import process_channel
from ai_nrw.ingest.ingestor import fetch_new_points

log = structlog.get_logger()

# Lookback window untuk detektor "sustained/persistent" (A8 persist default 4 jam).
LOOKBACK = timedelta(hours=6)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def run_anomaly_cycle(now: datetime | None = None) -> dict[str, int]:
    """Satu putaran anomali untuk semua channel yang ON. Return ringkas hitungan aksi."""
    now = now or utc_now()
    configs = load_channel_configs()
    if not configs:
        log.info("cycle.empty", reason="tak ada channel ON")
        return {}

    channel_ids = [c.target_id for c in configs]
    windows = fetch_new_points(channel_ids, since=now - LOOKBACK)

    totals = {"channels": 0, "errors": 0, "open": 0, "update": 0, "clearing": 0, "close": 0}
    for cfg in configs:
        try:
            pts = windows.get(cfg.target_id, [])
            samples = [Sample(ts=p.ts, value=p.value) for p in pts]

            # last_ts untuk A7 (no-data): titik terakhir di window, else checkpoint tersimpan
            last_ts = samples[-1].ts if samples else baseline_store.get_last_ts(cfg.target_id)

            signals = analyze_channel(cfg, samples, now, last_ts)
            counts = process_channel(cfg, signals, now)

            if samples:
                baseline_store.save_checkpoint(cfg.target_id, cfg.id_owner, samples[-1].ts)

            totals["channels"] += 1
            for k in ("open", "update", "clearing", "close"):
                totals[k] += counts[k]
        except Exception as e:  # noqa: BLE001 — 1 channel gagal tak boleh matikan siklus
            totals["errors"] += 1
            log.error("cycle.channel_error", target_id=cfg.target_id, error=str(e))

    log.info("cycle.done", **totals)
    return totals
