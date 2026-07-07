# 09 — Roadmap Implementasi & KPI

> Fase implementasi P0–P3, milestone, KPI keberhasilan. **Strategi inti: matangkan
> TEKANAN dulu sebagai pondasi end-to-end** (dok tekanan §11), baru kategori lain
> "isi kamus". **Kategori sensor lain DITAHAN** sampai pondasi tekanan terbukti jalan.

## Prinsip urutan
1. **Tekanan = reference implementation.** Selesaikan proses→store→lifecycle→view untuk
   tekanan sampai stabil di produksi (1 tenant pilot).
2. **Pondasi generik dulu, kamus belakangan.** Worker, 6 tabel `ai_*`, event lifecycle,
   4 layar → dibangun sekali, dipakai semua kategori.
3. **Opt-in bertahap.** Default OFF; nyalakan channel tekanan pilot dulu.
4. **Jangan sentuh kategori lain** (debit/level/volume/…) sebelum P2 — hindari premature
   generalization sebelum tekanan terbukti.

---

## P0 — Pondasi & MVP Tekanan (deteksi dasar)
**Tujuan:** satu channel tekanan pilot → event muncul di UI, bisa divalidasi.

Backend/worker:
- Skema 6 tabel `ai_*` (dok 06) + migrasi.
- Worker Python: Scheduler + Config Loader + Ingestor (baca ClickHouse borongan) +
  Checkpointer (dok 05). **Cadence 5 menit.**
- Baseline grid median/MAD inkremental (`ai_baseline`) + cold-start gating (`learnReady`).
- Detektor **core hand-code**: A1, A2, A3, A5, A7, A8 (dok 07 §2).
- Event Manager: buat/update/dedup/auto-close + `ai_event_log` (lifecycle dok tekanan §11.3).

Backend Go + UI:
- Endpoint `configs` (enable/disable + params) & `events` (list + validate) — dok 08.
- **AI Settings** (toggle + preset Tekanan) & **Event Inbox** (list aktif + 1-tap validasi).

**Exit P0:** channel tekanan pilot ON → A2/A3 low/high & A7 no-data muncul sebagai event,
operator bisa acknowledge/validasi. Footprint worker ≤ target.

---

## P1 — Tekanan "cerdas" (drift, forecast, analytics)
**Tujuan:** tekanan matang penuh — pondasi siap jadi template.

- Detektor **A4** (spike + River change-point), **A6** (noise), **A9** (z-score, pengingat),
  **A10** (River PageHinkley/ADWIN + EWMA — bocor lambat) — dok 07.
- **Night Pressure (§5.11)** + tren malam (statsmodels robust slope).
- **Forecast** Tier-0/1 (StatsForecast, harian) → `ai_forecast`; early-warning lewat-ambang.
- **Recurrence** job (pola kambuh-pulih) → `ai_recurrence` + escalation `recurrence_leak`.
- UI: **Event Detail** (kronologi + validasi/assign/close) & **Channel Analytics**
  (aktual + pita baseline + forecast + penanda event + panel night).
- `active_schedule` (kasus "nyala 20 jam") + kalender libur (mode relaxed).

**Exit P1:** **Tekanan LOCKED di produksi** — semua A1–A10 + forecast + lifecycle + 4 layar
jalan untuk channel tekanan pilot; metrik terpantau (§KPI). **Ini gerbang ke P2.**

---

## P2 — Generalisasi ke kategori lain (SETELAH tekanan terbukti) ⏸️
> **DITAHAN sampai P1 exit.** Baru di sini kategori lain disentuh — dan hanya "isi kamus"
> di atas pondasi yang sudah jalan (dok tekanan §11.5).

- Preset per kategori (dok 04 §8) diaktifkan satu per satu: **Debit/Aliran** dulu
  (MNF, pencurian, burst) → Level → Volume (totalizer/delta) → dst.
- Per kategori: hanya isi detektor mana ON + terjemahan arti + isi chart panel-d.
  **Tanpa** ubah worker/tabel/lifecycle/layar.
- Backtest & metrik per kategori (Merlion/Darts) sebelum promosi alarm penuh.
- Tier-2 opt-in (stumpy/PyOD) untuk channel bernilai tinggi bila statistik core kurang.

**Exit P2:** ≥2 kategori (mulai Debit) jalan lewat mekanisme "isi kamus" — membuktikan
pondasi benar-benar reusable.

---

## P3 — Layer atas & skala
- **Layer 2–3**: pasangan channel (burst signature tekanan+debit), **DMA/MNF/FAVAD**
  (WNTR), neraca air.
- **Katalog Node (B)** — diaktifkan saat sinyal perangkat tersedia (dok 04 §3, HOLD).
- **Scaling multi-worker** (shard per tenant, pisah pool forecast) → arah ~200 PDAM (dok 05 §6).
- Notifikasi push (queue) + routing (quiet hours, penerima).
- Auto-tuning param (`k,λ,h`) dari loop validasi.

---

## KPI Keberhasilan
| Kategori | Metrik | Target awal |
|----------|--------|-------------|
| **Kualitas deteksi** | false-alarm rate / channel / minggu | rendah & turun (operator percaya) |
| | precision/recall event berlabel | naik seiring feedback |
| **Nilai NRW** | lead-time early-warning (drift/night) sebelum manifest | sedini mungkin (hari–minggu) |
| | pola kambuh-pulih terdeteksi → tindak lanjut | terekam & di-escalate |
| **Forecast** | RMSE/MAPE, coverage interval 95% | MAPE wajar; coverage ≈ 95% |
| **Adopsi** | jumlah channel tekanan ON | tumbuh dari pilot |
| **Efisiensi** | footprint worker | ≤ 2 vCPU / 2 GB pada skala sekarang |
| | 1 siklus micro-batch semua channel ON | jauh di bawah cadence 5 menit |
| **Operasional** | % event tervalidasi (verdikt terisi) | tinggi → feedback loop hidup |
| | % auto-close (pulih sendiri) | terukur → alarm fatigue kecil |

---

## Ringkas keputusan (dok 09)
1. **Urutan: P0 pondasi+MVP tekanan → P1 tekanan cerdas (LOCKED) → P2 kategori lain → P3 layer atas/skala.**
2. **Kategori sensor lain DITAHAN sampai P1 exit** — hindari premature generalization.
3. P2 = **"isi kamus"** (Debit dulu) tanpa ubah pondasi.
4. KPI menekankan **kepercayaan operator** (false-alarm rendah, validasi terisi) + **nilai NRW**
   (lead-time, kambuh-pulih) + **efisiensi** (footprint, siklus < cadence).

> Seri dokumen desain **01–09 lengkap**. Detail per kategori (mulai Debit) dikerjakan di
> P2, di folder `kategori/`, mengikuti template `kategori/tekanan.md` §11.
