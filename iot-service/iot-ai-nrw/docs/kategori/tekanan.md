# Detail Kategori: TEKANAN (Pressure)

> Deep-dive analisa channel bertekanan: **baseline, ambang adaptif, forecasting
> (estimasi max/min/rata-rata beberapa hari ke depan), dan setiap indikasi anomali
> beserta ARTI operasional PDAM + rumus/logika perhitungannya.**
> Semua angka contoh = default preset; semuanya **configurable** per channel.

Notasi: nilai tekanan `x` (bar), waktu `t` (interval ±2 menit), slot musiman
`s = (hari, bucket-waktu)` mis. Senin–08:10. Jendela belajar `W` (default 21 hari).

---

## 0. Karakter Tekanan (kenapa logikanya begini)
- **Berpola harian kuat**: tinggi saat malam (demand rendah), turun saat jam puncak
  (pagi/sore). Maka "normal" harus **relatif jam & hari** → baseline musiman.
- **Dua arah penting**: terlalu rendah *dan* terlalu tinggi sama-sama masalah.
- **Bisa transien cepat** (water hammer, pompa start/stop).
- **Tak boleh negatif** pada distribusi normal → nilai < 0 = indikasi sensor.
- Terkait: operasi pompa, demand, kebocoran, status valve, elevasi.

---

## 1. Pembersihan Data (prasyarat)
> **Keputusan:** batas fisik dari `sensor_type` **DIABAIKAN**. Satu-satunya batas
> acuan = **`min_threshold` / `max_threshold` di `sensor_channel`** (batas layanan yang
> di-setting user).

Sebelum dihitung, tiap titik disaring:
- `allow_negative = false` → `x < 0` ditandai kandidat **A1 (sensor fault)** (§5.1).
- `null` / non-numerik → titik cacat (data-quality), tidak dipakai.
- Titik cacat **tidak ikut** hitung baseline (agar tak meracuni pola), tapi tetap
  dicatat untuk deteksi anomali sensor.
- Nilai di luar `min_threshold/max_threshold` **tidak** dianggap "invalid" — itu urusan
  **A2/A3** (rendah/tinggi), bukan A1.

Output: `x_clean` + flag kualitas per titik.

---

## 2. Baseline Musiman (fondasi semua analisa)
Untuk tiap slot `s`, dari `x_clean` dalam jendela `W`:

**Metode robust (default, tahan outlier):**
```
median_s      = median{ x_clean : slot = s }
MAD_s         = median{ | x_clean − median_s | }
sigma_s       = 1.4826 × MAD_s        # 1.4826 = konstanta agar MAD ≈ std (distribusi normal)
```
**Opsi klasik (configurable):** `mean_s`, `std_s`.

**Smoothing antar-slot** (agar ambang tak bergerigi): rata-rata bergerak 5 slot
bersebelahan pada `median_s` dan `sigma_s`.

**Confidence baseline slot** (dipakai di severity & gating):
```
coverage_s   = jumlah_sampel_s / sampel_ideal_s      # sampel_ideal = (W hari) × (sampel per slot)
conf_s       = clamp( coverage_s , 0..1 ) × (1 − penalti_fallback)
```
Slot yang diisi fallback (data tipis) → `conf_s` rendah.

**Penyempurnaan berbasis standar (opsional per channel):**
- **Kalender libur**: hari besar (Idul Fitri, tahun baru, dll) diperlakukan mode
  "relaxed" (pola demand berubah drastis) agar **tidak jadi alarm palsu**. Ini
  praktik baku (mis. Prophet dengan regressor libur).
- **Model baseline lanjutan (Tier-1, channel bernilai tinggi)**: ganti grid median/MAD
  dengan **STL** atau **Prophet-class** yang memisahkan trend + musiman (harian &
  mingguan) + libur secara eksplisit. Grid tetap **default murah** untuk mayoritas
  channel; STL/Prophet hanya saat di-enable & bernilai. Lihat
  [`tekanan-review-standar.md`](./tekanan-review-standar.md).

---

## 3. Ambang Adaptif
```
thr_max_ai_s = median_s + k · sigma_s
thr_min_ai_s = max( median_s − k · sigma_s , 0 )     # clamp ≥ 0 (tekanan non-negatif)
```
`k` = `std_multiplier` (default **1.5**; naikkan untuk jaringan ramai).

**Precedence ambang efektif saat evaluasi** (yang dipakai A2/A3):
```
thr = AI band (thr_min_ai_s, thr_max_ai_s)   bila conf_s ≥ conf_min
      else user (min_threshold, max_threshold)         # batas layanan channel = acuan utama
```
(Tidak ada lapis "batas fisik sensor_type" — diabaikan sesuai keputusan.)

---

## 4. FORECASTING — estimasi max / min / rata-rata beberapa hari ke depan

Karena tekanan **berpola & berulang**, forecast tidak harus mahal. Tiga tingkat
(pilih via config; default = Tier-0):

### 4.1 Tier-0 — Seasonal replay (default, tanpa ML, paling hemat)
Nilai yang *diharapkan* untuk timestamp masa depan = pola baseline slot-nya.
Untuk hari ke depan `d` (punya slot-slot `s ∈ d`):
```
forecast_slot(d,s) = median_{s'}        dengan s' = slot musiman yang bersesuaian (hari(d), bucket s)
band_atas(d,s)     = median_{s'} + k · sigma_{s'}
band_bawah(d,s)    = max( median_{s'} − k · sigma_{s'} , 0 )
```
**Rollup harian** (inilah "estimasi max/min/rata-rata"):
```
estimasi_rata2(d) = mean_{s∈d}  forecast_slot(d,s)
estimasi_puncak_wajar(d) = max_{s∈d} forecast_slot(d,s)      # puncak kurva khas
estimasi_lembah_wajar(d) = min_{s∈d} forecast_slot(d,s)      # lembah khas
batas_atas_realistis(d)  = max_{s∈d} band_atas(d,s)          # skenario tinggi wajar
batas_bawah_realistis(d) = min_{s∈d} band_bawah(d,s)         # skenario rendah wajar
```
> "Max ke depan" punya 2 makna & keduanya berguna: **puncak yang diharapkan**
> (`estimasi_puncak_wajar`) vs **batas atas realistis** (`batas_atas_realistis`).
> Untuk keputusan operasi, tampilkan keduanya.

Cocok bila pola stabil. Biaya ≈ 0 (cuma baca baseline).

### 4.2 Tier-1 — Trend-adjusted (bila ada drift lambat)
Bila tekanan **menurun/naik perlahan lintas minggu** (indikasi masalah berkembang),
tambahkan komponen tren pada deret **rata-rata harian**:
```
level & trend via Holt-Winters (ETS) atau regresi robust pada mean harian ter-deseasonalisasi
forecast_slot(d,s) = median_{s'} + trend(d)
```
- `trend(d)` = ekstrapolasi kemiringan (mis. −0.02 bar/hari) sejauh `d` hari.
- Interval kepercayaan dari sebaran residual: `± z · sigma_resid`.
- Tool ringan: **StatsForecast (AutoETS / SeasonalNaive)** — hemat, tak perlu Prophet.

### 4.3 Tier-2 — Model penuh (opsional, hanya channel bernilai tinggi)
SARIMA / ETS musiman penuh bila butuh akurasi tinggi. Default **OFF** (mahal).

### 4.4 Horizon & keluaran
- **Horizon = setting di AI config** (per channel), **default 30 hari ke depan**.
  Bisa diubah user (mis. 7 / 30 / 90 hari).
- Keluaran **per hari** untuk seluruh horizon: `{estimasi_rata2, estimasi_puncak_wajar,
  estimasi_lembah_wajar, batas_atas_realistis, batas_bawah_realistis, confidence}` →
  siap ditampilkan sebagai tabel/grafik prakiraan harian.
- **Konsekuensi horizon panjang (30 hari):**
  - **Confidence menurun** makin jauh ke depan → lebar pita (`± z·sigma_resid`)
    **melebar** seiring hari. Wajib ditampilkan agar operator tak over-percaya H+30.
  - Untuk 30 hari, **komponen tren (Tier-1) jadi penting** — drift lambat (mis.
    tekanan turun 0.02 bar/hari) berakumulasi berarti dalam sebulan. Seasonal-replay
    (Tier-0) murni akan datar/berulang tanpa menangkap tren. Rekomendasi: **Tier-1
    default saat horizon ≥ ~14 hari**, Tier-0 untuk horizon pendek.
  - Biaya tetap kecil: forecast dijadwalkan **harian** (bukan tiap 2 menit).

### 4.5 Early-warning dari forecast
Jika `batas_bawah_realistis(d) < user_min` (atau `batas_atas > user_max`) pada hari `d`:
> "Tekanan diprediksi turun di bawah X bar sekitar hari-H (±)." Peringatan **prediktif**,
> beri lead-time (config, mis. peringatkan bila terjadi dalam ≤ 3 hari).

---

## 5. INDIKASI ANOMALI — arti + rumus (inti permintaan Anda)

Tiap detektor: **definisi/rumus → severity → ARTI operasional PDAM**. Semua param default, configurable.

### 5.1 A1 — Nilai invalid / negatif → **"sensor rusak"**
- **Rumus:** `x < 0` (karena `allow_negative=false`) **atau** `null`/non-numerik.
  *(Batas fisik sensor_type diabaikan — nilai tinggi/rendah ekstrem masuk A2/A3, bukan A1.)*
- **Severity:** tinggi (data tak bisa dipercaya).
- **Arti:** sensor/transmitter **rusak**, kabel putus/short, loop 4–20 mA gagal,
  kalibrasi kacau. **Bukan** peristiwa hidrolik.
- *Catatan:* mode sensor-rusak lain tetap tertangkap oleh **A4** (spike liar),
  **A5** (flatline/nyangkut), dan **A6** (berisik) — jadi mengabaikan batas fisik
  tidak melemahkan deteksi sensor rusak.

### 5.2 A2 — Tekanan rendah berkelanjutan → **"tekanan selalu rendah"**
- **Rumus:** `x < thr_min` **menerus** selama `≥ sustain_T` (default 15 menit).
  ```
  low_run = durasi berturut { x_t < thr_min }
  trigger jika low_run ≥ sustain_T
  ```
- **Severity:** makin dalam (`(thr_min − x)/sigma_s`) & makin lama → makin tinggi.
- **Arti (indikasi):**
  - **Demand melebihi suplai** (jam puncak / distribusi kurang).
  - **Kebocoran besar / pipa pecah di hulu** (tekanan anjlok).
  - **Pompa mati / gagal / listrik padam.**
  - **Valve sebagian tertutup** atau penyumbatan.
  - **Pengambilan ilegal besar.**
  - Dampak: layanan lemah/mati di hilir, dan kalau karena bocor → **NRW naik**.

### 5.3 A3 — Tekanan tinggi berkelanjutan → **"tekanan selalu tinggi"**
- **Rumus:** `x > thr_max` menerus `≥ sustain_T`.
- **Arti:**
  - **Demand rendah tapi pompa full** → perlu **pressure management** (turunkan).
  - **Valve hilir tertutup (dead-end)** → tekanan menumpuk.
  - **Setelan PRV (pressure reducing valve) salah.**
  - Dampak: **stres pipa → memicu kebocoran baru**, boros energi, sambungan jebol.

### 5.4 A4 — Spike / lonjakan mendadak (rate-of-change)
- **Rumus:** perubahan antar titik terlalu tajam:
  ```
  rate_t = |x_t − x_{t-1}| / Δt        (bar per menit)
  trigger jika rate_t > spike_limit  (atau |x_t − x_{t-1}| > delta_maks)
  ```
- **Default `spike_limit` (otomatis, bisa diubah):** dikalibrasi per channel dari
  sebaran perubahan historis → `spike_limit_default = persentil-99 dari |Δx|` pada
  jendela belajar. Jadi tiap channel punya default yang pas dengan karakternya, dan
  **user boleh menimpanya** manual di AI config.
- **Diperkuat change-point (standar):** rate `|Δx|` = fast-path; konfirmasi onset burst
  pakai **CUSUM dua sisi** (lihat A10) agar tahan-noise. Ini pendekatan baku deteksi
  burst di jaringan air (Shewhart/CUSUM), bukan sekadar ambang beda-pertama.
- **Arti (bedakan arah):**
  - **Turun tajam** → awal **burst/pipa pecah**, atau pompa trip.
  - **Naik tajam** → **water hammer / transient** (valve/pompa switching cepat) →
    risiko kerusakan pipa; atau pompa start.

### 5.5 A5 — Flatline / stuck → **"sensor macet"**
- **Rumus:** hampir tak berubah dalam `N` sampel:
  ```
  span = max(x_{t-N..t}) − min(x_{t-N..t})
  trigger jika span < eps_flat (default 0.01 bar) selama N sampel / durasi
  ```
- **Arti:** **sensor beku/hang/rusak**, atau kondisi statis nyata (valve tertutup,
  aliran nol). **Pembeda:** kalau nilai flat **tidak mengikuti pola baseline** (harusnya
  ada variasi harian) → besar kemungkinan **sensor**, bukan hidrolik.

### 5.6 A6 — Erratic / noise → **"sensor mulai rusak"**
- **Rumus:** volatilitas jauh di atas normal slot:
  ```
  std_window (mis. 10 titik) >> sigma_s   →  ratio = std_window / sigma_s > noise_ratio (mis. 4)
  ```
  (alternatif: hitung jumlah pergantian arah turunan — zero-crossing tinggi).
- **Arti:** sensor **mulai rusak**, koneksi longgar, interferensi listrik, **udara di pipa**.

### 5.7 A7 — Tidak kirim data (No-data)
- **Rumus:** `now − last_ts > no_data_timeout`. Data 2-menit → default 3× interval
  (~6–10 menit, configurable).
- **Arti:** **node offline / sensor mati / komunikasi putus** (di level channel: channel
  ini tak update). Beririsan dengan analisa node (nanti).

### 5.8 A8 — Persistent out-of-range
- **Rumus:** **seluruh** window panjang (default 4 jam) `x ∉ [thr_min, thr_max]`.
- **Arti:** masalah **menetap** (bukan transien) — eskalasi dari A2/A3. Prioritas naik.

### 5.9 A9 — Deviasi baseline (z-score) → **"tak wajar untuk jam ini"**
- **Rumus (robust):**
  ```
  z_t = (x_t − median_s) / sigma_s          (sigma_s dari MAD)
  trigger jika |z_t| > z_threshold (default 3) dan bertahan (debounce)
  ```
- **Arti:** nilai **menyimpang dari pola musimannya** walau **masih di dalam batas
  absolut**. Contoh: jam 03:00 biasanya 3.0 bar, sekarang 2.2 bar (masih > min user)
  → ada yang **mulai mengambil air / bocor dini**. Ini **deteksi dini** yang lolos
  dari ambang statis.
- **Aktivasi & sifat (keputusan):** **nyala otomatis** begitu `learn_window` penuh —
  **tanpa approve user**. Untuk saat ini diperlakukan sebagai **PENGINGAT
  (informational)**, bukan alarm kritis: severity rendah, tampil sebagai catatan/insight
  agar operator waspada, tidak memicu eskalasi. (Bisa dinaikkan jadi alarm penuh nanti.)

### 5.10 (Preview L2) Burst signature — lintas channel
Kombinasi **tekanan turun + debit naik** bersamaan di titik sama = indikasi **pipa
pecah** dengan confidence lebih tinggi. Dibahas di Layer 2 (butuh mapping pasangan
channel), bukan di sini.

### 5.11 Analisa Tekanan Malam (analog-MNF) & pola jam tak wajar
> **Penting (kejujuran teknis):** **MNF sejati = metrik DEBIT** (sisa aliran malam →
> m³/hari). Tekanan tidak mengukur volume, jadi **kuantifikasi m³/hari TIDAK bisa dari
> tekanan saja** — itu dari channel debit atau korelasi tekanan+debit (Layer 2).
> Yang tekanan berikan di sini = **INDIKASI & early-warning** kebocoran/pengambilan
> malam, bukan angka kehilangan.

**Prinsip fisik:** malam (demand↓) tekanan seharusnya **naik ke puncak harian & stabil**.
Kebocoran/pengambilan malam menahan tekanan naik → tekanan malam **tertekan / turun tren**.

**Jendela malam** `NW` configurable, default **02:00–04:00**.

Statistik per malam-`d`:
```
P_night(d)     = median{ x : t ∈ NW pada malam d }
P_night_base   = median{ P_night(d') : d' dalam trailing 14–21 hari }
sigma_night    = 1.4826 × MAD{ P_night(d') }
```
Indikator (masing-masing on/off + param):
1. **Tekanan malam tertekan** (depressed):
   ```
   trigger jika P_night(d) < P_night_base − k_night · sigma_night
   ```
   → indikasi **kebocoran latar naik** atau **konsumsi malam bertambah** (mis. pencurian).
2. **Tren tekanan malam menurun** (early-warning, analog "MNF naik"):
   ```
   slope = regresi_robust( P_night(d') terhadap hari )
   trigger jika slope < −ambang_tren (mis. −0.02 bar/hari) berkelanjutan
   ```
   → **kebocoran berkembang perlahan**; beri lead-time.
3. **Ketidakstabilan malam** (harusnya stabil):
   ```
   trigger jika std{ x : t ∈ NW } > f · sigma_slot_malam
   ```
   → pengambilan intermiten / pompa nyala malam / kebocoran fluktuatif.

**Pola jam tak wajar (unusual-hour):** = **A9** difokuskan pada jam demand-rendah.
Tekanan turun tak wajar di jam sepi (`|z| > z_threshold` saat `t ∈ NW` atau jam malam)
= sinyal kuat **penarikan air tak wajar / bocor dini**. Night-analysis di atas
memperkuat sinyal A9 ini.

**Keluaran:** indikator {level malam vs baseline, tren, kestabilan, severity, confidence}
+ penanda "butuh konfirmasi debit untuk kuantifikasi m³/hari (L2)".

**Hukum FAVAD/N1 (standar, dipakai di L2):** kebocoran terkait tekanan secara fisik →
`Leakage ∝ Pressure^N1`, dengan `N1` **0.5** (pipa kaku) s/d **1.5** (pipa plastik),
`N1` configurable per DMA/bahan pipa. Saat digabung debit (L2), FAVAD dipakai untuk
menormalkan kebocoran terhadap tekanan & mengestimasi penghematan *pressure management*.
Di L1 (tekanan saja) cukup indikasi arah.

### 5.12 A10 — Drift kumulatif / bocor lambat (CUSUM & EWMA) ⭐ standar SPC
> **Detektor terpenting yang sebelumnya hilang.** A9 (z-score) hanya menangkap
> penyimpangan **besar & seketika**; ia **melewatkan pergeseran kecil yang menahun** —
> justru itulah tanda **kebocoran berkembang perlahan**. CUSUM/EWMA adalah **standar
> de-facto** untuk ini (setara metode **EWMA-STR** di literatur).

Bekerja pada **residual ter-deseasonalisasi** `r_t = x_t − median_s`:

**EWMA (pergeseran halus):**
```
z_t   = λ · r_t + (1 − λ) · z_{t-1}         (λ default 0.2)
alarm jika |z_t| > L · sigma_z              (L default 3; sigma_z = std EWMA)
```
**CUSUM dua sisi (pergeseran persisten):**
```
S⁺_t = max(0, S⁺_{t-1} + r_t − κ)
S⁻_t = min(0, S⁻_{t-1} + r_t + κ)           (κ = slack ≈ 0.5·sigma_s)
alarm jika S⁺_t > h  atau  S⁻_t < −h        (h = ambang ≈ 4–5·sigma_s)
```
- **Arti:** tekanan **perlahan menyimpang** dari pola normal secara akumulatif →
  **kebocoran latar tumbuh**, penyumbatan berkembang, atau setelan berubah pelan.
- **Hemat:** online, O(1) memori — cocok untuk seluruh 170 channel.
- **Reset** saat episode clear (hysteresis) agar tak menumpuk.
- Param configurable: `λ, L, κ, h`, on/off. Default **ON** (murah & bernilai tinggi).

---

## 6. Severity & Confidence (rumus umum)
**Severity** (gabungan besar pelanggaran + durasi):
```
mag  = max(0, (x − thr_max)/sigma_s , (thr_min − x)/sigma_s)   # berapa sigma keluar band
dur  = durasi episode
severity = tier( mag, dur ):
  info/warning  jika 1 ≤ mag < 2  atau durasi pendek
  critical      jika mag ≥ 3      atau durasi panjang / persistent (A8)
```
**Confidence** (seberapa layak dipercaya):
```
confidence = conf_s (cakupan baseline) × data_quality × (1 − penalti_fallback)
```
Alarm dengan `confidence < ambang_tampil` bisa ditahan/diturunkan prioritas.

---

## 7. Episode & Anti-noise (rumus)
- **Debounce:** kondisi harus bertahan `≥ T_debounce` sebelum episode "resmi" nyala.
- **Hysteresis:** nyala saat `x > thr_max`; **clear** hanya saat `x < thr_max − deadband`
  (default `deadband = 0.2·sigma_s`). Cegah flapping di sekitar ambang.
- **Cooldown:** setelah clear, tahan re-alert tipe sama `≤ cooldown` (default 30’).
- **Merge episode:** jeda antar episode `≤ max_gap` (default 5’) → lanjutkan episode
  yang sama (perpanjang `waktu_selesai`/`durasi`), bukan bikin baru.

---

## 8. Parameter Configurable (channel bertekanan) — default preset
| Param | Default | Keterangan |
|-------|---------|------------|
| `stat_method` | robust (median/MAD) | atau mean/std |
| `slot_size` | 10 menit | granularitas baseline |
| `learn_window` | 21 hari | jendela belajar |
| `smooth_window` | 5 slot | perataan ambang |
| `k` (std_multiplier) | 1.5 | lebar band AI |
| `allow_negative` | false | tekanan non-negatif |
| `sustain_T` (A2/A3) | 15 menit | durasi minimum |
| `spike_limit` (A4) | auto = persentil-99 |Δx| historis | bisa ditimpa user (bar/menit) |
| `eps_flat`, `N` (A5) | 0.01 bar, N sampel | ambang flatline |
| `noise_ratio` (A6) | 4 | volatilitas relatif |
| `no_data_timeout` (A7) | ~6–10 menit | 3× interval |
| `persist_window` (A8) | 4 jam | out-of-range menetap |
| `z_threshold` (A9) | 3 | auto-ON setelah learn_window; sifat **pengingat** (info) |
| A10 CUSUM/EWMA: `λ, L, κ, h`, on/off | 0.2, 3, 0.5σ, 4–5σ | deteksi drift/bocor lambat (standar SPC) |
| `holiday_calendar`, mode relaxed | libur nasional | tekan alarm palsu saat pola berubah |
| Baseline lanjutan (Tier-1) | STL/Prophet | opsional channel bernilai tinggi |
| `deadband`, `cooldown`, `max_gap` | 0.2σ, 30’, 5’ | anti-noise |
| Analisa malam (§5.11): `night_window`, `k_night`, `ambang_tren`, on/off | 02:00–04:00, dst | indikasi kebocoran/pengambilan malam |
| `forecast_tier` | auto (Tier-1 bila horizon ≥14 hari, else Tier-0) | 0/1/2 |
| `forecast_horizon` | **30 hari** | setting di AI config; mis. 7/30/90 |
| detektor A1..A9 | ON/OFF per detektor | sesuai preset |

---

## 9. Ringkas "apa artinya" (untuk operator)
| Gejala | Kode | Kemungkinan arti |
|--------|------|------------------|
| Selalu rendah | A2 | demand>suplai, **bocor/pipa pecah hulu**, pompa mati, valve/penyumbatan, pencurian |
| Selalu tinggi | A3 | pompa berlebih (perlu pressure mgmt), valve hilir tertutup, PRV salah → risiko pipa |
| Nilai negatif / null | A1 | **sensor rusak** / loop 4–20mA gagal / kalibrasi |
| Datar tak berubah | A5 | **sensor macet/beku** (atau valve tutup total) |
| Lonjakan tajam turun | A4 | awal **burst** / pompa trip |
| Lonjakan tajam naik | A4 | **water hammer** / pompa start → risiko pipa |
| Berisik/acak | A6 | sensor mulai rusak / udara di pipa / interferensi |
| Menyimpang dari pola jam | A9 | **bocor/pengambilan dini** walau nilai "masih normal" |
| **Menyimpang perlahan/menahun** | **A10** | **kebocoran latar tumbuh** (drift kumulatif CUSUM/EWMA) |
| Tekanan malam tertekan / tren turun | §5.11 | **kebocoran latar naik / konsumsi malam** (indikasi; m³ dari debit/L2) |
| Tak kirim data | A7 | node/sensor offline |

---

## 9b. Validasi & Metrik Model (standar)
Sebelum menaikkan detektor dari "pengingat" ke "alarm penuh":
- **Deteksi anomali:** lacak *precision/recall* atas event berlabel (bocor/burst yang
  terkonfirmasi), dan **laju false-alarm** per channel.
- **Forecast:** ukur **RMSE/MAPE** & cakupan interval (apakah pita 95% benar ~95%).
- **Backtesting**: uji di data historis sebelum aktif produksi.
- Metrik ini juga jadi dasar auto-tuning `k`, `λ`, `h` per channel.

## 10. Pertanyaan spesifik tekanan
1. ✅ **Horizon forecast** = setting di AI config, **default 30 hari** (Tier-1 otomatis
   untuk horizon panjang; confidence melebar makin jauh).
2. ✅ **Batas fisik sensor_type diabaikan.** Acuan tunggal = `min_threshold/max_threshold`
   di `sensor_channel`. A1 = negatif/null saja.
3. ✅ **`spike_limit`** = default otomatis (persentil-99 |Δ| historis), **bisa diubah** user.
4. ✅ **A9** = auto-ON setelah baseline penuh, **tanpa approve**; sifat **pengingat**
   (informational), bukan alarm kritis.

---

## 11. END-TO-END — proses → store → lifecycle → view (TEMPLATE semua kategori)

> Bagian ini merangkai semua di atas jadi **alur nyata satu channel tekanan**, memakai
> arsitektur [dok 05](../05-arsitektur.md) & tabel [dok 06](../06-model-data.md).
> **Strukturnya generik** — kategori lain (debit/level/…) mengikuti alur yang sama,
> hanya mengganti "kamus" (detektor mana ON + terjemahan arti). Inilah pondasi itu.

### 11.1 Proses (satu siklus micro-batch, cadence **default 5 menit**)
Data masuk tiap 2 menit; AI memproses tiap **5 menit** (configurable, dok 05 §4):
```
1. LOAD CONFIG   ai_config channel ini: enabled? params (k, horizon, active_schedule…)
2. INGEST        1 query borongan per-tenant: titik baru ts > ai_baseline.last_ts
3. CEK JADWAL    active_schedule → jam mati? suppress A1/A2/A5, skip; jam aktif → lanjut
4. BASELINE      update ai_baseline.grid (median/MAD slot) + online_state inkremental
5. DETEKSI       A1..A10 (River/ADTK) pakai grid + state → sinyal, mis. "A2 low, z=-3.1"
6. EVENT         sinyal → Event Manager (§11.3) → tulis/update ai_event (+ ai_event_log)
7. CHECKPOINT    simpan last_ts + online_state ke ai_baseline → worker stateless
```
Forecast **tidak** di sini — job harian terpisah menulis `ai_forecast` (§4).

### 11.2 Store (tabel yang tersentuh)
| Data | Tabel | Kapan ditulis |
|------|-------|---------------|
| Config channel (ON, params) | `ai_config` | saat user set di AI Settings |
| Grid musiman + state + checkpoint | `ai_baseline` | tiap siklus (inkremental) |
| Event + status + arti | `ai_event` | saat kondisi muncul/berubah |
| Jejak transisi status | `ai_event_log` | tiap perpindahan status |
| Forecast 30 hari | `ai_forecast` | job harian (overwrite) |
| Pola kambuh-pulih | `ai_recurrence` | job rekurensi (jam/hari) |

### 11.3 Lifecycle (contoh konkret A2 = tekanan rendah)
```
[BARU]     09:14  x<thr_min z=-3.1 → ai_event dibuat
                  meaning = "Tekanan rendah tak wajar — indikasi suplai kurang /
                             kebocoran hulu / pompa mati. Potensi Rp…"
   │  (dedup: kondisi lanjut → UPDATE last_seen_at & peak_magnitude, BUKAN event baru)
   ├─[DITINJAU]  operator kasih verdict: benar|false_alarm|abaikan
   │             (siapa aja boleh; verdict_by + verdict_at TETAP dicatat → feedback loop)
   ├─[DITINDAK]  assigned_to + action_note (petugas lapangan)
   └─ tekanan normal ≥ N periode → [AUTO_CLOSED]  resolved_at, duration_sec, "pulih sendiri"
                                    → tetap diarsip; job rekurensi hitung pola kambuh
```
Aturan kunci: **dedup** (1 kondisi = 1 event), **hysteresis/cooldown** (§7 anti-noise),
**auto-close** (pulih N periode → RESOLVED tapi disimpan), **superseded** (naik lebih berat).
Kambuh berulang → `ai_recurrence` → bila makin sering, mesin buat event `recurrence_leak`.

### 11.4 View di Angular (4 layar — a–c generik, d punya "rasa" chart per kategori)

**a. AI Settings** (`ai_config`) — daftar channel + status AI (OFF/ON) + preset; toggle
enable → pilih preset "Tekanan" → tweak params (horizon 30 hari, `active_schedule`,
min/max pengingat, k). Indikator "baseline belum cukup — butuh N hari" (`learn_ready`).
*Pola `ui-form`/`ui-list`.*

**b. Event Inbox** (`ai_event`, index "aktif") — tab **Aktif** (butuh perhatian) vs
**Riwayat** (auto-closed). Baris: arti PDAM + severity + durasi + **1-tap acknowledge**.
Filter status/severity/PDAM. *Pola `ui-list`.*

**c. Event Detail** (`ai_event` + `ai_event_log`) — kronologi transisi, grafik saat
kejadian, tombol validasi/assign/close, panel **riwayat kambuh** channel ini
(`ai_recurrence`). *Pola `ui-detail`.*

**d. Channel Analytics** (paling "AI") — satu chart:
- garis **aktual** + **pita baseline** (`median ± k·σ` dari `ai_baseline.grid`),
- **garis forecast 30 hari** (`ai_forecast.daily`: est_avg/peak/trough + pita melebar),
- penanda **event** (dari `ai_event`),
- panel **Night Pressure** (§5.11): level malam vs baseline + tren.

> Layar **a–c 100% dipakai ulang** semua kategori (cuma baca `ai_event`/`ai_config`).
> Layar **d** strukturnya sama; kategori lain ganti isi chart (mis. debit: tambah panel MNF).

### 11.5 Kenapa ini pondasi
Setelah tekanan matang, kategori lain **tidak** bikin ulang worker, tabel, lifecycle,
maupun layar. Yang mereka isi hanya **"kamus"**:

| Dipakai ulang (pondasi) | Diisi per kategori (kamus) |
|-------------------------|----------------------------|
| Worker + siklus micro-batch (dok 05) | detektor mana ON (debit: +MNF; volume: delta) |
| 6 tabel `ai_*` (dok 06) | preset & param default (dok 04 §8) |
| Event lifecycle + auto-close + rekurensi | terjemahan **arti PDAM** |
| 4 layar Angular | label/unit + isi chart panel-d |

**Urutan kerja benar: matangkan tekanan → kunci pondasi → kategori lain "isi kamus".**

---

**Tekanan: LOCKED.** ✅ Pondasi end-to-end (proses→store→lifecycle→view) siap jadi
template. Lanjut kategori berikutnya (Debit/Aliran) = tinggal isi kamusnya.
