"""Registry detektor — map `analysis_type` → fungsi detektor `fn(ctx) -> list[Signal]`.

Mengganti dispatch if/elif. Menambah detektor (generik ATAU khusus kategori) =
`@register("KODE")` di modulnya, tanpa menyentuh pipeline. Ref: dok 07 §9 (tool-agnostic).
"""

from __future__ import annotations

from typing import Callable

from ai_nrw.detectors.base import DetectionContext, Signal

DetectorFn = Callable[[DetectionContext], list[Signal]]

_REGISTRY: dict[str, DetectorFn] = {}


def register(code: str) -> Callable[[DetectorFn], DetectorFn]:
    """Decorator: daftarkan detektor untuk satu kode analisa."""

    def deco(fn: DetectorFn) -> DetectorFn:
        if code in _REGISTRY:
            raise ValueError(f"detektor '{code}' sudah terdaftar")
        _REGISTRY[code] = fn
        return fn

    return deco


def get(code: str) -> DetectorFn | None:
    return _REGISTRY.get(code)


def registered_codes() -> list[str]:
    return sorted(_REGISTRY)
