# Deploy iot-ai-nrw (VitoDeploy)

Repo ini di-mirror dari monorepo `pra-project` (subtree split, satu arah
monorepo → sini). **Jangan commit langsung ke repo ini** — kerjakan di monorepo.

## Setup sekali di server

1. Panel Vito: **Services → Install → Python 3.11** (memasang uv + interpreter).
2. Site dibuat dari repo ini (branch `main`) — checkout mis. `/home/iot-ai-nrw/iot-ai-nrw.com`.
3. `.env` di root situs (salin `.env.example`, isi `AINRW_PG_DSN` + `AINRW_CH_*`).
   `settings.py` membacanya dari root project, kebal working-dir supervisor.
4. Panel: **Workers → Create**
   - Command : `<root-situs>/.venv/bin/ai-nrw-worker`
   - User    : user situs
   - Numprocs: **1** (APScheduler in-proc — >1 = job dobel)
   - Auto restart: on

## Script deployment (panel Vito, "executed on every deployment")

```bash
set -e
git pull origin main
export AINRW_RESTART_CMD="sudo supervisorctl restart worker-1:*"   # sesuaikan nama worker
bash scripts/deploy.sh
```

`git pull` WAJIB baris pertama — Vito tidak menarik commit sendiri untuk site
custom; tanpanya `uv sync` merasa environment sudah sesuai (pyproject lama) dan
fix di remote tak pernah sampai. Nama worker: `sudo supervisorctl status`.

`scripts/deploy.sh` idempoten: `uv sync` → cek `.env` → `alembic upgrade head`
(SEBELUM restart, worker baru tak pernah ketemu skema lama) → restart.

## Verifikasi setelah deploy

```bash
sudo supervisorctl status                      # worker RUNNING?
sudo supervisorctl tail -f worker-1 stdout     # cari: worker.boot cadence_anomaly_sec=300
```

## Gotcha yang sudah dibayar mahal

- **psycopg2, bukan psycopg3** — pooler Postgres mengembalikan `version()` sebagai
  bytes; psycopg3 crash di deteksi versi SQLAlchemy. DSN wajib `postgresql+psycopg2://`
  dan `client_encoding=utf8` (teks makna detektor ber-em-dash).
- Python ≥ 3.11 (gerbang di deploy.sh).
- Tes lokal tanpa install apa pun: `python3 tests/test_<nama>.py` (pure stdlib).
