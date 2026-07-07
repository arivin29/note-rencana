"""Registry kategori metric. Import submodul = registrasi (side-effect).

Menambah kategori: buat `categories/<x>.py` + `register_category(...)`, lalu import di
bawah. Pipeline tak berubah. API: for_group(group_name) -> Category | None.
"""

from ai_nrw.categories.base import Category, all_categories, for_group, register_category

# import submodul agar register_category(...) tereksekusi
from ai_nrw.categories import (  # noqa: E402,F401
    flow,
    level,
    power,
    pressure,
    volume,
)

__all__ = ["Category", "for_group", "all_categories", "register_category"]
