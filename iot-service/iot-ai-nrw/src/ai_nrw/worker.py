"""Entrypoint worker AI-NRW (dok 05).

Mode:
  python -m ai_nrw.worker          → jalankan scheduler (loop, cadence dari .env)
  python -m ai_nrw.worker --once   → satu siklus anomali lalu keluar (debug/cron)

Siklus: config → ingest → detektor core → event manager → checkpoint (ai_nrw.cycle).
P0: detektor A1–A8. A9/A10 + forecast = P1.
"""

from __future__ import annotations

import sys

import structlog

from ai_nrw.cycle import run_anomaly_cycle
from ai_nrw.settings import settings

log = structlog.get_logger()


def main() -> None:
    if "--once" in sys.argv:
        log.info("worker.once")
        run_anomaly_cycle()
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
