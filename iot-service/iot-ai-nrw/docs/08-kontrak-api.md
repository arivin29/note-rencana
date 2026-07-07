# 08 — Kontrak API (AI-NRW → Backend Go → Angular)

> Endpoint yang **backend Go** ekspos agar **Angular** menampilkan hasil AI-NRW.
> Python **menulis** ke Postgres (dok 06); Go **membaca & menyajikan** + menerima aksi
> user (validasi/assign/config). **Wajib** mengikuti kontrak envelope platform yang sudah
> baku — **jangan buat envelope baru**.

## 0. Kontrak envelope (dari platform, TIDAK berubah)
- **List:** `{ "data": [...], "meta": { "total", "page", "limit", "totalPages" } }`
- **Single:** item dikembalikan **langsung** (bukan dibungkus `data`).
- **Error:** `{ "statusCode", "message", "error" }`.
- **JSON camelCase**; **multi-tenant**: `admin` lihat semua, `tenant` scoped ke `idOwner`
  (ditegakkan di service layer, sama seperti modul lain).

Base path: `/api/ai`. Semua endpoint hormati RBAC & scoping tenant existing.

---

## 1. AI Config (AI Settings — dok 04 §9)

Enable/disable & tuning per target (opt-in default OFF). Perubahan dibaca worker runtime.

| Method | Path | Guna |
|--------|------|------|
| `GET` | `/api/ai/configs` | list config channel (filter: `idOwner`, `enabled`, `groupName`, `search`, paginasi) |
| `GET` | `/api/ai/configs/:targetId` | config satu channel (semua `analysisType` + status kesiapan) |
| `PUT` | `/api/ai/configs/:targetId` | update: enable/disable + `params` (partial) |
| `POST` | `/api/ai/configs/:targetId/apply-preset` | terapkan preset kategori (body: `{ preset }`) |
| `GET` | `/api/ai/configs/:targetId/versions` | riwayat versi (audit) |
| `POST` | `/api/ai/configs/:targetId/rollback` | rollback ke versi (body: `{ version }`) |
| `GET` | `/api/ai/presets` | katalog preset per kategori metric (dok 04 §8) |

**List item (`GET /configs`)** — untuk layar daftar channel:
```json
{
  "targetId": "uuid", "channelName": "Tekanan Inlet DMA-01",
  "groupName": "Tekanan", "idOwner": "uuid",
  "aiEnabled": true, "preset": "Tekanan",
  "activeAnalyses": ["A2_low","A3_high","A4_spike","A9_deviation","A10_drift","forecast","night_pressure"],
  "learnReady": true, "learnProgress": 1.0,
  "cadenceSec": 300, "updatedAt": "2026-07-07T02:00:00Z"
}
```

**Detail (`GET /configs/:targetId`)** — panel tweak per detektor:
```json
{
  "targetId": "uuid", "channelName": "...", "groupName": "Tekanan",
  "aiEnabled": true, "preset": "Tekanan", "learnReady": true,
  "analyses": [
    { "analysisType": "A2_low", "enabled": true, "severity": "warning",
      "params": { "sustainT": "15m" } },
    { "analysisType": "A10_drift", "enabled": true, "severity": "warning",
      "params": { "lambda": 0.2, "L": 3, "kappa": "0.5s", "h": "4.5s" } },
    { "analysisType": "forecast", "enabled": true,
      "params": { "horizonDays": 30, "tier": "auto" } }
  ],
  "activeSchedule": { "mode": "windows", "windows": ["04:00-24:00"], "tz": "Asia/Jakarta" },
  "version": 3
}
```

**`learnReady=false`** → UI tampilkan "baseline belum cukup — butuh N hari" (dok 04 §9).

---

## 2. Events (Inbox + Detail — dok 06 §4, lifecycle dok tekanan §11.3)

| Method | Path | Guna |
|--------|------|------|
| `GET` | `/api/ai/events` | list event (filter di bawah) |
| `GET` | `/api/ai/events/:id` | detail + konteks + kronologi (`ai_event_log`) |
| `POST` | `/api/ai/events/:id/validate` | verdikt user: `{ verdict: benar\|false_alarm\|abaikan, note? }` |
| `POST` | `/api/ai/events/:id/assign` | `{ assignedTo, note? }` |
| `POST` | `/api/ai/events/:id/close` | tutup manual: `{ note? }` |
| `POST` | `/api/ai/events/:id/reopen` | buka kembali |
| `GET` | `/api/ai/events/stats` | ringkas hitung per status/severity (badge/tab) |

**Filter `GET /events`:** `status` (multi: baru,ditinjau,ditindak / selesai,auto_closed),
`severity`, `analysisType`, `idOwner`, `targetId`, `from`, `to`, `search`, paginasi.
Default tab **Aktif** = `status in (baru,ditinjau,ditindak)` (index parsial, dok 06 §4).

**List item:**
```json
{
  "id": "uuid", "targetId": "uuid", "channelName": "Tekanan Inlet DMA-01",
  "groupName": "Tekanan", "analysisType": "A2_low",
  "status": "baru", "severity": "critical", "confidence": 0.86,
  "meaning": "Tekanan rendah tak wajar — indikasi suplai kurang / kebocoran hulu.",
  "startedAt": "2026-07-07T09:14:00Z", "lastSeenAt": "2026-07-07T09:44:00Z",
  "durationSec": 1800, "isRecurring": true
}
```

**Detail** menambah: `context` (`{ value, threshold, slot, z, forecastRef }`),
`verdict`/`verdictBy`/`verdictAt`, `assignedTo`, `actionNote`, `recurrence` (ringkas),
dan `timeline` (array `ai_event_log`: `fromStatus`,`toStatus`,`actor`,`actorKind`,`note`,`at`).

> **Aksi menulis** (validate/assign/close) lewat Go → Postgres. Verdikt **selalu** merekam
> `verdictBy`+`verdictAt` (siapa aja boleh, tapi tercatat → feedback loop, dok tekanan §11.3).

---

## 3. Forecast (Channel Analytics panel — dok 06 §6)

| Method | Path | Guna |
|--------|------|------|
| `GET` | `/api/ai/forecast/:targetId` | forecast terbaru channel (30 hari) |

```json
{
  "targetId": "uuid", "horizonDays": 30, "tier": "tier-1",
  "generatedAt": "2026-07-07T02:10:00Z",
  "daily": [
    { "d": "2026-07-08", "estAvg": 3.1, "estPeak": 3.6, "estTrough": 2.7,
      "bandHi": 3.9, "bandLo": 2.4, "confidence": 0.82 }
  ],
  "metrics": { "rmse": 0.18, "mape": 5.9, "coverage95": 0.94 }
}
```

---

## 4. Channel Analytics (chart gabungan — dok tekanan §11.4d)

Satu endpoint memasok chart utama: aktual + pita baseline + forecast + penanda event.

| Method | Path | Guna |
|--------|------|------|
| `GET` | `/api/ai/analytics/:targetId` | data chart (query: `from`, `to`, `resolution`) |

```json
{
  "targetId": "uuid", "channelName": "...", "unit": "bar",
  "series": [ { "ts": "...", "value": 3.0 } ],
  "baselineBand": [ { "ts": "...", "median": 3.1, "hi": 3.9, "lo": 2.4 } ],
  "forecast": { "$ref": "/api/ai/forecast/:targetId" },
  "events": [ { "id": "uuid", "analysisType": "A2_low", "startedAt": "...", "resolvedAt": "...", "severity": "critical" } ],
  "night": { "window": "02:00-04:00", "pNight": [ { "d": "...", "value": 3.3 } ], "trend": "turun" }
}
```
`series`/`baselineBand` di-downsample sesuai `resolution` (push-down ClickHouse).

---

## 5. Recurrence (pola kambuh-pulih — dok 06 §7)

| Method | Path | Guna |
|--------|------|------|
| `GET` | `/api/ai/recurrence/:targetId` | pola kambuh per target (badge "sering kambuh" di Event Detail) |

```json
{ "targetId": "uuid", "analysisType": "A2_low", "windowDays": 14,
  "count": 12, "trend": "naik", "typicalHour": { "02": 4, "03": 5 }, "escalated": true }
```

---

## 6. Ringkas peta layar → endpoint
| Layar Angular | Endpoint utama |
|---------------|----------------|
| **AI Settings** (list + tweak) | `GET/PUT /configs`, `/apply-preset`, `/presets`, `/versions`, `/rollback` |
| **Event Inbox** | `GET /events`, `/events/stats` |
| **Event Detail** | `GET /events/:id`, `POST /validate\|assign\|close\|reopen`, `GET /recurrence/:targetId` |
| **Channel Analytics** | `GET /analytics/:targetId`, `GET /forecast/:targetId` |

---

## 7. Catatan implementasi (backend Go)
- Modul Go standar (pola `backend-module` skill di repo frontend `.claude/skills`): Model→Repository→Service(RBAC)→Controller(BaseController)→routes; **read-mostly** dari tabel `ai_*` yang ditulis Python.
- **Tak ada logika AI di Go** — Go hanya CRUD/serve + aksi lifecycle (update status/verdict). Perhitungan tetap di worker Python.
- Config write (`PUT /configs`) → naikkan `version` + tulis audit; worker baca versi terbaru (dok 05 §8, runtime reconfig).
- Semua list paginasi + scoping `idOwner`; camelCase; envelope baku.

## 8. Ringkas keputusan (dok 08)
1. Go = **read-mostly + aksi lifecycle**; Python = otak. Integrasi shared-DB (dok 05).
2. Endpoint dikelompokkan: **configs, events, forecast, analytics, recurrence, presets**.
3. **Envelope platform baku** (list `{data,meta}` / single langsung / error). Tanpa envelope baru.
4. Verdikt selalu rekam **siapa+kapan** (feedback loop). Aksi tulis lewat Go → Postgres.
5. Peta 4 layar → endpoint terkunci → siap dipakai saat implementasi UI.
