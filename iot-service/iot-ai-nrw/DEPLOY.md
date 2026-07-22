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
git pull origin ${BRANCH}
export UV_PYTHON_INSTALL_DIR=/opt/uv/python
uv sync
uv run alembic upgrade head
```

Lalu **centang "Restart workers"** di bawah editor script. JANGAN restart worker
manual via supervisorctl di script — panel me-restart berdasarkan ID worker dari
DB-nya sendiri (program supervisor dinamai `<worker-id>`, mis. `8`), jadi tetap
benar walau worker di-recreate; nama hardcode akan basi.

`git pull` WAJIB baris pertama — Vito tidak menarik commit sendiri untuk site
custom; tanpanya `uv sync` merasa environment sudah sesuai (pyproject lama) dan
fix di remote tak pernah sampai. Migrasi selalu SEBELUM restart, jadi worker
baru tak pernah ketemu skema lama.

Alternatif non-Vito (pm2/server polos): `bash scripts/deploy.sh` — idempoten,
plus guard `.env` & gerbang Python ≥ 3.11; restart via `AINRW_RESTART_CMD`
atau pm2 bila ada, selain itu diserahkan ke panel.

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
