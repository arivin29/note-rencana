"""Baseline bundle — objek yang dibawa ke `ctx.baseline` sepanjang satu evaluasi channel.

Membawa DUA hal yang dipakai detektor P1:
  - `grid`         : baseline musiman median/MAD (dibaca A9 deviasi).
  - `online_state` : state per-detektor STATEFUL (dibaca+DITULIS A10 drift PageHinkley).

Kunci desain: detektor stateful MUTASI `online_state[kode]` IN-PLACE (bukan lewat Signal),
sebab state harus persist walau tak ada anomali (akumulator drift jalan tiap siklus).
`cycle.py` memuat bundle → jalankan detektor → simpan `online_state` yang berubah.
Ref: dok 06 §3 (ai_baseline.grid/online_state), dok 07 §5-6.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ai_nrw.baseline import grid as gridmod
from ai_nrw.baseline.grid import SlotStat


@dataclass
class Baseline:
    grid: dict[tuple[int, int], SlotStat] = field(default_factory=dict)
    slot_size_min: int = 10
    online_state: dict[str, Any] = field(default_factory=dict)  # kode -> state jsonable
    night_state: dict[str, Any] = field(default_factory=dict)
    learn_ready: bool = False

    def state_for(self, code: str) -> dict[str, Any]:
        """State mutable untuk detektor stateful (dibuat kosong bila belum ada)."""
        return self.online_state.setdefault(code, {})


def from_row(row: dict[str, Any] | None) -> Baseline:
    """Bangun Baseline dari baris ai_baseline (grid/online_state = jsonb)."""
    if row is None:
        return Baseline()
    return Baseline(
        grid=gridmod.grid_from_json(row.get("grid") or {}),
        slot_size_min=int(row.get("slot_size_min") or 10),
        online_state=dict(row.get("online_state") or {}),
        night_state=dict(row.get("night_state") or {}),
        learn_ready=bool(row.get("learn_ready")),
    )
