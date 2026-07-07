"""Alembic environment — pakai DSN dari settings (.env), migrasi ai_* saja.

Tidak memakai autogenerate/metadata (skema ditulis manual sesuai dok 06); jalankan
`alembic upgrade head`. Tabel platform lain TIDAK disentuh dari sini.
"""

from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# pastikan `src/` di path agar bisa import ai_nrw.settings
SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from ai_nrw.settings import settings  # noqa: E402

config = context.config
config.set_main_option("sqlalchemy.url", settings.pg_dsn)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None  # migrasi manual (dok 06), tanpa autogenerate


def run_migrations_offline() -> None:
    context.configure(
        url=settings.pg_dsn,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
