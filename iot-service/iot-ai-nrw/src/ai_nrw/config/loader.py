"""Config Loader — baca ai_config target ON + metadata channel dari Postgres.

Menggabungkan baris ai_config (per analysis_type) menjadi satu objek per channel,
plus metadata nyata: group_name (sensor_types), unit & min/max_threshold (sensor_channels).
Ref: dok 04 (opt-in), dok 06 §2 + grounding kolom nyata.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ai_nrw.settings import settings
from ai_nrw.store import db


@dataclass
class ChannelConfig:
    """Konfigurasi efektif satu sensor_channel yang AI-nya ON."""

    target_id: str                       # = sensor_channels.id_sensor_channel (UUID)
    id_owner: str                        # tenant (UUID), denormal di ai_config
    group_name: str | None               # kategori metric ("Tekanan", …) dari sensor_types
    unit: str | None
    min_threshold: float | None          # batas layanan channel (real: min_threshold)
    max_threshold: float | None
    cadence_sec: int                     # irama evaluasi (default 5 menit)
    analyses: dict[str, dict[str, Any]]  # analysis_type -> params (hanya yang enabled)

    def enabled(self, analysis_type: str) -> bool:
        return analysis_type in self.analyses

    def params(self, analysis_type: str) -> dict[str, Any]:
        return self.analyses.get(analysis_type, {})


_SQL = """
SELECT c.target_id::text          AS target_id,
       c.id_owner::text           AS id_owner,
       c.analysis_type            AS analysis_type,
       c.params                   AS params,
       c.cadence_sec              AS cadence_sec,
       st.group_name              AS group_name,
       sc.unit                    AS unit,
       sc.min_threshold           AS min_threshold,
       sc.max_threshold           AS max_threshold
FROM ai_config c
JOIN sensor_channels sc ON sc.id_sensor_channel = c.target_id
JOIN sensor_types    st ON st.id_sensor_type   = sc.id_sensor_type
WHERE c.enabled
  AND c.target_type = 'sensor_channel'
  AND (:id_owner IS NULL OR c.id_owner = CAST(:id_owner AS uuid))
"""


def load_channel_configs(id_owner: str | None = None) -> list[ChannelConfig]:
    """Kumpulkan config per channel (gabung baris per analysis_type).

    id_owner None = semua tenant (skala kecil / worker tunggal, dok 05 §6).
    """
    rows = db.fetch_all(_SQL, {"id_owner": id_owner})

    by_channel: dict[str, ChannelConfig] = {}
    for r in rows:
        tid = r["target_id"]
        cfg = by_channel.get(tid)
        if cfg is None:
            cfg = ChannelConfig(
                target_id=tid,
                id_owner=r["id_owner"],
                group_name=r["group_name"],
                unit=r["unit"],
                min_threshold=_as_float(r["min_threshold"]),
                max_threshold=_as_float(r["max_threshold"]),
                cadence_sec=r["cadence_sec"] or settings.cadence_anomaly_sec,
                analyses={},
            )
            by_channel[tid] = cfg
        cfg.analyses[r["analysis_type"]] = r["params"] or {}
    return list(by_channel.values())


def _as_float(v: Any) -> float | None:
    return None if v is None else float(v)
