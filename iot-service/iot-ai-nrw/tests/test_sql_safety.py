"""Guard regresi: cegah pola SQL `:param::cast` yang TIDAK dikenali SQLAlchemy.

SQLAlchemy text() gagal mengenali bind-param bila langsung diikuti `::` (Postgres cast),
sehingga `:streak::int` di-render literal → runtime error. Gunakan `CAST(:param AS type)`.
Tes ini memindai seluruh src/scripts agar bug ini tak terulang. PURE STDLIB.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# bind-param (:nama) langsung diikuti '::' — berbahaya di SQLAlchemy text()
DANGER = re.compile(r":[a-zA-Z_]\w*::")


def _scan() -> list[str]:
    hits: list[str] = []
    for base in ("src", "scripts"):
        for py in (ROOT / base).rglob("*.py"):
            for i, line in enumerate(py.read_text(encoding="utf-8").splitlines(), 1):
                if DANGER.search(line):
                    hits.append(f"{py.relative_to(ROOT)}:{i}: {line.strip()}")
    return hits


def test_no_bindparam_double_colon_cast():
    hits = _scan()
    assert not hits, "Pakai CAST(:p AS t), bukan :p::t —\n" + "\n".join(hits)


if __name__ == "__main__":
    found = _scan()
    if found:
        print("❌ pola berbahaya ditemukan:")
        print("\n".join(found))
        raise SystemExit(1)
    print("✅ tak ada pola :param::cast berbahaya di src/scripts.")
