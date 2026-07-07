# 01 — Analisa Kebutuhan: AI-NRW untuk PDAM

> Tujuan dokumen: **memetakan kebutuhan** (bukan solusi teknis) modul analitik
> cerdas untuk PDAM — apa yang benar-benar diperlukan soal **anomali, forecasting,
> warning/early-warning, dan decision support**, siapa penggunanya, keputusan apa
> yang harus mereka ambil, dan data apa yang jadi bahan bakarnya.
> Belum menyentuh kode/DB yang berjalan. Asumsi ditandai jelas di §11.

---

## 1. Konteks Bisnis: kenapa modul ini ada

**NRW (Non-Revenue Water)** = air yang diproduksi tapi tidak menghasilkan pendapatan.

```
NRW% = (Volume diproduksi − Volume terjual/tertagih) / Volume diproduksi × 100%
```

NRW PDAM Indonesia rata-rata **tinggi (±30–50%)**; target sehat < 20–25%. Setiap
1% NRW = ratusan juta–miliaran Rupiah/tahun hilang. Modul ini menyerang NRW dari
sisi **operasional & data**, bukan konstruksi.

Komponen NRW (IWA Water Balance) yang jadi sasaran AI:

| Komponen | Contoh | Peran AI-NRW |
|----------|--------|--------------|
| **Real losses** (kehilangan fisik) | pipa pecah (burst), bocor latar (background leakage), luapan reservoir | deteksi dini, lokalisasi, kuantifikasi m³/Rp |
| **Apparent losses** (kehilangan semu) | meter pelanggan macet/mundur, pencurian air, sambungan ilegal | deteksi pola konsumsi tak wajar |
| **Unbilled authorized** | pemakaian resmi tak tertagih | pemetaan neraca air |

**Prinsip utama produk:** ubah data mentah → **keputusan**. Operator tidak butuh
"anomaly score 0.87", mereka butuh *"DMA Jahag diduga bocor, ±42 m³/hari ≈ Rp
3,1 jt/hari, prioritas tinggi, cek titik X"*.

---

## 2. Aktor & Keputusan yang Harus Mereka Ambil

Desain kebutuhan selalu diturunkan dari **keputusan** yang ingin dibantu.

| Aktor | Konteks | Keputusan | Informasi yang dibutuhkan |
|-------|---------|-----------|---------------------------|
| **Operator / dispatcher** (ruang kontrol) | pantau 24/7 | tanggapi kejadian sekarang | alarm real-time terpercaya, prioritas, lokasi, saran tindakan |
| **Manajer NRW / teknik** | harian–mingguan | alokasikan tim ke DMA mana dulu | ranking DMA berisiko, estimasi kehilangan (m³/Rp), tren |
| **Tim lapangan** | di lokasi | cari & perbaiki titik | jenis gangguan, perkiraan lokasi/segmen, riwayat |
| **Manajer operasi pompa/energi** | harian | jadwal & setelan pompa/tekanan | forecast demand & level reservoir, biaya energi |
| **Manajemen / direksi** | bulanan | evaluasi kinerja & investasi | KPI NRW, tren, ROI, laporan |
| **Admin platform (DEVETEK)** | lintas tenant | kelola & tuning model | kualitas data, performa model, drift |

> **Multi-tenant:** setiap PDAM = 1 tenant (owner). Semua analitik, model, dan
> insight **terisolasi per PDAM**. Admin DEVETEK bisa lintas-tenant.

---

## 3. Sinyal / Metrik Input (bahan bakar analitik)

Kebutuhan model sangat bergantung sinyal yang tersedia. Dikelompokkan:

**A. Sinyal hidrolik inti (wajib untuk NRW):**
- **Debit/Flow** (m³/h, L/s) — inlet DMA, transmisi, distribusi. Sinyal terpenting.
- **Tekanan/Pressure** (bar) — indikator burst & manajemen tekanan.
- **Level reservoir/tandon** (m atau %) — neraca air & operasi pompa.

**B. Sinyal energi & aset:**
- Pompa: **daya (kW), energi (kWh), arus, status run/stop, jam operasi**.
- Valve status/posisi (jika ada).

**C. Kualitas air (opsional, nilai tambah):**
- pH, kekeruhan (turbidity/NTU), sisa klor (residual chlorine), TDS, suhu.

**D. Sinyal komersial (untuk pisahkan real vs apparent loss):**
- Meter pelanggan / **AMR/AMI** (jika ada) — konsumsi per SR.
- Volume produksi (WTP) & volume tertagih (billing).

**E. Konteks (feature pendukung):**
- Waktu (jam, hari, hari libur/kalender), musim.
- Cuaca (suhu, hujan) — opsional, memperbaiki forecast demand.
- Struktur jaringan: **DMA**, hubungan hulu-hilir antar node (untuk korelasi & lokalisasi).

> **Prasyarat mutlak:** kualitas & granularitas data. Interval telemetry (mis.
> 1–15 menit), keteraturan, dan penanganan gap menentukan batas atas akurasi model.

---

## 4. Pilar Kebutuhan Analitik

Empat pilar + satu prasyarat. Ini inti "apa yang dibutuhkan".

### 4.0 Prasyarat — Data Quality & Preprocessing
Tanpa ini, semua model = *garbage in, garbage out*.
- Deteksi & tangani: gap/missing, outlier keras, spike sensor, flatline (sensor mati/beku), drift kalibrasi, satuan tidak konsisten.
- Resampling ke grid waktu seragam, imputasi terkontrol, penandaan kualitas data.
- **Sensor health score** per channel (layak dipakai model atau tidak).

### 4.1 Anomaly Detection — "ada yang tidak beres"
Jenis anomali khas air yang harus dikenali:

| Anomali | Tanda | Dampak |
|---------|-------|--------|
| **Burst / pipa pecah** | flow melonjak + tekanan drop mendadak & bersamaan | real loss besar, mendadak |
| **Background leakage** | **MNF (Minimum Night Flow)** naik perlahan dari baseline | real loss akumulatif |
| **Meter macet / mundur** | flow pelanggan flat/nol/negatif saat harusnya ada | apparent loss |
| **Pencurian / sambungan ilegal** | konsumsi pada jam tak wajar, pola menyimpang | apparent loss |
| **Sensor fault** | flatline, spike, noise berlebih, drift | data korup → alarm palsu |
| **Tekanan abnormal** | transient / water hammer / drop zona | risiko pipa & layanan |

Kebutuhan kunci:
- **Baseline musiman** (per jam-hari, weekday/weekend) — "normal" itu relatif waktu.
- **Multi-signal correlation** — burst = flow↑ **dan** pressure↓ bersamaan (lebih pasti daripada satu sinyal).
- **Skoring + grading** (mild→critical) yang **terkalibrasi** (hindari 46rb "critical" seperti pendekatan lama yang bikin *alarm fatigue*).
- **Explainable**: sertakan "nilai wajar" (expected band) vs aktual.

### 4.2 Forecasting — "apa yang akan terjadi"
| Target forecast | Horizon | Gunanya |
|-----------------|---------|---------|
| **Demand/konsumsi** | jam–hari | operasi pompa, neraca air, antisipasi puncak |
| **Level reservoir** | jam | cegah kosong (layanan mati) / luapan (rugi) |
| **Tekanan** | jam | manajemen tekanan, cegah gangguan |
| **Tren MNF / leak** | hari–minggu | prediksi kapan bocor jadi kritis (early warning) |
| **Energi pompa** | hari | optimasi biaya listrik (jam beban) |
| **Degradasi/kegagalan aset** | minggu | predictive maintenance pompa/valve |

Kebutuhan kunci: **interval kepercayaan** (bukan titik tunggal), penanganan
musiman (harian/mingguan), dan re-training berkala.

### 4.3 Warning / Early Warning — "bertindak sebelum parah"
Dua kelas peringatan:
- **Reactive alert** — kondisi sudah terjadi (ambang terlampaui). Cepat, deterministik.
- **Predictive / early warning** — dari forecast/tren: *"reservoir diprediksi kosong 3 jam lagi"*, *"MNF naik, DMA X akan melewati ambang kritis dalam ~5 hari"*. **Ini pembeda utama.**

Kebutuhan kunci (agar operator PERCAYA alarm):
- **Ambang dinamis/adaptif** per DMA & waktu (bukan satu angka statis).
- **Anti-noise**: debounce (harus bertahan N periode), hysteresis (band clear ≠ band trigger), dedup, cooldown, eskalasi severity.
- **Prioritas** = severity × dampak (Rp) × confidence.
- **Leak score / NRW risk score** per DMA sebagai indikator ringkas.

### 4.4 Decision Support & Insight — "jadi harus apa"
- **Kuantifikasi NRW**: m³/hari hilang, **Rp/hari**, %NRW per DMA & tren.
- **Lokalisasi / root-cause hint**: korelasi hulu-hilir mempersempit segmen.
- **Rekomendasi tindakan**: step test malam, patroli, kalibrasi meter, atur tekanan.
- **What-if / simulasi**: mis. turunkan tekanan X bar → estimasi penurunan NRW.
- **Reporting & KPI**: neraca air, tren NRW, efektivitas intervensi.

---

## 5. Use Case Konkret (skenario PDAM)

- **UC-1 Deteksi burst malam.** 02:30 flow inlet DMA melonjak 3× + tekanan turun → alarm kritis + estimasi kehilangan + segmen dugaan.
- **UC-2 Bocor latar meningkat.** MNF DMA naik 8→14 m³/jam selama 2 minggu → early warning + ranking prioritas + estimasi Rp.
- **UC-3 Meter pelanggan macet.** Konsumsi SR besar tiba-tiba nol berhari-hari → dugaan apparent loss → daftar meter untuk dicek.
- **UC-4 Reservoir mau kosong.** Forecast level < ambang dalam 3 jam → peringatan agar pompa dinyalakan / atur distribusi.
- **UC-5 Optimasi energi pompa.** Rekomendasi jadwal pompa mengikuti demand & tarif listrik → hemat kWh tanpa ganggu layanan.
- **UC-6 Prediksi kegagalan pompa.** Tren daya/arus/getaran memburuk → prediksi jendela kegagalan → jadwalkan perawatan.
- **UC-7 Ranking DMA prioritas NRW.** Dashboard manajer: DMA diurut berdasarkan skor risiko × kehilangan Rp untuk alokasi tim.

Tiap UC nanti dijabarkan jadi: trigger → data → logika → output → tindakan.

---

## 6. Output Modul (kontrak konseptual — bukan skema DB)

Apa yang **dihasilkan** modul (bentuk final: skema di dok 06, endpoint di dok 08):

1. **Anomaly events** — {waktu, channel/DMA, tipe, skor, grade, nilai aktual, expected band, dugaan lokasi, confidence}.
2. **Forecasts** — {target, horizon, deret prediksi + lower/upper bound, confidence, model}.
3. **Warnings / insights** — {judul actionable, severity, dampak m³ & Rp, rekomendasi, confidence, referensi bukti}.
4. **Scores** — leak score & NRW risk per DMA, sensor health, data quality.

Semua output harus: **terisolasi per tenant, explainable, dan punya confidence.**

---

## 7. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
|-------|-----------|
| **Explainability** | Operator harus paham *kenapa* alarm muncul. Tanpa ini, alarm diabaikan. Kritikal. |
| **Akurasi vs false-positive** | Target recall tinggi untuk burst; false-positive rendah agar tidak *alarm fatigue*. Perlu metrik & tuning per tenant. |
| **Latency** | Real-time (detik–menit) untuk burst/ambang; batch (nightly) untuk MNF, forecast, retraining. |
| **Cold start** | Butuh jendela belajar (±2–8 minggu) sebelum model matang; sediakan mode fallback (aturan statistik) selama itu. |
| **Retraining & drift** | Jadwal retraining + deteksi *concept drift* (pola berubah karena musim/jaringan). |
| **Multi-tenant** | Isolasi data & model per PDAM; tidak ada kebocoran antar tenant. |
| **Skalabilitas** | Ribuan channel; evaluasi hemat biaya (streaming + batch). |
| **Biaya compute** | Model AI mahal; seimbangkan akurasi vs biaya (mis. statistik dulu, ML untuk yang bernilai tinggi). |
| **Feature-gating** | Sesuai tier langganan: monitoring dasar → anomali → leak/forecast → prediktif (premium). |

---

## 8. Arsitektur — gambaran ringkas (detail di dok 02)

Sesuai versi lama: **service AI Python terpisah**. Gambaran konseptual:

```
Telemetry (stream/batch)
        │
        ▼
[AI-NRW Service — Python]
  ├─ Preprocessing & data-quality
  ├─ Anomaly engine (statistik + ML)
  ├─ Forecasting engine
  ├─ NRW/leak scoring & insight generator
  └─ (training & model registry)
        │  hasil: anomaly / forecast / warning / score
        ▼
  API / message queue  ──►  Backend platform  ──►  UI (operator, manajer, mobile)
```

Prinsip: modul AI **menghitung & menghasilkan insight**; platform utama
**menyimpan, menyajikan, dan mengirim notifikasi**. Batas tanggung jawab dipertegas
di dok 05 (arsitektur). (Belum diputuskan di sini — fokus dokumen ini kebutuhan, bukan arsitektur.)

---

## 9. Peta Metode AI (kandidat — keputusan resmi di dok 07)

| Kebutuhan | Kandidat metode | Catatan |
|-----------|-----------------|---------|
| Baseline & anomali statistik | z-score musiman, EWMA, S-H-ESD, MAD | murah, explainable, untuk cold-start & mayoritas channel |
| Anomali kompleks | Isolation Forest, Autoencoder, RCF | untuk pola multivariat/halus |
| Deteksi burst | rule multi-signal + change-point detection | flow↑ & pressure↓ bersamaan |
| Forecast deret waktu | Prophet, SARIMA, XGBoost, LSTM/GRU, TFT | pilih per target & horizon |
| Leak/MNF | analisis MNF + regresi tren + Leak Score multifaktor | domain-specific PDAM |
| Predictive maintenance | tren degradasi + survival/regresi | butuh sinyal aset |

Prinsip pemilihan: **mulai dari yang sederhana & explainable**, naikkan kompleksitas
hanya bila memberi nilai nyata.

---

## 10. Prioritas / Fase (ringkas — detail di dok 09)

- **P0 — Fondasi data & anomali dasar.** Preprocessing, data-quality, baseline
  statistik, deteksi burst/flatline, kuantifikasi kehilangan awal. Nilai cepat, murah.
- **P1 — NRW & leak.** MNF analysis, leak score per DMA, ranking prioritas, dampak Rp.
- **P2 — Forecasting.** Demand, level reservoir, tekanan, tren MNF → early warning prediktif.
- **P3 — Prediktif lanjut.** Predictive maintenance, optimasi energi, what-if/simulasi,
  model kustom per pelanggan.

---

## 11. Asumsi & Pertanyaan Terbuka (perlu jawaban Anda untuk pertajam)

**Asumsi sementara:** data telemetry deret waktu tersedia per channel dengan
interval tetap; minimal ada flow & pressure; setiap PDAM = 1 tenant.

Pertanyaan yang **mengubah isi desain**:

1. **Sinyal apa saja yang benar-benar tersedia?** (flow, pressure, level, energi
   pompa, kualitas air?) Interval telemetry berapa (1/5/15 menit)?
2. **Versi lama Python** — model apa yang dipakai (Isolation Forest? Prophet/LSTM?),
   output apa yang dihasilkan, dan **kenapa dirancang ulang** (kurang akurat? mahal?
   sulit dipelihara?)? Apa yang mau dipertahankan vs diganti?
3. **Data komersial** — apakah ada meter pelanggan (AMR/AMI), volume produksi WTP,
   dan data billing? Ini menentukan apakah kita bisa hitung **NRW penuh** atau baru
   **indikator kehilangan** dari sisi hidrolik saja.
4. **Struktur jaringan** — apakah konsep **DMA** & hubungan hulu-hilir antar node
   sudah termodel? Ini kunci untuk korelasi & lokalisasi kebocoran.
5. **Tarif air (Rp/m³)** per tenant — untuk kuantifikasi dampak Rupiah.
6. **Target deployment** — service Python berdiri sendiri; bagaimana ekspektasi
   integrasi ke platform (API sinkron vs antrian/async, batch vs streaming)?
7. **Cuaca/kalender** — apakah sumber data eksternal (cuaca, hari libur) boleh dipakai
   untuk memperbaiki forecast?

> Jawaban atas 1–4 paling menentukan cakupan. Setelah itu desain lanjut ke dok 05
> (arsitektur) & 07 (metode ML) dengan asumsi yang sudah terkunci.
>
> **Status (Jul 2026):** sebagian besar pertanyaan di atas sudah terjawab lewat
> keputusan di dok 03–07 (sumber = ClickHouse, interval 2 menit, config opt-in,
> tekanan sebagai pondasi). Sisa yang bergantung data pelanggan/DMA (NRW penuh,
> tarif Rp, topologi) dikerjakan di Layer 2–3 (dok 09 P3).
