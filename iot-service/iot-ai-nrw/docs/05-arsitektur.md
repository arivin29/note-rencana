# 05 — Arsitektur Service AI-NRW

> Cara kerja **runtime**: bentuk service, siklus micro-batch, irama (cadence),
> integrasi ke platform (ClickHouse/Postgres/Go/Angular), dan jalur **scaling** dari
> 11 tenant sekarang → ~200 PDAM. Menjadikan **tekanan** sebagai reference implementation:
> pipeline di sini **generik** — kategori lain hanya mengganti "kamus" (detektor + arti).

Acuan yang sudah dikunci (dok 03/04): baca **ClickHouse**, config di **PostgreSQL**
(berversi, opt-in default OFF), worker target **2 vCPU / 2 GB**.

---

## 1. Bentuk service (high-level)

Service AI adalah **worker Python mandiri** — bukan bagian dari backend Go, bukan API
yang menunggu request. Ia berjalan terus, menarik data, menghitung, menulis hasil.

```
        ┌─────────────────────────── PYTHON AI SERVICE (worker) ───────────────────────────┐
        │  Scheduler → Config Loader → Ingestor → Detector Engine → Event Manager → Store   │
        │                                        └→ Forecaster (job harian terpisah)        │
        └──────────────────────────────────────────────────────────────────────────────────┘
   baca ▲                         baca ▲ config                         tulis ▼ event/forecast/baseline
        │                              │                                       │
 ┌──────┴───────┐              ┌───────┴────────┐                      ┌───────┴────────┐
 │  ClickHouse  │              │   PostgreSQL   │                      │   PostgreSQL   │
 │  (telemetry) │              │   (ai_config)  │                      │ (ai_event, …)  │
 └──────────────┘              └────────────────┘                      └───────┬────────┘
                                                                               │ baca & serve
                                                                       ┌───────┴────────┐
                                                                       │  Go backend    │→ Angular
                                                                       └────────────────┘
```

**Integrasi = shared DB** (bukan API antar-service). Python **menulis** event/forecast ke
Postgres; Go **membaca** & menyajikannya lewat kontrak API yang sudah ada; Angular
menampilkan. Ini paling sederhana & pas untuk skala kita. (Queue/HTTP internal menyusul
hanya bila butuh push real-time — lihat §7.)

---

## 2. Komponen worker

| # | Komponen | Tugas | Sumber → Tujuan |
|---|----------|-------|-----------------|
| 1 | **Scheduler** | pemicu berkala (APScheduler in-proc) | — |
| 2 | **Config Loader** | baca target yang ON + params (cache, refresh berkala) | `ai_config` → memori |
| 3 | **Ingestor** | tarik titik baru sejak checkpoint, **borongan per-tenant** | ClickHouse → memori |
| 4 | **Baseline Updater** | update grid median/MAD + state online (inkremental) | `ai_baseline` ↔ memori |
| 5 | **Detector Engine** | jalankan A1–A10 (River/ADTK) per channel ON | memori → sinyal |
| 6 | **Event Manager** | sinyal → lifecycle (buat/update/auto-close/rekurensi) | sinyal → `ai_event` |
| 7 | **Forecaster** | job **harian** terpisah, tulis forecast 30 hari | ClickHouse → `ai_forecast` |
| 8 | **Checkpointer** | simpan `last_ts` per (tenant,channel) + state | → `ai_baseline`/checkpoint |

Komponen 1–6 = jalur **anomali** (sering, ringan). Komponen 7 = jalur **forecast**
(jarang, berat). Dipisah agar bisa di-scale sendiri (§6).

---

## 3. Siklus micro-batch (satu putaran anomali)

Dijalankan tiap **cadence** (default **5 menit** — lihat §4) untuk tiap tenant:

```
1. LOAD CONFIG    channel mana ON? params-nya? (dari cache Config Loader)
2. INGEST         1 query borongan: semua channel ON tenant ini, ts > checkpoint
3. PER CHANNEL:
   a. CEK JADWAL   active_schedule → jam aktif? jam mati → suppress A1/A5, skip deteksi hidrolik
   b. BASELINE     update grid slot (jam×hari) inkremental dari titik baru
   c. DETEKSI      A1..A10 pakai baseline + state → sinyal mentah
   d. EVENT        sinyal → Event Manager (buat / update / auto-close)
4. CHECKPOINT     simpan last_ts + state online (CUSUM/EWMA) → worker stateless
```

Sifat siklus (dari prinsip dok 03):
- **Inkremental** — hanya titik baru, bukan recompute jendela penuh.
- **Idempotent + checkpoint** — worker mati → restart → lanjut dari `last_ts`, tanpa dobel.
- **Borongan per-tenant** — 1 query menarik semua channel ON tenant, bukan N query
  (hindari N+1 ke ClickHouse; ini bottleneck sebenarnya di skala besar, bukan CPU Python).

---

## 4. Irama (Cadence) — **default 5 menit**

Data telemetry masuk tiap **2 menit**, tetapi **pemrosesan AI tidak perlu seketat itu.**

> **Keputusan: cadence anomali default = 5 menit** (configurable per channel/tenant).
> Ini menggantikan asumsi "proses tiap 2 menit" pada dok 03/04. Alasan: 5 menit tetap
> jauh dari kebutuhan real-time PDAM (fenomena tekanan/aliran bergerak menit–jam),
> memangkas beban ~60%, dan tiap siklus memproses 2–3 titik sekaligus (lebih stabil,
> less noise). Channel kritis boleh diturunkan (mis. 2 menit); channel stabil dinaikkan.

Tiga irama berbeda (kunci hemat 2c/2g):

| Tugas | Cadence default | Kenapa |
|-------|-----------------|--------|
| **Anomali** (A1–A10) | **5 menit** (configurable 2–15) | butuh cukup cepat; River/ADTK O(1) → murah |
| **Forecast** 30 hari | **1×/hari** (dini hari, jam sepi) | mahal; hasil dipakai seharian |
| **Rekurensi / pola kambuh-pulih** | 1×/jam atau 1×/hari | agregasi event, ringan |
| **Refresh baseline penuh** | harian (inkremental) | pola bergerak lambat |

Jadi bukan "hitung semua tiap 2 menit". Hanya anomali yang berirama pendek; forecast
menumpuk sekali sehari saat beban rendah.

---

## 5. Streaming vs micro-batch — **micro-batch** (dikunci)

| | Micro-batch (**dipilih**) | Streaming murni |
|---|---|---|
| Cara | tiap N menit: tarik → proses → tulis | konsumsi tiap pesan MQTT masuk |
| State | di DB/checkpoint → **worker stateless** | di memori → hilang saat restart |
| Recovery | ulang dari checkpoint (mudah) | harus snapshot state rajin |
| Debug | mudah (batch diskret) | sulit (aliran kontinu) |
| Cocok untuk | data menit-an (PDAM) ✅ | data per-detik |

Data 2 menit → micro-batch **lebih dari cukup** dan jauh lebih tahan-banting. State
online (CUSUM/EWMA River) tetap dipakai, tapi **di-checkpoint ke DB** tiap siklus →
gabungan "hemat seperti streaming" + "tahan-restart seperti batch".

---

## 6. Scaling: 11 tenant → ~200 PDAM

Beban "hitung" kecil; yang menentukan scaling = **cara membagi kerja + DB**. Empat
prinsip yang dipegang **dari hari-1** agar jalur ke 200 PDAM lurus (tanpa tulis ulang):

1. **Shard key = tenant (PDAM / `idOwner`).** Antar-PDAM tak saling hitung
   ("embarrassingly parallel"). Walau sekarang 1 worker, perlakukan seolah banyak shard.
2. **Worker stateless** (state di DB/checkpoint) → worker mana pun bisa pegang PDAM mana
   pun; tambah/kurang worker bebas.
3. **Pisah pool Anomali (sering, ringan) vs Forecast (harian, berat)** → di-scale sendiri;
   pool forecast bisa nyala hanya dini hari lalu mati (hemat).
4. **Semua digerakkan config table** → tambah PDAM/sensor = insert baris, **nol perubahan kode**.

**Kapasitas kasar** (anomali; River/ADTK ~5 ms/channel/siklus, jatah siklus 5 menit):

| Setup | Channel ON | ≈ PDAM (300 ch) | Infra |
|-------|-----------|-----------------|-------|
| Sekarang | 170 | 11 tenant kecil | 1 worker 2c/2g |
| **1 worker** | ~3.000–5.000 | **~10–15 PDAM** | tetap 2c/2g |
| 5 worker | ~15.000 | **~50 PDAM** | 5× container kecil, shard by tenant |
| 20 worker | ~60.000 | **~200 PDAM** | fleet + DB di-scale (§ dok 06) |

Patokan aman untuk sizing: **1 worker kecil = ~10 PDAM**; scale linear dengan menambah
worker. Yang teriak duluan di skala besar **bukan** ClickHouse/Python, tapi **(a) tabel
event Postgres** (→ lifecycle + partisi wajib) dan **(b) pola baca ClickHouse** (→ baca
borongan per-tenant + agregat turunan). Detail DB → dok 06.

**Distribusi kerja** saat >1 worker: koordinator ringan / tabel `worker_assignment`
(atau queue) memetakan tenant→worker. Tak perlu Kafka/Flink di jalur ini.

---

## 7. Integrasi ke platform

| Jalur | Mekanisme | Kapan |
|-------|-----------|-------|
| AI menulis hasil | **shared DB** (Postgres) — Go baca & serve | **default** (dipilih) |
| Notifikasi push | queue (Redis/NATS) → backend push ke UI | menyusul, bila butuh real-time |
| Forecast on-demand | HTTP internal Go→Python | opsional, jarang |

Kontrak ke Angular **tidak baru**: Go mengekspos `ai_event`/`ai_forecast`/`ai_config`
lewat pola envelope list/single yang sudah baku (`{data, meta}`). Detail endpoint → dok 08.

---

## 8. Deployment & keandalan

- **1 container Python**, 2 vCPU / 2 GB — cukup s/d ~10 PDAM. Horizontal (per-tenant)
  saat tumbuh.
- **Scheduler in-proc (APScheduler)** — belum perlu Airflow/Celery.
- **Idempotent + checkpoint** → aman restart/crash; bisa **replay** rentang waktu (berguna
  saat menambah detektor / mengganti param → hitung ulang histori).
- **Config runtime** → ubah `ai_config` tanpa redeploy; worker baca versi terbaru tiap
  refresh Config Loader.
- **Observability**: log per siklus (channel diproses, durasi, event dibuat), metrik
  footprint (CPU/RAM), lag checkpoint (seberapa jauh di belakang `now`).

---

## 9. Topologi Repo & Kepemilikan Skema (KEPUTUSAN TERKUNCI)

AI-NRW dibangun sebagai **project/repo terpisah** — **bukan** digabung ke `iot-backend-go`.
Alasan: bahasa/runtime beda (Python vs Go), unit deploy & scaling beda (worker vs API),
coupling nol di level kode (integrasi hanya shared-DB), dan konsisten dengan pola workspace
(tiap service = repo sendiri: `iot-angular`, `iot-backend-go`, `iot-scada`, `iot-gtw`).

**Lokasi:** `/Users/…/iot-service/iot-ai-nrw` (sibling dari `iot-angular`).

```
iot-ai-nrw/         ← BARU (Python worker) — OTAK analitik + OWNER skema ai_*
   src/ai_nrw/{config,ingest,baseline,detectors,forecast,events,recurrence,scheduler,store}
   migrations/      ← Alembic: satu-satunya pemilik migrasi ai_*
   docs/            ← seri desain 01–09 (pindah ke sini, ikut service-nya)

iot-backend-go/     ← tambah modul READ-ONLY (dok 08): serve ai_* ke Angular. TIDAK migrasi ai_*.
iot-angular/        ← 4 layar AI (AI Settings, Event Inbox, Detail, Analytics).
```

**Kepemilikan data (batas kontrak — hindari "dua tuan"):**
| Data | Pemilik (tulis + migrasi) | Konsumen (read) |
|------|---------------------------|-----------------|
| `ai_*` (Postgres) | **iot-ai-nrw** (Alembic) | iot-backend-go (GORM read-only) |
| telemetry (ClickHouse) | platform | iot-ai-nrw (read-only) |
| tabel bisnis lain | iot-backend-go | iot-ai-nrw (read bila perlu) |

**Belum perlu sekarang:** message queue / gRPC antar-service. **Shared-DB = kontrak
yang cukup** untuk skala ini (§7); queue menyusul hanya bila butuh push real-time.

---

## 10. Ringkas keputusan (dok 05)
1. Service = **worker Python mandiri** (repo `iot-ai-nrw` terpisah, §9); integrasi via
   **shared DB** (Go baca, Python tulis).
2. **Micro-batch** (bukan streaming); state online di-**checkpoint** → worker **stateless**.
3. **Cadence anomali default 5 menit** (data ingest tetap 2 menit) — menggantikan asumsi
   2 menit di dok 03/04. Forecast **harian**.
4. Scaling by **shard-per-tenant** + pisah pool anomali/forecast → **1 worker ≈ 10 PDAM**,
   linear s/d ~200 PDAM tanpa tulis ulang.
5. Pipeline **generik** — tekanan = reference; kategori lain ganti "kamus" saja.

> Skema tabel konkret (`ai_config`, `ai_baseline`, `ai_event`, `ai_event_log`,
> `ai_forecast`) → **dok 06**. Alur satu event tekanan end-to-end → `kategori/tekanan.md` §11.
