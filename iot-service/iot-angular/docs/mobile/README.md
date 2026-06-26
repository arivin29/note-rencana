# Mobile View Module — Design Docs

Dokumen perencanaan untuk fitur **Mobile View** di `iot-angular`: sebuah modul `/mobile/*` yang memberikan tampilan benar-benar mobile (lite) di atas aplikasi web/PWA yang sudah ada, dengan kemampuan **switch** antara tampilan Desktop ↔ Mobile.

> Status: **DESIGN / PRE-DEVELOPMENT**. Belum ada kode. Baca dokumen ini berurutan sebelum mulai implementasi.

## Prinsip inti (jangan dilanggar)

1. **Bukan aplikasi baru.** Hanya modul baru di dalam app yang sama.
2. **Share lapisan data, duplikat hanya tampilan.** Services, SDK (`src/sdk/core`), models, guards, interceptor → dipakai ulang 100%. Komponen mobile hanya template + presentational logic.
3. **Mobile = LITE.** Subset fitur read-heavy / on-the-go. Fitur berat (CRUD config, widget builder, SCADA, WebGIS) tetap di desktop.
4. **User yang memutuskan.** Auto-deteksi viewport sebagai default, tapi pilihan switch user selalu menang dan persist.
5. **READ / VIEW-ONLY (fase 1).** Mobile **tidak melakukan create/update/delete** entitas apa pun — itu **desktop only**. Aksi tulis non-CRUD (kontrol device SMS/MQTT, acknowledge/snooze alert, ganti password) = **fase lanjut**, bukan sekarang. Fase 1 murni menampilkan data.

## Daftar dokumen

| # | File | Isi |
|---|------|-----|
| 1 | [01-REQUIREMENTS.md](./01-REQUIREMENTS.md) | Kebutuhan fungsional & non-fungsional, scope in/out, daftar layar, user stories |
| 2 | [02-DESIGN.md](./02-DESIGN.md) | Arsitektur, struktur modul, mobile shell, mekanisme view-switch, routing, reuse |
| 3 | [03-TECHNICAL-SPEC.md](./03-TECHNICAL-SPEC.md) | Spec teknis: file-by-file, interface service, kontrak data, spec per layar, rencana fase |
| 4 | [04-STYLE-SYSTEM.md](./04-STYLE-SYSTEM.md) | Isolasi style mobile, design token sendiri, primitive, prinsip hemat ruang, wireframe awal |
| 5 | [05-SCREEN-FLOWS.md](./05-SCREEN-FLOWS.md) | **Mockup wireframe** semua layar + model navigasi + kebutuhan data per layar |
| 6 | [06-OPEN-ITEMS.md](./06-OPEN-ITEMS.md) | Tracker keputusan, gap, backlog, verifikasi backend, scope final sementara |

## Konteks repo (ringkas)

- **Framework:** Angular 20, NgModule (`standalone: false`), lazy-loaded feature modules.
- **Template:** Color Admin. Layout dikontrol service `AppSettings` (`src/app/service/app-settings.service`) — flag `appHeaderNone`, `appSidebarNone`, `appTopNav`, `appContentFullWidth`, `appContentFullHeight`, dll diterapkan di `src/app/app.component.html`.
- **Auth:** `AuthGuard` / `GuestGuard` + `JwtInterceptor` + `AuthService`. Role via route `data: { roles: ['admin'] }`.
- **Data:** generated SDK `xxxService.xControllerFindAll$Response(params)` → `res.body` (JSON.parse bila string) → `.data` / `.meta`. Kontrak `{ data, meta }`.
- **Tema:** Bootstrap 5 + CSS vars `--bs-theme` (primary `#0271ff`), dark-mode aware, FontAwesome 6.
- **PWA:** sudah aktif — modul `/mobile` otomatis ikut ter-cache.
</content>
