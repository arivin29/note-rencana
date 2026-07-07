# Review Mendalam: Analisa Tekanan vs Standar Industri

> Membandingkan desain kita (`kategori/tekanan.md`) dengan **standar umum**:
> (a) deteksi anomali/burst di jaringan air, (b) SPC/time-series anomaly, (c)
> forecasting air, (d) domain kebocoran (MNF/FAVAD). Lalu rekomendasi **model yang
> lebih baik** — tetap dengan prinsip hemat resource (bertingkat).

## 1. Standar yang dijadikan acuan (dari literatur)

| Bidang | Standar/metode umum |
|--------|---------------------|
| Deteksi burst tekanan (WDN) | **SPC**: Shewhart, **CUSUM**, **EWMA**; **change-point detection**; multivariat: Hotelling T², MCUSUM/MEWMA |
| Anomali time-series musiman | **STL decomposition + residual**, **S-H-ESD**, **EWMA-STR** (EWMA of season-trend residuals — tangkap shift *gradual & abrupt*), **Matrix Profile** |
| Forecasting air | **Holt-Winters / SARIMA** (pendek–menengah), **LSTM/hybrid** (jangka panjang), Prophet (musiman+libur) |
| Domain kebocoran | **MNF** (02–04) + water balance; **FAVAD** law: `Leakage ∝ Pressure^N1`, N1 0.5 (pipa kaku) → 1.5 (plastik); average night pressure |

## 2. Benchmark: desain kita vs standar

| Kapabilitas | Standar umum | Desain kita sekarang | Verdikt |
|-------------|--------------|----------------------|---------|
| Baseline musiman | STL/Prophet (trend+seasonal), profil harian×mingguan | Grid median/MAD per (hari, slot) + smoothing | ✅ Selaras (robust), tapi lookup-grid, tak pisahkan trend, **tanpa kalender libur** |
| Ambang | k·σ / control limits | k·σ adaptif (A2/A3) | ✅ Selaras |
| Anomali titik | z-score / ESD | A9 z-score robust | ✅ Selaras (bentuk paling sederhana) |
| **Drift kecil/lambat (bocor berkembang)** | **CUSUM / EWMA / EWMA-STR** | *(tidak ada)* — z-score lewatkan shift kecil menahun | ❌ **GAP terbesar** |
| **Onset burst (perubahan mendadak)** | **CUSUM change-point / Shewhart** | A4 = beda-pertama `|Δx|>limit` (kasar, sensitif noise) | ⚠️ Perlu diperkuat |
| Libur/kejadian khusus | kalender libur (Prophet) | tidak ada → risiko alarm palsu saat Idul Fitri dll | ❌ Gap |
| Forecast 30 hari | HW/SARIMA (pendek-menengah), LSTM (panjang) | Tier-0 replay, Tier-1 HW/ETS | ✅ Arah benar; untuk 30 hari perlu SARIMA/LSTM di channel bernilai tinggi |
| Anomali kompleks/pola | **Matrix Profile**, autoencoder/LSTM | tidak ada | ⚠️ Opsi Tier-2 belum |
| Kuantifikasi bocor dari tekanan | **FAVAD/N1** (pressure↔leak) | night-pressure indikatif, belum pakai hukum FAVAD | ⚠️ Perkuat di L2 |
| Validasi model | precision/recall berlabel, RMSE/MAPE, backtest | tidak ada | ❌ Gap |
| Anti-noise (debounce/hysteresis) | WEC rules, dwell time | ada | ✅ Selaras |

## 3. Rekomendasi model yang lebih baik (prioritas)

### P0 — WAJIB, murah, dampak tinggi
1. **Tambah detektor A10 — CUSUM/EWMA pada residual ter-deseasonalisasi**
   (deteksi **bocor lambat / drift kecil menahun** yang lolos z-score). Ini gap
   terbesar & justru paling relevan untuk NRW. Online, O(1) memori, sangat hemat.
   - Residual `r_t = x_t − median_s` (deseasonalized).
   - **EWMA**: `z_t = λ·r_t + (1−λ)·z_{t-1}`; alarm jika `|z_t| > L·σ_z`.
   - **CUSUM dua sisi**: `S⁺=max(0,S⁺+r_t−κ)`, `S⁻=min(0,S⁻+r_t+κ)`; alarm jika `S⁺>h` atau `S⁻<−h`.
   - Setara **EWMA-STR** (standar) → tangkap shift gradual *dan* abrupt.
2. **Perkuat A4 (burst onset) dengan CUSUM change-point**, bukan hanya `|Δx|`.
   Rate cepat tetap sebagai fast-path; CUSUM sebagai konfirmasi tahan-noise.
3. **Kalender libur** (hari besar Indonesia) → tekan alarm palsu saat pola demand
   berubah drastis (Idul Fitri, tahun baru). Cukup daftar tanggal + mode "relaxed".

### P1 — untuk channel bernilai tinggi (opt-in, Tier-1/2)
4. **Baseline STL / Prophet-class** (pisahkan trend+seasonal+libur) menggantikan
   grid untuk channel penting; grid tetap default murah 170 channel.
5. **Forecast SARIMA (AutoARIMA) / hybrid** untuk horizon 30 hari yang butuh akurasi;
   **LSTM/global model** hanya jika terbukti untung (literatur: LSTM unggul jangka panjang).
   Implementasi hemat: **StatsForecast (AutoARIMA/AutoETS)**.
6. **Matrix Profile** (discord discovery) sebagai deteksi anomali pola tak-terduga —
   efisien (STOMP/SCRIMP), explainable.

### P2 — domain & tata-kelola
7. **FAVAD/N1 di Layer 2** (tekanan+debit): normalisasi kebocoran terhadap tekanan &
   estimasi penghematan pressure-management. `N1` configurable (0.5–1.5 per bahan pipa).
8. **Loop validasi**: lacak precision/recall (event berlabel), RMSE/MAPE forecast,
   laju false-alarm; **backtesting** sebelum menaikkan detektor jadi alarm penuh.

## 4. Prinsip tetap: hemat resource, bertingkat
- **Default 170 channel** = grid robust + **A10 CUSUM/EWMA** (semua O(1), murah) →
  sudah setara standar SPC tanpa beban.
- **Model berat (STL/Prophet/SARIMA/LSTM/Matrix Profile)** hanya untuk channel yang
  di-*enable* & bernilai tinggi (Tier-2), dijadwal jarang. Konsisten dgn 2 vCPU/2 GB.

## 5. Kesimpulan
Desain kita **fondasinya sudah selaras standar** (profil musiman robust + residual +
night-pressure). **Kelemahan utama tunggal**: tidak ada **CUSUM/EWMA** untuk drift
kecil/lambat — padahal itu tanda kebocoran berkembang & jadi standar de-facto burst/leak
detection. Menambah **A10 (CUSUM/EWMA-STR)** + memperkuat A4 dengan change-point +
kalender libur = lompatan kualitas terbesar dengan biaya minimal. Model berat (Prophet/
SARIMA/LSTM/Matrix Profile/FAVAD) disiapkan sebagai tingkat lanjut opt-in.

## Sumber
- Change-point burst localization: <https://arxiv.org/html/2407.09074>
- CUSUM & heuristik burst: <https://www.researchgate.net/publication/261801230_Detecting_pipe_bursts_using_Heuristic_and_CUSUM_methods>
- Data-driven anomaly & early warning WDS: <https://www.sciencedirect.com/science/article/abs/pii/S0959652622035491>
- EWMA-STR (EWMA of season-trend residuals): <https://ieeexplore.ieee.org/document/7729882/>
- Robust seasonal decomposition (RobustTAD): <https://arxiv.org/pdf/2008.09245>
- Time-series anomaly detection decade review (Matrix Profile/CUSUM/EWMA): <https://arxiv.org/html/2412.20512v1>
- Forecasting HW/ARIMA/LSTM/Prophet (air): <https://www.mdpi.com/2073-4441/16/13/1827>, <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5089067>
- ARIMA untuk variasi tekanan jaringan (Noja): <https://arxiv.org/pdf/2512.09717>
- MNF + FAVAD/N1: <https://www.mdpi.com/2073-4441/13/5/643>, <https://www.mdpi.com/2073-4441/14/13/2067>, <https://ewra.net/wuj/pdf/WUJ_2013_05_03.pdf>
