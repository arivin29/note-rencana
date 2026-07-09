"""Entrypoint worker AI-NRW (dok 05).

Mode:
  python -m ai_nrw.worker              → scheduler (loop, cadence dari .env)
  python -m ai_nrw.worker --once       → satu siklus anomali lalu keluar (debug/cron)
  python -m ai_nrw.worker --baseline   → learn grid musiman sekali (A9)
  python -m ai_nrw.worker --forecast   → hitung forecast Tier-0 sekali
  python -m ai_nrw.worker --recurrence → agregasi kambuh-pulih sekali

Siklus anomali: config → ingest → detektor (A1-A10) → event manager → checkpoint.
"""

from __future__ import annotations

import sys

import structlog

from ai_nrw.cycle import (
    run_anomaly_cycle,
    run_baseline_cycle,
    run_forecast_cycle,
    run_recurrence_cycle,
)
from ai_nrw.settings import settings

log = structlog.get_logger()

_ONCE_JOBS = {
    "--once": ("worker.once", run_anomaly_cycle),
    "--baseline": ("worker.baseline", run_baseline_cycle),
    "--forecast": ("worker.forecast", run_forecast_cycle),
    "--recurrence": ("worker.recurrence", run_recurrence_cycle),
}


def main() -> None:
    for flag, (event, job) in _ONCE_JOBS.items():
        if flag in sys.argv:
            log.info(event)
            job()
            return

    # import di sini agar mode --once tak butuh APScheduler
    from ai_nrw.scheduler.runner import build_scheduler

    log.info(
        "worker.boot",
        cadence_anomaly_sec=settings.cadence_anomaly_sec,
        tenants=settings.tenant_ids or "ALL",
    )
    sched = build_scheduler()
    try:
        sched.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("worker.stop")


if __name__ == "__main__":
    main()
