# AI-NRW — Modul Analitik Cerdas untuk PDAM

Modul **baru & mandiri** (AI/ML berbasis Python) untuk membantu PDAM menekan
**NRW (Non-Revenue Water)** lewat monitoring cerdas, deteksi anomali, forecasting,
dan early-warning yang **actionable** (dapat ditindaklanjuti + dampak Rupiah).

> Status: **fase desain**. Dokumen di folder ini **belum** terikat ke kode atau
> skema database yang berjalan sekarang. Ini rancangan service baru dari nol.
> Referensi: versi lama pernah dibuat berbasis AI Python (analisa + anomali + forecast).

## Seri Dokumen (rencana)

| # | Dokumen | Isi | Status |
|---|---------|-----|--------|
| 01 | [`01-analisa-kebutuhan.md`](./01-analisa-kebutuhan.md) | Analisa kebutuhan PDAM: aktor, keputusan, pilar analitik (anomali/forecast/warning), use-case, input/output, non-functional | ✅ draft |
| 02 | [`02-model-berlapis.md`](./02-model-berlapis.md) | Model analitik **berlapis** (L1 per channel → L2 kombinasi → L3 DMA → …) + **spesifikasi Layer 1 per sensor channel** (formalisasi & generalisasi sistem Python lama) + pembagian kerja | ✅ draft |
| 03 | [`03-kebutuhan-teknis-nonfungsional.md`](./03-kebutuhan-teknis-nonfungsional.md) | Kebutuhan inti: **configurability**, **performance & hemat resource** (sizing nyata, inkremental, push-down), **kerangka pemilihan tool** | ✅ draft |
| 04 | [`04-katalog-analisa-dan-konfigurasi.md`](./04-katalog-analisa-dan-konfigurasi.md) | **Katalog analisa per target** (sensor channel **& node**) + **model konfigurasi** (opt-in default OFF, enable/disable & params per target, preset, PostgreSQL berversi) | ✅ draft |
| 05 | [`05-arsitektur.md`](./05-arsitektur.md) | Arsitektur worker Python, **siklus micro-batch**, **cadence (default 5 menit)**, integrasi shared-DB, **scaling 11 tenant → ~200 PDAM** | ✅ draft |
| 06 | [`06-model-data.md`](./06-model-data.md) | Skema **konkret** 6 tabel `ai_*` (config, baseline, event, event_log, forecast, recurrence) + config store berversi | ✅ draft |
| 07 | [`07-metode-ml.md`](./07-metode-ml.md) | **Keputusan resmi tool/metode per detektor** (hand-code vs River/ADTK/StatsForecast/statsmodels), training/retraining/cold-start/drift, evaluasi, kontrak tool-agnostic, footprint dependensi | ✅ draft |
| 08 | [`08-kontrak-api.md`](./08-kontrak-api.md) | Endpoint Go → Angular (configs/events/forecast/analytics/recurrence/presets) memakai **envelope platform baku**; peta 4 layar → endpoint | ✅ draft |
| 09 | [`09-roadmap.md`](./09-roadmap.md) | Fase **P0–P3** (pondasi+MVP tekanan → tekanan cerdas LOCKED → kategori lain → layer/skala) + KPI; **kategori lain DITAHAN sampai P1 exit** | ✅ draft |

Urutan baca: **01 (kenapa & apa) → 02 (berlapis, mulai Layer 1) → 03 (configurable,
efisien, tool) → 04 (katalog analisa + config per target) → 05 (arsitektur & scaling) →
06 (model data) → 07 (metode/tool) → 08 (kontrak API) → 09 (roadmap)**.
Seri **01–09 lengkap**; kategori pertama (**Tekanan**) LOCKED sebagai pondasi/template.

## Referensi Silang
- [`tooling-opensource.md`](./tooling-opensource.md) — peta **library open-source**
  per kebutuhan (River, ADTK, StatsForecast, PyOD, stumpy, WNTR, dll) + rekomendasi
  stack hemat resource. Jangan bikin dari nol.

## Detail per Kategori Metric (Layer A, dibahas satu per satu)

| Kategori | Dokumen | Status |
|----------|---------|--------|
| **Tekanan** | [`kategori/tekanan.md`](./kategori/tekanan.md) — baseline, ambang adaptif, forecasting (estimasi max/min/rata-rata), indikasi A1–A10 + arti PDAM + rumus, **§11 end-to-end (proses→store→lifecycle→view) = TEMPLATE semua kategori** · [review vs standar](./kategori/tekanan-review-standar.md) | ✅ **LOCKED** |
| Debit/Aliran | `kategori/debit.md` (+ MNF, pencurian, burst) | ⬜ berikutnya |
| Level | `kategori/level.md` (+ forecast kosong/luap) | ⬜ |
| Volume | `kategori/volume.md` (totalizer/delta) | ⬜ |
| Kualitas Air | `kategori/kualitas-air.md` | ⬜ |
| Listrik/Pompa | `kategori/listrik-pompa.md` (cyclic, degradasi) | ⬜ |
| Suhu / Diff-Pressure / Lainnya | `kategori/…` | ⬜ |
