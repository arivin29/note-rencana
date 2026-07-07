# 06 — Model Data & Config Store

> Skema **konkret** (DDL-level) untuk service AI-NRW. Semua **generik** (tak menyebut
> "tekanan") → dipakai ulang semua kategori. Telemetry tetap di **ClickHouse**; config,
> event, baseline, forecast di **PostgreSQL**. Nama tabel prefix `ai_`.
>
> Prinsip: **opt-in default OFF** (dok 04), **berversi + audit** (dok 03/04),
> **`params` jsonb** agar tiap analisa punya knob sendiri tanpa ubah skema,
> **worker stateless** (state ada di DB → dok 05).

Konvensi: `id` UUID; waktu `timestamptz` (UTC); tenant = `id_owner` (multi-tenant,
selaras platform). Target = `(target_type, target_id)` — fase ini `sensor_channel`
(node HOLD, dok 04 §3).

> **Grounding skema nyata (Jul 2026, verifikasi vs kode platform):**
> - `target_id` (sensor_channel) = `sensor_channels.id_sensor_channel` (**UUID**).
> - Batas layanan channel = **`sensor_channels.min_threshold` / `max_threshold`**
>   (bukan `min_value`/`max_value` — nama itu dikoreksi di seluruh desain).
> - Kategori metric = **`sensor_types.group_name`** (via `sensor_channels.id_sensor_type`).
> - `id_owner` **tidak ada** di `sensor_channels` → di-resolve saat enable lewat
>   `sensor → node → project → owner`, lalu disimpan denormal di `ai_config.id_owner`.
> - Telemetry: `iot.sensor_telemetry` (`event_time`,`channel_id`,`eng_value`,`raw_value`) → §8.
> - `id_owner` = UUID di semua entitas inti. Semua tabel `ai_*` di bawah tak berubah.

---

## 1. Peta tabel

| Tabel | Peran | Karakter | Volume @200 PDAM |
|-------|-------|----------|------------------|
| `ai_config` | apa yang ON + params per target | statis, kecil | ~ratusan ribu |
| `ai_baseline` | grid musiman + state online | 1 baris/channel, update inkremental | ~60 rb |
| `ai_event` | event + lifecycle + arti | operasional; aktif sedikit, closed di-partisi | ~jt/thn (partisi) |
| `ai_event_log` | jejak transisi status (audit) | append-only | ~jt/thn |
| `ai_forecast` | hasil forecast terbaru per channel | overwrite harian, jsonb | ~60 rb |
| `ai_recurrence` | rekap pola kambuh-pulih per target | agregat, 1 baris/target/tipe | ~ratusan rb |

ClickHouse (sudah ada): **`iot.sensor_telemetry`** raw 2-menit (kolom di §8) — sumber baca
Ingestor & Forecaster. Rollup/TTL = optimasi nanti (belum ada).

---

## 2. `ai_config` — langganan analisa per target

```sql
CREATE TABLE ai_config (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_owner       uuid NOT NULL,                       -- tenant (PDAM) = shard key
  target_type    text NOT NULL,                       -- 'sensor_channel' | 'node'(HOLD)
  target_id      uuid NOT NULL,                       -- id_sensor_channel
  analysis_type  text NOT NULL,                        -- 'baseline'|'A2_low'|'A10_drift'|'forecast'|'night_pressure'|…
  enabled        boolean NOT NULL DEFAULT false,       -- OPT-IN: default OFF
  preset         text,                                 -- kategori metric preset dipakai (dok 04 §8)
  params         jsonb NOT NULL DEFAULT '{}',          -- knob: {k,sustain_T,horizon,active_schedule,λ,h,…}
  severity_default text,                               -- 'info'|'warning'|'critical'
  cadence_sec    integer,                              -- override irama (default 300 = 5 menit, dok 05 §4)
  notify         jsonb DEFAULT '{}',                   -- {channels,recipients,quiet_hours}
  version        integer NOT NULL DEFAULT 1,
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, analysis_type)
);
CREATE INDEX ix_ai_config_active ON ai_config (id_owner, enabled) WHERE enabled;
```
(Migrasi `0001` menambah CHECK pada `target_type`/`severity_default`/`cadence_sec`.)

- Worker hanya memproses baris `enabled = true` → beban ~ sebanding adopsi.
- **`params` jsonb** memuat semua knob spesifik: mis. `active_schedule` (kasus "nyala 20
  jam"), `horizon`, `k`, `λ/κ/h` (A10), `night_window`.
- **Versi & audit**: perubahan menaikkan `version` (+ `created_at`/`updated_at`); histori
  penuh di **`ai_config_history`** (struktur sama + `changed_at`) untuk API versions/rollback
  (dok 08) — **dibuat saat API digarap**, belum di migrasi `0001`.
- **Tanpa FK ke `sensor_channels`** (lintas-domain platform) — config yatim (channel
  dihapus) ditangani **job cleanup**, bukan FK, agar tak mengunci urutan migrasi antar-repo.

**Contoh `params` (channel tekanan, preset "Tekanan"):**
```json
{
  "k": 1.5, "sustain_T": "15m", "allow_negative": false,
  "spike_limit": "auto_p99", "z_threshold": 3,
  "drift": {"lambda": 0.2, "L": 3, "kappa": "0.5s", "h": "4.5s"},
  "forecast": {"horizon_days": 30, "tier": "auto"},
  "night": {"window": "02:00-04:00", "k_night": 3},
  "active_schedule": {"mode": "windows", "windows": ["04:00-24:00"], "tz": "Asia/Jakarta"},
  "expected_off": {"suppress": ["A1","A2","A5"], "baseline_excludes_off": true}
}
```

---

## 3. `ai_baseline` — grid musiman + state (worker stateless)

Satu baris per channel; **update inkremental**, bukan rebuild (anti-pattern lama).

```sql
CREATE TABLE ai_baseline (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_owner      uuid NOT NULL,
  target_id     uuid NOT NULL,                          -- id_sensor_channel
  slot_size_min integer NOT NULL DEFAULT 10,            -- granularitas slot
  grid          jsonb NOT NULL,                          -- per slot (hari×bucket): {median, mad, sigma, coverage, n}
  online_state  jsonb NOT NULL DEFAULT '{}',             -- state O(1): {cusum_pos,cusum_neg,ewma_z,welford:{...}}
  night_state   jsonb DEFAULT '{}',                      -- P_night history ringkas (§5.11 tekanan)
  last_ts       timestamptz,                             -- CHECKPOINT: titik terakhir diproses
  learn_ready   boolean NOT NULL DEFAULT false,          -- baseline cukup? (gating A9/A10)
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_id)
);
```

- `grid` = pengganti tabel `sensor_baseline_ai` lama; disimpan **ringkas** (bukan raw).
- `online_state` = CUSUM/EWMA (A10) + Welford → dibaca-tulis tiap siklus → **worker mati
  bisa lanjut** (dok 05 §5).
- `last_ts` = checkpoint idempotent.

---

## 4. `ai_event` — event + lifecycle

Jantung operasional. **Satu kondisi = satu event** (dedup); di-update selama aktif.

```sql
CREATE TABLE ai_event (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  id_owner      uuid NOT NULL,
  target_type   text NOT NULL,
  target_id     uuid NOT NULL,
  analysis_type text NOT NULL,                           -- kode detektor: A2_low, A10_drift, night_pressure…
  status        text NOT NULL DEFAULT 'baru',            -- baru|ditinjau|ditindak|selesai|auto_closed|superseded
  severity      text NOT NULL,                           -- info|warning|critical
  confidence    numeric(4,3),                            -- 0..1 (dok tekanan §6)
  -- fakta kejadian
  started_at    timestamptz NOT NULL,
  last_seen_at  timestamptz NOT NULL,                    -- update tiap siklus selama aktif
  resolved_at   timestamptz,
  duration_sec  integer,                                 -- diisi saat close
  peak_magnitude numeric,                                -- puncak |σ keluar band| selama episode
  -- makna & tindak lanjut
  meaning       text,                                    -- ARTI PDAM (hasil terjemahan; dok tekanan §5)
  context       jsonb DEFAULT '{}',                      -- {value, threshold, slot, z, forecast_ref, …}
  verdict       text,                                    -- benar|false_alarm|abaikan  (validasi user)
  verdict_by    uuid, verdict_at timestamptz,            -- siapa aja boleh; TETAP dicatat (feedback loop)
  assigned_to   uuid, action_note text,
  recurrence_id uuid,                                    -- link ke ai_recurrence (pola kambuh)
  superseded_by uuid,                                    -- bila digantikan event lebih berat
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, started_at)
) PARTITION BY RANGE (started_at);                        -- partisi bulanan; arsip closed
```

Indeks kunci:
```sql
-- DEDUP DIJAMIN DB: maksimum satu event AKTIF per (target, analysis).
CREATE UNIQUE INDEX uq_ai_event_active ON ai_event (target_id, analysis_type)
  WHERE status IN ('baru','ditinjau','ditindak');
-- "event AKTIF yang butuh perhatian operator" (query panas, harus ringan)
CREATE INDEX ix_ai_event_active ON ai_event (id_owner, status, severity, last_seen_at)
  WHERE status IN ('baru','ditinjau','ditindak');
-- history/rekurensi per target
CREATE INDEX ix_ai_event_target ON ai_event (target_id, analysis_type, started_at DESC);
```

> **Integritas (diterapkan di migrasi `0001`):** kolom enum (`status`, `severity`,
> `verdict`, `actor_kind`, `target_type`, `tier`, `trend`) diberi **CHECK**; `confidence`
> di-CHECK 0..1; `ai_event_log.event_id` **FK → ai_event(id) ON DELETE CASCADE**;
> `superseded_by` **FK self**. Partial-unique di atas menjadikan **dedup jaminan DB**, bukan
> sekadar konvensi kode.
>
> **P0 vs skala:** migrasi `0001` membuat `ai_event` **tanpa partisi** (PK `id` saja) demi
> kesederhanaan; partisi bulanan (PK `(id, started_at)`) = migrasi terpisah di **P3**.

**Status lifecycle** (state machine, dok tekanan §11):
```
baru → ditinjau → ditindak → selesai
  └────────────┴───────────→ auto_closed   (pulih sendiri, N periode normal)
  └──────────────────────────→ superseded   (naik jadi event lebih berat)
```
- **Aktif sedikit** (index parsial) → operator ringan walau histori jutaan.
- **Closed/auto_closed** tetap disimpan (partisi bulan) → bahan **pola kambuh-pulih**.

---

## 5. `ai_event_log` — jejak transisi (audit)

```sql
CREATE TABLE ai_event_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL,
  from_status text, to_status text NOT NULL,
  actor       uuid,                                       -- null = sistem (auto-close)
  actor_kind  text NOT NULL DEFAULT 'system',             -- system|user
  note        text,
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_ai_event_log_event ON ai_event_log (event_id, at);
```

Setiap perpindahan status (termasuk auto-close & escalation) → satu baris. Ini kronologi
di layar Event Detail, dan sumber **feedback loop** (verdikt + siapa) untuk tuning.

---

## 6. `ai_forecast` — hasil forecast terbaru

Jangan simpan per-titik. **1 baris/channel, overwrite harian**, deret di jsonb.

```sql
CREATE TABLE ai_forecast (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_owner      uuid NOT NULL,
  target_id     uuid NOT NULL,
  horizon_days  integer NOT NULL,                         -- 30 default (dok tekanan §4.4)
  tier          text NOT NULL,                            -- tier-0|tier-1|tier-2
  generated_at  timestamptz NOT NULL DEFAULT now(),
  daily         jsonb NOT NULL,   -- [{d, est_avg, est_peak, est_trough, band_hi, band_lo, confidence}, …]
  metrics       jsonb DEFAULT '{}',                       -- {rmse, mape, coverage95} (backtest, dok tekanan §9b)
  UNIQUE (target_id)                                       -- overwrite: 1 forecast aktif per channel
);
```

Histori akurasi (opsional): `ai_forecast_history` (append `generated_at`) untuk lacak
RMSE/MAPE lintas waktu tanpa membebani tabel utama.

---

## 7. `ai_recurrence` — pola kambuh-pulih (sinyal NRW)

Auto-close bukan "buang". Agregat event tertutup per target → deteksi **kebocoran
intermittent** (dok diskusi: makin sering kambuh = naik jadi warning baru).

```sql
CREATE TABLE ai_recurrence (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_owner      uuid NOT NULL,
  target_id     uuid NOT NULL,
  analysis_type text NOT NULL,
  window_days   integer NOT NULL DEFAULT 14,
  count         integer NOT NULL,                         -- jumlah episode auto-closed dalam window
  trend         text,                                     -- naik|stabil|turun (frekuensi)
  typical_hour  jsonb,                                    -- distribusi jam kejadian (deteksi pola gilir bocor)
  escalated     boolean NOT NULL DEFAULT false,           -- sudah dinaikkan jadi event warning?
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_id, analysis_type)
);
```

Job rekurensi (1×/jam–hari, dok 05 §4) mengisi tabel ini; bila `count`/`trend`
melewati ambang → buat `ai_event` baru bertipe `recurrence_leak`.

---

## 8. ClickHouse (telemetry) — pijakan baca (SKEMA NYATA)

Tabel real: **`iot.sensor_telemetry`** (read-only untuk AI). Kolom (grounded dari query
backend `report_controller.go`; tak ada DDL di repo — tabel dibuat gateway):

| Kolom | Tipe | Peran untuk AI |
|-------|------|----------------|
| `event_time` | `DateTime` (UTC) | timestamp — checkpoint `last_ts` & ORDER BY |
| `channel_id` | `UUID` | = `sensor_channels.id_sensor_channel` (kunci join) |
| `eng_value` | `Float64` | **nilai utama** (post-kalibrasi) yang dianalisa |
| `raw_value` | `Float64` | nilai mentah (cadangan/diagnostik) |

- **Tak ada kolom owner/node/sensor** di telemetry → scope **resolve dulu di Postgres**:
  ambil daftar `channel_id` yang ON per tenant dari `ai_config` (+ join owner via
  `sensor→node→project→owner`), lalu ClickHouse `WHERE channel_id IN (...) AND event_time > last_ts`.
- **Baca borongan per-tenant**: 1 query untuk semua channel ON tenant (hindari N+1),
  `ORDER BY event_time ASC, channel_id`.
- **Rollup/TTL** (materialized view jam/hari) = optimasi nanti; belum ada, jangan asumsikan.
- Alternatif (bila perlu owner tanpa join): Postgres **`sensor_logs`** sudah membawa
  denormalisasi `id_owner/id_project/id_node/id_sensor` + `ts`/`value_engineered`/`value_raw`
  + `quality_flag` + `min_threshold`/`max_threshold`. Default tetap ClickHouse (dok 04 §terkunci).

---

## 9. Alur data ↔ tabel (ringkas)

```
ClickHouse.telemetry ──ingest──► [worker] ──update──► ai_baseline (grid+state+checkpoint)
                                     │
                                     ├─detect──► ai_event (buat/update)  ──log──► ai_event_log
                                     │                     │
                                     │              (harian) job rekurensi ──► ai_recurrence
                                     │
                       (harian) Forecaster ──► ai_forecast

ai_config ──drive──► seluruh perilaku worker (enable, params, cadence, active_schedule)
Go backend ──baca──► ai_event / ai_forecast / ai_config / ai_recurrence ──► Angular
```

---

## 10. Ringkas keputusan (dok 06)
1. **6 tabel Postgres** (`ai_config`, `ai_baseline`, `ai_event`, `ai_event_log`,
   `ai_forecast`, `ai_recurrence`) — semua **generik**, prefix `ai_`.
2. **Opt-in** lewat `ai_config.enabled` (default false); knob di **`params` jsonb**
   (termasuk `active_schedule` untuk kasus "nyala 20 jam").
3. **Worker stateless** via `ai_baseline.online_state` + `last_ts` (checkpoint).
4. **`ai_event`** = state machine berlifecycle, **partisi bulanan**, index parsial "aktif"
   → panas kecil walau histori besar.
5. **`ai_recurrence`** menjadikan auto-close tetap bernilai (pola kambuh-pulih = sinyal NRW).
6. Telemetry tetap **ClickHouse** (raw + rollup TTL), dibaca **borongan per-tenant**.

> DDL di atas = cetak biru, bukan migrasi final (indeks/partisi detail disetel saat
> implementasi). Alur satu event tekanan end-to-end memakai tabel ini → `kategori/tekanan.md` §11.
