# 01 — Requirements (Kebutuhan)

Modul: **Mobile View** (`/mobile/*`) untuk `iot-angular`.

---

## 1. Latar belakang & tujuan

Aplikasi saat ini berbasis web (PWA) dengan layout desktop (sidebar + header, data padat: tabel, grafik, widget builder). Di layar HP, tampilan ini "diperkecil" dan kurang nyaman untuk pemakaian lapangan (teknisi, operator, owner yang memantau on-the-go).

**Tujuan:** menyediakan tampilan **benar-benar mobile** yang ringan (lite) untuk tugas-tugas pemantauan & aksi cepat, tanpa membuat aplikasi terpisah, dan tanpa menduplikasi logika bisnis.

**Goals**
- G1 — Pengalaman mobile-native (bottom-nav, card stack, touch target besar) untuk subset fitur inti.
- G2 — User bisa switch Desktop ↔ Mobile kapan saja; pilihan persist.
- G3 — Nol duplikasi lapisan data; reuse service/SDK/guard/model existing.
- G4 — Tetap menghormati RBAC & multi-tenant scoping (admin vs tenant/`idOwner`) yang sama dengan desktop.

**Non-goals**
- NG1 — Bukan native app (tidak ada Capacitor/Ionic/React Native pada fase ini; tetap PWA).
- NG2 — Bukan paritas fitur penuh dengan desktop.
- NG3 — Tidak mengubah backend / kontrak API.

---

## 2. Persona & user story

| Persona | Kebutuhan utama di mobile |
|---------|---------------------------|
| **Teknisi lapangan** | Cek status node online/offline, lihat nilai sensor terakhir, lihat & ack alert |
| **Operator** | Pantau dashboard ringkas, daftar alert aktif, drill ke node bermasalah |
| **Owner / tenant** | Pantau ringkasan project & node miliknya dari HP |
| **Admin** | Pantau lintas owner secara ringkas (read-only di mobile) |

**User stories (prioritas)**
- US1 *(must)* — Sebagai operator, saya buka app di HP dan otomatis mendapat tampilan mobile.
- US2 *(must)* — Sebagai user, saya bisa menekan tombol "Tampilan Desktop/Mobile" untuk berganti, dan pilihan itu diingat saat saya buka lagi.
- US3 *(must)* — Sebagai teknisi, saya melihat daftar node dengan indikator status (online/offline, last seen) dan bisa cari.
- US4 *(must)* — Sebagai teknisi, saya buka satu node dan melihat nilai channel/sensor terbaru.
- US5 *(must)* — Sebagai operator, saya melihat daftar alert aktif dan bisa acknowledge.
- US6 *(should)* — Sebagai operator, saya melihat dashboard ringkas (jumlah node online/offline, jumlah alert aktif).
- US7 *(could)* — Sebagai teknisi, saya melihat tren singkat (sparkline) telemetry terakhir sebuah channel.
- US8 *(could)* — Sebagai user, saya buka profil & logout dari mobile.

---

## 3. Scope layar (mobile)

### IN — fase awal (lite)
| Layar | Route | Prioritas | Sumber data (service existing) |
|-------|-------|-----------|--------------------------------|
| Dashboard ringkas | `/mobile/dashboard` | Must | nodes + alerts (count & list) |
| Daftar node | `/mobile/nodes` | Must | `NodesService` |
| Detail node (lite) | `/mobile/nodes/:id` | Must | `NodesService` + telemetry/channel |
| Alert aktif | `/mobile/alerts` | Must | alerts service |
| Telemetry singkat | `/mobile/nodes/:id` (tab/section) atau `/mobile/telemetry/:channelId` | Should | telemetry/telemetry-channels service |
| Profil & logout | `/mobile/profile` | Could | `AuthService` |

### OUT — tetap di desktop (redirect "buka di desktop")
Widget Builder, IoT Config (mapping Modbus/sensor channel CRUD), **editor SCADA penuh** (mobile hanya SCADA *view* read-only di dalam Project detail), WebGIS, ML Dashboard, Report/Export, manajemen Users/Owners, audit logs, unpaired-devices pairing.

> Catatan: **Project detail** di mobile = layar **ber-tab** (Detail · Peta · Node · Channel-last · SCADA view) — lihat [05-SCREEN-FLOWS.md](./05-SCREEN-FLOWS.md) §8.

> Aturan: bila fitur butuh layar penuh/kompleks → **jangan** dibuat versi mobile-nya; arahkan user ke desktop.

---

## 4. Kebutuhan fungsional (FR)

- **FR1 — Routing terpisah.** Semua layar mobile di bawah prefix `/mobile`, lazy-loaded module, dijaga `AuthGuard`. Role rule (`data.roles`) konsisten dengan desktop.
- **FR2 — Mobile shell.** Tampilan mobile menyembunyikan chrome desktop (sidebar/header desktop) dan menampilkan: header tipis (judul + tombol switch + profil) dan **bottom navigation** (Dashboard, Nodes, Alerts, Profil).
- **FR3 — View switch.** Tombol switch tersedia di kedua sisi (mobile header & desktop header/top-nav). Menekan switch → navigasi ke sisi lain + simpan preferensi.
- **FR4 — Persist preferensi.** Mode disimpan di `localStorage` (`auto` | `desktop` | `mobile`). Default `auto`.
- **FR5 — Auto-deteksi.** Saat mode `auto` dan app dibuka di root/awal, tentukan sisi berdasarkan lebar layar (breakpoint ~768px) / `matchMedia`. Override manual user menang atas auto.
- **FR6 — Reuse data layer.** Komponen mobile memanggil **service yang sama** dengan desktop. Dilarang menyalin logika fetch/parse/RBAC ke komponen mobile; bila perlu dibagi, angkat ke service.
- **FR7 — Status & state.** Setiap layar menangani state: loading, error, empty, dan (bila relevan) pull-to-refresh / tombol refresh.
- **FR8 — READ-ONLY (fase 1).** Mobile fase 1 **tidak melakukan aksi tulis apa pun**: tidak ada create/update/delete entitas (selamanya desktop only), dan aksi tulis non-CRUD (kontrol device, acknowledge/snooze alert, ganti password) **ditunda ke fase lanjut**. Semua tombol aksi tulis disembunyikan/dinonaktifkan di fase 1.
- **FR9 — Deep-link aman.** Membuka `/mobile/...` langsung (mis. dari PWA shortcut) harus tetap melewati auth & memuat shell mobile dengan benar.

---

## 5. Kebutuhan non-fungsional (NFR)

- **NFR1 — Performa.** Modul lazy; bundle mobile kecil. Hindari import library berat desktop (widget-builder, OpenLayers, ECharts penuh) ke dalam bundle mobile. Sparkline pakai opsi paling ringan.
- **NFR2 — PWA/Offline.** Konsisten dengan service worker existing; layar mobile ter-cache. (Offline-first data = di luar scope fase ini, tampilkan state "tidak ada koneksi".)
- **NFR3 — Touch & a11y.** Target sentuh ≥ 44px, kontras cukup, font terbaca, mendukung dark mode (`--bs-theme`).
- **NFR4 — Konsistensi tema.** Pakai token tema existing (`--bs-theme` primary `#0271ff`, status success/warning/danger) dan FontAwesome 6 — bukan styling ad-hoc.
- **NFR5 — Keamanan/RBAC.** Tenant tetap ter-scope ke `idOwner` di service layer (sudah ditangani backend/service). Mobile tidak boleh meng-bypass guard/role.
- **NFR6 — Bahasa.** UI Bahasa Indonesia (mengikuti app saat ini), istilah teknis boleh Inggris.
- **NFR7 — Maintainability.** Mobile dibatasi ~5–7 layar fokus; tambah layar baru harus lewat review scope ("masih lite?").
- **NFR8 — Kompatibilitas.** Tidak meregresikan desktop. Perubahan pada komponen shared harus aman untuk kedua sisi.

---

## 6. Asumsi & dependensi

- A1 — `AppSettings` service dapat dipakai untuk menyembunyikan/menampilkan chrome layout per-route (terbukti dari `app.component.html`).
- A2 — Semua data yang dibutuhkan mobile sudah tersedia via SDK/endpoint existing (tidak butuh endpoint baru fase awal). **Perlu diverifikasi** saat spec per layar (lihat 03).
- A3 — Acknowledge alert sudah didukung backend (perlu konfirmasi endpoint).
- A4 — Tidak ada perubahan proses build/deploy (Firebase/PM2) selain ukuran bundle.

---

## 7. Kriteria penerimaan (acceptance)

- AC1 — Buka app di viewport < 768px (mode `auto`) → landing di `/mobile/dashboard`.
- AC2 — Tombol switch berpindah sisi dan preferensi bertahan setelah reload.
- AC3 — `/mobile/nodes` menampilkan node dengan status + search berfungsi, memakai `NodesService` (tanpa logika fetch terduplikasi).
- AC4 — `/mobile/nodes/:id` menampilkan nilai channel terbaru.
- AC5 — `/mobile/alerts` menampilkan alert aktif; acknowledge berhasil dan daftar ter-update.
- AC6 — Desktop tidak teregresi (sidebar/header tetap normal saat mode desktop).
- AC7 — Semua route mobile terlindung `AuthGuard`; akses tanpa login → ke `auth/login`.

---

## 8. Risiko

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Scope mobile membengkak jadi app kedua | Maintenance dobel | Kontrak tegas "mobile = lite"; gate review tiap penambahan layar (NFR7) |
| Duplikasi logika di komponen mobile | Bug ganda, drift | Aturan FR6; angkat logika ke service; code review |
| `AppSettings` chrome bocor antar-route (mobile flags kebawa ke desktop) | Layout rusak | Set di `ngOnInit` MobileLayout, **restore di `ngOnDestroy`** (lihat 02/03) |
| Bundle mobile kebawa library berat | Lambat di HP | NFR1; audit import; lazy + pilih lib ringan |
| Endpoint untuk data lite belum ada | Blokir layar | Verifikasi di spec (A2/A3) sebelum coding tiap layar |
</content>
