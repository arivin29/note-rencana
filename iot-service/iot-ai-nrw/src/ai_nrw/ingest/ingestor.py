"""Ingestor — tarik telemetry baru dari ClickHouse borongan per-tenant.

Pola (dok 05 §3, dok 06 §8): resolve channel_id ON dari Postgres (Config Loader) →
1 query ClickHouse `channel_id IN (...) AND event_time > since` → bucket per channel.
`iot.sensor_telemetry` tak punya kolom owner → scoping lewat daftar channel_id.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from ai_nrw.settings import settings
from ai_nrw.store.clickhouse import client


def _as_utc(ts: datetime) -> datetime:
    """ts_utc dari query sudah instant UTC yang benar; lekatkan tzinfo bila naive."""
    return ts if ts.tzinfo is not None else ts.replace(tzinfo=timezone.utc)


@dataclass(slots=True)
class Point:
    """Satu titik telemetry (nilai utama = eng_value)."""

    ts: datetime          # event_time (UTC, sudah dikoreksi tz — lihat _QUERY)
    value: float | None   # eng_value
    raw: float | None     # raw_value


# KOREKSI TIMEZONE (lihat settings.ch_event_tz): kolom event_time ter-tag Asia/Jakarta
# padahal nilainya wall-clock UTC. Kita bandingkan & kembalikan pada basis wall-clock
# yang konsisten agar jendela ingest berbasis UTC benar-benar menyentuh data terbaru:
#   - boundary  : {since} (wall-clock UTC) di-parse ULANG di tz kolom → sejajar event_time.
#                 event_time dibiarkan telanjang di WHERE agar indeks tetap terpakai.
#   - ts_utc    : wall-clock event_time (di tz kolom) di-parse ULANG sebagai UTC =
#                 instant yang DIMAKSUD produser. Bila kolom kelak jadi UTC murni
#                 (AINRW_CH_EVENT_TZ=UTC), kedua ekspresi jadi no-op.
_QUERY = """
SELECT channel_id,
       toDateTime64(toString(event_time), 3, 'UTC') AS ts_utc,
       eng_value, raw_value
FROM iot.sensor_telemetry
WHERE has({ids:Array(UUID)}, channel_id)
  AND event_time > toDateTime64({since_wall:String}, 3, {ch_tz:String})
ORDER BY ts_utc ASC, channel_id
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

    # wall-clock UTC dari `since` (buang tzinfo) → dibaca ulang di tz kolom oleh query
    since_wall = since.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

    result = client().query(
        _QUERY,
        parameters={"ids": channel_ids, "since_wall": since_wall, "ch_tz": settings.ch_event_tz},
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
