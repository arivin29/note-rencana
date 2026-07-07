# 07 — Metode & Tool (Keputusan Resmi per Kebutuhan)

> Mengunci **tool/metode konkret** untuk tiap detektor & forecaster, lengkap dengan
> **training / retraining / cold-start / drift / evaluasi**. Kelanjutan dari
> [`03`](./03-kebutuhan-teknis-nonfungsional.md) (kriteria), [`tooling-opensource.md`](./tooling-opensource.md)
> (survei OSS), dan [`kategori/tekanan.md`](./kategori/tekanan.md) (A1–A10 sebagai template).
>
> Prinsip pengunci (dok 03): **cheapest-thing-that-works, bertingkat**. Detektor sepele
> **hand-code** (nol dependensi, explainable); pakai library **hanya di mana ia benar-benar
> menambah nilai** (A10 drift, forecast, STL, ML Tier-2). Semua muat **2 vCPU / 2 GB**.

---

## 1. Filosofi keputusan: hand-code vs library

| Pilih **hand-code** bila… | Pilih **library** bila… |
|---------------------------|--------------------------|
| logikanya threshold/durasi/timestamp trivial | metodenya berstandar & mudah salah tulis (CUSUM, ARIMA, STL) |
| butuh explainable & dependensi minimal | butuh optimasi/kematangan (kecepatan, edge-case) |
| mis. A1, A2, A3, A5, A7, A8 | mis. A10 (River), forecast (StatsForecast), baseline lanjut (statsmodels) |

> Bukan "sebanyak mungkin library". Library yang matang menghemat bug di **matematika**;
> logika **domain PDAM & lifecycle** tetap kita (dok 05/06). Reuse ≈ 70% matematika,
> 30% domain kita bangun.

---

## 2. KEPUTUSAN RESMI — detektor A1–A10 (channel)

| Kode | Kebutuhan | **Keputusan** | Tier | Kenapa |
|------|-----------|---------------|:----:|--------|
| **A1** | invalid/negatif/null → sensor rusak | **hand-code** (cek `<0`/null) | core | trivial, per-titik O(1) |
| **A2** | low sustained | **hand-code** (threshold + `sustain_T`) | core | logika durasi sederhana |
| **A3** | high sustained | **hand-code** | core | sama A2 |
| **A4** | spike / rate + onset burst | **hand-code rate** (fast-path) **+ River `drift.PageHinkley`** (konfirmasi change-point) | core | rate murah; PageHinkley tahan-noise (standar) |
| **A5** | flatline / stuck | **hand-code** (`span < eps` N sampel) | core | trivial |
| **A6** | erratic / noise | **ADTK `VolatilityAD`** *atau* hand-code rasio std | core | ADTK ringan & teruji; hand-code juga cukup |
| **A7** | no-data | **hand-code** (`now − last_ts`) | core | timestamp saja |
| **A8** | persistent out-of-range | **hand-code** (window penuh di luar band) | core | agregasi window |
| **A9** | deviasi baseline (z-score robust) | **hand-code** (`z=(x−median)/σ`, σ dari MAD) — opsi **ADTK `GeneralizedESDTestAD`** (=S-H-ESD) untuk channel bernilai | core | median/MAD kita sudah punya; ESD bila mau standar musiman |
| **A10** ⭐ | drift / bocor lambat (CUSUM+EWMA) | **River `drift.PageHinkley` + `drift.ADWIN`**; EWMA hand-code | core | **inti reuse**: PageHinkley = CUSUM standar, O(1) online, cocok micro-batch |

**Catatan A10 (bintang):** River `PageHinkley` ≈ CUSUM satu/dua-sisi siap pakai;
`ADWIN` mendeteksi perubahan distribusi (window adaptif). EWMA (`z_t=λr_t+(1−λ)z_{t-1}`)
cukup 3 baris numpy. Ketiganya jalan pada **residual ter-deseasonalisasi** `r_t = x_t − median_s`.

**Domain tekanan (§5.11 night pressure / FAVAD):** **hand-code** + **statsmodels** untuk
regresi robust slope tren malam. FAVAD/N1 = rumus (`Leakage ∝ P^N1`), hand-code di L2.

---

## 3. Baseline musiman

| Kebutuhan | Keputusan | Tier |
|-----------|-----------|:----:|
| Grid median/MAD per slot (default 170 channel) | **numpy / Polars** (agregasi), **push-down SQL ClickHouse** untuk agregat | core |
| Baseline lanjut (trend+seasonal+libur) — channel bernilai | **statsmodels `STL`** / **StatsForecast `MSTL`** | Tier-1 (opt-in) |
| Kalender libur (mode relaxed) | **hand-code** daftar tanggal + flag; Prophet holidays bila Tier-2 | core |

Grid = **default murah**; STL hanya saat channel di-enable Tier-1 (dok tekanan §2).

---

## 4. Forecasting (horizon default 30 hari)

| Tier | Metode | **Tool** | Kapan |
|:----:|--------|----------|-------|
| **Tier-0** | seasonal replay (baca baseline) | **hand-code** (numpy) | default, pola stabil |
| **Tier-1** | trend-adjusted HW/ETS/ARIMA | **StatsForecast** `AutoETS`/`AutoARIMA`/`SeasonalNaive` | **auto saat horizon ≥14 hari** (dok tekanan §4.4) |
| **Tier-2** | LSTM/NBEATS/TFT | **NeuralForecast** | hanya channel bernilai tinggi, terbukti untung |
| + libur | multi-musim + holiday | **Prophet** | opsional, channel dengan pola libur kuat |

**StatsForecast = pilihan utama** (20× lebih cepat dari pmdarima, ringan → muat forecast
banyak channel di 2c/2g). Forecast dijalankan **1×/hari** (job terpisah, dok 05 §4) →
tulis `ai_forecast.daily`. NeuralForecast/Prophet **default OFF** (berat).

---

## 5. Anomali ML & pola (Tier-2, opt-in)

| Kebutuhan | Tool | Kapan |
|-----------|------|-------|
| Anomali pola tak-terduga (discord) | **stumpy** (Matrix Profile) | channel bernilai, dijadwal jarang |
| Anomali ML (IsolationForest/LOF/OCSVM) | **PyOD** | multivariat / L2, channel terpilih |
| Change-point offline (audit histori) | **ruptures** (PELT) | analisa retrospektif, bukan runtime |

Semua **default OFF**. Dinyalakan per channel via `ai_config` bila statistik core kurang.

---

## 6. Domain air (Layer 2–3, nanti)

| Kebutuhan | Tool |
|-----------|------|
| Hidraulik / DMA / simulasi kebocoran / pressure-management | **WNTR** (USEPA/Sandia) |
| Dataset uji berlabel (validasi) | **BattLeDIM / LeakDB** |

WNTR bukan deteksi per-channel — nilainya di L2–L3 (MNF, FAVAD, what-if). Di luar lingkup L1.

---

## 7. Training / Retraining / Cold-start / Drift

| Aspek | Kebijakan |
|-------|-----------|
| **Baseline grid** | update **inkremental** tiap siklus + refresh penuh **harian** (rolling window `W=21 hari`). Bukan DELETE+rebuild (anti-pattern lama). |
| **State online (A10)** | update tiap siklus, **checkpoint ke `ai_baseline.online_state`** → worker stateless. |
| **Forecast** | **refit harian** (StatsForecast fit-per-run, tanpa model persist) → tak perlu model registry. |
| **Cold-start** | `ai_baseline.learn_ready=false` sampai coverage cukup → **A9/A10 di-gate** (tak alarm sebelum baseline matang). A1–A5/A7 tetap jalan (tak butuh baseline). |
| **Drift/perubahan rezim** | River `ADWIN` mendeteksi shift distribusi → picu **reset baseline** channel itu (hindari baseline basi setelah perubahan jaringan permanen, mis. valve baru). |
| **Retrain Tier-2** | terjadwal jarang (mingguan) + hanya bila metrik memburuk (§8). |
| **Model registry** | **DITUNDA** (MLflow/BentoML overkill) — StatsForecast/River tak butuh artifact persist. |

---

## 8. Evaluasi & Metrik (gerbang promosi)

Sebelum menaikkan detektor dari **pengingat (info)** → **alarm penuh** (dok tekanan §9b):

| Aspek | Metrik | Tool |
|-------|--------|------|
| Deteksi anomali | precision/recall atas event berlabel; **laju false-alarm/channel** | hand-code + **Merlion/Darts** (backtest) |
| Forecast | **RMSE/MAPE**, coverage interval (pita 95% ≈ 95%?) | StatsForecast utils / hand-code |
| Tuning | metrik → auto-tune `k, λ, h` per channel | loop offline |

- **Backtesting** di data historis sebelum aktif produksi (Merlion/Darts untuk prototipe/benchmark, **bukan** runtime).
- Metrik disimpan di `ai_forecast.metrics` & log per-channel → dasar promosi & auto-tuning.

---

## 9. Antarmuka tool-agnostic (agar bisa ganti tool)

Supaya besok bisa swap tool (mis. StatsForecast→NeuralForecast) tanpa bongkar pipeline,
komponen dibungkus **kontrak stabil** (dok 03 prinsip):

```python
# Detector: konsumsi titik/window → sinyal (kode detektor + severity + konteks)
class Detector(Protocol):
    def update(self, point, baseline, state) -> list[Signal]: ...

# Forecaster: fit deret → forecast harian (dipakai job harian)
class Forecaster(Protocol):
    def fit_predict(self, series, horizon_days) -> list[DailyForecast]: ...
```

- A1–A10 = implementasi `Detector` (hand-code / River / ADTK di baliknya — dipilih via config `params`).
- Tier-0/1/2 forecast = implementasi `Forecaster` (numpy / StatsForecast / NeuralForecast).
- **Pemilihan tool = konfigurasi**, bukan hard-wire → sejalan `ai_config.params`.

---

## 10. Footprint dependensi (semua muat 2c/2g)

**Core (wajib, ringan):**
```
river            # A10 drift (PageHinkley/ADWIN) + statistik online
statsforecast    # forecast Tier-1 (AutoETS/AutoARIMA)
statsmodels      # STL (Tier-1), regresi robust (night trend)
adtk             # A6/A9 opsional (VolatilityAD, ESD)
polars, duckdb, numpy   # ingest & agregasi hemat memori
clickhouse-driver, psycopg   # I/O
apscheduler      # penjadwalan in-proc
```

**Opt-in / Tier-2 (install terpisah, hanya bila dipakai):**
```
neuralforecast, prophet   # forecast berat
pyod, stumpy              # anomali ML / matrix profile
ruptures                  # change-point offline (audit)
wntr                      # domain air L2–L3 (nanti)
merlion / darts           # backtest/benchmark (dev, bukan runtime)
```

Core stack cukup untuk **A1–A10 + forecast 170 channel** dengan biaya kecil. Berat = opt-in.

---

## 11. Ringkas keputusan (dok 07)
1. **A1–A5, A7, A8 = hand-code** (trivial, explainable, nol dependensi).
2. **A10 = River** (`PageHinkley`/`ADWIN`) + EWMA hand-code — **inti reuse**, O(1) online.
3. **A4** = rate hand-code + **River change-point** konfirmasi; **A6/A9** hand-code (opsi **ADTK**).
4. **Baseline** = numpy/Polars + push-down SQL; **STL (statsmodels)** hanya Tier-1 opt-in.
5. **Forecast** = **StatsForecast** (Tier-1, harian, refit-per-run); Neural/Prophet Tier-2 OFF.
6. **Tier-2** (stumpy/PyOD) & **domain** (WNTR) opt-in, di luar core.
7. **Stateless via checkpoint**, **cold-start gating** (`learn_ready`), **drift→ADWIN reset**.
8. **Tool dipilih via config** di balik kontrak `Detector`/`Forecaster` → **bisa diganti** tanpa bongkar pipeline.
9. **Model registry DITUNDA** — core tak butuh artifact persist.

> Endpoint yang mengekspos hasil (event/forecast/config) ke Go/Angular → **dok 08**.
> Fase implementasi & KPI → **dok 09**.
