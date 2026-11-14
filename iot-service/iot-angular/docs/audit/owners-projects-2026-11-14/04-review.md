# 04 — Review implementasi rework /iot/owners & /iot/projects

Tanggal: 2026-11-14 · Reviewer: senior-dev (staff engineer) · Lingkup: perubahan belum-commit di iot-angular
(owners/**, projects-list/**, routing, menu, `project-health.ts`, 3 guide) + backend commit `e34d346`.
Tanpa edit kode, tanpa restart. Bukti runtime diambil dari backend lokal `localhost:3000` (JWT 5 menit
dibuat dari `JWT_SECRET`, tidak dicetak) dan Postgres lokal (`.env`).

**Kesimpulan: tidak ada P0.** Ada 1 P1 (data pemakaian API key yang basi tampil sebagai data nyata)
dan 6 P2. Backend health/scoping benar dan terbukti di runtime. `ng build` (development) lolos tanpa error.

---

## 1. Peta request (sesudah rework)

| Halaman | Endpoint | Param | Panggilan | Catatan |
|---|---|---|---|---|
| /iot/projects | `GET /api/projects` | `page`,`limit=100` (fetchAll) | 1 per muat + 1 per 60 dtk (dilewati saat tab tersembunyi) | 3 kueri di backend, 0,20 s untuk 24 project (terukur) |
| /iot/projects (admin) | `GET /api/owners` | `page`,`limit=100` (fetchAll) | 1 saat init, diulang di `reload()` hanya bila gagal/kosong | — |
| /iot/owners | `GET /api/owners` | fetchAll | 1 per muat manual | `health` per owner: 1 kueri projects + 1 kueri health |
| /iot/owners/:id | `GET /api/owners/{id}/detail` | — | 1 | sekarang berisi `ownerCode/email/phone/address/health`, `health` per project |
| /iot/owners/:id | `GET /api/users?idOwner=` | fetchAll | 1 (+1 sesudah tambah user) | `idOwner` dibaca `user_controller.go:37`; runtime: total 15 → 1 dengan filter |
| /iot/owners/:id | `GET /api/tenant-api-keys?ownerId=` | — | 1 (+1 sesudah buat/regenerate) | admin tanpa `ownerId` → 400 (terbukti) |
| /iot/owners/new, :id/edit | `GET /api/owners` (opsi industri) + `GET /api/owners/{id}` | fetchAll | 1 + 1 | — |

---

## 2. Temuan

### P1

**R1 [P1] · `owners-detail.html:376-379` · Kolom "Pemakaian" API key menampilkan angka basi sebagai angka nyata.**
- Bukti: backend Go tidak pernah mengubah `requests_today`/`requests_total`. Satu-satunya penulisan di
  `ApiKeyAuth` (`app/http/middleware/api_key_auth.go`) adalah `last_used_at`. `grep requests_today|requests_total app/`
  hanya menemukan tag model di `tenant_api_key_controller.go`. Isi DB:
  `basic|39|2979|t`, `basic|2|208|t` (sisa era NestJS, beku), `premium|0|0|t`, `standard|0|0|t`
  (sudah dipakai karena `last_used_at` terisi, tetapi tetap 0).
- Dampak: admin melihat "39 hari ini · 2.979 total" untuk key yang angka hariannya tidak pernah di-reset, dan
  "0 hari ini" untuk key yang jelas dipakai. Ini melanggar aturan *no fake data*.
- Perbaikan: sembunyikan kolom **Pemakaian** dan tampilkan hanya "dipakai {{ timeAgo(lastUsedAt) }}", yang memang nyata.
  Kalau angkanya mau dipertahankan, `ApiKeyAuth` harus `UPDATE … SET requests_total = requests_total + 1,
  requests_today = CASE WHEN last_used_at::date = now()::date THEN requests_today + 1 ELSE 1 END` dalam satu statement.
  Kolom ini baru boleh tampil sesudah perubahan backend itu masuk.

### P2

**R2 [P2] · `owners-detail.ts:47-49`, `owners-detail.html:324-326, 374` · Angka batas permintaan dikarang.**
- Bukti: `RATE_LIMIT_LABEL` menulis "Basic (60/menit) / Standard (120/menit) / Premium (300/menit)". Backend tidak
  punya rate limiter: `grep -i throttl|ratelimit|limiter app routes config bootstrap` tidak menemukan apa-apa.
  Developer Portal (`developer-portal.html:127-129, 531`) menulis angka lain: 30/60/120.
- Dampak: admin menjanjikan kuota ke PDAM yang tidak ditegakkan, dan dua halaman saling bertentangan.
- Perbaikan: label cukup nama paket (`Basic`/`Standard`/`Premium`) tanpa angka, sampai limiter ada.
  Satukan konstantanya dengan `tenant-api-keys.service.ts`.

**R3 [P2] · `pages/auth/profile/profile.component.html:145`, `pages/iot/search/search-page/search-page.ts:152` · Tenant diarahkan ke link yang sekarang diblokir.**
- Bukti: route `iot/owners` sekarang memakai `canActivate:[AuthGuard]`, `roles:['admin']` (`app-routing.module.ts:189-193`).
  Halaman Profil menampilkan link "Organization" → `/iot/owners/<idOwner>` untuk user yang punya owner, yaitu tenant.
  Search memanggil `navigateToOwner` tanpa cek role. Guard membuang tenant ke `/` tanpa pesan.
  Sebelum rework, tenant bisa membuka owner-nya sendiri (backend `ensureOwnerAccess` mengizinkan).
- Dampak: tenant klik nama PDAM-nya, lalu "terlempar" ke dashboard. Ini kelas bug #8.
- Perbaikan: di Profil, render nama owner sebagai teks biasa bila `role !== 'admin'`. Di Search, sembunyikan
  kategori owner untuk tenant, atau arahkan ke `/iot/projects`.

**R4 [P2] · `owners-detail.html:318`, `owners-detail.ts:275` · "Berlaku sampai" API key habis 07:00 WIB pada tanggal itu, bukan di akhir hari.**
- Bukti: `<input type="date">` mengirim `"YYYY-MM-DD"`. `tenant_api_keys.expires_at` bertipe `timestamptz` dan
  timezone DB `Etc/UTC`, jadi tersimpan `YYYY-MM-DD 00:00+00` = 07:00 WIB. `ApiKeyAuth.isExpired` membandingkan
  dengan waktu sekarang (UTC).
- Dampak: key yang "berlaku sampai 1 Des" sudah ditolak sejak 1 Des pagi, dan integrasi PDAM putus sehari lebih cepat.
- Perbaikan: di `createApiKey()` kirim `expiresAt: d ? d + 'T23:59:59+07:00' : null`. Developer Portal punya pola
  yang sama (`developer-portal.component.ts:371`).

**R5 [P2] · `projects-list.ts:164-172` · Kegagalan auto-refresh 60 dtk tidak terlihat.**
- Bukti: pada `silent && rows.length`, cabang error tidak menyetel apa pun. Header tetap menulis
  "diperbarui HH:mm:ss (otomatis tiap 60 dtk)" dengan jam lama.
- Dampak: kalau backend/DB mati berjam-jam, halaman terus menampilkan "Normal" dan "Node mengirim 25/78" yang basi
  tanpa tanda apa pun (kelas bug #4, versi UI).
- Perbaikan: tambah `refreshError: boolean`. Setel `true` di cabang silent-error dan `false` saat sukses. Tampilkan
  `alert-warning` kecil "Gagal memperbarui otomatis — data per {{ lastRefreshedAt | date:'HH:mm' }}" + Coba lagi.
  Kalimat di guide `projects-list.md` §2 Header perlu ditambah satu baris tentang peringatan ini.

**R6 [P2] · backend `project_service.go:64-65, 74-75`; `owner_service.go:181-182, 253-254` · Error kueri health tidak di-log.**
- Bukti: `return …, apperr.Internal("Failed to fetch project health")` tanpa `facades.Log().Error(…, "error", err)`.
  Pesan aslinya (mis. timeout, kolom hilang) hilang. `storage/logs` tidak akan pernah memuat penyebabnya.
- Dampak: UI sudah jujur (500 → state error + Coba lagi), tetapi operator tidak bisa mendiagnosis penyebabnya.
- Perbaikan: log `err` di keempat titik itu sebelum mengembalikan `Internal`.

**R7 [P2, lanjutan F23] · backend `owner_service.go:407-410` (`Update`) · Tenant masih bisa PATCH owner-nya sendiri, termasuk `slaLevel`.**
- Bukti: `Update` hanya memanggil `ensureOwnerAccess`. `Create`/`Delete` sudah admin-only. UI owner sekarang admin-only,
  jadi tidak ada caller tenant yang sah.
- Perbaikan: `if !services.IsAdmin(sc) { return nil, apperr.Forbidden(...) }` di `Update`, atau whitelist field untuk
  tenant (tanpa `slaLevel`/`forwardingSettings`). Apakah SLA mengatur tagihan masih **perlu keputusan owner**.

---

## 3. Terverifikasi BENAR (jangan diperbaiki ulang)

**SQL freshness vs `telemetry-freshness.ts`**
- Ambangnya identik: `GREATEST(600, 3×interval)` / `GREATEST(3600, 12×interval)`. NULL interval → 0, sama dengan `Number(x)||0`.
- Batasnya setara: `last_seen_at > NOW()-x` ⇔ `age < x`. `last_seen_at` NULL → `nodata`. Kolomnya `timestamptz`, jadi tidak ada masalah zona waktu.
- Frontend node-level di tempat lain juga memakai `node.lastSeenAt` + `telemetryIntervalSec`, sehingga sumbernya sama.

**SQL health (`projecthealth.ForProjects`)**
- Tidak ada double count. `ns`/`ss`/`al` adalah CTE terpisah yang masing-masing di-GROUP BY per project lalu di-LEFT JOIN. Alert dihitung `COUNT(DISTINCT id_alert_event)`.
- Cek silang runtime: jumlah health dari `/projects` maupun `/owners` = 78 node (DB 78), 140 sensor (DB 140), 25/0/52/1.
- `COALESCE(e.id_node, s.id_node)` benar.
  - Dari 6 alert open/acknowledged, 5 punya `id_node`.
  - Rule `29fd0302…` tidak punya `id_sensor_channel`, jadi fallback via sensor tidak berlaku di sana.
  - 1 alert acknowledged tanpa node (node terhapus, FK `SET NULL`) wajar tidak terhitung, sehingga hasilnya 5, bukan 6.
  - Status `cleared` dikecualikan.
- Project tanpa node tetap muncul dengan health nol karena `FROM projects p LEFT JOIN …`. Frontend memetakannya ke "Belum ada perangkat".
- `IN (?)` dengan `[]string` berjalan (24 id). Daftar kosong dijaga di `ForProjects`, `ownerHealth` dan `project List` sebelum kueri.
- Performa `/projects?limit=100`: 0,20 s.

**Scoping fail-closed (runtime)**
- Tenant dengan owner: `/projects` 200 (1 project), `?ownerId=<owner lain>` diabaikan (tetap 1), `/owners` 1, detail owner sendiri 200, owner lain 403, `/tenant-api-keys` 200, `/projects/statistics/overview` 200.
- Tenant tanpa owner: `/projects` 403, `/owners` 200 kosong, detail 403, `/tenant-api-keys` 403.
- Admin: `/tenant-api-keys` tanpa `ownerId` → 400 dengan pesan jelas.
- Tidak ada caller sah yang terkena:
  - DB: semua 12 tenant punya `id_owner`, dan 3 admin. DTO user hanya mengizinkan `admin|tenant`.
  - API-key auth (`role` kosong) hanya dipasang di `/external-api/v1/*`, tidak memanggil service yang diubah.
  - Mobile (`mobile-scope.service.ts`) memakai JWT user.
  - Widget builder `dashboard-modal` memakai JWT user.
  - SCADA memanggil `/owners/{id}/projects` dengan JWT user.
- Developer Portal: admin melihat list kosong seperti sebelumnya (dulu `[]`, sekarang 400 yang ditelan oleh `loadApiKeys`). Bukan regresi.

**Stub forwarding**: tulis/test/hapus → 501. GET list → `[]`, GET satu → 404. UI tidak memanggilnya lagi.

**Frontend**
- Timer 60 dtk: `clearInterval` di `ngOnDestroy`, dilewati saat `document.hidden` atau `loading`.
- Debounce search: projects memakai `setTimeout` yang di-clear di destroy/reset. Owners memakai `Subject`+`debounceTime(300)`+`takeUntil(destroy$)`.
- Request lama dibatalkan: `loadSub.unsubscribe()`, `load$`, `ownerChange$`.
- Reset state antar owner (`resetState()` di `paramMap`) lengkap, termasuk `generatedApiKey` dan form API key.
- `OwnerApiKeysService`:
  - URL dan `ownerId` di query untuk semua method, ditambah di body untuk POST, sesuai `ownerScope`.
  - PATCH `{isActive}` dibaca `Update`.
  - Regenerate route ada.
  - Response list (array) dinormalisasi `listOf`.
- `AuthGuard` di parent lazy route membaca `route.data.roles` dan benar-benar menolak non-admin. Menu Owners juga `roles:['admin']`.
- Data palsu: tidak ada `Math.random`/dummy, SLA kosong → "—" (`normalizeSla`), health tidak ada → "—"/"Tidak tersedia", bukan 0.
- Locale: `LOCALE_ID 'id-ID'` terdaftar. Pipe `number`/`date` memakai zona browser (WIB). `timeAgoId` berbahasa Indonesia.
- Teks UI halaman yang diubah berbahasa Indonesia (`user-modal` lama masih Inggris, di luar lingkup).
- Spasi antar `<span>`: tidak ada yang kolaps. Pemisah " / ", " · ", `&nbsp;` berada di dalam text node non-kosong.
- Route target ada: `/iot/projects/:id/overview|nodes|monitor|edit`, `/admin/users/:id`.
- `ng build --configuration=development` lolos.

**Guide**: `owners-list.md`, `owner-detail.md`, `projects-list.md` cocok dengan kode.
- Ambang dan contoh (5 mnt → 15/60 mnt, 15 mnt → 45 mnt/3 jam) benar.
- Perilaku klik KPI/tab benar.
- Halaman owners tidak auto-refresh, projects auto-refresh 60 dtk dan dilewati saat tab tersembunyi.
- `data.guide` terpasang di keempat route owner dan di projects-list.
- Yang perlu ditambah hanya catatan R5 bila R5 diperbaiki, dan kolom Pemakaian/Batas bila R1/R2 diubah (`owner-detail.md` §2 Tab API key).

---

## 4. Rencana perbaikan berurutan

1. **Backend** (bisa paralel satu sama lain):
   - R6: log error di 4 titik.
   - R7: `Update` owner admin-only, atau whitelist field. Butuh keputusan owner soal SLA.
   - (Opsional R1-b) Counter `requests_*` di `ApiKeyAuth`.
2. **SDK**: tidak ada perubahan.
3. **Frontend** (semua paralel):
   - R1: sembunyikan kolom Pemakaian.
   - R2: label paket tanpa angka.
   - R3: link owner di Profil/Search untuk tenant.
   - R4: `expiresAt` akhir hari WIB (juga Developer Portal).
   - R5: peringatan gagal auto-refresh.
4. **guide-writer**: perbarui `owner-detail.md` (R1/R2/R4) dan `projects-list.md` (R5).
