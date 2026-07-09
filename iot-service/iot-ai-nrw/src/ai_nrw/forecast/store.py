"""Persistensi ai_forecast — overwrite ramalan terbaru per channel (unik per target).

Ref: dok 06 §6. `daily` = list DailyForecast (jsonb), `metrics` = metadata metode.
"""

from __future__ import annotations

import json

from ai_nrw.forecast.base import DailyForecast
from ai_nrw.store import db


def save(
    id_owner: str,
    target_id: str,
    horizon_days: int,
    tier: str,
    daily: list[DailyForecast],
    metrics: dict | None = None,
) -> None:
    db.execute(
        """
        INSERT INTO ai_forecast (id_owner, target_id, horizon_days, tier, daily, metrics)
        VALUES (CAST(:o AS uuid), CAST(:t AS uuid), :h, :tier, CAST(:daily AS jsonb), CAST(:m AS jsonb))
        ON CONFLICT (target_id)
        DO UPDATE SET horizon_days = EXCLUDED.horizon_days,
                      tier = EXCLUDED.tier,
                      generated_at = now(),
                      daily = EXCLUDED.daily,
                      metrics = EXCLUDED.metrics
        """,
        {
            "o": id_owner,
            "t": target_id,
            "h": horizon_days,
            "tier": tier,
            "daily": json.dumps([p.as_dict() for p in daily]),
            "m": json.dumps(metrics or {}),
        },
    )
