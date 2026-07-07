"""create ai_* tables (config, baseline, event, event_log, forecast, recurrence)

Skema mengikuti docs/06-model-data.md. Semua generik (tak menyebut "tekanan").

Catatan desain (sadar):
- `ai_event` P0 TANPA partisi (satu tabel biasa); partisi bulanan = optimasi skala (P3),
  saat itu PK berubah jadi (id, started_at).
- Integritas via CHECK (status/severity/verdict/…) + partial UNIQUE "satu event aktif
  per (target, analysis)" = jaminan dedup di level DB.
- `ai_config.target_id` sengaja TANPA FK ke sensor_channels (lintas-domain platform) —
  config yatim ditangani job cleanup, bukan FK.
- `ai_config_history` (untuk API versions/rollback) menyusul saat API digarap.

Revision ID: 0001
Revises:
Create Date: 2026-07-07
"""
from __future__ import annotations

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # gen_random_uuid() ada di PG13+ inti; pgcrypto = jaring pengaman utk PG lama.
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    # ---- ai_config : langganan analisa per target (opt-in default OFF) ----
    op.execute(
        """
        CREATE TABLE ai_config (
          id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          id_owner         uuid NOT NULL,
          target_type      text NOT NULL DEFAULT 'sensor_channel'
                             CHECK (target_type IN ('sensor_channel','node')),
          target_id        uuid NOT NULL,
          analysis_type    text NOT NULL,
          enabled          boolean NOT NULL DEFAULT false,
          preset           text,
          params           jsonb NOT NULL DEFAULT '{}'::jsonb,
          severity_default text CHECK (severity_default IN ('info','warning','critical')),
          cadence_sec      integer CHECK (cadence_sec IS NULL OR cadence_sec > 0),
          notify           jsonb NOT NULL DEFAULT '{}'::jsonb,
          version          integer NOT NULL DEFAULT 1,
          created_by       uuid,
          created_at       timestamptz NOT NULL DEFAULT now(),
          updated_by       uuid,
          updated_at       timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT uq_ai_config_target UNIQUE (target_type, target_id, analysis_type)
        );
        """
    )
    op.execute(
        "CREATE INDEX ix_ai_config_active ON ai_config (id_owner, enabled) WHERE enabled;"
    )

    # ---- ai_baseline : grid musiman + state online + checkpoint (worker stateless) ----
    op.execute(
        """
        CREATE TABLE ai_baseline (
          id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          id_owner      uuid NOT NULL,
          target_id     uuid NOT NULL,
          slot_size_min integer NOT NULL DEFAULT 10 CHECK (slot_size_min > 0),
          grid          jsonb NOT NULL DEFAULT '{}'::jsonb,
          online_state  jsonb NOT NULL DEFAULT '{}'::jsonb,
          night_state   jsonb NOT NULL DEFAULT '{}'::jsonb,
          last_ts       timestamptz,
          learn_ready   boolean NOT NULL DEFAULT false,
          updated_at    timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT uq_ai_baseline_target UNIQUE (target_id)
        );
        """
    )

    # ---- ai_event : event + lifecycle (state machine) ----
    op.execute(
        """
        CREATE TABLE ai_event (
          id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          id_owner       uuid NOT NULL,
          target_type    text NOT NULL DEFAULT 'sensor_channel'
                          CHECK (target_type IN ('sensor_channel','node')),
          target_id      uuid NOT NULL,
          analysis_type  text NOT NULL,
          status         text NOT NULL DEFAULT 'baru'
                          CHECK (status IN ('baru','ditinjau','ditindak','selesai','auto_closed','superseded')),
          severity       text NOT NULL CHECK (severity IN ('info','warning','critical')),
          confidence     numeric(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
          started_at     timestamptz NOT NULL,
          last_seen_at   timestamptz NOT NULL,
          resolved_at    timestamptz,
          duration_sec   integer,
          peak_magnitude numeric,
          meaning        text,
          context        jsonb NOT NULL DEFAULT '{}'::jsonb,
          verdict        text CHECK (verdict IN ('benar','false_alarm','abaikan')),
          verdict_by     uuid,
          verdict_at     timestamptz,
          assigned_to    uuid,
          action_note    text,
          recurrence_id  uuid,
          superseded_by  uuid REFERENCES ai_event (id) ON DELETE SET NULL,
          created_at     timestamptz NOT NULL DEFAULT now()
        );
        """
    )
    # Dedup DIJAMIN DB: maksimum satu event AKTIF per (target, analysis).
    op.execute(
        """
        CREATE UNIQUE INDEX uq_ai_event_active ON ai_event (target_id, analysis_type)
          WHERE status IN ('baru','ditinjau','ditindak');
        """
    )
    # Index panas: daftar event aktif untuk operator (per tenant).
    op.execute(
        """
        CREATE INDEX ix_ai_event_active ON ai_event (id_owner, status, severity, last_seen_at)
          WHERE status IN ('baru','ditinjau','ditindak');
        """
    )
    # History/rekurensi per target.
    op.execute(
        "CREATE INDEX ix_ai_event_target ON ai_event (target_id, analysis_type, started_at DESC);"
    )

    # ---- ai_event_log : jejak transisi status (audit, feedback loop) ----
    op.execute(
        """
        CREATE TABLE ai_event_log (
          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id    uuid NOT NULL REFERENCES ai_event (id) ON DELETE CASCADE,
          from_status text,
          to_status   text NOT NULL,
          actor       uuid,
          actor_kind  text NOT NULL DEFAULT 'system' CHECK (actor_kind IN ('system','user')),
          note        text,
          at          timestamptz NOT NULL DEFAULT now()
        );
        """
    )
    op.execute("CREATE INDEX ix_ai_event_log_event ON ai_event_log (event_id, at);")

    # ---- ai_forecast : forecast terbaru per channel (overwrite harian) ----
    op.execute(
        """
        CREATE TABLE ai_forecast (
          id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          id_owner     uuid NOT NULL,
          target_id    uuid NOT NULL,
          horizon_days integer NOT NULL CHECK (horizon_days > 0),
          tier         text NOT NULL CHECK (tier IN ('tier-0','tier-1','tier-2')),
          generated_at timestamptz NOT NULL DEFAULT now(),
          daily        jsonb NOT NULL DEFAULT '[]'::jsonb,
          metrics      jsonb NOT NULL DEFAULT '{}'::jsonb,
          CONSTRAINT uq_ai_forecast_target UNIQUE (target_id)
        );
        """
    )

    # ---- ai_recurrence : pola kambuh-pulih (sinyal NRW) ----
    op.execute(
        """
        CREATE TABLE ai_recurrence (
          id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          id_owner      uuid NOT NULL,
          target_id     uuid NOT NULL,
          analysis_type text NOT NULL,
          window_days   integer NOT NULL DEFAULT 14 CHECK (window_days > 0),
          count         integer NOT NULL DEFAULT 0,
          trend         text CHECK (trend IN ('naik','stabil','turun')),
          typical_hour  jsonb NOT NULL DEFAULT '{}'::jsonb,
          escalated     boolean NOT NULL DEFAULT false,
          updated_at    timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT uq_ai_recurrence_target UNIQUE (target_id, analysis_type)
        );
        """
    )


def downgrade() -> None:
    for t in (
        "ai_recurrence",
        "ai_forecast",
        "ai_event_log",
        "ai_event",
        "ai_baseline",
        "ai_config",
    ):
        op.execute(f"DROP TABLE IF EXISTS {t} CASCADE;")
