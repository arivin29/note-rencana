# Spesifikasi: Pengiriman Notifikasi Multi-Channel (shoutrrr sekarang, FCM nanti)

> **Status:** Desain — belum dieksekusi
> **Tanggal:** 2026-07-08
> **Repo utama:** `iot-backend-go` (Go / Goravel), sekunder `iot-angular` (Angular 20)
> **Keputusan arsitektur:** lihat memory `notification-architecture.md`

---

## 1. Tujuan

Notifikasi di platform saat ini **tersimpan tapi tidak pernah benar-benar terkirim** ke channel eksternal. Dokumen ini merancang lapisan **pengiriman (delivery)** yang:

1. Mengirim notifikasi ke channel eksternal nyata (email, Telegram, webhook→gateway WhatsApp) memakai **`containrrr/shoutrrr`** — library Go, **nol infra tambahan**.
2. Menyiapkan jalur **FCM** untuk push device (PWA + HP) di fase berikutnya — mulus karena sudah di Firebase (`iot-devetek`).
3. **Tidak membuang** logika yang sudah ada (dedup, suppression, ML preview, mark-read, multi-tenant). Yang di-offload hanya *channel plumbing* — bagian paling bug-prone.
4. **In-app bell/unread** tetap dilayani tabel `notifications` + API yang sudah ada.

---

## 2. Kondisi saat ini (ter-verifikasi dari kode)

### 2.1 Yang SUDAH ada
| Komponen | Lokasi | Catatan |
|---|---|---|
| Model `Notification` | `app/models/notification/notification.go` | kolom: type, title, message, status (pending/sent/failed/read), sentAt, readAt, errorMessage, metadata jsonb |
| Model `NotificationChannel` | `app/models/notification/notification_channel.go` | type: `email`/`webhook`/`sms`/`push`/`in_app`, `config jsonb`, `isActive` |
| Service | `app/services/notification/notification_service.go` (613 baris) | CRUD, mark-read, unread-count, dedup, ML preview/test/daily-summary |
| Controller + routes | `app/http/controllers/notification/notification_controller.go`, `routes/api.go:504-532` | 22 endpoint |
| DTO | `app/dto/notification/notification_dto.go` | |
| SDK Angular | `src/sdk/core/services/notifications.service.ts`, `ml-notifications.service.ts` | sudah ter-generate |
| UI (mock) | `src/app/template/ui/modal-notifications/` | template bawaan, **belum di-wire** ke data nyata |

### 2.2 Temuan kritis (jadi dasar desain)
1. **Pengiriman dipalsukan.** `Create()` (`notification_service.go:83-93`) langsung men-set `Status = NotificationStatusSent` dan `SentAt = now` **tanpa memanggil channel apa pun**. Channel default = `in_app` (`resolveDeliveryChannel`, `:498-519`). → Inilah **seam** tempat shoutrrr disisipkan.
2. **Tidak ada pemicu internal.** `grep NewNotificationService` di seluruh `app/` (di luar modul notif) = **nol hasil**. Notifikasi hanya lahir lewat HTTP API (kemungkinan di-POST oleh worker ML / eksternal). Belum ada wiring `alertevent → notification` maupun `mqtt → notification`.
3. **Dedup in-memory.** `dedupCache` (`notification_service.go:29-32`) = map proses, window 15 menit (`:521-535`). Hilang saat restart, tidak ter-share antar instance. (Di luar scope fase ini, tapi dicatat.)
4. **Secret channel bocor.** `FindAllChannels` / `GetChannelByID` mengembalikan `config` mentah — jika config berisi token/password, itu terekspos ke siapa pun yang authorized. **Harus di-redact** saat menambah channel dengan secret.
5. **Dependency belum ada.** `shoutrrr` dan `firebase` belum di `go.mod` (module name legacy: `core-pengaduan`). Go 1.25 (shoutrrr butuh ≥1.18 → aman).
6. **Default channel = `in_app` → tidak ada yang keluar.** `resolveDeliveryChannel` (`:509-514`) memilih channel `in_app` lebih dulu bila pemanggil tak menyebut `idChannel`. Artinya **meski nanti dispatch shoutrrr terpasang, notif tetap tak terkirim ke Telegram/email kecuali pemanggil eksplisit memberi `idChannel` channel eksternal** — atau kita ubah aturan routing. **Wajib** diperhitungkan di POC: `test-alert` harus mengoper `idChannel` channel Telegram.
7. **Tidak ada scheduler/cron.** `app/console/` kosong — `send-daily-summary` & alert periodik **tidak pernah jalan otomatis**, hanya via API manual. Di luar scope delivery, tapi menjelaskan kenapa sistem belum "hidup" end-to-end.
8. **Titik wiring pemicu presisi:** `AlertEventService.Create` (`app/services/alertevent/alert_event_service.go:291`) membuat alert event **tanpa** memanggil notifikasi (grep `Notif` di file itu = nol). Inilah lokasi tepat menyisipkan hook `→ NotificationService.Create` (Fase 4).

---

## 3. Prinsip arsitektur (tetap)

```
Event/anomali ─► [logika kita: alertrule/dedup/ML]   ← tetap milik kita (kecil & stabil)
                     │
                     ├─► shoutrrr   ──► email (SMTP) · Telegram · webhook→gateway WA   (channel eksternal)  ← FASE INI
                     ├─► FCM (nanti) ─► push HP + web-push PWA                            (device push)       ← FASE BERIKUT
                     └─► INSERT notifications ─► bell/unread in-app                        (inbox di app kita)  ← SUDAH ADA
```
Tiga jalur independen dari satu event. shoutrrr dan FCM **berdampingan**, bukan saling menggantikan (shoutrrr tidak punya provider FCM).

---

## 4. Desain — Lapisan Pengiriman shoutrrr

### 4.1 Titik sisip (the seam)
Ubah alur `Create()` menjadi **sadar-channel**:

```
Create(input)
  ├─ validasi + resolve user/channel (SEPERTI SEKARANG)
  ├─ INSERT notification  → status = "pending"        (bukan langsung "sent")
  ├─ if channel.Type == in_app:
  │      status = "sent"                                (in-app = tersimpan; itu sudah "terkirim")
  └─ else (email/telegram/webhook/...):
         dispatch ASYNC via shoutrrr (goroutine)
           ├─ sukses → status = "sent",  sentAt = now
           └─ gagal  → status = "failed", errorMessage = err
```

**Kenapa async (goroutine):** pengiriman jaringan tak boleh memblok request HTTP / pipeline ML. Baris dibuat `pending` dulu, lalu di-update oleh goroutine setelah hasil nyata. Ini juga memperbaiki status yang selama ini bohong.

### 4.2 Modul baru: dispatcher
File baru `app/services/notification/dispatcher.go`:

```go
// Dispatch mengirim satu notifikasi lewat channel eksternal via shoutrrr.
// Mengembalikan error nyata → dipetakan ke status failed + error_message.
func Dispatch(channel *notifModel.NotificationChannel, n *notifModel.Notification) error {
    url, err := buildShoutrrrURL(channel)   // config_json → URL scheme shoutrrr
    if err != nil { return err }
    params := &types.Params{"title": n.Title}
    return shoutrrr.Send(url, n.Message)     // atau router.Send(msg, params) utk title
}
```

Prinsip: **jangan simpan URL shoutrrr mentah di DB**. Simpan `config` terstruktur (per tipe), lalu `buildShoutrrrURL` merakit URL di Go → gampang divalidasi, secret tetap terstruktur.

### 4.3 Pemetaan channel → shoutrrr
| `channel.Type` | Skema shoutrrr | Field `config_json` yang dibutuhkan |
|---|---|---|
| `email` | `smtp://user:pass@host:port/?from=&to=` | `host, port, username, password, from, to[]` |
| `telegram` *(baru)* | `telegram://<botToken>@telegram?chats=<chatId>` | `botToken, chats[]` |
| `webhook` | `generic://<host>/<path>?@Header=...&messagekey=...` | `url, headers{}, method, messageKey` |
| `whatsapp` *(via webhook)* | `generic://` ke gateway (Fonnte/Wablas) | `gatewayUrl, token, targetKey, messageKey` |
| `push` / `in_app` | *(tidak lewat shoutrrr)* | in_app = tabel; push = FCM (fase berikut) |

> **Catatan implementasi:** sintaks persis param `generic` shoutrrr (`@header`, `$json`, `messagekey`, `titlekey`, `contenttype`) **wajib diverifikasi ke dokumentasi shoutrrr saat coding** — di sini didesain pendekatannya, bukan string finalnya. WhatsApp resmi tetap butuh gateway berbayar; shoutrrr hanya jembatan HTTP-nya.

### 4.4 Tipe channel baru
Tambah konstanta di `notification_channel.go`:
```go
ChannelTypeTelegram = "telegram"
ChannelTypeWhatsApp = "whatsapp"   // diproses sebagai generic webhook ke gateway
```
Model & config_json fleksibel (jsonb) → **tanpa migrasi skema** untuk menambah tipe.

### 4.5 Keamanan secret
- **Redact** field sensitif (`password`, `botToken`, `token`) di response `FindAllChannels` / `GetChannelByID` (`notification_controller.go:125-151`). Tampilkan `"***"` atau hilangkan.
- Fase ini: secret tetap di `config_json` (plaintext DB) — **catat sebagai utang teknis**; pertimbangkan enkripsi/at-rest atau referensi ENV di fase pengerasan.

---

## 5. Perubahan API (minimal)
| Endpoint | Perubahan |
|---|---|
| `POST /notifications` | Tidak berubah kontrak; internal jadi async-dispatch untuk channel non-in_app |
| `POST /notifications/channels` | Terima tipe baru `telegram`/`whatsapp`; validasi `config` per tipe |
| **baru** `POST /notifications/channels/{id}/test` | Kirim pesan uji lewat channel itu → verifikasi kredensial tanpa bikin alert |
| `GET /notifications/channels/*` | **Redact** secret di response |

Kontrak envelope tetap (list `{data, meta}`, single langsung). SDK Angular: karena regen ng-openapi-gen broken (lihat memory `sdk-regen-gotcha`), method channel-test **ditambah manual** ke `notifications.service.ts`.

---

## 6. Perubahan data model
- **Fase shoutrrr: TIDAK ADA perubahan skema.** Semua muat di `config_json` + status/errorMessage yang sudah ada.
- **Fase FCM (nanti):** tabel baru `device_tokens` (lihat §7).

---

## 7. Fase berikut — FCM (push device)

shoutrrr **tidak** punya provider FCM → integrasi terpisah:

**Backend**
- Dependency `firebase.google.com/go/v4` + `.../messaging`.
- Service-account JSON dari project `iot-devetek` (rahasia; via ENV/secret, jangan commit).
- Tabel baru:
  ```sql
  device_tokens(
    id_device_token uuid pk,
    id_user uuid not null,
    token text not null,          -- FCM registration token
    platform varchar(20),         -- web|android|ios
    last_seen_at timestamptz,
    created_at, updated_at
  )
  ```
- Kirim ke token (per device) atau **topic** (broadcast per DMA/role, mis. `dma-3`, `role-operator`).

**Frontend (Angular) — ⚠️ prasyarat yang terlewat di draft awal**
- **Angular BUKAN PWA terkonfigurasi saat ini.** Tak ada `ngsw-config.json`, `manifest.webmanifest`, maupun `@angular/service-worker` (terverifikasi). Yang selama ini disebut "PWA mobile" sebenarnya **rute Angular responsif** (`/mobile/...`), bukan aplikasi ter-install dengan service worker.
- **FCM web-push WAJIB service worker.** Jadi Fase 3 punya prasyarat tambahan: **tambah `firebase-messaging-sw.js` standalone** (paling ringan) — atau adopsi `@angular/service-worker` penuh bila memang mau jadi PWA sungguhan.
- `firebase` juga belum ada di `package.json` Angular → perlu ditambah.
- Lalu: minta izin notifikasi, ambil FCM token, `POST` ke backend simpan di `device_tokens`; handler foreground → toast + refresh unread-count.

**Alur gabungan:** satu event → `INSERT notifications` (bell) + `shoutrrr` (eksternal) + `FCM` (device). Ketiganya opsional per preferensi channel.

---

## 8. Wiring pemicu (rekomendasi, follow-up)
Saat ini **nol** pemanggil internal. Agar alert nyata mengalir otomatis:
- `alertevent` service → saat event dibuat, panggil `NotificationService.Create(...)` (atau jalur ML yang sudah ada).
- Worker ML (`iot-ai-nrw` / ml lama) → sudah bisa POST ke `/notifications/ml/test-alert`; pertahankan.
- **Preferensi per user/DMA** (channel mana untuk siapa) — perlu keputusan; saat ini channel di-resolve global (`resolveDeliveryChannel` prefer in_app).

Ini di luar scope "delivery" tapi wajib agar sistem berguna end-to-end → masuk daftar open question.

---

## 9. Risiko & open questions
| # | Hal | Perlu keputusan |
|---|---|---|
| 1 | **Preferensi channel per user/DMA** belum ada — siapa dapat channel apa? | Perlu model preferensi (fase lanjut) |
| 2 | **Dedup in-memory** tak persisten/terdistribusi | Biarkan dulu, atau pindah ke tabel/Redis? |
| 3 | **Secret di config_json plaintext** | Terima sbg utang teknis, atau enkripsi sekarang? |
| 4 | **Retry saat gagal kirim** | Sekali kirim + status failed, atau retry/backoff queue? |
| 5 | **WhatsApp gateway** mana (Fonnte/Wablas/Twilio) | Pilih vendor + akun berbayar |
| 6 | Async goroutine vs job-queue | Goroutine cukup utk skala sekarang? |
| 7 | **Default routing = in_app** → notif tak keluar tanpa `idChannel` eksplisit | Perlu aturan routing (per severity/preferensi) atau "kirim ke semua channel eksternal aktif" |
| 8 | **Angular bukan PWA** → FCM web-push perlu service worker yang belum ada | `firebase-messaging-sw.js` standalone, atau adopsi `@angular/service-worker` penuh? |
| 9 | **Tak ada scheduler** → daily-summary/alert periodik tak auto-jalan | Perlu cron (Goravel schedule) di fase lanjut? |

---

## 10. Checklist implementasi bertahap

### Fase 0 — POC shoutrrr (1 channel, tanpa ubah skema)
- [ ] `go get github.com/containrrr/shoutrrr` → tambah ke `go.mod`
- [ ] `app/services/notification/dispatcher.go`: `buildShoutrrrURL` + `Dispatch` (Telegram dulu — cuma butuh bot token)
- [ ] Sisipkan dispatch async di `NotificationService.Create` (`notification_service.go:94`) untuk channel non-`in_app`; status `pending→sent/failed`
- [ ] Seed 1 channel Telegram via `POST /notifications/channels` → catat `idChannel`-nya
- [ ] Uji: `POST /notifications/ml/test-alert` dengan **`idChannel` channel Telegram di body** (WAJIB — jika tidak, `resolveDeliveryChannel` jatuh ke `in_app` dan tak ada yang terkirim) → pesan sungguh masuk Telegram
- [ ] `go build ./... && ./tmp/main.exe` verifikasi

### Fase 1 — Channel lengkap + hardening
- [ ] Tambah tipe `email` (SMTP) + `whatsapp` (generic→gateway) di `buildShoutrrrURL`
- [ ] Konstanta `ChannelTypeTelegram/WhatsApp` + validasi `config` per tipe
- [ ] Endpoint `POST /notifications/channels/{id}/test`
- [ ] **Redact** secret di response channel (`notification_controller.go`)
- [ ] SDK Angular: tambah method channel-test manual

### Fase 2 — UI in-app (Angular)
- [ ] Wire bell/badge unread ke `notifications.service.ts` (ganti mock `modal-notifications`)
- [ ] Poll `unread-count` / mark-read; halaman list notifikasi

### Fase 3 — FCM push
- [ ] Migrasi `device_tokens` (manual via psql — repo tak punya runner, `bootstrap/migrations.go` kosong)
- [ ] Backend Firebase Admin Go SDK + kirim token/topic
- [ ] Frontend `firebase-messaging-sw.js` + flow izin/token
- [ ] Fan-out FCM di jalur Create

### Fase 4 — Wiring pemicu + preferensi
- [ ] `alertevent → NotificationService.Create`
- [ ] Model preferensi channel per user/DMA
- [ ] (Opsional) dedup persisten + retry/backoff

---

## 11. Titik mulai yang disepakati
**Fase 0**: POC shoutrrr Telegram — 1 channel, kirim notif beneran lewat pipeline yang sudah ada, tanpa ubah skema. Kalau jalan → lanjut email/WA, lalu FCM.
</content>
</invoke>
