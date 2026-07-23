"""Scheduler in-proc (APScheduler) — daftarkan job sesuai cadence (dok 05 §4).

Anomali: interval (default 5 menit). Learn baseline (A9): cron harian. Forecast
(Tier-0 seasonal): cron harian. Rekurensi (kambuh-pulih): cron per jam.
"""

from __future__ import annotations

import structlog
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from ai_nrw.cycle import (
    run_anomaly_cycle,
    run_baseline_cycle,
    run_forecast_cycle,
    run_recurrence_cycle,
)
from ai_nrw.jobs.runner import run_jobs_cycle
from ai_nrw.settings import settings

log = structlog.get_logger()


def build_scheduler() -> BlockingScheduler:
    sched = BlockingScheduler(timezone="UTC")
    sched.add_job(
        run_anomaly_cycle,
        IntervalTrigger(seconds=settings.cadence_anomaly_sec),
        id="anomaly",
        max_instances=1,
        coalesce=True,
        # JANGAN set next_run_time=None → itu menandai job PAUSED (tak pernah jalan) di
        # APScheduler, bukan "tunggu tick pertama". IntervalTrigger default sudah menunda
        # tembakan pertama sebesar satu interval; itulah perilaku yang diinginkan.
    )
    sched.add_job(
        run_jobs_cycle,
        IntervalTrigger(seconds=settings.cadence_jobs_sec),
        id="jobs",
        max_instances=1,
        coalesce=True,
    )
    sched.add_job(
        run_baseline_cycle,
        CronTrigger.from_crontab(settings.cadence_baseline_cron, timezone="UTC"),
        id="baseline",
        max_instances=1,
        coalesce=True,
    )
    sched.add_job(
        run_forecast_cycle,
        CronTrigger.from_crontab(settings.cadence_forecast_cron, timezone="UTC"),
        id="forecast", max_instances=1, coalesce=True,
    )
    sched.add_job(
        run_recurrence_cycle,
        CronTrigger.from_crontab(settings.cadence_recurrence_cron, timezone="UTC"),
        id="recurrence", max_instances=1, coalesce=True,
    )
    return sched
