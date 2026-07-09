# MQTT Broadcast Spec — Push Sensor-Channel-Latest ke Broker PDAM

**Status:** Draft desain (belum eksekusi)
**Tanggal:** 2026-07-09
**Konteks:** Klien PDAM minta data channel realtime setelah `iot_log` sukses diproses, disalurkan ke **broker MQTT milik PDAM** (bukan broker kita). Melengkapi jalur pull yang sudah ada: `GET /external-api/v1/info`.
**Keluarga dokumen:** satu arah dengan [`notification-delivery-spec.md`](./notification-delivery-spec.md) — sama-sama "satu event, beberapa jalur keluar".

---

## 1. Tujuan & Ruang Lingkup

**Tujuan:** Setelah setiap `iot_log` sukses diproses menjadi `sensor_channel_latest`, **push nilai terbaru** ke broker MQTT yang disediakan **oleh PDAM**, secara realtime, per-owner, aman, dan **tanpa mengganggu kinerja/kestabilan proses ingestion `iot-gtw`**.

**Masuk lingkup (Fase 1):**
- 1 jenis topik: **sensor-channel-latest** (nilai ternormalisasi hasil proses).
- Model **push keluar** — kita = client, PDAM = pemilik broker.
- Config per-PDAM, kredensial terenkripsi, resilien terhadap broker PDAM yang down.

**Di luar lingkup (nanti):** topik anomali/alert, status node online/offline, ringkasan harian. Desain **disiapkan** untuk multi-topik (§5) tapi tidak diimplementasi sekarang.

**Non-tujuan:** kita **tidak** menghosting broker. Auth/ACL sisi consumer = tanggung jawab broker PDAM.

---

## 2. Kondisi Saat Ini (terverifikasi dari kode `iot-gtw`)

`iot-gtw` = gateway **NestJS 10** (bukan Go), TypeORM + `mqtt` v5 + ClickHouse, dijalankan via **PM2**.

| # | Temuan | Lokasi | Implikasi |
|---|---|---|---|
| 1 | Sudah konek broker + punya `publish(topic, msg)` | `src/modules/mqtt/mqtt.service.ts:244` | Publish = panggil method, bukan infra baru |
| 2 | `processIotLog()` bikin `sensor_channel_latest` batch lalu tulis ClickHouse | `src/modules/telemetry-processor/telemetry-processor.service.ts` batch di ~284, diisi ~434, ditulis ~493, `return {success:true}` ~519 | **Seam publish ada di sini** (setelah tulis ClickHouse sukses) |
| 3 | Owner scoping sudah ada: `ownerCode = 5 char pertama device_id` | `src/modules/forwarding/forwarding-worker.service.ts:152` | Langsung jadi segmen topik isolasi tenant |
| 4 | Pola "push per-owner ke target eksternal" **sudah terbukti** (modul `forwarding`), sumber `sensor_channel_latest` sudah tersedia | `forwarding-worker.service.ts:143` `fetchSensorChannelLatest(ownerCode)` | MQTT = target-type baru dari pola yang sama |
| 5 | Entity per-owner sudah ada: `OwnerForwardingDatabase` (`owner_forwarding_databases`), `OwnerForwardingLog` (`owner_forwarding_logs`) | `src/entities/existing/owner-forwarding-*.entity.ts` | `OwnerForwardingMqtt` ikut konvensi ini |
| 6 | **Kredensial forwarding belum dienkripsi** | `src/modules/forwarding/target-db-connector.service.ts:63` → `password: config.passwordCipher, // TODO: Decrypt in production` | ⚠️ Utang teknis. Password broker PDAM **wajib** terenkripsi at-rest → beresin sekalian |
| 7 | Reconnect client ingestion **berhenti** setelah `maxReconnectAttempts` | `mqtt.service.ts:65-95` | Untuk outbound ke PDAM perlu perilaku beda (backoff tak berhenti) |
| 8 | PM2 cuma 1 app `iot-gateway` (`exec_mode: fork`, `instances: 1`) | `ecosystem.config.js` | Gampang tambah app kedua terisolasi |

---

## 3. Keputusan Arsitektur

### 3.0 Pembagian tanggung jawab 3 tier (⚠️ beda dari forwarding lama)

Config `owner_forwarding_mqtt` **tidak** di-CRUD lewat iot-gtw (forwarding lama begitu, di port 5001/4000 `/api/forwarding/configs`). Untuk fitur ini pakai **pola standar platform**: Angular ↔ **iot-backend-go** untuk CRUD, iot-gtw **hanya eksekutor**.

| Tier | Peran | Tidak melakukan |
|---|---|---|
| **Angular** (`:3000` → Go) | Form setting: user isi/update broker URL, username, password, topic template, QoS, retained, aktif/nonaktif; list + test. | Tidak menyimpan; tidak konek broker. |
| **iot-backend-go** (Go, `:3000`) | CRUD `owner_forwarding_mqtt` → **simpan ke Postgres `iot`**; **enkripsi password saat save**, **redaksi saat read**; scoping multi-tenant (tenant hanya owner-nya). | Tidak konek broker; tidak publish. |
| **iot-gtw** (`iot-broadcast`, proses PM2 terpisah) | **Eksekutor**: baca `owner_forwarding_mqtt` dari Postgres, dekripsi, konek broker PDAM, push `sensor_channel_latest`, tulis `owner_forwarding_mqtt_log`. | Tidak expose CRUD config ini. |

**Kunci: dua service share Postgres `iot` yang sama** (terverifikasi — iot-gtw & Go sama-sama `…:54366/iot`). Aliran config = **Go → tabel → iot-gtw**. Tidak ada kopling API antar-service; kontraknya = skema tabel. Konsekuensi enkripsi lihat §7.

### 3.1 Penempatan eksekutor: **repo iot-gtw, proses PM2 terpisah** ✅

Broadcaster = **app PM2 kedua** (`iot-broadcast`) di dalam repo `iot-gtw`, **bukan** modul di dalam proses `iot-gateway`, **bukan** repo baru.

- **Satu codebase** — reuse entity `OwnerForwarding*`, ClickHouse client, config, tooling. Nol duplikasi.
- **Proses runtime terpisah** — event loop, memori, dan **crash domain terpisah**. Socket PDAM nge-hang / publisher OOM **tidak bisa** menyentuh proses ingestion.
- **Handoff via ClickHouse** — broadcaster **poll** `sensor_channel_latest` (pola `fetchSensorChannelLatest` yang ada). Dua proses tidak saling `await` → decoupled total.

**Alternatif yang ditolak:**
| Opsi | Alasan tolak |
|---|---|
| Modul di dalam proses `iot-gateway` | Melanggar syarat "tanpa ganggu kinerja". Node single-thread — publish loop berat / socket hang bisa nambah latency & risiko crash ke ingestion. |
| Repo terpisah penuh | Overkill sekarang. Duplikasi entity + akses DB + overhead deploy/versioning. Kontrak data (`sensor_channel_latest`) toh sudah shared. Bisa di-extract nanti kalau membesar. |

### 3.2 Model penyaluran: **scheduler-drain dulu**, event-push kemudian

Mulai dengan **poll `sensor_channel_latest` tiap N detik lalu publish** (reuse pola `forwarding`). Alasannya = resiliensi hampir gratis: broker PDAM mati siklus ini, siklus berikut nyusul. "Cukup realtime" untuk monitoring air (update bukan sub-detik).

Upgrade ke **event-push** (publish tepat saat seam §2 temuan 2) hanya bila ada PDAM yang butuh betul-betul instan. **Payload & topic contract sama → upgrade tidak breaking.**

---

## 4. Data Model — `owner_forwarding_mqtt`

Ikut konvensi `owner_forwarding_databases`. **Pemilik tulis = iot-backend-go** (CRUD); iot-gtw hanya baca.

```
owner_forwarding_mqtt
  id_owner_forwarding_mqtt   uuid pk
  id_owner                   uuid      -- FK owner/tenant (scoping multi-tenant di Go, dari JWT)
  owner_code                 varchar   -- 5 char, DIISI OTOMATIS Go dari owners.owner_code (bukan input user)
  label                      varchar
  broker_url                 varchar   -- mqtts://host:8883 (WAJIB mqtts di produksi)
  username                   varchar
  password_cipher            text      -- TERENKRIPSI at-rest, diisi Go saat save (§7)
  tls_enabled                boolean   default true
  tls_insecure               boolean   default false  -- allow self-signed (opsional)
  topic_template             varchar   -- mis. "pdam-x/sensor/{deviceId}/{metricCode}"
  qos                        smallint  default 1
  retained                   boolean   default true
  enabled_categories         jsonb     -- ["telemetry"] sekarang; siap ["telemetry","alert",...] (§5)
  is_active                  boolean   default true
  created_at / updated_at
```

`owner_forwarding_mqtt_log` (ikut `owner_forwarding_logs`) — audit eksekusi, **ditulis oleh iot-gtw**: owner, jumlah pesan, sukses/gagal, error terakhir, `created_at`.

**⚠️ Retensi log = maksimal 7 hari.** Tabel log ini bisa membengkak cepat (tiap siklus push per-PDAM nulis baris). Wajib ada pembersih otomatis — **tiru pola yang sudah ada** `src/modules/scheduler/data-cleanup.service.ts` (`@Cron('0 2 * * *')` harian jam 2 pagi):
- `DELETE FROM owner_forwarding_mqtt_log WHERE created_at < now() - interval '7 days'`; **atau**
- Partisi harian + drop partisi > 7 hari (lebih efisien kalau volumenya besar).

Rekomendasi: mulai dari cron delete harian (tambah method di `data-cleanup.service.ts`), pindah ke partisi kalau volume terbukti tinggi. Index `created_at` untuk delete cepat.

> **Kurangi volume log di sumbernya:** dengan watermark anti re-publish (§8-i), baris log hanya lahir saat ada nilai baru dikirim — bukan tiap siklus. Ini menekan pertumbuhan log jauh sebelum retensi bekerja.

---

## 5. Skema Topik & Registry Multi-Topik (jangka panjang)

**Prinsip: jangan hardcode topik.** Nambah topik baru = daftar entry di registry, bukan tulis ulang publisher.

Kategori jadi segmen topik supaya PDAM bisa subscribe selektif:
```
{prefix}/telemetry/{deviceId}/{metricCode}    ← FASE 1 (channel-latest)   retained=true qos=1
{prefix}/status/{deviceId}                     ← nanti: node online/offline
{prefix}/alert/{deviceId}/{ruleId}             ← nanti: anomali/threshold
{prefix}/summary/{ownerCode}                   ← nanti: ringkasan harian
```

**Registry event-type → topic-template** (in-code map): tiap entry punya `category`, `topicTemplate`, builder payload. `enabled_categories` per-owner (§4) menentukan mana yang aktif per PDAM (PDAM X telemetry-only, PDAM Y semua).

`{prefix}` dan pola nama berasal dari `topic_template` per-owner — tiap PDAM boyeh konvensi sendiri.

---

## 6. Payload Contract (versioned)

Payload membawa **rantai ID penuh** `owner → project → node → sensor → sensor_channel`, penamaan **cocok External API** (`idNode`, `idSensorChannel`) agar PDAM bisa join data MQTT ke API mereka.

```json
{
  "schemaVersion": 1,
  "category": "telemetry",
  "idOwner": "bbb0d16b-…",   "ownerCode": "RDWNJ",
  "idProject": "5deae217-…", "projectCode": "Cabang Tenggarong",
  "idNode": "bb459ea5-…",    "nodeCode": "HELIO-865124070949252", "deviceId": "HELIO-865124070949252",
  "idSensor": "bb8bf827-…",  "sensorLabel": "05-Perum Tambak Rel", "sensorCatalog": "dcf920f3-…",
  "idSensorChannel": "968e3ebd-…", "metricCode": "tekanan", "unit": "bar",
  "value": 1.47, "rawValue": 0.651, "quality": 10,
  "ts": "2026-07-09 06:36:28.194"
}
```

**Join ke External API** (kunci = `idSensorChannel`):
- `GET /external-api/v1/sensor-data?channelId={idSensorChannel}` → histori channel
- `GET /external-api/v1/nodes/{idNode}` → detail node

`schemaVersion` **wajib** — nanti nambah field, consumer lama tidak pecah. Publish **nilai ternormalisasi** (`eng_value`), **bukan** raw payload device.

**Pemetaan ke kolom `iot.sensor_channel_latest` (terverifikasi live):**

| Field payload | Kolom ClickHouse | Catatan |
|---|---|---|
| `idOwner` / `ownerCode` | `owner_id` / `owner_code` | |
| `idProject` / `projectCode` | `project_id` / `project_code` | |
| `idNode` / `nodeCode` / `deviceId` | `node_id` / `node_code` / `device_id` | |
| `idSensor` / `sensorLabel` / `sensorCatalog` | `sensor_id` / `sensor_label` / `sensor_catalog` | |
| `idSensorChannel` | `channel_id` | **kunci join External API** (param `channelId`) |
| `metricCode` / `unit` | `metric_code` / `metric_unit` | |
| `value` / `rawValue` | `eng_value` / `raw_value` | `value` = ternormalisasi |
| `quality` | `signal_quality` | |
| `ts` | `last_update` | juga jadi **watermark** anti re-publish (§8-i) |

Query sumber: `FROM iot.sensor_channel_latest FINAL WHERE owner_code = {…}` (`forwarding-worker.service.ts:246`).

---

## 7. Keamanan

Model push keluar → isolasi tenant **otomatis** (broker PDAM terpisah fisik, tidak ada risiko bocor antar-tenant, tidak perlu ACL di sisi kita). Auth/ACL consumer = urusan broker PDAM. Fokus keamanan **kita** bergeser ke:

1. **Enkripsi kredensial at-rest (WAJIB).** `password_cipher` terenkripsi (AES-GCM), bukan plaintext.
2. **⚠️ Shared encryption key lintas-service.** **Go yang enkripsi saat save, iot-gtw yang dekripsi saat baca.** Dua service beda bahasa → **kunci enkripsi wajib sama** (satu secret di env kedua repo, mis. `FORWARDING_ENC_KEY`) dan algoritma sama (AES-256-GCM: format `nonce||ciphertext||tag`, base64). Ini kontrak lintas-service yang gampang salah — dokumentasikan format byte-nya eksplisit dan tulis test vektor bersama. Rotasi kunci = prosedur khusus (re-encrypt semua baris).
3. **TLS ke broker PDAM (`mqtts`).** Default `tls_enabled=true`. Tanpa ini kredensial & data plaintext di jaringan.
4. **Redaksi (di Go).** Response CRUD **tidak pernah** kembalikan `password_cipher` / plaintext. Form Angular kirim password baru hanya saat diubah (write-only field); kalau kosong saat update, Go pertahankan cipher lama.
5. **Least privilege.** Kredensial dari PDAM idealnya publish-only ke namespace mereka.
6. **Utang lama.** Sekalian benerin `target-db-connector.service.ts:63` (`// TODO: Decrypt in production`) pakai util enkripsi yang sama.

---

## 8. Resiliensi — jaga proses kita tidak error saat broker PDAM putus

Prinsip induk: **broker satu PDAM bermasalah TIDAK BOLEH (a) bikin proses broadcaster crash, (b) ganggu PDAM lain, (c) menyentuh proses ingestion sama sekali.**

| # | Mekanisme | Detail |
|---|---|---|
| a | **Isolasi dari ingestion** | Broadcaster = proses PM2 terpisah, sumber data via poll ClickHouse. Ingestion tak pernah `await` publish. |
| b | **Bulkhead per-PDAM** | Tiap PDAM: koneksi sendiri + antrian sendiri + status error sendiri. A mati → cuma antrian A numpuk. |
| c | **Circuit breaker** | Gagal N kali → buka circuit (stop nembak) → probe berkala → tutup saat sehat. Cegah boros retry + banjir log. |
| d | **Bounded queue + drop policy** | Buffer per-PDAM **wajib ber-batas** (max size/TTL). Penuh → **buang lama, simpan baru** (ini "nilai terakhir"; `retained=true` di broker PDAM simpan last value). Jangan unbounded → OOM. |
| e | **Timeout connect & publish** | Socket hang tak boleh nyandera worker. |
| f | **Reconnect backoff (beda dari ingestion)** | Exponential backoff + jitter, di-cap (mis. max 5 menit), **tidak berhenti** — PDAM bisa pulih kapan saja. Kontras `mqtt.service.ts` yang berhenti di `maxReconnectAttempts`. |
| g | **Handler `error` wajib (footgun Node)** | Client MQTT emit `'error'` tanpa listener → **Node crash**. Tiap koneksi PDAM wajib `.on('error')` + `try/catch` di publish. |
| h | **Observability** | Per-PDAM: status koneksi, kedalaman antrian, last-success timestamp (reuse `owner_forwarding_logs`). Alert internal bila antrian membengkak. |
| **i** | **⚠️ Watermark anti re-publish (WAJIB — temuan audit)** | `sensor_channel_latest FINAL` mengembalikan baris "latest" yang **sama tiap siklus**. Tanpa penjaga, drain akan **publish ulang nilai identik tiap N detik** → boros + menyesatkan (consumer kira ada data baru). Simpan **high-water mark `max(last_update)` per owner** (in-memory di proses iot-broadcast); publish **hanya baris dengan `last_update > watermark`** (atau bandingkan `last_iot_log_id`). Karena `retained=true`, nilai lama sudah nangkring di broker → tak perlu dikirim ulang. Saat restart: reset watermark → publish sekali ulang (aman karena retained), atau persist watermark bila mau. |

---

## 9. Alur End-to-End (UI ↔ backend ↔ iot-gtw)

### 9.1 Alur config (sekali set / saat diubah user)

```
[Angular :3000]                [iot-backend-go :3000]              [Postgres iot]
Form setting broker ──POST/PUT──► Validasi + scoping tenant
  URL/user/pass/topic/qos          enkripsi password (AES-GCM) ──INSERT/UPDATE──► owner_forwarding_mqtt
  test-connection (opsional)       redaksi cipher di response
List / toggle aktif   ◄──GET──── (tanpa password)
```

### 9.2 Alur eksekusi (loop terus-menerus, tanpa UI)

```
[iot-gateway proc]              [iot-broadcast proc — PM2 app #2]           [broker PDAM]
processIotLog ─► ClickHouse       loop tiap N detik:
  sensor_channel_latest ────────►   read active(owner_forwarding_mqtt) ◄─ Postgres iot
  (tulis ~baris 493)                 dekripsi password (key sama dgn Go, §7)
                                     for owner: fetchSensorChannelLatest(ownerCode)
                                       enqueue(owner, buildPayload(row))
                                     drain antrian owner ──publish──────────► mqtts retained qos1
                                       │ bulkhead + circuit-breaker + backoff + bounded queue
                                       └► tulis owner_forwarding_mqtt_log (retensi 7 hari, §4)
```

**Poin penting alur:**
- **Config & eksekusi terputus total** — Go tulis tabel, iot-gtw baca tabel. iot-gtw ambil perubahan config di siklus berikutnya (refresh daftar active tiap loop / cache pendek). Tak ada panggilan API antar-service.
- **Angular tidak pernah bicara ke iot-gtw** untuk fitur ini — semua lewat Go. (iot-gtw port 4000/`/api` tetap internal.)
- **Status/health untuk UI** dibaca dari `owner_forwarding_mqtt_log` (ditulis iot-gtw) via endpoint Go — jadi UI bisa tampilkan "terakhir sukses kirim / error" per-PDAM tanpa akses langsung ke iot-gtw.

Upgrade event-push nanti: `telemetry-processor` emit event → broadcaster fan-out. Kontrak payload/topik/tabel tak berubah.

### 9.3 UI — penempatan di Developer Portal

Halaman `/developer` (`src/app/pages/developer/`) = **API Developer Portal**, satu komponen 3 tab: `explorer` (Try-it External API), `keys` (My API Keys via `TenantApiKeysService`), `guide`. Audiens = integrator PDAM.

MQTT broadcast = **saudara "push" dari External API yang "pull"** → tempatkan sebagai **tab ke-4** di portal yang sama, **bukan menu terpisah**:
```
activeTab: 'explorer' | 'keys' | 'realtime' | 'guide'
                                   ▲ baru: "Realtime (MQTT)"
```
Alasan: audiens & mental-model sama (cara data keluar), portal sudah **tenant-scoped** (`idOwner`) jadi config MQTT otomatis milik PDAM yang login, dan pola "test/try-it" sudah ada.

Isi tab = **2 bagian**:

**A. CRUD config broker** (skill `ui-list` + `ui-form`) — biasanya 1 broker per PDAM tapi desain dukung banyak (mis. staging/prod):
- **List**: tabel config — label, broker URL (host saja, tanpa cred), badge status (aktif/nonaktif/error), toggle aktif, tombol Edit, Delete.
- **Add / Edit** (form): broker URL, username, password (*write-only* — kosong = pertahankan lama), topic template, QoS, retained, TLS, `enabled_categories`, aktif.
- Semua panggil Go `:3000` (SDK method tambah manual — regen broken).

**B. Log pengiriman** (skill `ui-list`) — tabel `owner_forwarding_mqtt_log` (retensi 7 hari, §4):
- Kolom: waktu, broker/label, jumlah pesan terkirim, status (sukses/gagal), error terakhir.
- Filter tanggal + status; paginasi. Baca via endpoint status/log Go (§9.2).
- Di atas tabel: **kartu ringkasan status** per-broker ("Aktif · sukses 12 dtk lalu · 340 msg/mnt" / "Error: …") — ini umpan balik koneksi (§9.4).

### 9.4 Feedback koneksi — **tanpa tombol Test terpisah** (aktifkan & pantau log)

**Keputusan: TIDAK ada endpoint Test Connection.** Begitu config `is_active=true`, siklus iot-gtw berikutnya langsung ambil config itu, **connect ke broker, dan mulai kirim**. Pengiriman pertama **=** tesnya. Hasil (sukses / error koneksi) tertulis ke `owner_forwarding_mqtt_log` → tampil di **kartu status** UI.

Konsekuensi bagus: **tidak perlu panggilan internal Go→iot-gtw sama sekali.** Jalur data & kontrol murni via tabel (§9.2) → **nol-kopling betulan**.

**Syarat agar feedback cepat & tidak ambigu:** iot-gtw **connect ke broker saat config jadi aktif** (bukan menunggu ada telemetry). Jadi broker unreachable / auth salah / TLS error langsung tercatat di status dalam ~1 siklus, independen dari ada-tidaknya data sensor saat itu. (Kalau connect baru dicoba saat ada data, "belum ada log" jadi ambigu antara "broker mati" vs "belum ada telemetry".)

**Kartu status live** (bawah form) = satu-satunya umpan balik, baca `owner_forwarding_mqtt_log` via endpoint Go:
- ✅ "Aktif · terakhir sukses 12 dtk lalu · 340 msg/mnt"
- ❌ "Error: connection refused / auth failed / TLS (5 mnt lalu)"
- ⏳ "Aktif · menunggu data / koneksi…" (baru diaktifkan, belum ada log)

UI tak pernah akses iot-gtw langsung. Kalau nanti butuh validasi instan sebelum aktif, tombol Test bisa ditambah belakangan (Go proxy ke iot-gtw) — tapi untuk sekarang **diabaikan**.

---

## 10. Risiko & Open Questions

| # | Item | Catatan |
|---|---|---|
| 1 | **Broker PDAM apa (EMQX/Mosquitto/cloud)?** | Tidak krusial untuk kita (kita client), tapi pengaruh TLS/cert & konvensi topik. Konfirmasi per-PDAM saat onboarding. |
| 2 | Enkripsi cred = prasyarat, menyentuh modul forwarding lama | Perlu keputusan: perbaiki plaintext debt sekarang atau tandai terpisah. Rekomendasi: sekarang (util bersama). |
| 3 | Interval poll vs beban ClickHouse | N detik: seimbangkan realtime vs query load. Mulai 5–10 dtk. |
| 4 | Kontrak topik per-PDAM | `topic_template` configurable; sepakati saat onboarding tiap PDAM. |
| 5 | Backpressure bila banyak PDAM down bersamaan | Bounded queue + circuit breaker menahan; pastikan total memori antrian ter-cap. |
| 6 | **Shared encryption key Go↔iot-gtw** | Kontrak lintas-bahasa paling rawan. Format byte + key env harus identik; wajib test vektor bersama sebelum produksi (§7). |
| 7 | **Volume `owner_forwarding_mqtt_log`** | Retensi 7 hari via cron/partisi (§4). Kalau cron delete lambat saat volume besar → pindah ke drop-partisi harian. |
| 8 | iot-gtw ambil perubahan config telat | iot-gtw baca tabel per-siklus; ada jeda ~1 loop antara user simpan di UI dan efektif. Dapat diterima; kalau perlu instan, tambah invalidasi cache. |

---

## 11. Rencana Fase (checklist)

**Fase 0 — POC (1 PDAM, 1 topik, config manual di DB)**
- [ ] Sepakati format enkripsi (AES-256-GCM, `nonce||ct||tag` base64, env `FORWARDING_ENC_KEY`) + test vektor bersama Go↔iot-gtw.
- [ ] Tabel `owner_forwarding_mqtt` + entity (migration manual, insert 1 baris uji langsung ke DB).
- [ ] Broadcaster minimal (iot-gtw): baca 1 config → dekripsi → poll `fetchSensorChannelLatest(ownerCode)` → publish `mqtts` retained qos1 ke broker uji.
- [ ] **Watermark `last_update` per owner** — publish hanya baris berubah (§8-i). WAJIB sejak POC biar tak spam.
- [ ] `.on('error')` + try/catch + timeout terpasang (anti-crash).

**Fase 1a — Backend Go (CRUD config)**
- [ ] Modul `owner_forwarding_mqtt` pakai skill `backend-module` (Model+DTO+Repo+Service+Controller+routes).
- [ ] Enkripsi password saat save (util bersama), redaksi saat read, scoping tenant (`idOwner`).
- [ ] Endpoint: list, create, update, delete, toggle, **status** (ringkasan) + **logs** (list paginasi `owner_forwarding_mqtt_log`, filter tanggal/status). **Tanpa test-connection** (§9.4).

**Fase 1b — UI Angular (tab Developer Portal)**
- [ ] Tab ke-4 `realtime` di `developer-portal.component.ts` (samping Explorer/Keys/Guide).
- [ ] **Bagian A — CRUD config** (skill `ui-list` + `ui-form`): list config (label, URL, status, toggle, edit, delete) + form add/edit (broker URL, username, password write-only, topic template, QoS, retained, TLS, `enabled_categories`, aktif).
- [ ] **Bagian B — Log pengiriman** (skill `ui-list`): tabel `owner_forwarding_mqtt_log` (waktu, broker, jml pesan, status, error) + filter tanggal/status + paginasi.
- [ ] Kartu ringkasan **status live** per-broker (last success/error, rate) di atas log — feedback koneksi (bukan tombol test).
- [ ] SDK method tambah **manual** (regen broken — memory `sdk-regen-gotcha`).

**Fase 1c — Eksekutor produksi (iot-gtw)**
- [ ] App PM2 kedua `iot-broadcast` di `ecosystem.config.js`.
- [ ] Refresh daftar active config tiap loop (ambil perubahan dari UI).
- [ ] **Connect ke broker saat config aktif** (bukan nunggu data) → error koneksi cepat tercatat (§9.4).
- [ ] Bulkhead + circuit breaker + bounded queue + backoff.
- [ ] `owner_forwarding_mqtt_log` tulis audit **+ cron pembersih retensi 7 hari** (`@nestjs/schedule`, index `created_at`).
- [ ] Beresin plaintext debt `target-db-connector.service.ts:63` pakai util enkripsi yang sama.

**Fase 2 — Multi-topik**
- [ ] Registry event-type → topic-template.
- [ ] `enabled_categories` per-owner.
- [ ] Tambah kategori `status` / `alert` (payload versioned).

**Fase 3 — Event-push (opsional, bila ada PDAM butuh instan)**
- [ ] Emit dari `telemetry-processor` → broadcaster fan-out. Kontrak tetap.

---

## 12. Titik Mulai (referensi kode)

- Seam data: `src/modules/telemetry-processor/telemetry-processor.service.ts` (~493, setelah tulis ClickHouse) — untuk event-push nanti.
- Sumber poll: `src/modules/forwarding/forwarding-worker.service.ts:143` `fetchSensorChannelLatest`.
- Publish: `src/modules/mqtt/mqtt.service.ts:244` (pola client MQTT).
- Cred/enkripsi (debt): `src/modules/forwarding/target-db-connector.service.ts:63`.
- Entity pola: `src/entities/existing/owner-forwarding-database.entity.ts`, `owner-forwarding-log.entity.ts`.
- PM2: `ecosystem.config.js`.
- Pola cron retensi: `src/modules/scheduler/data-cleanup.service.ts` (`@Cron('0 2 * * *')`).
- Kolom sumber & watermark: `iot.sensor_channel_latest` (`eng_value`, `metric_unit`, `metric_code`, `device_id`, `owner_code`, `owner_id`, `last_update`, `last_iot_log_id`).
- Mapping owner: `iot-backend-go/app/models/owner/owner.go` (`owner_code varchar(5) unique` ↔ `idOwner`).

---

## 13. Audit Pra-Eksekusi (2026-07-09)

Verifikasi asumsi load-bearing terhadap kode nyata sebelum mulai. **Hasil: siap eksekusi**, 1 celah wajib-tambal sudah dimasukkan.

**✅ Terverifikasi benar:**
1. `publish()` ada — `mqtt.service.ts:244`.
2. Payload di-back kolom nyata — `sensor_channel_latest` punya `device_id, owner_code, owner_id, metric_code, metric_unit, raw_value, eng_value, last_update, last_iot_log_id` (§6).
3. Sumber poll ada — `fetchSensorChannelLatest(ownerCode)` query `sensor_channel_latest FINAL`.
4. **Scoping tenant bukan masalah** — `owners.owner_code varchar(5) UNIQUE` ↔ `idOwner` (1:1), dan baris CH bawa `owner_code`+`owner_id`. Go isi `owner_code` otomatis dari JWT owner, bukan input user.
5. Scheduler tersedia & ada pola tiru — `@nestjs/schedule` dipakai luas; `data-cleanup.service.ts` (`@Cron` harian 2 pagi) = template retensi.
6. Utang plaintext cred terkonfirmasi — `target-db-connector.service.ts:63`.

**⚠️ Celah wajib-tambal (sudah masuk §8-i):**
- **Re-publish nilai identik.** `sensor_channel_latest FINAL` kasih baris "latest" sama tiap siklus → tanpa **watermark `last_update`**, drain publish ulang nilai sama tiap N detik (boros + menyesatkan). Watermark WAJIB sejak POC.

**Penyempurnaan yang sudah difold:**
- Pemetaan payload→kolom eksplisit (`value←eng_value`, `unit←metric_unit`, `ts←last_update`) — §6.
- `owner_code` auto-derive dari owner (bukan field form) — §4.
- Retensi tiru `data-cleanup.service.ts` — §4.

**Tetap terbuka (bukan blocker):** broker tiap PDAM apa (per-onboarding), interval poll final (mulai 5–10 dtk), format byte enkripsi + test vektor Go↔iot-gtw (§7) — dibereskan di Fase 0.
