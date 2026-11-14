# Audit Senior Dev — `/iot/owners` & `/iot/projects` (14 Nov 2026)

Cakupan: `owners-list`, `owners-detail` (TS 918 + HTML 688 baris), `owners-add` (dipakai juga untuk `:ownerId/edit`), `user-modal`, `projects-list`.
Backend: `iot-backend-go` — `owner_controller.go`, `owner_service.go`, `project_controller.go`, `project_service.go`, `tenantapikey`, `user`.

**Metode bukti.** Backend `:3000` **tidak listening** saat audit (`curl 127.0.0.1:3000` → 000). Backend sengaja **tidak** dinyalakan karena proses itu juga menjalankan scheduler alert/notifikasi yang menulis ke DB produksi. Sebagai gantinya:
- query SQL **read-only** (`SET default_transaction_read_only=on`) ke Postgres produksi lewat tailnet, memakai SQL yang **sama** dengan yang dijalankan service Go;
- log `storage/logs/goravel-2026-11-14.log` (backend jalan pagi tadi) untuk pola query & latensi;
- bukti zero-time runtime dari audit sebelumnya (`docs/audit/mobile-2026-11-14/04-review.md` T7).

Kalau sebuah klaim butuh respons HTTP live dan belum dibuktikan, ditandai **perlu verifikasi**.

Waktu acuan: Sab 14 Nov 2026 19:23 WIB.

---

## 1. Peta request

### 1a. `/iot/owners` (owners-list)

| # | Endpoint | Param dikirim | Param dibaca backend | Panggilan | Masalah |
|---|---|---|---|---|---|
| 1 | `GET /api/owners` | `page`, `limit`=10, `search`, `industry` | semua ✓ (`ParsePagination` + `OwnerFilter`) | 1× saat init, lalu **1× per ketikan** (tanpa debounce, tanpa switchMap) | Field count dibaca dengan nama salah → selalu 0 (F1). Respons bisa datang tidak berurutan. |
| 2 | `GET /api/owners` | `limit`=1000 | dipotong ke 100 oleh `Sanitize()` | 1× | Hanya untuk opsi Industry. Masih aman (27 owner), tapi terpotong diam-diam kalau owner > 100. |

### 1b. `/iot/owners/:id` (owners-detail)

| # | Endpoint | Param | Dibaca? | Panggilan | Masalah |
|---|---|---|---|---|---|
| 1 | `GET /api/owners/{id}/detail` | path id | ✓ | 1× | Di backend ±7 query: `findOwnerRow` 2× (masing-masing agregat SEMUA projects×nodes×sensors), stats, webhooks, dbs, **forwardingLogs (tidak dipakai UI, 1,9 s cold)**. Tidak mengembalikan email/phone/address. `projects[]` dikembalikan tapi tidak ditampilkan. |
| 2 | `GET /api/users` | `idOwner` | ✓ `idOwner` | 1× (setelah #1) | Respons `{data,meta}`, frontend cek `Array.isArray(response)` → **selalu []** (F4). Default limit 10. |
| 3 | `GET /api/tenant-api-keys` | `ownerId` | ✗ **tidak dibaca**. Pakai `owner_id` dari JWT; admin tidak punya → `WHERE id_owner = ''` → error uuid ditelan → `[]` | 1× | Daftar API key admin selalu kosong (F5). |
| 4 | `POST/PUT /api/owners/{id}/webhooks[/…]`, `/databases[/…]`, `/test` | body | ✗ **semua stub** (`return Created({})` / `Success({})` / `{"success":false,"message":"placeholder"}`) | saat klik | UI bilang "saved successfully", padahal tidak ada yang disimpan (F3). |
| 5 | `POST /api/tenant-api-keys` | body `idOwner` | ✗ (pakai JWT owner) | saat klik | Admin → 400 "Missing user or owner context". |

### 1c. `/iot/owners/new` & `/:ownerId/edit` (owners-add)

| Endpoint | Masalah |
|---|---|
| `GET /api/owners/{id}` (edit) | ✓ |
| `POST /api/owners` | ✓ email/phone/address dikirim. `notes` tidak ada kolomnya, jadi dibuang diam-diam. |
| `PATCH /api/owners/{id}` | **email/phone/address tidak dikirim** → editan hilang (F7). |

### 1d. `/iot/projects` (projects-list)

| # | Endpoint | Param | Dibaca? | Panggilan | Masalah |
|---|---|---|---|---|---|
| 1 | `GET /api/owners` | `page=1, limit=200` | limit dipotong 100 | 1× | Hanya untuk dropdown Owner. |
| 2 | `GET /api/projects` | `page=1, limit=200, search, ownerId` | ✓ `ownerId`, `search` (hanya `name ILIKE`); `limit` dipotong **100** di repo | 1× + 1× per ganti owner/search (debounce 400 ms) | `meta.total` diabaikan → terpotong diam-diam di > 100. Backend: **2 + 6×N query** (N=24 → 146 query). `alerts:0` hard-code. `online` = `connectivity_status`. |

Area & status difilter di klien. Backend sebenarnya menerima `areaType` & `status`, tapi selama total ≤ 100 hasilnya tetap benar.

---

## 2. Asal setiap angka yang tampil (owners-list, owners-detail, projects-list)

| Halaman · angka | Sumber di kode | Asli? |
|---|---|---|
| Owners list · "N Projects" | `owner.totalProjects \|\| 0` (`owners-list.ts:140`) — API mengirim `projectCount` | **Selalu 0** (nama field salah) |
| Owners list · "N Nodes · N Sensors" | `totalNodes`/`totalSensors \|\| 0` — API mengirim `nodeCount`/`sensorCount` | **Selalu 0** |
| Owners list · Alerts | `owner.alertCount \|\| 0` — tidak ada di API | **Selalu 0 (palsu)** |
| Owners list · Status badge + tab Active/Trial/Suspended | `mapStatus(owner.status)` — tabel `owners` **tidak punya** kolom status → selalu `active` | **Palsu**: semua "Active", termasuk "Test Company 1" |
| Owners list · tab "All" count | `meta.total` (27) | asli; tetapi tab "Active" = jumlah di halaman (10) → tidak konsisten |
| Owners list · SLA | `owner.slaLevel \|\| 'bronze'` | owner tanpa SLA (7 test owner) tampil "BRONZE" padahal **kosong** |
| Owners list · Last Activity | `updatedAt` record owner, format `en-US` + `timeZone:'UTC'` | Bukan aktivitas (tanggal edit profil); UTC, bukan WIB |
| Owners list · industry | `industry \|\| 'Unspecified'` | ok |
| Owner detail · Projects/Nodes | `statistics.totalProjects/totalNodes` | asli |
| Owner detail · "Sensors" | `statistics.activeSensors` | Label "Sensors" padahal yang dihitung sensor **aktif** (DEMO1: 13, project card: 14) |
| Owner detail · email/phone | hard-code `''` ("Not in API yet") | Kosong, padahal kolomnya ada di DB |
| Owner detail · Forwarding Health | `determineForwardingStatus` → badge **selalu hijau** (`owners-detail.html:69`) | "Not Configured"/"Disabled" tetap hijau |
| Owner detail · webhook form (label, URL, secret, headers, "Healthy", last delivery 26 Mei 2024) | default **hard-code** `owners-detail.ts:120-137` dipakai bila owner tak punya webhook | **Palsu** untuk 25/27 owner |
| Owner detail · MySQL/PostgreSQL config ("mysql-fw.adhiwater.local", "Healthy", 26 Mei 2024) | default hard-code `owners-detail.ts:139-175` | **Palsu** untuk 26/27 owner |
| Owner detail · Users table | `Array.isArray(response) ? response : []` | **Selalu kosong** |
| Owner detail · API keys | `GET /tenant-api-keys` (scope JWT) | **Selalu kosong** untuk admin |
| Projects card · status badge | `projects.status` (flag admin, 24/24 `active`) | Bukan kesehatan: Way Rilau 0/20 online tetap hijau "Active" |
| Projects card · "online/nodes" | `stats.online` = `COUNT(connectivity_status='online')` | Kebetulan cocok hari ini (lihat §3), semantik ≠ `getFreshness` |
| Projects card · Sensors | `stats.sensors` | asli (semua status) |
| Projects card · Alerts | `stats.alerts` = **`0` hard-code** (`project_service.go:85`) | **Palsu** |
| Projects card · lokasi | `node_locations … LIMIT 1` tanpa ORDER, fallback "Unknown location" | 11/11 project PDAM tidak punya `node_locations` → semua "Unknown location", padahal `nodes.address` terisi |
| Projects card · last sync | `MAX(nodes.last_seen_at)`; zero-time dijaga di klien (`parseLastSync < 2000`) | asli; format "5m ago" Inggris, > 7 hari `toLocaleDateString()` |

---

## 3. Data live vs tampilan (angka)

Ground truth Postgres, 14 Nov 19:20 WIB. Kolom `fresh/stale/offline/nodata` memakai rumus `getFreshness` (fresh < max(10, 3×interval) menit, stale < max(60, 12×interval)) atas `nodes.last_seen_at` + `telemetry_interval_sec`. Ini rumus yang sama dengan yang dipakai workspace (`project-workspace.component.ts:239`).

| Owner | Owners list tampil (P/N/S/Alert) | Owner detail (P/N/S) | Projects card (online/N · S · Alert) | Kebenaran DB |
|---|---|---|---|---|
| WAYRL PDAM Way Rilau | 0 / 0 / 0 / 0 | 1 / 20 / 25 | 0/20 · 25 · 0 · "Unknown location" | 1 prj, 20 node **semua offline** sejak 15 Okt, `connectivity_status` = **degraded** (macet), 25 sensor, 0 alert open |
| 9VSIK PDAM TEBO | 0 / 0 / 0 / 0 | 1 / 12 / 12 | 11/12 · 12 · 0 | 11 fresh, 1 offline, 12 sensor |
| RDWNJ Tirta Mahakam | 0 / 0 / 0 / 0 | 1 / 8 / 8 | 8/8 · 8 · 0 | 8 fresh |
| DEMO1 PT DEVELOPMENT | 0 / 0 / 0 / **0** | 1 / 6 / **13** | 0/6 · **14** · **0** | 6 offline (last 9 Nov), 14 sensor (13 aktif), **3 alert open** (node_offline) |
| VE7GX Tirta Jasa Lamsel | 0 / 0 / 0 / **0** | 1 / 2 / 3 | 1/2 · 3 · **0** | 1 fresh 1 offline, **1 alert open** |
| LU2R3 PT PP | 0 / 0 / 0 / **0** | 1 / 1 / 2 | 0/1 · 2 · **0** | 1 offline, **1 alert open** |
| 6BDB7 Bright Farms | 0 / 0 / 0 | 2 / 1 / 1 | 0/1, last sync "Belum pernah" | 1 node nodata (`last_seen_at` NULL) |
| Semua 27 owner | P/N/S = 0 untuk **setiap** baris | — | — | 15 owner punya node (78 node total) |

Jadi satu owner (DEMO1) tampil dengan **tiga angka sensor berbeda** (0 / 13 / 14) dan **dua angka alert** (0 di mana-mana, padahal 3 open). Inilah keluhan owner "tidak realistis & tidak konsisten".

`connectivity_status` vs freshness hari ini: 23+2 `online` = 25 fresh (cocok). Tetapi **31 node macet di `degraded`**: 20 WAYRL sejak 15 Okt, 6 DEMO1, 1 9VSIK sejak 25 Jul, dst. Penyebabnya, `iot-gtw/src/modules/mqtt/connectivity-monitor.service.ts:83-87` hanya memindahkan `connectivityStatus: 'online'` ke offline (komentarnya "or 'degraded'" tidak diimplementasi), dan ambangnya tetap 5/15 menit tanpa melihat interval node. Akibatnya angka "offline" apa pun yang dihitung dari `connectivity_status='offline'` menghasilkan **22**, padahal menurut freshness yang benar **52** (+1 nodata).

---

## 4. Temuan

### P0

**F1 [P0] · `owners-list.ts:140-143` · Semua hitungan owner selalu 0 (nama field salah) + kolom Alerts palsu.**
- Bukti: frontend membaca `owner.totalProjects / totalNodes / totalSensors / alertCount`. Backend `owner_service.go:1020-1024` (`ownerToMap`, `includeCounts`) mengirim `projectCount`, `nodeCount`, `sensorCount`, dan tidak mengirim alert sama sekali. DB: 15 owner punya node (WAYRL 20, 9VSIK 12, …). Halaman menampilkan "0 Projects · 0 Nodes · 0 Sensors · 0" untuk semua 27 baris.
- Dampak: daftar owner terlihat seperti tenant kosong semua. Inilah inti keluhan "tidak realistis".
- Perbaikan: di `mapOwnerToSummary` baca `owner.projectCount ?? 0`, `nodeCount`, `sensorCount` (pakai `??`, bukan `||`). Kolom Alerts: hapus sampai backend punya `openAlerts` (lihat Rencana B2), lalu tampilkan `openAlerts`.

**F2 [P0] · `owners-detail.ts:120-175` · Konfigurasi forwarding palsu ("adhiwater") ditampilkan sebagai data asli, dan bisa ikut tersimpan.**
- Bukti: `webhookConfig` default berisi `endpointUrl:'https://hooks.adhiwater.co.id/iot/ingest'`, `secretToken:'whsec-demo-token'`, header `X-Tenant-Code: ADHI-WATER`, `lastStatus:'Healthy'`, `lastDeliveryAt:'2024-05-26T09:12:00Z'`. `databaseConfigs` default berisi `mysql-fw.adhiwater.local` "Healthy" dan `pg-fw.ops.internal`. Default ini hanya diganti bila API punya data. Di DB hanya 3 owner yang punya webhook/db, sehingga **25 owner melihat webhook palsu** dan **26 owner melihat DB config palsu**. Bukti bocor ke DB: owner `4FC2A` (SmartFactory) punya baris `owner_forwarding_webhooks` "Command Center Webhook" → `https://hooks.adhiwater.co.id/iot/ingest`, persis nilai placeholder (tersimpan di era NestJS).
- Dampak: operator mengira data owner sudah dikirim ke endpoint "Healthy", lengkap dengan tanggal palsu. Kalau tombol Save ditekan, konfigurasi palsu dikirim.
- Perbaikan: inisialisasi `webhookConfig = null`, `databaseConfigs = []`. Tampilkan empty state "Belum dikonfigurasi" dengan tombol "Tambah". Hapus semua literal adhiwater/demo.

**F3 [P0] · `owner_controller.go:208-254` · Semua endpoint tulis forwarding hanya stub, tapi UI melaporkan sukses.**
- Bukti: `CreateWebhook` → `Created({})`, `UpdateWebhook`/`UpdateDatabase` → `Success({})`, `CreateDatabase` → `Created({})`, `TestWebhook` → `{"success":false,"message":"placeholder"}`, `TestDatabase` → `{"connected":false,"message":"placeholder"}` (frontend membaca `result.success`). Frontend `saveWebhookConfig` menulis "Configuration created successfully!" dan `this.webhookId = response.idOwnerForwardingWebhook` (= undefined).
- Dampak: perubahan konfigurasi hilang diam-diam padahal ada pesan sukses. Tombol Test selalu "Test failed: placeholder".
- Perbaikan (pilih satu):
  - (a) termurah dan jujur: jadikan kartu Forwarding **read-only** (tampilkan `forwardingWebhooks`/`forwardingDatabases` dari `/detail`), sembunyikan tombol Save/Test, beri label "Edit belum tersedia";
  - (b) implementasi CRUD sesuai skill `backend-module`.

  Bagaimanapun, stub tidak boleh mengembalikan 2xx. Ganti dengan `apperr.NotImplemented`/501 agar tidak ada lagi sukses palsu.

**F4 [P0] · `owners-detail.ts:700` · Tabel User selalu "No users found".**
- Bukti: `/api/users` mengembalikan `Paginated` `{data, meta}` (`user_controller.go:63`). Frontend: `this.ownerUsers = Array.isArray(response) ? response : []` → `[]`. DB: 12 tenant user, mis. WAYRL 1, 6MNOQ 2, 9VSIK 1.
- Dampak: admin mengira owner belum punya login lalu membuat user ganda (tombol "Create First User").
- Perbaikan: `this.ownerUsers = response?.data ?? []`, kirim `limit: 100` (atau pakai `fetchAll`), tampilkan `meta.total`.

### P1

**F5 [P1] · `tenantapikey` controller `Index`/`Store` + `tenant-api-keys.service.ts:60-63` · Bagian API key rusak total untuk admin.**
- Bukti: frontend mengirim `?ownerId=`. Backend `Index` mengabaikannya dan memakai `GetOwnerID(ctx)` (admin = ""): `WHERE id_owner = ''`. Diuji di psql: `ERROR: invalid input syntax for type uuid: ""`. Error dari `.Get()` tidak dicek → `Success([])`. DB berisi 6 key (DEMO1 3, RDWNJ 1, 9VSIK 1, WAYRL 1); halaman bilang "No API keys generated yet". `Store` sebagai admin → 400 "Missing user or owner context" (`idOwner` di body diabaikan).
- Dampak: admin tidak bisa melihat, membuat, atau mencabut key PDAM. Ini juga kasus "error ditelan" (kelas #4).
- Perbaikan: di `Index`/`Store`/`Update`/`Destroy`/`Regenerate`, bila `role=admin` pakai `ownerId` (query) atau `idOwner` (body) yang divalidasi `uuidRe`. Bila tenant, paksa owner dari JWT. Bila tenant tanpa owner → 403. Cek error `.Get()` → 500.

**F6 [P1] · `project_service.go:47-106` · `/projects` N+1 di backend: 2 + 6 query per project, `alerts:0` hard-code, `online` dari `connectivity_status`.**
- Bukti: per project dijalankan owner, count nodes, count online, count sensors, node_locations, MAX(last_seen_at) → untuk admin (24 project) = **146 query**. RTT tailnet 35–45 ms per query (psql `\timing`). Di log 14 Nov latensi per query 34–925 ms (pool `DB_MAX_OPEN_CONNS=10` saling berebut dengan halaman lain). Ini konsisten dengan 5–6 s yang dilaporkan sebelumnya. `"alerts": 0` di baris 85, padahal DB punya 5 alert open + 1 acknowledged (Demo-project 3, Trial/VE7GX 1, Portable 1).
- Dampak: halaman lambat. Kartu dan sort "Alert terbanyak" tidak berguna. Angka online memakai sumber yang bisa macet (§3).
- Perbaikan: satu query CTE (lihat Rencana B1) yang mengembalikan `stats.{nodes,sensors,fresh,stale,offline,nodata,openAlerts}`, `lastSync` (null bila tak ada), dan `location` (fallback `nodes.address`).

**F7 [P1] · `owners-add.ts:193-204` · Edit owner membuang email/phone/address.**
- Bukti: `updateOwner` hanya mengirim name, industry, contactPerson, slaLevel, forwardingSettings. Backend `Update` memang mendukung `Email/Phone/Address` (`owner_service.go:374-382`). `createOwner` mengirimnya, `updateOwner` tidak.
- Dampak: admin mengubah kontak PDAM, tampil sukses, nilai lama tetap tersimpan.
- Perbaikan: pakai satu builder payload (getter `payload` di baris 227 sudah ada, tinggal dipakai untuk create dan update). Hapus `notes` (tidak ada kolom di `owners`) atau tambahkan kolomnya.

**F8 [P1] · `owner_service.go:632-637, 643-646, 980-985`; `project_controller.go:35-39`; `project_service.go:34` · Scoping tenant fail-open.**
- Bukti: pola `!IsAdmin(sc) && OwnerID != ""` → tenant dengan `OwnerID` kosong lolos tanpa filter. `ProjectController.Index`: bila `Role != admin` tapi `OwnerID == ""` → memakai `?ownerId=` dari query (tenant memilih owner mana pun) atau tanpa filter (semua project). Middleware JWT hanya mengisi `owner_id` bila claim `idOwner` non-nil (`jwt_auth.go:58`).
- Status data: 12/12 tenant saat ini punya `id_owner`, jadi belum bisa dieksploitasi lewat login normal. Tetapi token tenant dengan `idOwner:null` (user tenant yang ownernya dihapus, refresh token lama) akan melihat semua owner/project. **Perlu verifikasi runtime** dengan token tenant tanpa `idOwner` begitu backend jalan.
- Perbaikan: helper `services.ScopeOwner(sc) (ownerID string, err error)`: admin → "" (tanpa filter), tenant dengan owner → owner, selain itu → `Forbidden`. Pakai di semua tempat di atas. Ini temuan keamanan, jadi **eskalasi ke owner**.

**F9 [P1] · `owners-detail.ts:238-249`, `owner_service.go:225-243` · Owner detail tidak menampilkan email/phone/address, tidak punya daftar project, tidak punya link ke workspace.**
- Bukti: `email: ''` / `phone: ''` hard-code ("Not in API yet"). `/detail` tidak mengembalikan `email/phone/address/ownerCode`, padahal `findOwnerRow` sudah mengambilnya. `data.projects` (dengan `nodeCount`) dikembalikan tapi tidak dirender. Tidak ada `routerLink` ke `/iot/projects/:id/overview` di halaman ini.
- Dampak: dari halaman owner, operator tidak bisa melihat project-nya atau masuk ke workspace.
- Perbaikan: backend menambah `ownerCode,email,phone,address` ke map `/detail`. Frontend menambah kartu "Projects" berisi baris per project (nama, status kesehatan, node fresh/total, alert open, last sync) dan `[routerLink]="['/iot/projects', p.idProject, 'overview']"`.

**F10 [P1] · `owners-list.ts:5, 50, 153-160` · Status owner (Active/Trial/Suspended) dikarang.**
- Bukti: tabel `owners` tidak punya kolom status (diperiksa di `information_schema`). `mapStatus(undefined)` → `'active'`. Tab Trial/Suspended selalu 0. Tab "All" = 27, sedangkan "Active" = jumlah baris di halaman (10).
- Perbaikan: hapus tab dan badge status sampai ada kolomnya. Kalau dibutuhkan, tambahkan `owners.status` lewat migrasi.

**F11 [P1] · `owner_service.go:772-811` · `statistics.activeAlerts` selalu 0 untuk alert engine Go.**
- Bukti: join `alert_events → alert_rules → sensor_channels`. Semua 6 event aktif adalah `rule_type=node_offline` dengan `id_sensor_channel IS NULL` → tidak pernah ikut terhitung (diuji: DEMO1 `active_alerts=0` padahal 3 open). Join kartesius 7 tabel hanya untuk COUNT DISTINCT.
- Perbaikan: hitung alert lewat `alert_events.id_node` (kolom ini sudah ada, terisi pada event baru): `JOIN nodes n ON n.id_node = e.id_node JOIN projects p … WHERE e.status IN ('open','acknowledged')`, plus fallback via rule→channel untuk event lama tanpa `id_node` (6 baris, semuanya `cleared`/`acknowledged`).

**F12 [P1] · `iot-gtw/.../connectivity-monitor.service.ts:47-56, 83-87` (di luar repo halaman, tapi menjadi sumber angka "online") · `connectivity_status` macet di `degraded`, dan `last_seen_at` dipalsukan.**
- Bukti: query offline hanya memilih `connectivityStatus: 'online'`, sehingga 31 node `degraded` tidak pernah menjadi offline (WAYRL 20 node sejak 15 Okt). `initialCleanup` mengisi `lastSeenAt = now - 24h` untuk node yang belum pernah kirim, artinya timestamp palsu ditulis ke DB.
- Perbaikan: jangan pakai `connectivity_status` untuk angka di UI. Hitung dari `last_seen_at` + interval (Rencana B0). Perbaiki gtw: `In(['online','degraded'])` dan hapus pemalsuan `lastSeenAt`. **Eskalasi ke owner** karena gtw adalah proses produksi.

### P2

**F13 [P2] · `owners-detail.html:637-642` · Catatan developer tampil sebagai teks di halaman.**
Pembuka `<!--` hilang, sehingga teks "Needs implementation: 1. Backend endpoint: GET /owners/:id/forwarding-logs … -->" ter-render di bawah kartu API Key. Perbaikan: hapus blok 637-687 atau perbaiki komentarnya.

**F14 [P2] · `owners-detail.ts:297-303` · Konfigurasi DB Postgres tak pernah dikenali → Save membuat config baru, Test bilang "save first".**
API mengirim `dbType` apa adanya dari DB (`postgres`, 3 baris DEMO1), tetapi frontend mencocokkan `'postgresql'` → `postgresDatabaseId = null`. Selain itu satu `postgresDatabaseId`/`mysqlTestMessage` dipakai bersama semua config (DEMO1 punya 3), sehingga Save/Test pada config ke-1 mengenai id config terakhir. Perbaikan: pakai `config.id` per kartu dan normalisasi `dbType` (`postgres|postgresql`). Nilainya rendah selama endpoint masih stub (F3), tapi bug ini akan muncul begitu F3 diimplementasi.

**F15 [P2] · `owners-detail.html:69` · Badge Forwarding Health selalu hijau.**
"Not Configured", "Disabled" (DEMO1: 3 DB disabled, `last_status=failed`, "password authentication failed", 121.793 log gagal) tetap hijau. Perbaikan: warna per status. Untuk "Operational", turunkan dari `lastStatus` config yang enabled, bukan dari "ada yang enabled".

**F16 [P2] · `owners-list.ts:192-199, 86` · Pencarian tanpa debounce dan tanpa pembatalan.**
Satu request per ketikan, dan respons lama bisa menimpa yang baru. Perbaikan: `Subject` + `debounceTime(300)` + `switchMap`, sama seperti projects-list (yang sudah memakai debounce 400 ms tapi juga belum membatalkan request lama). Placeholder "Cari nama owner / ID / kontak": backend mencari `name/industry/contact_person`, bukan `owner_code`. Tambahkan `o.owner_code ILIKE ?` di `buildOwnerFilters`.

**F17 [P2] · `projects-list.ts:94-100, 315-320`; `owners-list.ts:112` · Pemotongan limit laten.**
`limit:200`/`1000` dipotong ke 100 tanpa memeriksa `meta.total`. `statusCount` memakai `projects.length`. Saat ini 24 project dan 27 owner, jadi belum terpotong. Perbaikan: `fetchAll()` dari `shared/utils/fetch-all.ts` untuk dropdown owner. Untuk daftar project, pakai `fetchAll` atau paginasi server dengan `meta.total`.

**F18 [P2] · `owners-add.ts:23-24, 98-102` · Opsi form tidak cocok dengan data.**
Industri di DB: `Aquaculture`, `Water Management`, `Industry 1..5`, `Testing` tidak ada di `industryOptions`. 7 owner memakai SLA huruf kecil (`gold/platinum/silver`) sedangkan opsi `Gold`. Akibatnya `<select>` tampil kosong saat edit. `enableWebhook` default `true` + wajib URL membuat 15 owner dengan `forwarding_settings` NULL tidak bisa disimpan tanpa mengisi URL. Padahal `forwardingSettings` tidak dibaca proses mana pun (grep: hanya model/DTO dan entity gtw), jadi toggle ini mati. Perbaikan: normalisasi SLA (Title Case, lewat migrasi data + validasi enum di DTO), sisipkan nilai yang ada ke opsi bila tidak ada, default `enableWebhook:false` atau hapus seksi forwarding dari form.

**F19 [P2] · Format waktu/angka.**
- `owners-list.ts:175-179` memakai `en-US` + `timeZone:'UTC'` ("09:12 AM UTC", "Yesterday").
- `projects-list.ts:461-471` memakai teks Inggris ("5m ago", "just now") dan `toLocaleDateString()` tanpa locale.

App memakai `LOCALE_ID 'id-ID'`. Perbaikan: `timeAgo()` dari `telemetry-freshness.ts`, atau `DatePipe` dengan `'dd MMM yyyy HH:mm'` (zona browser = WIB), teks Indonesia.

**F20 [P2] · `project_service.go:90-94` · Lokasi project "Unknown location" untuk semua project PDAM.**
11/11 project Water Treatment punya 0 `node_locations`, padahal `nodes.address` terisi (9VSIK 12/12, RDWNJ 8/8, F9YUN 2/2, WYDZI 2/2). Query `LIMIT 1` tanpa `ORDER BY` juga tidak deterministik. Perbaikan: `COALESCE((SELECT address FROM node_locations … ORDER BY created_at LIMIT 1), (SELECT address FROM nodes WHERE id_project=? AND address<>'' ORDER BY created_at LIMIT 1))`, atau `NULL` → UI menyembunyikan barisnya (jangan tampilkan "Unknown location").

**F21 [P2] · `projects-list.ts:411, 474-483` · Badge status project = flag admin, terlihat seperti kesehatan.**
24/24 `active`. Way Rilau (20/20 offline sebulan) tampil hijau "Active". Tab Maintenance/Offline selalu 0. Perbaikan: pisahkan "Status kontrak/admin" dari "Kesehatan" (dari freshness agregat: semua offline → "Tidak melapor"; sebagian → "Sebagian offline").

**F22 [P2] · `owner_service.go:936-978` · `/detail` memuat `forwardingLogs` yang tidak dipakai UI.**
Query `owner_forwarding_logs WHERE id_owner=? ORDER BY created_at DESC LIMIT 20` memakai index `created_at` dan memfilter 131.265 baris: 1,9 s cold, 17 ms warm (EXPLAIN ANALYZE, 9VSIK). Perbaikan: hapus dari `/detail` (UI sudah tidak memakainya) atau buat index `(id_owner, created_at DESC)`.

**F23 [P2] · `owner_service.go:355-385` · Tenant bisa mengubah `slaLevel`/`name` owner-nya sendiri lewat `PATCH /owners/{id}`.**
`ensureOwnerAccess` hanya memastikan owner sendiri. Apakah SLA mengatur fitur/tagihan: **perlu verifikasi**. Bila ya, `slaLevel` dan `forwardingSettings` harus admin-only.

### P3 (singkat)
- `owners-list.html:17-42` — Export / Invite / Assign SLA / Generate Contract / Archive hanya `href="javascript:;"` tanpa aksi. Hapus.
- `app-menus.service.ts:19` — menu `/iot/owners#delivery` menuju list page; anchor-nya pun `#delivery-config` di detail.
- `owners-add.ts:177` — `queryParams: { created }` tidak dibaca list (tak ada toast).
- `owners-edit/` — komponen yatim (tidak dideklarasikan, route edit memakai `OwnersAddPage`). Hapus.
- Route `iot/owners` dan `iot/projects` tanpa `AuthGuard`/roles (menu admin-only, backend tetap scoping). Tambahkan guard role `admin` untuk owners.
- Tidak ada `data.guide` untuk owners & projects-list (skill `page-guide`).
- `owners-list.ts:139` — `slaLevel || 'bronze'` mengarang SLA. Tampilkan "—".

---

## 5. Terverifikasi BENAR (jangan diperbaiki ulang)
- `projects-list` mengirim `ownerId` dan backend membaca `ownerId` (`project_controller.go:38`). Tidak ada mismatch.
- `projects-list` sudah menjaga zero-time Go (`parseLastSync < 2000` → "Belum pernah"). Backend `project_service.go:97-103` belum diubah. Zero-time `0001-01-01` terbukti runtime di audit mobile (project "ABC"). Hari ini **perlu verifikasi** karena backend mati.
- Link kartu project → `/iot/projects/:id/overview`, `/nodes`, `/monitor`: ketiganya ada di `projects-routing.module.ts:28-34`.
- `users` filter `idOwner` dibaca backend (`user_controller.go:37`) dan repo memfilter `id_owner`.
- `/owners` list: tenant di-scope ke owner sendiri (bila `OwnerID` terisi). Count di backend benar (`COUNT DISTINCT`, cocok dengan DB untuk semua 27 owner). Hanya nama field-nya yang dibaca salah oleh frontend.
- `/owners/{id}/detail` `totalProjects/totalNodes` cocok dengan DB (WAYRL 1/20, 9VSIK 1/12, DEMO1 1/6).
- `tenant-api-keys` Show/Update/Destroy/Regenerate men-scope `id_owner` dari JWT (fail-closed untuk tenant).
- `secretToken`/`passwordCipher` dimasking di backend (`"***"`, `"********"`).
- `projects-list` sudah memakai `<card>`, debounce, pagination window, empty/error state dengan "Coba lagi".
- `/projects/{id}/detailed` masih `SELECT *` → kunci snake_case (`project_service.go:147,155`). Endpoint ini dipakai workspace, bukan halaman ini. Status tidak berubah sejak audit sebelumnya.

---

## 6. Rencana data (agregat backend yang dibutuhkan)

Prinsip: **satu sumber status** = rumus `getFreshness` atas `nodes.last_seen_at` + `telemetry_interval_sec`. `connectivity_status` tidak dipakai (macet, ambang tetap). Agregat dihitung **di SQL sekali per request**, bukan N+1 dan bukan dari frontend.

**B0 — fragmen SQL bersama** (`app/services/freshness_sql.go`; konstanta disalin dari `telemetry-freshness.ts` + komentar "WAJIB sinkron"):
```sql
CASE
  WHEN n.last_seen_at IS NULL THEN 'nodata'
  WHEN now() - n.last_seen_at < make_interval(mins => GREATEST(10, COALESCE(n.telemetry_interval_sec,0)/60.0*3)::int) THEN 'fresh'
  WHEN now() - n.last_seen_at < make_interval(mins => GREATEST(60, COALESCE(n.telemetry_interval_sec,0)/60.0*12)::int) THEN 'stale'
  ELSE 'offline' END
```

**B1 — `GET /projects` (ganti loop 6 query → 2 query: count + data):**
```sql
WITH pg AS (SELECT p.* FROM projects p WHERE <filter> ORDER BY p.created_at DESC LIMIT ? OFFSET ?),
nf AS (SELECT n.id_project, n.id_node, n.address, n.last_seen_at, <B0> AS fr FROM nodes n WHERE n.id_project IN (SELECT id_project FROM pg)),
agg AS (SELECT id_project, COUNT(*) nodes,
          COUNT(*) FILTER (WHERE fr='fresh') fresh, … stale, offline, nodata,
          MAX(last_seen_at) last_seen, MIN(NULLIF(address,'')) any_address
        FROM nf GROUP BY 1),
sen AS (SELECT n.id_project, COUNT(*) sensors FROM sensors s JOIN nf n USING(id_node) GROUP BY 1),
alr AS (SELECT n.id_project, COUNT(*) open_alerts FROM alert_events e JOIN nf n ON n.id_node=e.id_node
        WHERE e.status IN ('open','acknowledged') GROUP BY 1)
SELECT pg.*, o.name owner_name, o.industry, agg.*, sen.sensors, alr.open_alerts
FROM pg JOIN owners o USING(id_owner) LEFT JOIN agg USING(id_project) LEFT JOIN sen USING(id_project) LEFT JOIN alr USING(id_project);
```
Kontrak tetap (`stats.nodes/sensors/online/alerts`), dengan `online := fresh` dan `alerts := open_alerts`, plus `stats.stale/offline/nodata`. `lastSync` = `null` bila tak ada (scan ke `sql.NullTime`). `location` = node_locations ?? `any_address` ?? `null`. Perkiraan: 146 → 2 query, ~5 s → < 150 ms lewat tailnet.

**B2 — `GET /owners` list:** subquery `stats` diganti CTE yang sama dengan B1, dibatasi ke `id_owner` halaman ini (sekarang mengagregasi seluruh DB tiap request). Tambahkan `nodesFresh/nodesStale/nodesOffline/nodesNoData`, `openAlerts`, `lastSeenAt` (MAX). Nama yang ada (`projectCount/nodeCount/sensorCount`) dipertahankan. Frontend menyesuaikan diri (F1), bukan backend yang mengganti nama.

**B3 — `GET /owners/{id}/detail`:**
- tambah `ownerCode,email,phone,address`;
- `statistics` = `{totalProjects,totalNodes,totalSensors,activeSensors,nodesFresh,…,openAlerts,lastSeenAt}` dari B0/B1 (alert via `e.id_node`);
- `projects[]` = baris B1 untuk owner itu (fungsi repo yang sama), supaya owner detail dan projects-list **menghasilkan angka identik**;
- hapus `forwardingLogs`, hilangkan panggilan `findOwnerRow` ganda.

**B4 — perbaikan kecil backend:** tenant-api-keys admin path (F5), stub forwarding → 501 (F3), helper scope fail-closed (F8), `search` owner_code (F16).

**Termurah yang benar:** B0 + B1 sebagai satu fungsi repo `ProjectStatsRepository.ForProjects(ids []string)` dipakai B1, B2 (dikelompokkan lagi per owner), dan B3. Tidak perlu tabel/materialized view baru: data kecil (78 node, 140 sensor, ~500 alert event), dan semua join memakai FK ber-index. Index tambahan yang disarankan: `alert_events(id_node) WHERE status IN ('open','acknowledged')`, `owner_forwarding_logs(id_owner, created_at DESC)`.

---

## 7. Rencana perbaikan berurutan

**Fase 0 — frontend saja, bisa langsung & paralel (tanpa menunggu backend):**
1. F1 mapping `projectCount/nodeCount/sensorCount`, hapus kolom Alerts & status palsu (F10), `slaLevel` "—". ∥
2. F2 hapus default adhiwater → empty state, F3 (a) kartu forwarding read-only, F13 komentar bocor, F15 warna badge. ∥
3. F4 users `response.data`. ∥
4. F7 payload update lengkap, F18 opsi select. ∥
5. F16 debounce+switchMap, F19 `timeAgo`/id-ID, F17 `fetchAll` untuk dropdown owner. ∥

**Fase 1 — backend (berurutan dalam satu PR, paralel dengan Fase 0):**
1. B0 fragmen freshness → B1 `/projects` CTE (F6, F20, `lastSync` null).
2. B2 `/owners` agregat per halaman + `openAlerts`; B3 `/detail` (F9, F11, F22).
3. B4: F5 tenant-api-keys admin, F3 stub → 501, F8 scope fail-closed (**eskalasi owner**), F16 search owner_code.

**Fase 2 — SDK:** tambah field baru (`stats.stale/offline/nodata`, `openAlerts`, `email/phone/address` di `OwnerDetailResponseDto`) **secara manual** di `src/sdk/core/models/` (regen rusak, lihat memori SDK Regen Gotcha).

**Fase 3 — frontend memakai agregat baru:**
1. projects-list: kartu menampilkan fresh/stale/offline, alert asli, badge kesehatan (F21), lokasi atau baris disembunyikan.
2. owners-list: kolom "Node melapor X/Y", alert open, "Terakhir data" (`lastSeenAt`), bukan `updatedAt`.
3. owners-detail: kartu Projects dengan link workspace (F9), email/phone.
4. `page-guide` untuk owners & projects-list, lalu review `senior-dev-auditor`.

**Terpisah (eskalasi owner, produksi):** F12 gtw `connectivity-monitor` (degraded macet + pemalsuan `lastSeenAt`), F23 kebijakan SLA tenant, data placeholder adhiwater milik `4FC2A` di `owner_forwarding_webhooks` (hapus atau nonaktifkan, sudah `enabled=false`).
