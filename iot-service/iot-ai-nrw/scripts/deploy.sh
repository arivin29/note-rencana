#!/usr/bin/env bash
# Deploy worker AI-NRW di server — idempoten, aman dijalankan berulang.
#
# Dipanggil CI (via SSH) setelah `git pull`, atau manual:
#   bash iot-service/iot-ai-nrw/scripts/deploy.sh
#
# Urutan: venv → install → migrasi DB → restart pm2. Migrasi SEBELUM restart
# supaya worker baru tak pernah menyentuh skema lama.
set -euo pipefail
cd "$(dirname "$0")/.."

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

# .env digitignore — HARUS sudah ada di server (salin dari .env.example sekali)
if [ ! -f .env ]; then
  echo "FATAL: .env belum ada — salin .env.example lalu isi DSN Postgres/ClickHouse." >&2
  exit 1
fi

.venv/bin/alembic upgrade head

mkdir -p logs
if pm2 describe ai-nrw-worker >/dev/null 2>&1; then
  pm2 restart ai-nrw-worker --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

echo "OK: ai-nrw-worker jalan. Cek: pm2 logs ai-nrw-worker --lines 20"
