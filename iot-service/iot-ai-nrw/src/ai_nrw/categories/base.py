"""Kategori metric ("kamus") — apa yang beda antar tipe sensor.

Pipeline & detektor generik dipakai ulang; tiap kategori cuma mendeklarasikan:
  - group_names : nilai `sensor_types.group_name` yang cocok
  - preset      : detektor default + param (untuk AI Settings / seed)
  - meanings    : terjemahan arti PDAM per kode analisa
  - (opsional)  : detektor khusus kategori didaftarkan di registry dari modulnya
                  (mis. MNF untuk flow, night_pressure untuk tekanan).

Menambah kategori = tambah satu modul + register_category(...), NOL ubah pipeline.
Ref: dok tekanan §11.5 (isi kamus), dok 04 §8 (preset per kategori).
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Category:
    key: str                          # id internal (pressure/flow/…)
    label: str                        # nama tampil
    group_names: tuple[str, ...]      # cocok dgn sensor_types.group_name
    preset: dict[str, dict] = field(default_factory=dict)     # code -> default params
    meanings: dict[str, str] = field(default_factory=dict)    # code -> arti PDAM

    def meaning(self, code: str) -> str | None:
        return self.meanings.get(code)


_BY_GROUP: dict[str, Category] = {}


def register_category(cat: Category) -> Category:
    for g in cat.group_names:
        _BY_GROUP[g.strip().lower()] = cat
    return cat


def for_group(group_name: str | None) -> Category | None:
    """Cari kategori dari group_name (case-insensitive). None bila tak ada kamusnya."""
    if not group_name:
        return None
    return _BY_GROUP.get(group_name.strip().lower())


def all_categories() -> list[Category]:
    # dedup by identity (satu kategori bisa punya beberapa group_names)
    return list({id(c): c for c in _BY_GROUP.values()}.values())
