# iot-ai-nrw — maintenance targets
.PHONY: install test test-stdlib lint typecheck check migrate run once

install:            ## venv deps (core + dev + adtk)
	pip install -e ".[dev,detectors-extra]"

test:               ## unit tests (pytest)
	python -m pytest -q

test-stdlib:        ## jalankan tes tanpa install apa pun (pure stdlib)
	@for t in tests/test_core_detectors.py tests/test_lifecycle.py tests/test_categories.py; do \
		python3 $$t || exit 1; \
	done

lint:               ## ruff
	ruff check src tests scripts

typecheck:          ## mypy
	mypy src

check: lint typecheck test   ## gerbang CI: lint + type + test

migrate:            ## buat/upgrade tabel ai_*
	alembic upgrade head

run:                ## worker loop (cadence dari .env)
	python -m ai_nrw.worker

once:               ## satu siklus anomali lalu keluar
	python -m ai_nrw.worker --once
