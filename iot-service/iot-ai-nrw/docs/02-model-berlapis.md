# 02 — Model Analitik Berlapis (Layered) & Pembagian Kerja

> Strategi: bangun analitik **berlapis dari unit terkecil → gabungan → jaringan**,
> supaya mudah dibagi tim dan tiap lapis bisa jalan/berguna sendiri sebelum lapis
> berikutnya siap. Fokus awal: **per sensor channel**.
>
> Konteks input (dikonfirmasi):
> - **Semua metric** yang ada di sensor type / channel masuk ruang lingkup (bukan hanya tekanan).
> - Data telemetry masuk **tiap ±2 menit**.
> - Fase awal fokus **data sensor** (belum DMA/jaringan penuh).
> - Unit analisa = **sensor channel** (bukan "sensor" seperti struktur lama).

---

## 1. Prinsip Layering

| Prinsip | Maksud |
|---------|--------|
| **Unit terkecil dulu** | Layer 1 memproses tiap channel independen — logika seragam, paralel, mudah dites. |
| **Setiap lapis berdiri sendiri** | L1 sudah memberi nilai (anomali per channel) tanpa menunggu L2. |
| **Lapis atas = komposisi lapis bawah** | L2 memakai output/relasi 2 channel; L3 mengagregasi banyak channel; dst. |
| **Metric-agnostic** | Logika L1 tidak tahu "ini tekanan/debit/level" — hanya deret angka + konfigurasi channel. Perilaku khusus diatur lewat **profil channel**, bukan hard-code. |
| **Explainable & terkalibrasi** | Setiap anomali menyertakan alasan (nilai vs baseline/threshold) + severity + confidence, agar tidak *alarm fatigue*. |

---

## 2. Peta Lapisan

| Layer | Cakupan | Contoh keluaran | Prasyarat | Prioritas |
|-------|---------|-----------------|-----------|-----------|
| **L1 — Per Sensor Channel** | 1 channel independen | baseline adaptif, anomali A1–A10 per channel, health channel | data channel + konfigurasi | **P0 (mulai di sini)** |
| **L2 — Kombinasi 1–2 Channel** | relasi antar 2 channel (biasanya 1 node/titik) | burst signature (flow↑ & pressure↓), selisih inlet–outlet, efisiensi pompa (power vs flow) | mapping relasi channel | P1 |
| **L3 — Grup / DMA** | agregasi banyak channel dalam 1 zona | MNF per DMA, neraca air, leak score & ranking DMA | model DMA + topologi | P2 |
| **L4 — Jaringan / lintas-DMA** | korelasi antar zona | lokalisasi root-cause, propagasi tekanan | topologi jaringan | P3 |
| **L5 — Forecasting & Prediktif** | menembus semua layer | forecast nilai/demand/level, tren MNF, prediksi kegagalan | riwayat cukup | tumbuh dari L1→L3 |

> L5 (forecasting) **dimulai kecil di L1** (forecast nilai per channel untuk
> early-warning "akan melewati ambang X jam lagi") lalu meluas ke demand/level/MNF
> di L3.

---

## 3. LAYER 1 — Spesifikasi Per Sensor Channel (fokus fase ini)

Formalisasi + generalisasi dari script lama (`update_baseline_ai_v2.py`,
`deteksi_anomali_ai_v2.py`). Struktur data final ada di dok 06 (model data) — di sini
**konseptual per channel**.

### 3.1 Sub-modul L1

```
L1.1 Data Quality & Cleaning   → bersihkan & tandai kualitas tiap titik
L1.2 Baseline Musiman          → pola "normal" per (hari, slot waktu)
L1.3 Adaptive Threshold        → ambang AI = baseline ± k·stddev, fallback ke user
L1.4 Anomaly Detection         → deteksi A1–A10 + episode/dedup
L1.5 (opsional) Forecast Channel→ tren jangka pendek → early-warning per channel
```

### 3.2 L1.1 — Data Quality & Cleaning
Per titik data channel:
- Buang/tandai sebagai **data cacat**: `null`/non-numerik, nilai **negatif** (untuk
  metric yang tak boleh negatif), spike keras yang tak masuk akal fisik.
- **Nilai di luar `min_threshold`/`max_threshold` channel TIDAK dibuang** — itu bukan "invalid",
  melainkan urusan **A2/A3** (rendah/tinggi). Lihat keputusan terkunci di §3.4.
- **Gap handling**: data 2-menit → deteksi missing (interval > 2× nominal). Isi
  hanya untuk keperluan baseline (jangan palsukan data mentah).
- Hasil: `value_clean` + flag kualitas. Titik cacat **tidak** ikut hitung baseline.

> Dari kode lama: `value_clean = value bila (notnull & ≥0)`. Aturan lama yang juga
> mensyaratkan `min_threshold ≤ value ≤ max_threshold` **tidak dipakai** untuk membuang data —
> nilai di luar range tetap dipakai & memicu A2/A3. Aturan "≥0" jadi **opsi per profil
> channel** (`allow_negative`; sebagian metric boleh negatif, mis. selisih/flow balik).

### 3.3 L1.2 — Baseline Musiman (per channel)
Tujuan: "normal itu relatif waktu". Langkah (mengikuti + memperbaiki kode lama):

1. **Slotting waktu**: kelompokkan per `(hari_dalam_minggu, slot_waktu)`.
   - Kode lama: slot **10 menit** (`menit//10*10`) → 7 hari × 144 slot = 1008 slot/channel.
   - Data 2-menit → tiap slot 10-menit berisi ±5 sampel. **Slot 10-menit dipertahankan**
     (bisa dikonfigurasi 5/10/15). Trade-off granularitas vs stabilitas.
2. **Jendela belajar**: default **3 minggu** terakhir (kode lama). Konfigurabel;
   makin panjang makin stabil, tapi lambat ikut perubahan musim.
3. **Isi slot kosong**: rata-rata slot yang sama (hari+waktu), lalu fallback ke
   rata-rata waktu lintas-hari bila masih kosong (`is_fallback=true`, confidence turun).
4. **Skip slot fluktuatif**: jika `range slot > ambang` (mis. 0.7) → slot dianggap
   terlalu volatile (mis. **pompa otomatis**) dan tidak dipakai bikin ambang ketat —
   **KECUALI** channel berprofil "actuated/cyclic" (dulu `is_pompa_boost`).
   Digeneralkan jadi **profil channel** (lihat §3.6).
5. **Statistik baseline per slot**: `avg`, `stddev`.
   - **Perbaikan disarankan**: sediakan opsi **robust** (median + MAD) agar tahan outlier;
     mean/std tetap default untuk kompatibilitas.
6. **Smoothing**: rolling mean 5 slot (center) agar ambang tidak bergerigi. Dipertahankan.
7. **Clamp**: `threshold_min ≥ 0.01` (untuk metric non-negatif). Jadi opsi per profil.

Keluaran L1.2: tabel baseline per `(channel, hari, slot)` = {avg, stddev, is_fallback,
slot_range, skip_slot, confidence}.

### 3.4 L1.3 — Adaptive Threshold
```
threshold_min_ai = avg − k · stddev
threshold_max_ai = avg + k · stddev      (k = std_multiplier, default 1.5)
```
**Precedence ambang saat evaluasi** (KEPUTUSAN TERKUNCI — 2 lapis saja):
1. **AI baseline** untuk slot & channel ini (bila ada & `conf ≥ conf_min`) →
2. **User `min_threshold`/`max_threshold`** channel (batas layanan yang di-setting user).

> **Batas fisik dari `sensor_type` DIABAIKAN** (tidak ada lapis ke-3). Satu-satunya
> acuan manual = `min_threshold`/`max_threshold` di `sensor_channel`. Ini keputusan yang berlaku
> untuk semua kategori (ditetapkan di [`kategori/tekanan.md`](./kategori/tekanan.md) §1/§3),
> menggantikan pola lama 3-lapis. Nilai negatif/null tetap A1; di luar range = A2/A3.

### 3.5 L1.4 — Anomaly Detection + Episode/Dedup
Evaluasi berjalan berkala (mis. tiap beberapa menit) atas jendela data terakhir
(kode lama: **4 jam**), memakai ambang dari §3.4.

**Taksonomi anomali (generalisasi, metric-agnostic).** Kode lama pakai A1/A2/A3/A7/A8
khusus tekanan; diperluas & dinetralkan:

| Kode | Nama (umum) | Definisi | Asal |
|------|-------------|----------|------|
| **A1** | Invalid / negatif | nilai < 0 atau `null`/non-numerik (BUKAN sekadar di luar range → itu A2/A3) | lama (tekanan negatif) |
| **A2** | Low sustained | di bawah ambang-min menerus ≥ T (mis. 15 mnt) | lama |
| **A3** | High sustained | di atas ambang-max menerus ≥ T | lama |
| **A4** | Spike / rate-of-change | Δnilai per waktu > batas (lonjakan mendadak) | **baru** — penting untuk burst/transient |
| **A5** | Flatline / stuck | nilai (nyaris) tak berubah ≥ N sampel → sensor beku/meter macet | **baru** — kunci apparent-loss & sensor fault |
| **A6** | Erratic / noise | varians abnormal dibanding baseline slot | baru (opsional) |
| **A7** | No-data | tidak kirim data > T (2-menit → mis. > 10 mnt) | lama |
| **A8** | Persistent out-of-range | seluruh jendela (mis. > 4 jam) di luar ambang | lama |
| **A9** | Baseline deviation (AI) | keluar band statistik (|z| > k) walau masih dalam user-range | **baru** — inti "AI anomaly" (yang membedakan dari ambang tetap) |
| **A10** | Drift kumulatif (CUSUM/EWMA) | pergeseran kecil **menahun** dari baseline (CUSUM `S±`, EWMA `z_t`) yang lolos A9 | **baru** — standar SPC; kunci **bocor lambat** (NRW) |

> Catatan: A2/A3 = pelanggaran **ambang** (bisa AI atau user). A9 = penyimpangan
> **pola musiman seketika**; **A10** = penyimpangan **perlahan/akumulatif** (drift) —
> A9 melewatkan shift kecil menahun yang justru tanda kebocoran berkembang. Ketiganya
> perlu, beda guna. Rumus lengkap A10 (CUSUM dua sisi + EWMA-STR) di
> [`kategori/tekanan.md`](./kategori/tekanan.md) §5.12; tool = **River** (dok 07).

**Episode & dedup (dari kode lama, diformalkan):**
- Satu anomali = **episode** {waktu_mulai, waktu_selesai, durasi, nilai_terakhir, status}.
- Gabung dengan episode sebelumnya bila jeda ≤ `max_gap` (lama: **5 menit**) → update
  `waktu_selesai`/`durasi`, jangan bikin event baru. (mekanisme `sensor_anomali_terakhir`.)
- **Tambahan disarankan**: `severity` (dari magnitudo × durasi), `confidence`
  (dari kualitas data + cakupan baseline; slot fallback → confidence rendah),
  dan status lifecycle (baru → berlangsung → selesai/clear).

**Anti-noise wajib** (agar operator percaya): debounce (T menit menerus sebelum
nyala), hysteresis (band clear ≠ band trigger), cooldown antar re-alert.

### 3.6 L1.6 — Konfigurasi per Channel (profil)
Agar logika seragam tapi perilaku pas per jenis sinyal:

| Konfig | Guna | Contoh |
|--------|------|--------|
| `user_min` / `user_max` | sanity bound manual | batas fisik channel |
| `std_multiplier` (k) | lebar band AI | 1.5 default; naikkan untuk sinyal ramai |
| `allow_negative` | metric boleh negatif? | flow balik / selisih ya; tekanan tidak |
| `behavior_profile` | steady / cyclic-actuated / bursty | pompa = cyclic → jangan skip fluktuasinya |
| `telemetry_interval` | dasar deteksi no-data & rate | 2 menit |
| `flatline_tolerance`, `spike_limit`, `sustain_T`, `max_gap` | parameter A4/A5/A2-A3 | per channel/profil |

> `behavior_profile` menggantikan flag `is_pompa_boost` lama dengan lebih umum.

### 3.7 L1.5 — Forecast Channel (opsional, benih L5)
Untuk **early-warning prediktif** di level channel: forecast jangka pendek (jam)
+ deteksi **kapan diprediksi melewati ambang**. Mulai sederhana (regresi tren / EWMA /
Prophet per channel), tingkatkan nanti. Ini yang mengubah "sudah bocor" → "akan bermasalah".

### 3.8 Output L1 (kontrak konseptual)
- `channel_baseline` — pola normal per (channel, hari, slot) + confidence.
- `channel_threshold` — ambang efektif terkini (AI/user/default).
- `channel_anomaly` — episode A1–A10 {tipe, mulai, selesai, durasi, nilai, severity, confidence, alasan}.
- `channel_health` — layak-pakai / kualitas data channel.

---

## 4. Apa yang Dipertahankan vs Diperbaiki dari Sistem Lama

| Aspek | Sistem lama (v2) | Rencana baru |
|-------|------------------|--------------|
| Unit analisa | per `sensor` | **per `sensor_channel`** (lebih granular & benar) |
| Cakupan metric | fokus tekanan (A1–A3 dinamai tekanan) | **semua metric**, taksonomi netral |
| Baseline musiman (hari+slot 10mnt, 3 minggu) | ✅ bagus | **dipertahankan**, slot konfigurabel |
| Skip slot fluktuatif + pengecualian pompa | ✅ ide bagus | **dipertahankan** → `behavior_profile` |
| Fallback slot kosong + smoothing + clamp | ✅ | **dipertahankan** |
| Statistik | mean/std (sensitif outlier) | tambah opsi **robust (median/MAD)** |
| Ambang | AI band ± k·std, fallback user | **dipertahankan** + precedence eksplisit |
| Anomali | A1,A2,A3,A7,A8 | **+ A4 spike, A5 flatline, A6 noise, A9 baseline-deviation** |
| Dedup episode (`max_gap` 5 mnt) | ✅ | **dipertahankan** + severity/confidence/lifecycle |
| Forecast | (terpisah/di luar file ini) | jadi **L1.5** lalu L5 |
| Struktur data | MySQL lama (`sensor_data`, `sensors`, ...) | kontrak baru (dok 03), tak terikat DB lama/berjalan |
| Eksekusi | script `DELETE`+rebuild seluruh baseline | inkremental & terjadwal (efisien, dibahas dok 03/05) |

---

## 5. Preview LAYER 2 — Kombinasi 1–2 Channel (fase berikut)
Contoh relasi yang bernilai tinggi (butuh **mapping pasangan channel**):
- **Burst signature**: `flow↑` **dan** `pressure↓` bersamaan di titik sama → dugaan pipa pecah (confidence lebih tinggi dari satu sinyal).
- **Selisih inlet–outlet**: `flow_in − flow_out` pada segmen → estimasi kehilangan.
- **Neraca level**: `level reservoir` vs `flow keluar` → konsistensi volume.
- **Efisiensi pompa**: `power` vs `flow` → deteksi pompa boros/aus.

L2 mengonsumsi anomali & nilai L1, **tidak menghitung ulang dari mentah**.

---

## 6. Pembagian Kerja (usulan)
- **Tim A — L1 engine** (paling paralel): implement L1.1–L1.4 generik untuk semua
  channel + konfigurasi profil. Ini fondasi & sudah punya acuan kode lama.
- **Tim B — L1 kalibrasi & taksonomi**: definisikan parameter default per `sensor_type`
  (k, sustain_T, flatline_tolerance, spike_limit) + A4/A5/A9 baru.
- **Tim C — L2 relasi**: mapping pasangan channel + burst/selisih/efisiensi.
- **Tim D — L5 forecast**: mulai forecast per channel (L1.5).
Dependensi: B menyuplai parameter ke A; C & D menunggu L1 stabil.

---

## 7. Pertanyaan Terbuka Khusus Layer

> **Status (Jul 2026): sebagian besar SUDAH TERJAWAB** di dok 04 & `kategori/tekanan.md`.

1. ✅ **Slot baseline** = **10 menit** default (configurable 5/10/15) — tekanan §8.
2. ✅ **Robust stats (median/MAD)** = **default** (tahan outlier); mean/std opsi — tekanan §2.
3. ⏳ **Parameter default per `sensor_type`** → diganti **preset per kategori metric**
   (94 sensor_type terlalu banyak) — dok 04 §8. Kalibrasi per kategori, bukan per tipe.
4. ✅ **A9** = **auto-ON setelah baseline penuh**, sifat **pengingat** (info), tanpa
   approve — tekanan §5.9. Cold-start di-gate lewat `learn_ready` (dok 07 §7).
5. ✅ **Forecast per channel** = **P1** (setelah deteksi dasar P0 solid) — dok 09.
