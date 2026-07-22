"""active_schedule — jam aktif channel + kalender libur (mode relaxed). Pure stdlib.

Kasus nyata (dok 06 §2, dok tekanan §11.1): banyak jaringan PDAM "nyala 20 jam" —
pompa dimatikan dini hari. Saat jam mati, tekanan nol/datar itu NORMAL; tanpa jadwal,
A1 (nol dianggap invalid), A2 (low sustained), dan A5 (flatline) berbunyi TIAP malam
dan operator belajar mengabaikan alarm — alarm fatigue, kebalikan tujuan sistem.

Dua mekanisme, keduanya per-channel lewat baris ai_config `analysis_type='active_schedule'`:
  - `windows` jam aktif (tz-aware) → di LUAR jendela, kode di `suppress_off` dibungkam.
  - `holidays` (tanggal ISO, atau "MM-DD" berulang tiap tahun) → mode RELAXED: detektor
    ADAPTIF (yang membandingkan ke kebiasaan) dibungkam karena pola demand hari besar
    memang beda — Idul Fitri bukan anomali. Ambang statis batas layanan (A2/A3/A8)
    TETAP jalan: batas fisik layanan tak ikut libur.

Bukan detektor (tak menghasilkan Signal, tak didaftarkan ke registry) — engine memanggil
`evaluate()` sebelum dispatch untuk menentukan kode yang dibungkam siklus ini.
Ref: dok 05 §3 (langkah 3a), dok 07 §3 (kalender libur), tekanan-review-standar §46.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

ACTIVE_SCHEDULE = "active_schedule"

DEFAULT_TZ = "Asia/Jakarta"

# Jam mati → nilai nol/datar normal (dok tekanan §11.1 langkah 3).
DEFAULT_SUPPRESS_OFF = ("A1_invalid", "A2_low", "A5_flatline")

# Hari libur → pola demand berubah drastis; bungkam pembanding-kebiasaan saja.
DEFAULT_RELAX_HOLIDAY = ("A6_noise", "A9_deviation", "A10_drift", "night_pressure")


@dataclass(frozen=True)
class ScheduleState:
    """Hasil evaluasi jadwal untuk SATU siklus — engine hanya butuh `suppressed`."""

    off_hours: bool = False
    holiday: bool = False
    suppressed: frozenset[str] = field(default_factory=frozenset)


ALWAYS_ON = ScheduleState()


def _as_list(v: Any) -> list[str]:
    """Terima list ATAU string ber-koma — input teks UI menyimpan array sebagai string."""
    if v is None:
        return []
    if isinstance(v, str):
        v = v.split(",")
    return [s.strip() for s in v if str(s).strip()]


def _minute(hhmm: str) -> int:
    """'HH:MM' → menit-dalam-hari. '24:00' sah sebagai akhir jendela (=1440)."""
    h, m = hhmm.strip().split(":")
    return int(h) * 60 + int(m)


def parse_windows(raw: Any) -> list[tuple[int, int]]:
    """['04:00-24:00', '22:00-06:00'] → [(240,1440), (1320,360)]. Entri rusak dilewati.

    start == end diartikan jendela kosong (bukan 24 jam) dan dibuang — kalau maunya
    selalu aktif, tulis '00:00-24:00' atau kosongkan windows sama sekali.
    """
    out: list[tuple[int, int]] = []
    for w in _as_list(raw):
        try:
            a, b = w.split("-")
            start, end = _minute(a), _minute(b)
        except (ValueError, IndexError):
            continue
        if start != end:
            out.append((start, end))
    return out


def in_windows(minute_of_day: int, windows: list[tuple[int, int]]) -> bool:
    """True bila menit lokal jatuh di salah satu jendela; start>end = lintas tengah malam."""
    for start, end in windows:
        if start < end:
            if start <= minute_of_day < end:
                return True
        else:  # mis. 22:00-06:00
            if minute_of_day >= start or minute_of_day < end:
                return True
    return False


def _localize(now: datetime, tz_name: str) -> datetime:
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    try:
        return now.astimezone(ZoneInfo(tz_name))
    except (KeyError, ValueError, OSError):
        return now.astimezone(timezone.utc)  # tz salah ketik → jangan matikan deteksi


def is_holiday(local: datetime, holidays: list[str]) -> bool:
    """'2026-03-31' cocok tanggal persis; '12-25' berulang tiap tahun."""
    iso = local.date().isoformat()
    mmdd = f"{local.month:02d}-{local.day:02d}"
    for h in holidays:
        h = h.strip()
        if h == iso or (len(h) == 5 and h == mmdd):
            return True
    return False


def evaluate(params: dict[str, Any] | None, now: datetime) -> ScheduleState:
    """Status jadwal channel pada `now` (UTC). Tanpa baris active_schedule → selalu aktif.

    `windows` kosong = channel 24 jam (hanya logika libur yang bekerja).
    """
    if not params:
        return ALWAYS_ON

    local = _localize(now, str(params.get("tz", DEFAULT_TZ)))

    windows = parse_windows(params.get("windows"))
    off = bool(windows) and not in_windows(local.hour * 60 + local.minute, windows)

    holiday = is_holiday(local, _as_list(params.get("holidays")))

    suppressed: set[str] = set()
    if off:
        suppressed.update(_as_list(params.get("suppress_off")) or DEFAULT_SUPPRESS_OFF)
    if holiday:
        suppressed.update(_as_list(params.get("relax_holiday")) or DEFAULT_RELAX_HOLIDAY)
    return ScheduleState(off_hours=off, holiday=holiday, suppressed=frozenset(suppressed))
