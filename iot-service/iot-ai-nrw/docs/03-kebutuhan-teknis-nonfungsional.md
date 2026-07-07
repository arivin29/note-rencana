# 03 — Kebutuhan Teknis & Non-Fungsional
## Configurability · Performance · Efisiensi Resource · Kerangka Pemilihan Tool

> Dokumen ini menaikkan tiga hal jadi **kebutuhan inti (bukan afterthought)**:
> (1) semuanya **configurable**, (2) **hemat resource & performant**, (3) **tool
> dipilih berdasarkan kecocokan + efisiensi**, bukan meniru sistem lama.
> Prinsip pengarah: **seoptimal & seefisien mungkin sesuai sasaran** — bukan
> secanggih mungkin.

---

## 1. Realita Sizing (pijakan semua keputusan)

Angka aktual (per Jul 2026):

| Metrik | Nilai | Implikasi desain |
|--------|-------|------------------|
| Channel aktif | **170** | kecil; semua bisa diproses satu worker |
| Sensor / Node | 98 / 45 | — |
| `sensor_type` | **94** | terlalu banyak untuk tuning per-tipe → **default berbasis kategori metric**, bukan 94 tipe |
| Tenant (PDAM) | **11** | multi-tenant skala kecil |
| Telemetry masuk | **±20–28 rb baris/hari** (~0,3 row/s) | **volume sangat kecil** |
| Teoretis maksimum | 170 ch × 720 (2-mnt) = 122 rb/hari (~1,4 row/s) | tetap kecil |
| Riwayat 3 bulan | ~800 rb baris | muat di memori sekalipun |

**Kesimpulan kunci:** *throughput bukan masalah*. Yang membunuh performa sistem
lama bukan volume, tapi **pola boros**: loop Python per-sensor dengan banyak query
(N+1), `DELETE` seluruh tabel baseline tiap run, statistik non-inkremental. Jadi
target efisiensi = **arsitektur, bukan hardware**. Satu worker kecil (target resmi
**2 vCPU / 2 GB**) lebih dari cukup untuk skala sekarang.

---

## 2. Prinsip Efisiensi (pengikat seluruh desain)

1. **Cheapest-thing-that-works, bertingkat.** Mayoritas channel cukup statistik
   murah (O(1) inkremental). ML mahal hanya untuk channel bernilai tinggi/kasus sulit.
2. **Push-down ke tempat data.** Agregasi baseline & sebagian deteksi lebih hemat
   dikerjakan **di DB kolumnar (SQL)** daripada tarik semua baris ke Python.
3. **Inkremental, bukan recompute.** Statistik online (Welford untuk mean/var,
   EWMA, t-digest untuk kuantil) → tak perlu memuat ulang jendela penuh tiap run.
4. **Micro-batch selaras interval.** Data datang tiap 2 menit → evaluasi
   micro-batch **tiap 5 menit** (default, dikunci di dok 05 §4) sudah "real-time"
   secukupnya; tak perlu streaming berat. (Cadence bisa di-config; channel kritis lebih sering.)
5. **Idempotent & resumable.** Job bisa diulang tanpa efek ganda; aman kalau worker mati.
6. **Cadence adaptif.** Channel kritis dievaluasi lebih sering; channel stabil lebih jarang.
7. **Minimal moving parts.** Jangan tambah infra berat (Kafka/Flink/Airflow) sebelum
   volume benar-benar menuntut. Reuse yang sudah ada.

---

## 3. Configurability (kebutuhan inti #1)

Target: **nol magic-number**. Semua yang di sistem lama di-hard-code (`std_multiplier=1.5`,
slot 10 mnt, window 3 minggu, `fluct=0.7`, `max_gap=5`, sustain 15 mnt, no-data 1 jam)
harus jadi **parameter ber-default & bisa di-override**, tanpa deploy ulang.

### 3.1 Hirarki resolusi konfigurasi
Override dari umum → spesifik (yang lebih spesifik menang):

```
System default  →  Kategori metric  →  sensor_type  →  Channel  →  (Tenant override)
     (paling umum)   (pressure/flow/…)                (paling spesifik)
```

> Karena ada **94 sensor_type** tapi hanya 170 channel, tuning per-tipe tidak
> praktis. Maka **default utama diletakkan di level "kategori metric"** (mis.
> pressure, flow, level, power/energy, quality) — jauh lebih sedikit & bermakna.
> `sensor_type`/channel hanya untuk pengecualian.

### 3.2 Katalog parameter yang wajib configurable
| Kelompok | Parameter | Default awal (indikatif) |
|----------|-----------|--------------------------|
| Baseline | ukuran slot, panjang jendela belajar, metode statistik (mean/std vs median/MAD), smoothing window | 10 mnt, 3 minggu, robust, 5 |
| Ambang | `k` (std_multiplier / lebar band), clamp min/max, precedence sumber ambang | 1.5, clamp per kategori |
| Data-quality | `allow_negative`, batas fisik, aturan spike-drop, aturan gap/imputasi | per kategori |
| Deteksi | sustain_T (A2/A3), spike_limit (A4), flatline_tolerance & N (A5), no-data timeout (A7), window persistent (A8), z-threshold (A9) | konfigurabel |
| Episode | `max_gap` (merge), cooldown, hysteresis deadband, debounce | 5 mnt, dst |
| Eksekusi | cadence evaluasi, prioritas/kritikalitas channel, on/off tiap detektor | per channel |

### 3.3 Feature flags (aktif/nonaktif granular)
- Per **detektor** (A1–A10), per **layer** (L1/L2/…), per **kategori metric**, per **tenant/tier langganan**.
- Contoh: A9 (baseline-deviation) bisa OFF saat cold-start, ON setelah baseline stabil.

### 3.4 Sifat konfigurasi
- **Runtime reconfigurable** (ubah tanpa redeploy; worker baca versi config terbaru).
- **Berversi & ter-audit** (tahu kapan siapa ubah apa; bisa rollback).
- **Template default** per kategori metric agar channel baru **langsung jalan** (tak nol).
- **Explainable**: setiap alarm mencatat konfigurasi & nilai yang dipakai saat itu.

---

## 4. Strategi Komputasi (kebutuhan inti #2)

### 4.1 Model eksekusi (usulan)
| Beban | Mode | Cadence | Kenapa |
|-------|------|---------|--------|
| Deteksi ambang/rate/flatline/no-data (L1.4) | **micro-batch** atau stream ringan | **tiap ~5 mnt** (default; ingest tetap 2 mnt) | murah, mendekati real-time |
| Baseline musiman (L1.2) | **batch inkremental** | harian/beberapa jam | pola bergerak lambat; jangan recompute penuh |
| Anomali statistik lanjut / ML (A9, L2+) | batch terjadwal | menit–jam | hanya channel terpilih |
| Forecast (L5) | batch | harian | horizon panjang |

### 4.2 Teknik hemat resource
- **Baseline inkremental**: perbarui agregat slot dengan data baru saja
  (Welford/EWMA), **bukan** `DELETE`+rebuild 3 minggu tiap run (anti-pattern lama).
- **Push-down SQL**: hitung avg/stddev/kuantil per (channel,hari,slot) langsung di
  **ClickHouse** (kolumnar) → hasil kecil ditarik ke worker. Hindari tarik jutaan baris.
- **Vektorisasi / set-based**: proses banyak channel sekaligus (satu query beragregasi),
  bukan loop per-channel dengan N query (kritik utama sistem lama).
- **Cache ambang** di memori worker (refresh berkala) → evaluasi per titik = lookup O(1).
- **Streaming stats** (t-digest) untuk kuantil tanpa simpan seluruh sampel.
- **Cost tiering per channel**: kritikalitas rendah → statistik saja; tinggi → boleh ML.

### 4.3 Skalabilitas & keandalan
- Partisi kerja **per tenant / per channel** → mudah paralel bila tumbuh.
- Job **idempotent + checkpoint** (tahu sudah proses sampai `ts` mana).
- Backpressure tak relevan di volume ini, tapi desain tetap siap 10–50× pertumbuhan.

---

## 5. Kerangka Pemilihan Tool (kebutuhan inti #3)

> **Status: SUDAH DIPUTUSKAN di dok 07 (metode-ml).** Bagian ini = kriteria + kandidat
> awal; keputusan resmi tool per detektor (hand-code vs River/ADTK/StatsForecast/statsmodels)
> ada di [`07-metode-ml.md`](./07-metode-ml.md).

Prinsip: *minimal, reuse yang ada, hindari infra berat sampai perlu.*

### 5.1 Kriteria penilaian
Kecocokan fungsi · efisiensi resource (CPU/RAM/IO) · kesederhanaan operasional ·
reuse stack existing · explainability · kematangan/komunitas · biaya.

### 5.2 Kandidat per kebutuhan
| Kebutuhan | Kandidat | Catatan efisiensi |
|-----------|----------|-------------------|
| **Baca telemetry / agregasi** | **ClickHouse** (sudah di stack), TimescaleDB, Postgres | ClickHouse kolumnar → agregasi baseline super murah; **kandidat kuat, sudah ada** |
| **Simpan config, hasil anomali/forecast, metadata** | Postgres | transaksional, relasional; pas untuk config berversi |
| **Proses/compute** | **SQL-in-DB dulu**, lalu **Polars** / **DuckDB** untuk yang tak bisa SQL; hindari pandas loop | Polars/DuckDB jauh lebih hemat memori & cepat dari pandas |
| **Statistik online** | numpy, **River** (online ML/stat), t-digest | O(1) memori, ideal micro-batch |
| **Anomali ML (bila perlu)** | **PyOD**, scikit-learn (IsolationForest) | hanya untuk channel/kasus bernilai tinggi |
| **Forecasting** | **StatsForecast/Nixtla** (cepat, ringan), statsmodels, Prophet | StatsForecast jauh lebih hemat dari Prophet massal |
| **Penjadwalan** | cron / **APScheduler** (in-proc) | ringan; belum perlu Airflow/Celery |
| **Real-time feed (opsional)** | tap MQTT / micro-batch ClickHouse | belum perlu Kafka/Flink di volume ini |
| **Model registry/serving** | **DITUNDA** (MLflow/BentoML overkill sekarang) | tambah hanya jika model ML sudah banyak |

### 5.3 Arah rekomendasi awal (untuk didiskusikan)
- **Data plane:** baca telemetry dari **ClickHouse**, dorong agregasi baseline ke SQL.
- **Control/result plane:** **Postgres** untuk config, baseline ringkas, hasil anomali/forecast.
- **Compute:** satu **worker Python** micro-batch (APScheduler), pakai **Polars/DuckDB + numpy/River**; SQL untuk yang berat. Tanpa infra streaming/orkestrasi berat.
- **ML:** statistik dulu untuk 170 channel (trivial); ML (PyOD/StatsForecast) menyusul, per channel terpilih.
- Semua keputusan tool **dikunci di dok 07 (metode ML)** setelah kebutuhan disepakati.

---

## 6. Pelajaran / Anti-Pattern dari Sistem Lama (v2)

| Anti-pattern | Dampak | Perbaikan |
|--------------|--------|-----------|
| Loop `for sensor` + banyak query per sensor | N+1, lambat walau data kecil | set-based / push-down SQL |
| `DELETE FROM sensor_baseline_ai` lalu rebuild penuh tiap run | boros, tak skalabel | baseline **inkremental** |
| `mean`/`std` polos | rentan outlier menggeser ambang | opsi **robust (median/MAD)** |
| Magic-number hard-coded | tak bisa tuning tanpa edit kode | **config berhirarki + runtime** |
| Tak ada severity/confidence | operator sulit prioritas & percaya | tambah **severity + confidence** |
| Anomali dinamai per-metric (tekanan) | tak reusable ke metric lain | **taksonomi netral** (dok 02) |

---

## 7. Definisi "Optimal & Efisien" (kriteria sukses teknis)
- Satu evaluasi micro-batch seluruh 170 channel selesai **jauh di bawah cadence 5 menit**.
- Refresh baseline harian **inkremental**, bukan full-scan berulang.
- Footprint worker **≤ 2 vCPU / ≤ 2 GB RAM** pada skala sekarang; naik linear-landai.
- Menambah channel/tenant **tak butuh perubahan kode**, cukup konfigurasi.
- False-positive terkendali (severity+confidence+anti-noise) → operator mempercayai alarm.

---

## 8. Pertanyaan Terbuka (teknis) — status
1. ✅ **Sumber data:** service AI **baca langsung ClickHouse**.
2. ✅ **Resource:** **2 vCPU / 2 GB RAM** → target footprint dikunci di §7.
3. ✅ **Proyeksi:** ~1 bulan ke depan (skala tetap kecil; headroom 10–50× tetap dijaga desain).
4. ✅ **Config default berbasis kategori metric** disetujui → dipakai sebagai **preset** (lihat [`04`](./04-katalog-analisa-dan-konfigurasi.md); enablement tetap opt-in per target).
5. ✅ **Config store:** **PostgreSQL** (berversi).
6. ✅ **Real-time:** cukup **micro-batch (cadence default 5 menit, ingest 2 menit)** untuk
   sekarang — dikunci di dok 05 §4.

> Model **enablement opt-in (default OFF) per target** + katalog lengkap apa yang
> bisa di-config ada di dok **[04 — Katalog Analisa & Konfigurasi](./04-katalog-analisa-dan-konfigurasi.md)**.
