"""Scheduler in-proc (APScheduler) — daftarkan job sesuai cadence (dok 05 §4).

Anomali: interval (default 5 menit). Forecast & rekurensi: cron (P1, stub sekarang).
"""

from __future__ import annotations

import structlog
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from ai_nrw.cycle import run_anomaly_cycle
from ai_nrw.settings import settings

log = structlog.get_logger()


def _forecast_job() -> None:
    log.info("forecast_job.skip", reason="P1 — belum diimplementasi")


def _recurrence_job() -> None:
    log.info("recurrence_job.skip", reason="P1 — belum diimplementasi")


def build_scheduler() -> BlockingScheduler:
    sched = BlockingScheduler(timezone="UTC")
    sched.add_job(
        run_anomaly_cycle,
        IntervalTrigger(seconds=settings.cadence_anomaly_sec),
        id="anomaly",
        max_instances=1,
        coalesce=True,
        next_run_time=None,  # tunggu tick pertama; panggil manual di boot bila perlu
    )
    sched.add_job(_forecast_job, CronTrigger.from_crontab(settings.cadence_forecast_cron, timezone="UTC"), id="forecast")
    sched.add_job(_recurrence_job, CronTrigger.from_crontab(settings.cadence_recurrence_cron, timezone="UTC"), id="recurrence")
    return sched
