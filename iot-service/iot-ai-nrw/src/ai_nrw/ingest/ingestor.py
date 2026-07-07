"""Ingestor — tarik telemetry baru dari ClickHouse borongan per-tenant.

Pola (dok 05 §3, dok 06 §8): resolve channel_id ON dari Postgres (Config Loader) →
1 query ClickHouse `channel_id IN (...) AND event_time > since` → bucket per channel.
`iot.sensor_telemetry` tak punya kolom owner → scoping lewat daftar channel_id.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from ai_nrw.store.clickhouse import client


def _as_utc(ts: datetime) -> datetime:
    """event_time ClickHouse = UTC; lekatkan tzinfo bila naive agar konsisten aware-UTC."""
    return ts if ts.tzinfo is not None else ts.replace(tzinfo=timezone.utc)


@dataclass(slots=True)
class Point:
    """Satu titik telemetry (nilai utama = eng_value)."""

    ts: datetime          # event_time (UTC)
    value: float | None   # eng_value
    raw: float | None     # raw_value


_QUERY = """
SELECT channel_id, event_time, eng_value, raw_value
FROM iot.sensor_telemetry
WHERE has({ids:Array(UUID)}, channel_id)
  AND event_time > {since:DateTime64(3)}
ORDER BY event_time ASC, channel_id
"""


def fetch_new_points(
    channel_ids: list[str],
    since: datetime,
) -> dict[str, list[Point]]:
    """Ambil titik baru (event_time > since) untuk daftar channel, dibucket per channel.

    `since` = titik checkpoint paling awal antar channel (per-channel di-filter lagi oleh
    pemanggil via ai_baseline.last_ts). Untuk P0 skala kecil ini cukup & 1 query.
    Mengembalikan {channel_id: [Point, ...]} terurut waktu.
    """
    if not channel_ids:
        return {}

    result = client().query(
        _QUERY,
        parameters={"ids": channel_ids, "since": since},
    )

    out: dict[str, list[Point]] = {cid: [] for cid in channel_ids}
    for channel_id, event_time, eng_value, raw_value in result.result_rows:
        cid = str(channel_id)
        out.setdefault(cid, []).append(
            Point(
                ts=_as_utc(event_time),
                value=None if eng_value is None else float(eng_value),
                raw=None if raw_value is None else float(raw_value),
            )
        )
    return out
