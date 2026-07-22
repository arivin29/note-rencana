#!/usr/bin/env bash
# Deploy worker AI-NRW di server — idempoten, aman dijalankan berulang.
#
# Dipanggil CI (via SSH) setelah `git pull`, atau manual:
#   bash iot-service/iot-ai-nrw/scripts/deploy.sh
#
# Dua dunia yang didukung:
#   - Vito/supervisor : venv via uv, restart via AINRW_RESTART_CMD (atau panel Vito)
#   - pm2             : fallback bila pm2 terpasang dan AINRW_RESTART_CMD kosong
#
# Urutan: venv → install → migrasi DB → restart. Migrasi SEBELUM restart supaya
# worker baru tak pernah menyentuh skema lama.
set -euo pipefail
cd "$(dirname "$0")/.."

# --- venv + dependensi -----------------------------------------------------
if command -v uv >/dev/null 2>&1; then
  # jalur Vito: uv sudah dipasang service Python panel (interpreter di /opt/uv/python)
  [ -d .venv ] || uv venv --python 3.11
  uv sync
else
  PY=${PYTHON:-python3}
  # gerbang versi — pyproject minta >=3.11; gagal di sini lebih jelas daripada
  # ImportError misterius saat worker boot
  "$PY" - <<'EOF'
import sys
assert sys.version_info >= (3, 11), f"butuh Python >= 3.11, ini {sys.version.split()[0]}"
EOF
  [ -d .venv ] || "$PY" -m venv .venv
  .venv/bin/pip install -q --upgrade pip
  .venv/bin/pip install -q -e .
fi

# .env digitignore — HARUS sudah ada di server (salin dari .env.example sekali).
# settings.py membacanya dari root project (bukan CWD), jadi lokasinya pasti di sini.
if [ ! -f .env ]; then
  echo "FATAL: .env belum ada — salin .env.example lalu isi DSN Postgres/ClickHouse." >&2
  exit 1
fi

.venv/bin/alembic upgrade head

# --- restart worker --------------------------------------------------------
# Vito memberi nama program supervisor sendiri (mis. worker-3) — set sekali di CI:
#   AINRW_RESTART_CMD="sudo supervisorctl restart worker-3:*"
if [ -n "${AINRW_RESTART_CMD:-}" ]; then
  eval "$AINRW_RESTART_CMD"
elif command -v pm2 >/dev/null 2>&1; then
  mkdir -p logs
  if pm2 describe ai-nrw-worker >/dev/null 2>&1; then
    pm2 restart ai-nrw-worker --update-env
  else
    pm2 start ecosystem.config.js
  fi
  pm2 save
else
  echo "CATATAN: tak ada AINRW_RESTART_CMD & pm2 — restart worker lewat panel Vito."
fi

echo "OK: deploy ai-nrw selesai."
