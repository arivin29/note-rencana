"""Aktifkan AI (detektor core P0) untuk satu sensor_channel — pilot.

Usage:
    python scripts/seed_enable.py <id_sensor_channel> [preset]

Resolve id_owner via sensor→node→project→owner, lalu insert baris ai_config (enabled=ON,
opt-in). Idempotent (ON CONFLICT). Setelah ini, `python -m ai_nrw.worker --once` akan
memproses channel tersebut.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ai_nrw import categories
from ai_nrw.store import db

# Fallback bila group_name channel tak punya kamus kategori.
FALLBACK_PRESET: dict[str, dict] = {
    "A1_invalid": {"allow_negative": False},
    "A2_low": {"sustain_T": "15m"},
    "A3_high": {"sustain_T": "15m"},
    "A5_flatline": {"eps_flat": 0.01, "n": 10},
    "A7_nodata": {"no_data_timeout": "10m"},
    "A8_persistent": {"persist_window": "4h"},
}


def resolve_channel(channel_id: str) -> dict | None:
    """id_owner + group_name kategori (via join platform)."""
    return db.fetch_one(
        """
        SELECT p.id_owner::text AS id_owner, st.group_name AS group_name
        FROM sensor_channels sc
        JOIN sensors  s  ON s.id_sensor    = sc.id_sensor
        JOIN nodes    n  ON n.id_node      = s.id_node
        JOIN projects p  ON p.id_project   = n.id_project
        JOIN sensor_types st ON st.id_sensor_type = sc.id_sensor_type
        WHERE sc.id_sensor_channel = CAST(:cid AS uuid)
        """,
        {"cid": channel_id},
    )


def enable(channel_id: str) -> None:
    info = resolve_channel(channel_id)
    if not info:
        raise SystemExit(f"❌ channel {channel_id} tak ditemukan / owner tak ter-resolve")
    owner, group = info["id_owner"], info["group_name"]

    # preset dari KAMUS kategori (dok 04 §8) → benar-benar "isi kamus", bukan hardcode.
    cat = categories.for_group(group)
    preset = cat.preset if cat else FALLBACK_PRESET
    preset_name = cat.label if cat else "generic"

    for atype, params in preset.items():
        db.execute(
            """
            INSERT INTO ai_config
              (id_owner, target_type, target_id, analysis_type, enabled, preset, params, cadence_sec)
            VALUES
              (CAST(:o AS uuid), 'sensor_channel', CAST(:t AS uuid), :a, true, :preset,
               CAST(:p AS jsonb), 300)
            ON CONFLICT (target_type, target_id, analysis_type)
            DO UPDATE SET enabled = true, params = EXCLUDED.params, preset = EXCLUDED.preset,
                          version = ai_config.version + 1, updated_at = now()
            """,
            {"o": owner, "t": channel_id, "a": atype, "preset": preset_name, "p": json.dumps(params)},
        )
    print(f"✅ {len(preset)} detektor aktif untuk channel {channel_id} "
          f"(owner {owner}, group '{group}', preset '{preset_name}')")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("usage: python scripts/seed_enable.py <id_sensor_channel>")
    enable(sys.argv[1])
