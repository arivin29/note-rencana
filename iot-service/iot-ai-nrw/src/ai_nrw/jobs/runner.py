"""Poller antrean job manual — ambil pending, jalankan komputasi 1 channel, tandai selesai.

Kind: forecast · baseline · recompute (baseline+forecast) · anomaly · all.
Anomali manual dievaluasi AS-OF titik telemetry terakhir channel (bukan `now`), agar
tetap mendeteksi walau data terakhir agak lama. Ref: dok 05 (runtime reconfig / prioritas).
"""

from __future__ import annotations

import json

import structlog

from ai_nrw import cycle
from ai_nrw.store import db

log = structlog.get_logger()


def _latest_event_time(target_id: str):
    """max(event_time) channel di ClickHouse (untuk anomali as-of), sebagai instant UTC
    TERKOREKSI — samakan dgn koreksi tz di ingestor.fetch_new_points supaya `asof` sejajar
    dengan timestamp sampel (bukan mundur 7 jam). None bila kosong/gagal."""
    try:
        from ai_nrw.store.clickhouse import client

        # toString(event_time) merender wall-clock di tz kolom (mis-tag), lalu di-parse
        # ULANG sbg UTC = instant yang dimaksud — identik dgn koreksi ts_utc di ingestor.
        rows = client().query(
            "SELECT toDateTime64(toString(max(event_time)), 3, 'UTC') "
            "FROM iot.sensor_telemetry WHERE channel_id = {t:UUID}",
            parameters={"t": target_id},
        ).result_rows
        return rows[0][0] if rows and rows[0][0] else None
    except Exception:  # noqa: BLE001
        return None


def claim_pending() -> dict | None:
    """Klaim satu job pending (aman antar-worker: FOR UPDATE SKIP LOCKED)."""
    rows = db.execute_returning(
        """
        UPDATE ai_job SET status = 'running', started_at = now()
        WHERE id = (
            SELECT id FROM ai_job WHERE status = 'pending'
            ORDER BY requested_at LIMIT 1 FOR UPDATE SKIP LOCKED
        )
        RETURNING id::text AS id, target_id::text AS target_id, kind
        """,
        {},
    )
    return rows[0] if rows else None


def run_job(job: dict) -> dict:
    """Jalankan komputasi sesuai kind untuk 1 channel."""
    tid = job["target_id"]
    kind = job["kind"]
    only = {tid}
    now = cycle.utc_now()
    res: dict = {}

    if kind in ("baseline", "recompute", "all"):
        res["baseline"] = cycle.run_baseline_cycle(now, only_targets=only)
    if kind in ("forecast", "recompute", "all"):
        res["forecast"] = cycle.run_forecast_cycle(now, only_targets=only)
    if kind in ("anomaly", "all"):
        asof = _latest_event_time(tid) or now
        res["anomaly"] = cycle.run_anomaly_cycle(asof, only_targets=only)
    return res


def run_jobs_cycle(max_jobs: int = 10) -> dict[str, int]:
    """Proses hingga `max_jobs` job pending per tick."""
    processed = 0
    for _ in range(max_jobs):
        job = claim_pending()
        if not job:
            break
        try:
            res = run_job(job)
            db.execute(
                "UPDATE ai_job SET status='done', finished_at=now(), result=CAST(:r AS jsonb) WHERE id=CAST(:id AS uuid)",
                {"r": json.dumps(res), "id": job["id"]},
            )
            log.info("job.done", id=job["id"], kind=job["kind"], target=job["target_id"])
        except Exception as e:  # noqa: BLE001 — 1 job gagal tak matikan poller
            db.execute(
                "UPDATE ai_job SET status='error', finished_at=now(), error=:e WHERE id=CAST(:id AS uuid)",
                {"e": str(e)[:500], "id": job["id"]},
            )
            log.error("job.error", id=job["id"], error=str(e))
        processed += 1
    if processed:
        log.info("jobs.done", processed=processed)
    return {"processed": processed}
