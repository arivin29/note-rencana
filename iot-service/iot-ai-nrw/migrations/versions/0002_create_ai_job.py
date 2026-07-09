"""create ai_job (antrean tugas manual: hitung-ulang / jalankan sekarang)

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-08
"""
from __future__ import annotations

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE ai_job (
          id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          id_owner     uuid NOT NULL,
          target_id    uuid NOT NULL,
          kind         text NOT NULL CHECK (kind IN ('forecast','baseline','recompute','anomaly','all')),
          status       text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','running','done','error')),
          requested_by uuid,
          requested_at timestamptz NOT NULL DEFAULT now(),
          started_at   timestamptz,
          finished_at  timestamptz,
          result       jsonb,
          error        text
        );
        """
    )
    op.execute("CREATE INDEX ix_ai_job_pending ON ai_job (requested_at) WHERE status = 'pending';")
    op.execute("CREATE INDEX ix_ai_job_target ON ai_job (target_id, requested_at DESC);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS ai_job CASCADE;")
