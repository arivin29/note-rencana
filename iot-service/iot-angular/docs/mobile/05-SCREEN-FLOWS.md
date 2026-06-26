# 05 — Screen Flows & Mockup (Wireframe)

Mockup low-fi semua layar mobile + model navigasi, supaya kebutuhan tiap layar terlihat jelas sebelum coding. Acuan lebar ~390–412px. Tiap layar dilengkapi **kebutuhan data** (field + sumber) dan **catatan**.

Status keputusan terkait ada di [06-OPEN-ITEMS.md](./06-OPEN-ITEMS.md). Style/token di [04-STYLE-SYSTEM.md](./04-STYLE-SYSTEM.md).

---

## 0. Model navigasi

```
                         ┌──────────────┐
                         │   LOGIN      │ (tanpa chrome)
                         └──────┬───────┘
                                ▼  (auth OK)
   AppBar:  [📁 Project ▾]                [🖥 switch] [⋮]
   ┌──────────────────────── KONTEN ────────────────────────┐
   │                                                         │
   BottomNav:  [Dashboard] [Perangkat] [Peringatan] [Profil]
        │            │            │            │
        ▼            ▼            ▼            ▼
   Dashboard    Nodes list     Alerts      Profil/Setting
        │            │            │
        │            ▼            │
        │       Node detail ◀────┘ (dari alert → node)
        │            │
        │            ├─► Channel detail (chart + rows)
        │            └─► [Kontrol] sheet (SMS/MQTT)
        │
        └─► (chip Project) ─► Sheet Pilih Project ─►(ⓘ)─► Project detail ─► Node detail
                                                          │  (top tab bar)
                                                          └─ Detail · Peta · Node · Channel(last) · SCADA(view)
```

- **Project = chip konteks di AppBar** (bukan tab). Men-scope Dashboard/Nodes/Alerts.
- Sub-layar (Node detail, Channel detail, Project detail) tampil **back + judul**, chip project disembunyikan.
- BottomNav 4 tab tetap.

---

## 1. Login (mobile tersendiri)

```
┌─────────────────────────────┐
│                             │
│            ▢ logo           │
│        DEVETEK IoT          │
│           Mobile            │
│                             │
│  ✉  Email ________________  │
│  🔒 Kata sandi ___________  │
│                             │
│  [        Masuk         ]   │
│  Lupa kata sandi?           │
└─────────────────────────────┘
```
**Data:** `AuthService.login(email,password)` → `{ user, access_token }`. **Catatan:** UI baru `.m-app`, logika auth = sama (GuestGuard). Handle error 401 (pesan inline) & loading tombol.

---

## 2. Dashboard (`/mobile/dashboard`)

```
┌─ 📁 Pump House ▾ ──── 🖥 ⋮ ─┐
│ ┌────────┐ ┌────────┐        │
│ │  10    │ │   2    │        │  ← stat: online / offline
│ │ Online │ │ Offline│        │
│ └────────┘ └────────┘        │
│ ┌────────┐ ┌────────┐        │
│ │  5  ⚠  │ │  12    │        │  ← alert aktif / total node
│ │ Alert  │ │ Node   │        │
│ └────────┘ └────────┘        │
│ PERLU PERHATIAN              │
│ ┌──────────────────────────┐ │
│ │ NODE-014   2j    ● Offline│ │
│ │ NODE-022   suhu  ⚠ Suhu   │ │
│ │ NODE-007   15m   ● Offline│ │
│ └──────────────────────────┘ │
│ RINGKASAN PROJECT           │
│ ┌──────────────────────────┐ │
│ │ Pump House  12 node  🗺 › │ │  → Project detail
│ └──────────────────────────┘ │
├── [Dash] Perangkat Alert Profil ┤
└─────────────────────────────┘
```
**Data:** count node by status; count alert aktif; list "perlu perhatian" (node offline / alert terbaru, maks ~5). **Sumber/cek:** endpoint summary/count (V5) atau hitung dari list. **Aksi:** tap stat alert → Alerts; tap node → Node detail; tap project → Project detail. Ter-scope project aktif.

---

## 3. Nodes list (`/mobile/nodes`)

```
┌─ 📁 Pump House ▾ ──── 🖥 ⋮ ─┐
│ 🔍 Cari perangkat…      ⚙   │  ← search + filter
│ ┌──────────────────────────┐ │
│ │ NODE-014        ● Offline │ │
│ │ Pump House · last 2j      │ │
│ ├──────────────────────────┤ │
│ │ NODE-015        ● Online  │ │
│ │ Tank A · last 12d         │ │
│ ├──────────────────────────┤ │
│ │ NODE-022        ⚠ Suhu    │ │
│ │ Pump House · suhu tinggi  │ │
│ └──────────────────────────┘ │
│       ⟳ Muat lebih           │
└─────────────────────────────┘
```
**Data:** `NodesService.findAll({page,limit,search, idProject})` → `{data,meta}`. Field per card: `code`, `connectivity_status`, `last_seen_at`, project. **Catatan:** pagination/virtual-scroll (sensor besar di detail, list node wajar). Filter: status/project. "Semua Project" → group per project (section header).

---

## 4. Node detail (`/mobile/nodes/:id`)

```
┌─ ‹  NODE-014 ───────── 🖥 ─┐
│ ┌──────────────────────────┐ │
│ │ NODE-014       ● Online   │ │  ← status header
│ │ last seen 12d · FW 3.0.0  │ │
│ │ SIM7600 · DevKit          │ │
│ └──────────────────────────┘ │
│ CHANNEL · NILAI TERBARU      │
│ ┌──────────────────────────┐ │
│ │ Suhu          72.4 °C  ●  │ │  → Channel detail
│ │ Tekanan        3.1 bar ●  │ │
│ │ Flow         128 L/min ⚠  │ │  ⚠ lewat threshold
│ └──────────────────────────┘ │
│ TELEMETRY 1 JAM              │
│ ┌──────────────────────────┐ │
│ │  ╱╲╱‾╲╱‾  (sparkline)     │ │  → Channel detail
│ │            Lihat grafik › │ │
│ └──────────────────────────┘ │
│ [   ⚡ Kontrol perangkat   ] │  → Control sheet
│ ▾ INFO PERANGKAT             │
│ │ Serial    SN-2024-0142    │
│ │ Dev EUI   A81758FFFE…     │
│ │ Lokasi    -6.21, 106.84   │
│ │ Project   Pump House      │
└─────────────────────────────┘
```
**Data:** `NodesService.findOne(id)` (status, fw, model, serial, dev_eui, lokasi, project) + **latest value per channel** (V1). **Aksi (fase 1):** tap channel → Channel detail (read). Tombol **⚡ Kontrol disembunyikan/dinonaktifkan** di fase read-only (aksinya = fase lanjut, §9). Info perangkat collapsible (progressive disclosure). **Auto-reload** aktif (interval cepat).

---

## 5. Channel detail (`/mobile/nodes/:id/channels/:channelId`)

```
┌─ ‹  Suhu (NODE-014) ─── 🖥 ─┐
│ NODE-014 · °C · batas 0–75   │
│ [ 1 jam ] 24 jam  7 hari     │  ← range chips
│ ┌──────────────────────────┐ │
│ │        ╱‾╲   ╱‾╲          │ │
│ │   ╱‾╲╱    ╲╱    ╲  (line) │ │  ← 1 seri, ringan
│ │ ─────────────────────────│ │     garis threshold tipis
│ └──────────────────────────┘ │
│ DATA TERAKHIR                │
│ │ 12:04:21      72.4 °C  ●  │
│ │ 12:04:06      72.1 °C  ●  │
│ │ 12:03:51      71.9 °C  ●  │
│ │ 12:03:36      72.0 °C  ●  │
│       ⟳ Muat lebih           │
└─────────────────────────────┘
```
**Data:** time-series `sensor_logs` per channel (V2): `ts`, `value_engineered`, `quality_flag`; meta channel (`unit`, `min/max_threshold`). **Catatan:** **1 channel per layar** (multi-seri = desktop). Rows paginated (tabel ~685k). Chart pakai lib ringan. Range chips ubah window query.

---

## 6. Alerts (`/mobile/alerts`)

```
┌─ 📁 Pump House ▾ ──── 🖥 ⋮ ─┐
│ [ Aktif (5) ]  Riwayat       │  ← filter
│ ┌──────────────────────────┐ │
│ │ ⚠ Suhu tinggi   NODE-022  │ │
│ │ 78°C > 75°C · 5m   [Ack]  │ │
│ ├──────────────────────────┤ │
│ │ ● Offline       NODE-014  │ │
│ │ tidak lapor · 2j   [Ack]  │ │
│ ├──────────────────────────┤ │
│ │ ⛔ Flow kritis   NODE-031 │ │
│ │ 0 L/min · 20m   [Snooze]  │ │
│ └──────────────────────────┘ │
├── Dash Perangkat [Alert] Profil ┤
└─────────────────────────────┘
```
**Data:** `GET /alert-events` → `{data:{data[],total,page,limit}}` (severity, status, message, value, triggeredAt, node{}, channel{}). **Fase 1 = LIHAT SAJA.** Scoping (lihat 06 §5 cat.2): **Aktif** = client-side filter by project aktif (`status=active&limit=100`); **Riwayat** = owner-wide (label "semua project"), filter per-project = fast-follow backend. **Tombol [Ack]/[Snooze] = FASE LANJUT** (aksi tulis). (Push notification = ditunda, 06/A2.)

---

## 7. Project switcher (sheet, dari chip AppBar)

```
┌──────── Pilih Project ───────┐  (bottom sheet)
│ ▔▔▔                          │
│ 🔍 Cari project…             │
│ ┌──────────────────────────┐ │
│ │ ◉ Semua Project          │ │  ← overview lintas-project
│ │ ○ Pump House    12 node ⓘ│ │  ⓘ → Project detail
│ │ ○ Tank Farm A    8 node ⓘ│ │
│ │ ○ Inlet Station  5 node ⓘ│ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```
**Data:** `ProjectsService.findAll()` (ter-scope `idOwner`). **Aksi:** pilih nama → set project aktif (`ProjectContextService` + localStorage), semua layar re-scope. Tap `ⓘ` → Project detail. **Catatan:** admin scoping = SKIP (06/A4) — tenant lihat project miliknya.

---

## 8. Project detail (`/mobile/projects/:id`) — ber-tab

Layar ber-**top tab bar** (segmented, horizontal-scroll bila sempit). Header ringkas selalu tampil; konten berganti per tab. Tiap tab = child route (`/mobile/projects/:id/{detail|map|nodes|channels|scada}`) supaya deep-link & lazy-load (peta/SCADA berat hanya dimuat saat tab dibuka).

```
┌─ ‹  Pump House ───────────── 🖥 ─┐
│ ● Aktif · Industrial · 12 node    │  ← header ringkas (persist)
│ [Detail] Peta  Node  Channel  SCADA│  ← top tab bar (scroll →)
├───────────────────────────────────┤
│            konten tab              │
└───────────────────────────────────┘
```

### 8a. Tab Detail
```
│ ┌────┐ ┌────┐ ┌────┐              │
│ │ 12 │ │ 10 │ │ 2  │  node/on/off │
│ └────┘ └────┘ └────┘              │
│ │ Owner       PT Sumber Air       │
│ │ Area        Industrial          │
│ │ Status      ● Aktif             │
│ │ Dibuat      12 Jan 2026         │
│ │ Alert aktif 3                   │
```
**Data:** project (`name`, `id_owner`/owner, `area_type`, `status`, tanggal), counts node + alert. (V4/V5)

### 8b. Tab Peta
```
│ ┌───────────────────────────────┐ │
│ │   ●hijau      ●hijau          │ │  ← marker by status
│ │       ▢ geofence              │ │     tap marker → mini-card → node
│ │          ●merah    ●hijau     │ │
│ └───────────────────────────────┘ │
```
**Data:** node `latitude`/`longitude` + `connectivity_status`, `geofence` project (V4). **Peta:** Leaflet **lazy** (load hanya saat tab ini). Marker warna by status, geofence polygon opsional.

### 8c. Tab Node
```
│ 🔍 Cari…                          │
│ │ NODE-014            ● Offline  │  → Node detail
│ │ NODE-015            ● Online   │
│ │ NODE-016            ● Online   │
```
**Data:** list node project (paged) — sama seperti Nodes list (§3) tapi pre-scoped ke project ini.

### 8d. Tab Channel (last) — nilai terbaru semua channel di project
```
│ 🔍 Cari channel…                  │
│ │ NODE-014 · Suhu     72.4 °C ●  │  → Channel detail
│ │ NODE-014 · Flow    128 L/min⚠  │
│ │ NODE-015 · Level    3.4 m   ●  │
│ │ NODE-016 · Tekanan  2.1 bar ●  │
```
**Data:** daftar `sensor_channels` se-project + **nilai terbaru** (`value_engineered`, `ts`, `quality_flag`) + threshold (warna). Sumber: latest-per-channel level project (**V10**). **Aksi:** tap → Channel detail (§5). Berguna untuk pantau cepat semua metrik 1 project tanpa buka node satu-satu.

### 8e. Tab SCADA (view read-only)
```
│ ┌───────────────────────────────┐ │
│ │  [Tank]──▶[Pump]──▶[Valve]    │ │  ← diagram, nilai live di node
│ │    3.4m     ON      72°C       │ │     pan/zoom; read-only
│ └───────────────────────────────┘ │
│ ⓘ Baca-saja · edit di desktop      │
```
**Data:** `scada_diagrams` + `scada_nodes`/`scada_edges`/`scada_node_bindings` (binding → nilai live `sensor_channels`) (**V11**). **Scope:** hanya **read-only view** (pan/zoom + nilai live); editor SCADA penuh tetap desktop. **Lazy-load** (berat). Project tanpa diagram → empty state.

> **Catatan §8:** tab Peta & SCADA = dua komponen terberat → keduanya **lazy per-tab** agar tidak membebani bundle saat tab lain dibuka.

---

## 9. Control sheet — SMS / MQTT (dari Node detail)

> 🚧 **FASE LANJUT (aksi tulis) — BUKAN fase 1.** Disain disimpan untuk nanti. Di fase read-only, tombol `⚡ Kontrol` di Node detail **disembunyikan / dinonaktifkan**.

```
┌──────── Kontrol · NODE-014 ──────┐  (bottom sheet)
│ ▔▔▔                              │
│ Transport:  [ MQTT ]   SMS       │  ← MQTT online · SMS fallback
│ ┌──────────────────────────────┐ │
│ │ 🔌 Relay 1              [OFF] │ │  → KONFIRMASI
│ │ 🔌 Relay 2              [ON ] │ │  → KONFIRMASI
│ │ ⏻  Restart perangkat   [Kirim]│ │  → konfirmasi tegas
│ │ ⬇  Minta pembacaan     [Kirim]│ │
│ └──────────────────────────────┘ │
│ Status: ⏳ terkirim, menunggu ack │
│ (aksi fisik · konfirmasi · role)  │
└──────────────────────────────────┘
```
**Data:** daftar command dari `node_model_commands` (template per model); endpoint eksekusi MQTT/SMS + status/ack (V3). **Aturan wajib:** konfirmasi sebelum eksekusi, feedback (terkirim → ack/timeout), role-gated, transport MQTT bila online / SMS fallback saat offline. = poin C3 (06).

---

## 10. Profil & Setting (`/mobile/profile`)

```
┌─ 📁 Pump House ▾ ──── 🖥 ⋮ ─┐
│ ┌──────────────────────────┐ │
│ │ (TK)  Teknisi Lapangan    │ │
│ │       …@devetek.id·tenant │ │
│ └──────────────────────────┘ │
│ PREFERENSI                   │
│ │ Satuan          Metrik    │
│ │ Bahasa          Indonesia │
│ │ Tema gelap          ◑     │
│ │ Auto-reload     15 detik  │  ← interval AutoRefreshService
│ AKUN                         │
│ │ Ganti kata sandi       ›  │
│ │ Keluar                 ⏏  │
├── Dash Perangkat Alert [Profil]┤
└─────────────────────────────┘
```
**Data:** `AuthService.currentUser` (nama/email/role/owner). **Fase 1:** lihat profil, logout, atur preferensi lokal (tema/unit/bahasa/interval auto-reload — tersimpan di device). **Ganti kata sandi = FASE LANJUT** (aksi tulis).

---

## 11. State global (berlaku semua layar)

```
 Loading            Empty                 Error / Offline
 ┌──────────┐      ┌──────────┐          ┌──────────────────┐
 │ ░░░░ skel│      │   ▢      │          │ ⚠ Tidak ada koneksi│
 │ ░░░ skel │      │ Belum    │          │  [ Coba lagi ]     │
 │ ░░░░ skel│      │ ada data │          └──────────────────┘
 └──────────┘      └──────────┘   Offline → banner + tombol aksi non-aktif (06/A5)
```

---

## 12. Ringkasan kebutuhan data (ikhtisar untuk verifikasi backend)

| Layar | Butuh | Ref |
|-------|-------|-----|
| Dashboard | count online/offline/alert + list perlu-perhatian | V5 |
| Nodes list | list node + status + last_seen (paged, by project) | — |
| Node detail | node + latest value per channel | V1 |
| Channel detail | time-series + rows per channel (paged) | V2 |
| Alerts | alert_events aktif/riwayat + ack/snooze | V6 |
| Project · Detail/Peta | project + counts + node lat/long + geofence | V4 |
| Project · Channel (last) | latest value semua channel se-project | V10 |
| Project · SCADA | scada_diagrams/nodes/edges/bindings + nilai live | V11 |
| Control | node_model_commands + eksekusi MQTT/SMS + ack | V3 |
| Semua | channel realtime (opsional) → else auto-reload | V7 |

> Langkah berikut: verifikasi V1–V7 di `iot-backend-go` lalu ubah catatan "cek" jadi spec pasti di [03-TECHNICAL-SPEC.md](./03-TECHNICAL-SPEC.md).
</content>
