# External API Test Report

**Owner:** PDAM TEBO (`4cabf383-cb99-47e2-9c6c-9ad4bbf543fd`)
**Base URL:** `https://iot-api.demo.vm.devetek.com/external-api/v1`
**API Key Prefix:** `tnt_EhMm****`
**Rate Limit Plan:** basic (60 req/min, 10.000/day)
**Expires:** 2027-04-19
**Tested At:** 2026-04-19 20:34 WIB

---

## Test Summary

| # | Endpoint | Method | Status | Records |
|---|----------|--------|--------|---------|
| 1 | `/info` | GET | ✅ 200 | — |
| 2 | `/projects` | GET | ✅ 200 | 1 project |
| 3 | `/nodes` | GET | ✅ 200 | 6 nodes |
| 4 | `/nodes/:nodeId` | GET | ✅ 200 | 1 node + sensors |
| 5 | `/sensors` | GET | ✅ 200 | 6 sensors |
| 6 | `/sensor-data` | GET | ✅ 200 | 7.580 records (hari ini) |
| 7 | `/sensor-data/latest` | GET | ✅ 200 | 6 readings |
| 8 | `/sensor-data/aggregated` | GET | ✅ 200 | 2 intervals |
| 9 | `/alerts` | GET | ✅ 200 | 0 alerts |

---

## 1. GET /info

Menampilkan informasi tenant dan status API key.

```json
{
  "status": "active",
  "tenant": {
    "idOwner": "4cabf383-cb99-47e2-9c6c-9ad4bbf543fd",
    "ownerCode": "9VSIK",
    "name": "PDAM TEBO",
    "email": null
  },
  "apiKey": {
    "createdAt": "2026-04-19T13:28:58.562Z",
    "lastUsedAt": "2026-04-19T13:34:30.458Z",
    "expiresAt": "2027-04-19T13:25:58.815Z",
    "rateLimitPlan": "basic",
    "requestsToday": 3,
    "requestsRemaining": 9997
  }
}
```

---

## 2. GET /projects

Daftar semua project milik tenant.

| Project | Area Type | Status | Nodes | Created |
|---------|-----------|--------|-------|---------|
| Cabang Tebo | plant | active | 6 | 2026-01-28 |

---

## 3. GET /nodes

Daftar semua node (logger/device) dalam project tenant.

| Node | Serial Number | Location | Status | Connectivity | Last Seen |
|------|--------------|----------|--------|-------------|-----------|
| 1 | HELIO-350544503213269 | P2 Mangun Jaya Ujung | active | 🟢 online | 2026-04-19 20:34 |
| 2 | HELIO-353691843831016 | Perkantoran | active | 🟢 online | 2026-04-19 20:34 |
| 3 | HELIO-357073298536240 | Logger P3_Ruko Idai | active | 🟢 online | 2026-04-19 20:34 |
| 4 | HELIO-357073298204872 | SENSOR IPA KANTOR 2 | active | 🟡 degraded | 2026-04-14 |
| 5 | HELIO-353691843830935 | IPA Kantor | active | 🟢 online | 2026-04-19 20:34 |
| 6 | HELIO-357073299572905 | Logger P6 (POMBENSIN) | active | 🟡 degraded | 2026-04-19 16:28 |

**Coordinates:**

| Node | Latitude | Longitude |
|------|----------|-----------|
| HELIO-350544503213269 | -1.34980889 | 102.61359133 |
| HELIO-353691843831016 | -1.46243878 | 102.42596149 |
| HELIO-357073298536240 | -1.46851486 | 102.35335435 |
| HELIO-357073298204872 | -1.48079000 | 102.44506000 |
| HELIO-353691843830935 | -1.46101893 | 102.39751434 |
| HELIO-357073299572905 | -1.48192833 | 102.58833815 |

---

## 4. GET /sensors

Semua sensor tipe **tekanan** (pressure) dengan unit **bar**.

| Sensor | Node | Location | Channel Metric | Unit |
|--------|------|----------|---------------|------|
| c219aeee | HELIO-353691843831016 | Perkantoran | tekanan | bar |
| 64d5f0c0 | HELIO-350544503213269 | P2 Mangun Jaya Ujung | tekanan | bar |
| 7a781f3a | HELIO-353691843830935 | IPA Kantor | tekanan | bar |
| 41dd7d10 | HELIO-357073299572905 | Logger P6 (POMBENSIN) | tekanan | bar |
| f1cdaa45 | HELIO-357073298536240 | Logger P3_Ruko Idai | tekanan | bar |
| 566e3ab6 | HELIO-357073298204872 | SENSOR IPA KANTOR 2 | Tekanan | bar |

---

## 5. GET /sensor-data/latest

Data tekanan terkini dari semua sensor.

| Node | Location | Tekanan (bar) | Timestamp | Quality |
|------|----------|:------------:|-----------|---------|
| HELIO-353691843831016 | Perkantoran | **0.397** | 2026-04-19 20:34 | ✅ good |
| HELIO-350544503213269 | P2 Mangun Jaya Ujung | **0.953** | 2026-04-19 20:34 | ✅ good |
| HELIO-353691843830935 | IPA Kantor | **1.269** | 2026-04-19 20:34 | ✅ good |
| HELIO-357073299572905 | Logger P6 (POMBENSIN) | **0.511** | 2026-04-19 16:28 | ✅ good |
| HELIO-357073298536240 | Logger P3_Ruko Idai | **0.443** | 2026-04-19 20:34 | ✅ good |
| HELIO-357073298204872 | SENSOR IPA KANTOR 2 | **5.195** | 2026-04-14 04:09 | ✅ good |

> ⚠️ Node HELIO-357073298204872 menunjukkan tekanan **5.195 bar** (jauh lebih tinggi dari node lain) dan terakhir kirim data **5 hari lalu** — perlu dicek.

---

## 6. GET /alerts

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

Tidak ada alert aktif saat ini.

---

## 7. GET /nodes/:nodeId — Node Detail

Detail lengkap node termasuk sensor dan threshold.

```bash
curl -H "X-API-Key: <API_KEY>" \
  https://iot-api.demo.vm.devetek.com/external-api/v1/nodes/4c4645f1-b136-4a7f-9a4f-9a532f14d3b8
```

```json
{
  "idNode": "4c4645f1-b136-4a7f-9a4f-9a532f14d3b8",
  "code": "HELIO-353691843831016",
  "serialNumber": "HELIO-353691843831016",
  "status": "active",
  "connectivityStatus": "online",
  "telemetryIntervalSec": 120,
  "location": {
    "address": "Perkantoran",
    "country": "Indonesia",
    "latitude": "-1.46243878",
    "longitude": "102.42596149"
  },
  "project": { "idProject": "1414bdba-...", "name": "Cabang Tebo" },
  "sensors": [
    {
      "idSensor": "c219aeee-...",
      "sensorCode": "01",
      "label": "tekanan",
      "channels": [
        {
          "metricCode": "tekanan",
          "unit": "bar",
          "minThreshold": "0.5",
          "maxThreshold": "5.0"
        }
      ]
    }
  ]
}
```

---

## 8. GET /sensor-data — Query by Date Range

Query data telemetri dengan filter tanggal. **Max range: 7 hari.**

```bash
curl -H "X-API-Key: <API_KEY>" \
  "https://iot-api.demo.vm.devetek.com/external-api/v1/sensor-data?startDate=2026-04-19T00:00:00Z&endDate=2026-04-19T23:59:59Z&limit=3"
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `startDate` | ✅ | ISO 8601 start date |
| `endDate` | ✅ | ISO 8601 end date |
| `channelId` | ❌ | Filter by sensor channel |
| `nodeId` | ❌ | Filter by node |
| `page` | ❌ | Page number (default: 1) |
| `limit` | ❌ | Items per page (default: 20) |

**Result:** Total **7.580 records** untuk tanggal 19 April 2026.

```json
{
  "data": [
    {
      "id": "681853",
      "timestamp": "2026-04-19T13:34:26.277Z",
      "value": 0.953,
      "valueRaw": 0.953,
      "unit": "bar",
      "qualityFlag": "good",
      "channel": { "metricCode": "tekanan" },
      "node": { "code": "HELIO-350544503213269", "location": { "address": "p2 Mangun jaya ujung" } }
    }
  ],
  "pagination": { "page": 1, "limit": 3, "total": 7580, "totalPages": 2527 },
  "meta": { "queryTimeMs": 89 }
}
```

---

## 9. GET /sensor-data/aggregated — Aggregated Data

Data agregasi (avg, min, max, sum, count) per interval waktu.

```bash
curl -H "X-API-Key: <API_KEY>" \
  "https://iot-api.demo.vm.devetek.com/external-api/v1/sensor-data/aggregated?channelId=4207ba5b-246c-4ccf-ad66-a6c57e6059c6&startDate=2026-04-18T00:00:00Z&endDate=2026-04-19T23:59:59Z&interval=1d"
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `channelId` | ✅ | Sensor channel UUID |
| `startDate` | ✅ | ISO 8601 start date |
| `endDate` | ✅ | ISO 8601 end date |
| `interval` | ❌ | `1h`, `6h`, `1d` (default: `1h`) |
| `aggregation` | ❌ | `avg`, `min`, `max`, `sum`, `count` (default: `avg`) |

**Result (Perkantoran — tekanan, 2 hari):**

| Tanggal | Avg Tekanan (bar) | Data Points |
|---------|:-----------------:|:-----------:|
| 2026-04-18 | **0.052** | 1.558 |
| 2026-04-19 | **0.249** | 1.887 |

**Statistics:** min=0.043, max=0.428, avg=0.160, total=3.445 records (queryTime: 21ms)

---

## Authentication

Semua endpoint menggunakan header:

```
X-API-Key: tnt_EhMmYXNAKpKwV4kK2dO9BsAj9CasHEDG
```

### Contoh cURL

```bash
curl -H "X-API-Key: tnt_EhMmYXNAKpKwV4kK2dO9BsAj9CasHEDG" \
  https://iot-api.demo.vm.devetek.com/external-api/v1/info
```

### Contoh Import ke Postman

1. Import dari Swagger JSON: `https://iot-api.demo.vm.devetek.com/external-api/docs-json`
2. Set header `X-API-Key` di collection variables
3. Semua endpoint siap digunakan

---

## Swagger Documentation

- **UI:** https://iot-api.demo.vm.devetek.com/external-api/docs
- **OpenAPI JSON:** https://iot-api.demo.vm.devetek.com/external-api/docs-json

---

## Notes

- API Key hanya ditampilkan **sekali** saat generate — simpan dengan aman
- Rate limit plan `basic`: 60 request/menit, 10.000 request/hari
- Key expire dalam **1 tahun** (2027-04-19)
- Data sensor semua bertipe **tekanan (bar)** — monitoring tekanan air PDAM
- 4 dari 6 node online, 2 node degraded
