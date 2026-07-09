"""Siklus micro-batch anomali — rangkaian end-to-end (dok 05 §3).

config → ingest window → detektor (core A1-A8 + A9 deviasi + A10 drift) → event manager
→ checkpoint. Baseline grid (A9) & online_state (A10) dimuat/disimpan saat channel meng-ON-kan.
Learn grid = irama terpisah (`run_baseline_cycle`, harian).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import structlog

from ai_nrw.baseline import builder as baseline_builder
from ai_nrw.baseline import store as baseline_store
from ai_nrw.config.loader import load_channel_configs
from ai_nrw.detectors.base import Sample
from ai_nrw.detectors.deviation import A9
from ai_nrw.detectors.drift import A10
from ai_nrw.detectors.engine import analyze_channel
from ai_nrw.detectors.night_pressure import NIGHT
from ai_nrw.events.manager import process_channel
from ai_nrw.forecast import seasonal as fc_seasonal
from ai_nrw.forecast import store as forecast_store
from ai_nrw.ingest.ingestor import fetch_new_points
from ai_nrw.recurrence import analyzer as rec_analyzer
from ai_nrw.recurrence import store as recurrence_store

log = structlog.get_logger()

# Lookback window untuk detektor "sustained/persistent" (A8 persist default 4 jam).
LOOKBACK = timedelta(hours=6)

# Detektor yang butuh bundle baseline (grid A9 / online_state A10 / night_state night_pressure).
_BASELINE_CODES = frozenset({A9, A10, NIGHT})

# Pseudo-analisa (bukan detektor per-siklus; punya siklus sendiri).
FORECAST = "forecast"
RECURRENCE_WINDOW_DAYS = 14


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def run_anomaly_cycle(
    now: datetime | None = None, only_targets: set[str] | None = None
) -> dict[str, int]:
    """Satu putaran anomali untuk semua channel yang ON. Return ringkas hitungan aksi.

    `only_targets` membatasi ke channel tertentu (dipakai job manual "jalankan sekarang").
    """
    now = now or utc_now()
    configs = load_channel_configs()
    if only_targets is not None:
        configs = [c for c in configs if c.target_id in only_targets]
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

            # muat bundle baseline hanya bila channel meng-ON-kan A9/A10 (hemat query)
            needs_baseline = bool(_BASELINE_CODES & cfg.analyses.keys())
            bl = baseline_store.load_baseline(cfg.target_id) if needs_baseline else None

            signals = analyze_channel(cfg, samples, now, last_ts, baseline=bl)
            counts = process_channel(cfg, signals, now)

            # detektor stateful memutasi bundle in-place → persist (walau tak ada anomali)
            if bl is not None and A10 in cfg.analyses:
                baseline_store.save_online_state(cfg.target_id, cfg.id_owner, bl.online_state)
            if bl is not None and NIGHT in cfg.analyses:
                baseline_store.save_night_state(cfg.target_id, cfg.id_owner, bl.night_state)

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


def run_baseline_cycle(
    now: datetime | None = None, only_targets: set[str] | None = None
) -> dict[str, int]:
    """Learn ulang grid musiman (A9) untuk channel yang meng-ON-kan A9. Irama harian.

    Terpisah dari anomali karena mahal (jendela 28 hari) & tak perlu sering.
    """
    now = now or utc_now()
    configs = [c for c in load_channel_configs() if A9 in c.analyses]
    if only_targets is not None:
        configs = [c for c in configs if c.target_id in only_targets]
    if not configs:
        return {}

    totals = {"channels": 0, "ready": 0, "errors": 0}
    for cfg in configs:
        try:
            bl = baseline_builder.learn_channel(
                cfg.target_id, cfg.id_owner, now, fetch_new_points
            )
            totals["channels"] += 1
            totals["ready"] += int(bl.learn_ready)
        except Exception as e:  # noqa: BLE001
            totals["errors"] += 1
            log.error("baseline.channel_error", target_id=cfg.target_id, error=str(e))

    log.info("baseline.done", **totals)
    return totals


def run_forecast_cycle(
    now: datetime | None = None, only_targets: set[str] | None = None
) -> dict[str, int]:
    """Ramalan harian (Tier-0 seasonal-naive dari grid) untuk channel yang ON forecast.

    Butuh grid sudah di-learn (run_baseline_cycle). Grid kosong → channel dilewati.
    """
    now = now or utc_now()
    configs = [c for c in load_channel_configs() if FORECAST in c.analyses]
    if only_targets is not None:
        configs = [c for c in configs if c.target_id in only_targets]
    if not configs:
        return {}

    start = (now + timedelta(days=1)).date()  # d=0 = besok
    totals = {"channels": 0, "skipped": 0, "errors": 0}
    for cfg in configs:
        try:
            bl = baseline_store.load_baseline(cfg.target_id)
            if not bl.grid:
                totals["skipped"] += 1
                continue
            params = cfg.analyses[FORECAST] or {}
            horizon = int(params.get("horizon_days", 7))
            # band_pct (persen, UI-friendly) → fraksi lebar pita minimum. Default 20%.
            band_pct = float(params.get("band_pct", 20))
            min_band_frac = max(0.0, band_pct / 100.0)
            daily = fc_seasonal.forecast_daily(
                bl.grid, start, horizon_days=horizon, min_band_frac=min_band_frac
            )
            if not daily:
                totals["skipped"] += 1
                continue
            forecast_store.save(
                cfg.id_owner, cfg.target_id, horizon, fc_seasonal.TIER, daily,
                metrics={"method": "seasonal_naive", "days": len(daily)},
            )
            totals["channels"] += 1
        except Exception as e:  # noqa: BLE001
            totals["errors"] += 1
            log.error("forecast.channel_error", target_id=cfg.target_id, error=str(e))

    log.info("forecast.done", **totals)
    return totals


def run_recurrence_cycle(now: datetime | None = None) -> dict[str, int]:
    """Agregasi kambuh-pulih per (target, analysis) dari history ai_event → ai_recurrence."""
    now = now or utc_now()
    since = now - timedelta(days=RECURRENCE_WINDOW_DAYS)
    targets = recurrence_store.targets_with_events(since)

    totals = {"targets": 0, "escalated": 0, "errors": 0}
    for t in targets:
        try:
            ts_list = recurrence_store.started_ats(t["target_id"], t["analysis_type"], since)
            stat = rec_analyzer.analyze(ts_list, now, window_days=RECURRENCE_WINDOW_DAYS)
            recurrence_store.save(
                t["id_owner"], t["target_id"], t["analysis_type"], RECURRENCE_WINDOW_DAYS, stat
            )
            totals["targets"] += 1
            totals["escalated"] += int(stat.escalated)
        except Exception as e:  # noqa: BLE001
            totals["errors"] += 1
            log.error("recurrence.target_error", target_id=t["target_id"], error=str(e))

    log.info("recurrence.done", **totals)
    return totals
