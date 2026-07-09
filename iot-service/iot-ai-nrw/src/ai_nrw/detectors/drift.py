"""A10 — drift lambat (CUSUM ter-standarisasi, gaya Page-Hinkley). Pure stdlib, STATEFUL.

Menangkap pergeseran mean PERLAHAN yang lolos dari ambang statis & sustained — sinyal
kunci **kebocoran merambat** (tekanan turun sedikit demi sedikit selama berjam-jam/berhari).
Ekuivalen River PageHinkley/ADWIN, tapi di-hand-code agar tanpa dependensi & bisa diuji offline.

STATEFUL: state (mean, scale, g_hi, g_lo, n, last_ts) persist di `ai_baseline.online_state`
dan DIMUTASI in-place lewat `ctx.baseline.state_for("A10_drift")`. Idempoten lintas siklus
karena hanya melipat titik dgn `ts > state.last_ts` (window ingest saling tumpang-tindih).

Standarisasi: residual z = (x - mean) / scale membuat delta/lambda seragam antar sensor
(satuan sigma), jadi TAK perlu tuning per-channel. Ref: dok 07 §2 (A10), dok tekanan §2.
"""

from __future__ import annotations

from datetime import datetime

from ai_nrw.detectors.base import WARNING, DetectionContext, Sample, Signal
from ai_nrw.detectors.registry import register

A10 = "A10_drift"

_MEAN_UP = "Tren naik perlahan (drift) — pergeseran menetap di atas normal."
_MEAN_DOWN = "Tren turun perlahan (drift) — indikasi kebocoran merambat / suplai menurun."


def _fresh_state() -> dict:
    return {"n": 0, "mean": 0.0, "scale": 0.0, "g_hi": 0.0, "g_lo": 0.0, "last_ts": None}


def _parse_ts(v) -> datetime | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v
    return datetime.fromisoformat(v)


def update_drift(
    state: dict,
    samples: list[Sample],
    *,
    delta: float = 0.5,
    lambda_: float = 5.0,
    lr: float = 0.02,
    min_instances: int = 30,
    scale_floor: float = 1e-6,
) -> tuple[str | None, Sample | None]:
    """Lipat titik baru (ts > state.last_ts) ke CUSUM. MUTASI `state`.

    Return (direction, sample) saat alarm ('up'/'down'), else (None, None). Alarm mereset
    akumulator sisi terkait agar tak spam tiap siklus. `scale` = EWMA |residual| (≈ MAD).
    """
    last_ts = _parse_ts(state.get("last_ts"))
    fired: tuple[str | None, Sample | None] = (None, None)

    for s in samples:
        if s.value is None:
            continue
        if last_ts is not None and s.ts <= last_ts:
            continue  # sudah dilipat di siklus lalu → jaga idempoten
        last_ts = s.ts
        x = float(s.value)
        n = state["n"]

        if n == 0:  # cold start: tanam mean, belum ada skala
            state["mean"] = x
            state["scale"] = 0.0
            state["n"] = 1
            continue

        mean = state["mean"]
        residual = x - mean

        if n < min_instances:
            # WARMUP: estimasi mean & skala kumulatif (stabil, bebas param). BELUM
            # akumulasi CUSUM — cegah false alarm dari skala mentah (z meledak saat scale≈0).
            state["mean"] = mean + residual / (n + 1)
            state["scale"] = state["scale"] + (abs(residual) - state["scale"]) / n
            state["n"] = n + 1
            continue

        # STEADY: z ter-standarisasi → CUSUM dua sisi (satuan sigma, seragam antar sensor)
        scale = max(state["scale"], scale_floor)
        z = residual / scale
        g_hi = max(0.0, state["g_hi"] + z - delta)
        g_lo = max(0.0, state["g_lo"] - z - delta)

        if g_hi > lambda_:
            fired = ("up", s)
            g_hi = 0.0
        elif g_lo > lambda_:
            fired = ("down", s)
            g_lo = 0.0

        # adaptasi level & skala PELAN (lr kecil) agar drift sempat terakumulasi dulu
        state["mean"] = mean + lr * residual
        state["scale"] = (1 - lr) * state["scale"] + lr * abs(residual)
        state["g_hi"] = g_hi
        state["g_lo"] = g_lo
        state["n"] = n + 1

    if last_ts is not None:
        state["last_ts"] = last_ts.isoformat()
    return fired


@register(A10)
def _det_a10(ctx: DetectionContext) -> list[Signal]:
    bl = ctx.baseline
    if bl is None:
        return []  # butuh bundle utk simpan state; cycle menyuntik saat A10 ON
    state = bl.state_for(A10)
    if not state:
        state.update(_fresh_state())

    direction, sample = update_drift(
        state,
        ctx.samples,
        delta=float(ctx.params.get("delta", 0.5)),
        lambda_=float(ctx.params.get("lambda", 5.0)),
        lr=float(ctx.params.get("lr", 0.02)),
        min_instances=int(ctx.params.get("min_instances", 30)),
    )
    if direction is None or sample is None:
        return []

    meaning = _MEAN_UP if direction == "up" else _MEAN_DOWN
    return [
        Signal(
            A10, WARNING, sample.ts, sample.value, meaning,
            {"direction": direction, "mean": round(state["mean"], 4), "n": state["n"]},
        )
    ]
