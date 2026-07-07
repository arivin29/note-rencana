# Peta Tool / Library Open-Source (untuk AI-NRW)

> Kebutuhan kita **sudah banyak jawaban open-source-nya** — tidak perlu bikin dari
> nol. Dokumen ini memetakan **tiap kebutuhan → library OSS yang cocok**, dengan
> catatan bobot resource (ingat target **2 vCPU / 2 GB**, 170 channel, opt-in).

## 1. Pemetaan kebutuhan → library

| Kebutuhan (desain kita) | Library OSS | Lisensi/bobot | Kenapa cocok |
|-------------------------|-------------|---------------|--------------|
| **A10 CUSUM/EWMA/drift** (bocor lambat) ⭐ | **River** — `drift.PageHinkley` (≈CUSUM), `drift.ADWIN`, `drift.KSWIN`, `anomaly.*` | ringan, online | **persis A10**; O(1) streaming, selaras prinsip micro-batch/inkremental |
| Rule-based A1–A8 (threshold, level-shift, volatility, flatline, persist, seasonal) | **ADTK** (Anomaly Detection Toolkit) | ringan | detektor siap: `ThresholdAD`, `QuantileAD`, `LevelShiftAD`, `VolatilityAD`, `PersistAD`, `SeasonalAD`, pipeline — pragmatis & explainable |
| A9 z-score / **S-H-ESD** | ADTK `GeneralizedESDTestAD` (=S-H-ESD), statsmodels STL + ESD | ringan | standar residual musiman |
| **Change-point / onset burst** (perkuat A4) | **ruptures** (offline: PELT/BinSeg/Window), **changefinder** (online) | ringan | standar deteksi perubahan mendadak |
| **Matrix Profile** (anomali pola, Tier-2) | **stumpy** | sedang | efisien (STOMP/SCRIMP), maintained, explainable (discord) |
| Baseline musiman / **STL** / dekomposisi | **statsmodels** (STL, ETS, SARIMAX), StatsForecast `MSTL` | ringan | fondasi; grid median/MAD kita cukup numpy/Polars |
| **Forecast** HW/ARIMA/ETS (Tier-1, 30 hari) | **StatsForecast (Nixtla)** — AutoARIMA/AutoETS/AutoTheta/AutoTBATS | **ringan & cepat** (20× > pmdarima) | ideal untuk banyak channel di 2c/2g |
| Forecast + **libur** | **Prophet** | sedang | multi-musim + holiday regressor (Idul Fitri dll) |
| Forecast **LSTM/NBEATS/TFT** (Tier-2, channel bernilai tinggi) | **NeuralForecast (Nixtla)** | berat | hanya bila terbukti untung (literatur: unggul jangka panjang) |
| Anomali ML multivariat (IsolationForest/LOF/OCSVM) | **PyOD** (60+ detektor, 46 jt+ unduhan) | sedang | untuk A-ML & L2 multivariat |
| Framework all-in-one (forecast+anomaly+**backtest**) | **Merlion** (Salesforce), **Darts** | berat | bagus untuk **evaluasi/benchmark** & prototipe, bukan core runtime |
| **Domain air / EPANET / DMA / leak** (L2–L3) | **WNTR** (USEPA/Sandia, BSD) | sedang | simulasi hidraulik, model kebocoran, DMA, skenario what-if & data leak berlabel |
| Data proses hemat memori | **Polars**, **DuckDB**, numpy | ringan | pengganti pandas (loop lama) |

## 2. Rekomendasi stack (hemat, 2 vCPU / 2 GB)

**Core (dipakai untuk 170 channel — semua ringan):**
- **River** → statistik online + **A10** (Page-Hinkley/ADWIN) + drift.
- **ADTK** → detektor rule-based A1–A9 siap pakai (atau hand-code yang trivial).
- **StatsForecast (Nixtla)** → forecast HW/ARIMA/ETS (Tier-1, 30 hari).
- **statsmodels** + **numpy/Polars/DuckDB** → baseline/STL + proses data.

**Opt-in / Tier-2 (hanya channel bernilai tinggi, dijadwal jarang):**
- **stumpy** (Matrix Profile), **PyOD** (IsolationForest), **Prophet** (libur),
  **NeuralForecast** (LSTM/NBEATS).

**Domain & validasi (Layer 2–3 nanti):**
- **WNTR** untuk hidraulik/DMA/leak-scenario & **what-if pressure management**.
- **Merlion/Darts** untuk **backtesting & metrik** (RMSE/MAPE, precision/recall).
- Dataset uji berlabel: **BattLeDIM / LeakDB** (benchmark kebocoran) untuk validasi §9b.

> Prinsip: **core = library ringan online/statistik** (River+StatsForecast+ADTK) →
> sudah menutup A1–A10 + forecast dengan biaya kecil. Model berat (stumpy/PyOD/
> NeuralForecast/Prophet/Darts/Merlion/WNTR) **opt-in** sesuai nilai channel.

## 3. Catatan kecocokan
- **River** sangat pas dengan arsitektur kita (micro-batch 2-menit, inkremental,
  O(1)) — dan `PageHinkley` = implementasi standar dari A10 yang baru kita tambah.
- **StatsForecast** ringan & cepat → forecast 170 channel muat di 2c/2g; hindari
  Prophet/Neural untuk massal (berat), pakai hanya per-channel terpilih.
- **ADTK** menghemat kode A1–A9, tapi detektor sesederhana range/rate/flatline
  tetap bisa hand-code bila ingin dependensi minimal.
- **WNTR** bukan untuk deteksi per-channel; nilainya di **Layer 2–3** (DMA, MNF,
  FAVAD/pressure-management, simulasi & data berlabel).
- Referensi kurasi: *awesome-TS-anomaly-detection*, *awesome-time-series*.

## Sumber
- Awesome TS anomaly detection (kurasi tool): <https://github.com/rob-med/awesome-TS-anomaly-detection>
- ADTK: <https://adtk.readthedocs.io/en/stable/>
- PyOD: <https://github.com/yzhao062/pyod>
- Darts (forecast+anomaly): <https://github.com/unit8co/darts>
- STUMPY (Matrix Profile): dokumentasi resmi stumpy
- StatsForecast (Nixtla): <https://github.com/Nixtla/statsforecast>
- River (online ML + drift Page-Hinkley/ADWIN): <https://riverml.xyz/dev/introduction/getting-started/concept-drift-detection/>
- ruptures (change-point): repo `deepcharles/ruptures`
- WNTR (EPANET, air): <https://github.com/USEPA/WNTR>
- Kerangka NRW berbasis AI (studi kasus): <https://arxiv.org/pdf/2606.15709>
