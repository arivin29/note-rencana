# 04 — Katalog Analisa & Model Konfigurasi (per Target)

> Dokumen ini menjawab: **apa saja yang bisa di-enable/disable & di-config**,
> untuk **setiap objek analisa** — bukan hanya sensor channel, tapi juga **node**.
> Prinsip: **default TIDAK ada analisa AI**; user meng-*aktifkan* per target lalu
> menyetel parameter sesuai kebutuhan (mis. forecast 1/3/12 bulan).

## Keputusan yang sudah dikunci
| Aspek | Keputusan |
|-------|-----------|
| Sumber data | Service AI **baca langsung ClickHouse** |
| Resource worker | **2 vCPU / 2 GB RAM** (target footprint) |
| Forecast default | **1 bulan** ke depan, **konfigurabel** (1 / 3 / 12 bulan) |
| Default analisa | **OFF** untuk semua target — full opt-in |
| Config store | **PostgreSQL** (berversi) |
| Objek analisa | **sensor channel** *dan* **node** (extensible: sensor, DMA, dst) |

---

## 1. Konsep "Analysis Target"

Setiap analisa menempel pada sebuah **target**. Fase ini: 2 tipe target.

| Target | Unit | Contoh analisa | Sinyal sumber |
|--------|------|----------------|---------------|
| **`sensor_channel`** | 1 aliran nilai metric | baseline, anomali A1–A10, forecast | deret nilai channel |
| **`node`** | 1 perangkat fisik | offline, batre drop, alat dicuri, reboot | status koneksi, batre, GPS, sinyal, uptime |
| *(nanti)* `sensor`, `dma`, `network` | grup | korelasi, MNF, neraca air | agregasi banyak channel |

**Model langganan (subscription) per target:**
```
(target_type, target_id)
   └── analysis[]  →  { type, enabled, params{}, severity, schedule, notify{} }
```
- Default: **kosong / semua disabled** → beban komputasi ~0.
- User **enable** analisa tertentu → isi `params` (atau pakai preset) → jalan.
- Hanya analisa **enabled** yang dievaluasi worker → biaya = sebanding adopsi.

---

## 2. KATALOG A — Analisa untuk **Sensor Channel**

Semua item = **toggle enable/disable + parameter sendiri**. Dikelompokkan.

### A1. Baseline & Data Quality (fondasi analisa lain)
| Analisa | Enable? | Parameter yang bisa di-config |
|---------|:------:|--------------------------------|
| Pembelajaran baseline musiman | ✓ | ukuran slot (5/10/15 mnt), jendela belajar (mgg), metode statistik (mean-std / median-MAD), smoothing window, min-sampel per slot |
| Pembersihan data | ✓ | `allow_negative`, `min_threshold`/`max_threshold` channel (batas fisik sensor_type **diabaikan**; di luar range = A2/A3, bukan dibuang), filter spike-drop, aturan gap & imputasi |
| Sensor health / data completeness | ✓ | ambang % data hilang, ambang staleness |

### A2. Threshold / Range
| Analisa | Enable? | Parameter |
|---------|:------:|-----------|
| Ambang statis (user min/max) | ✓ | min, max |
| Ambang adaptif AI (baseline ± k·σ) | ✓ | `k` (lebar band), clamp min/max, precedence sumber ambang |

### A3. Detektor Anomali (masing-masing bisa on/off)
| Kode | Detektor | Parameter utama |
|------|----------|-----------------|
| A1 | Invalid / negatif | `allow_negative` (negatif/null saja; di luar range = A2/A3) |
| A2 | Low sustained | ambang-min, `sustain_T` (durasi) |
| A3 | High sustained | ambang-max, `sustain_T` |
| A4 | Spike / rate-of-change | `spike_limit` (Δ/waktu atau %), arah |
| A5 | Flatline / stuck | toleransi perubahan, `N` sampel/durasi |
| A6 | Erratic / noise | faktor varians vs baseline |
| A7 | No-data | `timeout` (mis. > 10 mnt utk data 2-mnt) |
| A8 | Persistent out-of-range | panjang window (mis. 4 jam) |
| A9 | Baseline deviation (z-score) | `z_threshold`, syarat "baseline stabil dulu" |
| **A10** | **Drift kumulatif (CUSUM/EWMA)** | `λ, L, κ, h`, on/off — deteksi **bocor lambat** (standar SPC); tool **River** (dok 07) |
| A-ML | Anomali ML (IsolationForest/PyOD) | on hanya utk channel bernilai tinggi; sensitivitas |

### A4. Forecasting & Early-Warning
| Analisa | Enable? | Parameter |
|---------|:------:|-----------|
| Forecast nilai | ✓ | **horizon (1/3/12 bulan)**, granularitas, model (auto/seasonal), interval kepercayaan, cadence retrain |
| Prediksi lewat-ambang (early warning) | ✓ | lead-time (jam/hari), ambang acuan |
| Deteksi tren/drift lambat | ✓ | sensitivitas, arah, jendela |

### A5. Domain-specific (tergantung kategori metric)
| Analisa | Cocok untuk | Parameter |
|---------|-------------|-----------|
| MNF (Minimum Night Flow) | flow/debit | jendela malam (mis. 02:00–04:00), baseline MNF |
| Pola konsumsi tak wajar (indikasi pencurian) | flow | jam sensitif, ambang deviasi |
| Burst rate | flow/pressure | Δ mendadak |

### A6. Perilaku Alarm & Anti-noise (per channel)
`debounce`, `hysteresis deadband`, `cooldown` re-alert, `max_gap` merge episode,
aturan **severity**, ambang **confidence** untuk ditampilkan, **quiet hours**,
**routing notifikasi** (penerima & kanal).

### A7. Eksekusi / Performa (per channel)
Cadence evaluasi (real-time micro-batch / jarang), **tier kritikalitas** (memengaruhi
cadence & anggaran compute), **compute tier** (statistik saja / boleh ML).

---

## 3. KATALOG B — Analisa untuk **Node / Device**  ⏸️ DITUNDA

> **Status: HOLD.** Sinyal level-node (batre/GPS/tamper/sinyal) **belum tersedia**
> di perangkat saat ini. Katalog ini **disimpan sebagai rencana** dan dikerjakan
> **nanti** setelah perangkat mengirim sinyal yang dibutuhkan. **Fokus fase ini =
> Katalog A (sensor channel).** Target `node` tetap ada di model, tapi analisanya
> belum diaktifkan.

Objeknya perangkat, bukan nilai metric. Contoh yang Anda sebut (batre drop, alat
dicuri, hidup-mati) + kemungkinan lain. Ketersediaan tergantung sinyal perangkat.

### B1. Konektivitas & Ketersediaan
| Analisa | Enable? | Parameter |
|---------|:------:|-----------|
| Deteksi offline | ✓ | ambang warning/critical (menit), severity |
| Uptime / availability | ✓ | target uptime %, jendela hitung |
| Reboot/restart berulang | ✓ | ambang frekuensi reboot (per jam/hari) |
| Frekuensi putus koneksi | ✓ | ambang disconnect/jam |
| Data completeness node | ✓ | % telemetry di bawah ekspektasi lintas semua channel-nya |

### B2. Energi / Baterai
| Analisa | Enable? | Parameter |
|---------|:------:|-----------|
| Baterai lemah | ✓ | ambang % / tegangan |
| **Laju drop baterai abnormal** | ✓ | batas laju (%/hari atau V/hari) |
| **Prediksi habis baterai** | ✓ | horizon prediksi, ambang peringatan (mis. < 3 hari) |
| Kehilangan daya eksternal (jalan pakai baterai) | ✓ | ambang tegangan eksternal |
| Solar tidak mengisi | ✓ | pola siang tanpa kenaikan, ambang |

### B3. Keamanan / Tamper (indikasi "alat dicuri")
| Analisa | Enable? | Parameter |
|---------|:------:|-----------|
| **Pergerakan GPS dari lokasi pasang** | ✓ | radius geofence, durasi konfirmasi |
| Mati mendadak tak wajar (offline + tak terjadwal) | ✓ | pola, jendela |
| Tamper switch / enclosure terbuka | ✓* | (jika hardware ada) |
| Guncangan/akselerometer | ✓* | (jika hardware ada) sensitivitas |
| Hilang sinyal + batre normal (dugaan diangkut) | ✓ | korelasi kondisi |

### B4. Kualitas Sinyal & Lingkungan
| Analisa | Enable? | Parameter |
|---------|:------:|-----------|
| Sinyal GSM/RSSI lemah / menurun | ✓ | ambang, tren |
| Suhu perangkat abnormal | ✓* | ambang (jika ada sensor suhu internal) |

### B5. Skor & Prediktif Node
| Analisa | Enable? | Parameter |
|---------|:------:|-----------|
| Node health score gabungan | ✓ | bobot komponen (koneksi/batre/data/sinyal) |
| Prediksi kegagalan/perawatan | ✓ | horizon, sinyal degradasi |

Node juga punya **anti-noise & routing** (severity, cooldown, quiet hours, penerima)
seperti §A6.

---

## 4. Model Konfigurasi (di PostgreSQL, berversi)

### 4.1 Prinsip
- **Opt-in**: default tak ada satupun analisa aktif.
- **Granularitas enable = per target saja**: **`sensor_channel`** dan **`node`**.
  (Tidak ada enable massal level sensor-grup / project / tenant — di luar lingkup.)
- **Preset DISEDIAKAN**: user bisa "terapkan preset" per **kategori metric** (channel),
  lalu tweak. Preset = titik awal cerdas, bukan paksaan. Lihat §8.
- **Berversi + audit**: tiap perubahan tercatat (siapa, kapan, dari→ke), bisa rollback.
- **Runtime**: worker membaca config terkini tanpa redeploy.

### 4.2 Bentuk konseptual (skema final di dok 06)
```
analysis_config
  id, target_type (sensor_channel|node), target_id,
  analysis_type (baseline|A4_spike|forecast|node_battery_drop|node_geofence|…),
  enabled (bool, default false),
  params (jsonb),            -- knob spesifik analisa (horizon, k, sustain_T, radius, …)
  severity (default),
  schedule (cadence/eval),
  notify (jsonb: penerima, kanal, quiet_hours),
  version, updated_by, updated_at
```
`params` sengaja **jsonb** agar tiap tipe analisa punya knob berbeda tanpa ubah skema.

### 4.3 Resolusi nilai efektif
```
Preset kategori/model  →  Override per target  →  (nilai efektif dipakai worker)
```
Enablement selalu **eksplisit per target** (default false). Preset hanya mengisi
`params` awal saat user meng-enable.

---

## 5. Dampak ke Performa (kenapa model ini efisien)
- Default OFF → di awal **beban ~0**; naik hanya untuk channel/node yang di-*enable*.
- Worker tiap siklus hanya memproses **daftar analisa aktif** (dari `analysis_config`),
  dikelompokkan agar bisa **set-based / push-down ke ClickHouse**.
- Forecast (mahal) hanya untuk target yang meng-enable, dijadwalkan jarang (harian).
- Cocok dengan target **2 vCPU / 2 GB** bahkan bila adopsi tumbuh bertahap.

---

## 6. Kelayakan Sinyal Node (perlu dikonfirmasi)
Analisa node bergantung sinyal yang dikirim perangkat. Yang **umumnya tersedia**
(Teltonika/ESP32): status koneksi, `last_seen`, **GPS (lat/lng)**, **tegangan/`%` baterai**,
tegangan eksternal, **sinyal GSM/RSSI**, mode sleep. Yang **tergantung hardware**:
tamper switch, akselerometer, suhu internal.

→ Perlu pemetaan: **per node-model, sinyal apa yang tersedia** — menentukan analisa
node mana yang bisa ditawarkan (§B3 tamper mungkin hanya sebagian model).

---

## 7. Keputusan (sebelumnya pertanyaan terbuka)
1. ✅ **Katalog final** — dianggap lengkap.
2. ✅ **Preset DISEDIAKAN** per kategori metric (channel). Detail §8.
3. ✅ **Granularitas enable** = cukup **per sensor channel & node** (tanpa grup/tenant massal).
4. ⏸️ **Sinyal node belum ada** → **Katalog B (node) DITUNDA**; fokus Katalog A.
5. ✅ **UI = layar khusus "AI Settings"** (bukan diselipkan ke form existing). Rincian di §9.

---

## 8. Preset Default per Kategori Metric (Channel)

Preset = konfigurasi awal cerdas saat user meng-enable AI pada sebuah channel.
User pilih preset (mengikuti **`group_name`** kategori channel), lalu boleh tweak.
Tiap kategori "berkarakter" beda, jadi presetnya beda.

Kategori nyata (dari `sensor_types.group_name`):
**Tekanan (23) · Debit/Aliran (16) · Level (11) · Kualitas Air (10) · Listrik/Pompa (8)
· Suhu (6) · Volume (5) · Tekanan Diferensial (3) · Lainnya (12).**

| Kategori | Karakter | Detektor default ON | Param kunci | Catatan khusus |
|----------|----------|---------------------|-------------|----------------|
| **Tekanan** | dua arah, bisa spike (water hammer), cepat berubah | A2 low, A3 high, A4 spike, A7 no-data, A9 deviasi, **analisa tekanan malam (analog-MNF)** | `k=1.5`, sustain 15’, spike auto-p99, `allow_negative=false`, night 02–04 | low & high sama penting; tekanan malam = indikasi bocor/pengambilan (m³ dari debit/L2); kandidat burst L2. Detail: [`kategori/tekanan.md`](./kategori/tekanan.md) |
| **Debit/Aliran** | dua arah, bisa 0 malam, spike=burst | A3 high, A4 spike, A5 flatline, A7, A9, **MNF** | sustain 15’, spike agresif, MNF window 02–04 | MNF & pola konsumsi (pencurian) khusus flow |
| **Level** | terbatas 0–max, lambat | A2 low, A3 high, A5 flatline, A7, forecast | `k=2.0`, forecast **level habis/luap** ON | early-warning reservoir kosong/luapan |
| **Volume** | **totalizer MONOTON naik** | A5 flatline (=tak ada konsumsi), **A-turun (reset/rollback)**, A7 | proses **delta/inkremen**, bukan nilai mentah | logika beda total; jangan pakai band absolut |
| **Kualitas Air** | ambang keselamatan/regulasi, lambat | A2 low, A3 high, A4 spike, A7 | rentang aman per parameter (mis. pH 6.5–8.5, sisa klor min) | spike = indikasi kontaminasi |
| **Listrik/Pompa** | **cyclic/actuated** (pompa on/off) | A5 flatline, A4 spike, A7, tren degradasi | **`behavior_profile=cyclic`** → jangan skip fluktuasi | fluktuasi = normal; fokus tren aus/boros |
| **Suhu** | lambat, terbatas | A3 high, A7, A9 | `k=2.0`, sustain lebih panjang | jarang mendesak |
| **Tekanan Diferensial** | indikator filter/kotoran | A3 high, tren naik | tren `dP` naik = penyumbatan | early-warning perawatan |
| **Lainnya** (humidity dll) | generik | A2, A3, A7 | preset konservatif | tuning manual bila perlu |

Prinsip preset:
- **Konservatif dulu** (hindari alarm palsu); user bisa perketat.
- **A9 (deviasi baseline) & forecast** default ON hanya di kategori yang jelas untung
  (level, tekanan); lainnya OFF sampai baseline stabil / user aktifkan.
- **Forecast horizon default 1 bulan** (bisa 1/3/12) — relevan terutama Level & Volume.
- Preset **berversi**; memperbarui preset tidak menimpa channel yang sudah di-tweak user.

> Volume (totalizer) & Listrik/Pompa (cyclic) adalah dua kategori dengan logika
> paling berbeda — ditandai eksplisit agar tim tidak menyamakan dengan channel biasa.

---

## 9. UI — Layar khusus "AI Settings"

Kebutuhan: **halaman tersendiri**, bukan diselipkan ke form node/channel biasa.

Cakupan konseptual (rincian nanti):
- Daftar channel + **status AI (OFF/ON)** + preset terpakai + ringkas analisa aktif.
- **Toggle enable per channel** → pilih **preset** → panel **tweak params** (per detektor/forecast).
- Indikator kesiapan (mis. "baseline belum cukup — butuh N hari").
- Riwayat/versi konfigurasi (audit) + aksi rollback.
- (nanti) tab **Node** saat Katalog B diaktifkan.

Karena default OFF, layar ini juga jadi tempat user "menyalakan" AI per channel.
