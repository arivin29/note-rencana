# Mobile Helios — audit UI/UX enterprise (Lead Product Designer, 14 Nov 2026)

Cakupan: semua komponen `src/app/mobile/**` (ts/html), `src/scss/mobile/mobile.scss`, routing, `src/index.html` (meta viewport),
dibandingkan dengan standar rumah (`ui-coding-style`, `ui-list`, `ui-detail`, `ui-card`), `CLAUDE.md`, util bersama
(`telemetry-freshness.ts`, `threshold.ts`, `channel-display.ts`, `fetch-all.ts`) dan pembanding desktop
`project-workspace/pages/sensors-page/`. Tanpa browser: aspek visual disimpulkan dari kode + token.
Temuan yang sudah dibuktikan via API di `01-pdam-operator.md` dirujuk sebagai **[OP-n]**, tidak diulang panjang.

Jawaban singkat untuk "kok aneh?": aplikasi punya **dua sumber konteks project yang saling bertentangan** (chip global
`ProjectContextService` + route `/projects/:id`), **landing yang tidak menjawab "bagaimana kondisi jaringan saya sekarang"**,
**kode mesin sebagai judul** di hampir semua daftar, dan **empat kosakata status berbeda** (connectivityStatus, status channel
backend, status webgis, severity alert) tanpa satu pun memakai aturan freshness yang dipakai desktop.

---

## 1. Skor ringkas (1 = buruk, 5 = standar rumah)

| Layar | Konsistensi | Hierarki | State | Kejujuran data | Navigasi |
|---|---|---|---|---|---|
| Shell (AppBar, chip project, bottom nav) | 3 | 2 | 3 | 2 | 2 |
| Dashboard `/dashboard` | 3 | 2 | 2 | **1** | 2 |
| Daftar project | 4 | 3 | 3 | 2 | 3 |
| Project › Detail (ringkasan) | 3 | 3 | 3 | 3 | 3 |
| Project › Peta | 2 | 3 | 2 | 3 | 3 |
| Project › Channel | 2 | 3 | 2 | 3 | 3 |
| Project › SCADA | 3 | 3 | 3 | 4 | 2 |
| Daftar perangkat `/nodes` | 3 | 2 | 2 | 2 | 3 |
| Perangkat › Info | 3 | 3 | 3 | **1** | 3 |
| Perangkat › Command | 3 | 4 | 3 | 4 | 3 |
| Perangkat › Logs | 3 | 3 | 3 | 4 | 3 |
| Detail channel (grafik) | 2 | 2 | 2 | 3 | 2 |
| Peringatan | 3 | 3 | 3 | 3 | 3 |
| Profil | 3 | 4 | 4 | 3 | 4 |
| Login | 4 | 4 | 4 | 5 | 3 |

Kekuatan yang perlu dipertahankan: token `--m-*` rapi dan terisolasi, kartu/list/pill satu keluarga, skeleton + "Coba lagi"
ada di sebagian besar layar, tidak ada `Math.random`/dummy di frontend, bottom sheet konsisten, auto-refresh terpusat
(`AutoRefreshService`) yang berhenti saat tab tersembunyi.

---

## 2. Usulan IA baru (menggantikan Dashboard)

### 2.1 Penilaian usulan owner
Setuju, dengan dua tambahan: (a) **hapus chip project global** — project harus tinggal di URL, bukan di localStorage;
(b) bottom nav pindah **ke dalam konteks project** (gantikan tab atas `m-tabs`), karena tab di atas berada di luar jangkauan
jempol dan saat ini ada 3 tingkat tab bertumpuk (bottom nav → 5 tab project → 3 tab node).

Mengapa Dashboard harus dihapus, bukan diperbaiki:
- Ia **tidak bisa di-scope ke project**: `nodesControllerGetStatistics` hanya menerima `ownerId` (SDK `nodes-controller-get-statistics.ts`),
  jadi chip "Project X" di AppBar berbohong — angka tetap seluruh tenant (`mobile-dashboard.component.ts:44`, `:59`).
- Isinya (4 angka + 5 alert) sudah ada lebih baik di `project-info` (stats per project, perangkat bermasalah).
- Untuk tenant 1 project (mayoritas PDAM) ia menambah 3–4 ketukan sebelum nilai tekanan/debit terlihat [OP H1].

### 2.2 Struktur layar (diagram sebagai list)

```
/mobile  (MobileHomeGuard — fetchAll projects, baca meta.total)
├─ 0 project   → /mobile/empty            "Belum ada project untuk akun ini" + Tampilan Desktop + Keluar
├─ 1 project   → /mobile/p/:pid           (replaceUrl; layar Project-list tidak pernah tampil)
└─ >1 project  → /mobile/projects         Daftar project
     AppBar: Helios · [lonceng: peringatan semua project (badge meta.total)] · [avatar → Profil]
     Kartu project: nama · area · "12/14 aktif" (getFreshness) · badge peringatan aktif · data terakhir
     Urut: yang bermasalah di atas; baris "Terakhir dibuka: <project>" di paling atas (opsional)
     Tanpa bottom nav.

/mobile/p/:pid  — shell project (bottom nav 5 item, replaceUrl antar tab)
├─ Ringkasan   /p/:pid               ← pengganti Dashboard
│     1. Kepala status: nama project · "Data terakhir 2 mnt lalu" · bar Aktif/Terlambat/Offline/Belum ada data
│     2. KPI 2×2: Perangkat · Offline · Di luar ambang · Peringatan aktif  (tap → tab terfilter)
│     3. "Perlu perhatian": gabungan alert aktif (idProject) + perangkat offline/terlambat, urut severity → umur,
│        tiap baris: alamat (judul) · kode · nilai/ambang atau "Data terakhir 3 jam lalu" · tombol telepon PIC
│     4. Entri sekunder: "Bagan SCADA (n)" · "Kontak owner"
├─ Perangkat   /p/:pid/nodes         daftar node (alamat-first, status freshness, chip filter + hitung)
├─ Channel     /p/:pid/channels      nilai terbaru semua channel (yang ada sekarang, label diperbaiki)
├─ Peta        /p/:pid/map
└─ Peringatan  /p/:pid/alerts        Aktif | Riwayat, ter-scope idProject

  Bottom nav: [Ringkasan] [Perangkat] [Channel] [Peta] [Peringatan(badge)]
  AppBar: back (hanya jika >1 project → ke /projects) · judul = nama project (+ caret bila >1 project)
          · [avatar → Profil]
  SCADA:  /p/:pid/scada (dari kartu Ringkasan; full-screen viewer, bukan tab)

/mobile/p/:pid/nodes/:nid            Detail perangkat — AppBar judul = alamat, subjudul = kode
   segmented di bawah kepala: Nilai · Perintah · Log  (Info teknis + Installation Context dipindah ke bawah tab Nilai,
   dilipat "Info teknis")
/mobile/p/:pid/nodes/:nid/channels/:cid   Grafik channel
/mobile/profile                       Profil (dari avatar), punya back
```

### 2.3 Deep link & kompatibilitas
| URL lama | Perlakuan |
|---|---|
| `/mobile`, `/mobile/dashboard` | redirect → `MobileHomeGuard` (juga `root-redirect.guard.ts:13`, `mobile-login.component.ts:18,29`) |
| `/mobile/projects/:id/**` | redirect → `/mobile/p/:id/**` |
| `/mobile/nodes/:id[/…]` (dari notifikasi/alert/tautan lama) | resolver: ambil node → `idProject` → redirect ke `/mobile/p/:pid/nodes/:id[/…]` |
| `/mobile/nodes` (tanpa project) | 1 project → `/p/:pid/nodes`; >1 → `/projects` |
| `/mobile/alerts` | 1 project → `/p/:pid/alerts`; >1 → daftar lintas project (layar yang sama, tanpa idProject) |

### 2.4 Perilaku back
- Ganti `location.back()` (`mobile-header.component.ts:37`) dengan **back hierarkis**: setiap route punya `data.parent`
  (channel → node → tab asal → ringkasan → `/projects` bila >1 project). Pakai `history.back()` hanya bila navigasi
  sebelumnya ada di dalam app (`router.lastSuccessfulNavigation?.previousNavigation != null`), selain itu `navigate(parent)`.
- Pindah tab bottom nav pakai `replaceUrl: true` → tombol back Android tidak berputar di antara tab.
- Ringkasan dengan 1 project: tidak ada back (root). Back Android di root = keluar app (perilaku native, benar).
- SCADA viewer: satu back saja (hapus tombol "Daftar" internal `project-scada.component.html:29`; daftar diagram = route sendiri).

### 2.5 Yang hilang & penggantinya
| Bagian Dashboard | Pindah ke |
|---|---|
| Node online/offline/total | KPI Ringkasan project (dari `projectsControllerFindOneDetailed.stats` + getFreshness) dan kartu Daftar project |
| Alert aktif (angka) | badge bottom nav "Peringatan" + KPI Ringkasan (`meta.total`, `idProject`) |
| "Perlu perhatian" 5 alert | Ringkasan §3 (alert + perangkat mati digabung) |
| Lintas project | lonceng di Daftar project (hanya user >1 project) |
| Chip "Semua Project" | dihapus; `ProjectContextService` dihapus dari mobile |

---

## 3. Temuan

Format: `[P]` · lokasi · masalah · standar · perbaikan. Path relatif ke `src/app/mobile/` kecuali disebut lain.

### P0 — data tidak jujur / menyesatkan

1. **[P0]** `dashboard/mobile-dashboard/mobile-dashboard.component.ts:75` + `.html:62-65` · Gagal memuat alert ditelan diam-diam, lalu
   layar menampilkan **"Semua aman — tidak ada alert aktif"**. · Data jujur: kegagalan ≠ kosong. · Simpan `alertsError`; tampilkan
   kartu error "Peringatan gagal dimuat · Coba lagi"; teks "Semua aman" hanya bila request sukses dan `meta.total === 0`. (Dibawa ke Ringkasan baru.)
2. **[P0]** `mobile-dashboard.component.ts:65` · KPI "Alert aktif" = `b.total ?? b.data.total ?? list.length` dengan `limit: 5` — kontrak
   memakai `meta.total`, jadi angka **mentok di 5**. · Kontrak API + "Counts come from meta.total". · `totalOf(body)` dari `shared/utils/fetch-all.ts`.
3. **[P0]** `mobile-dashboard.component.ts:44,59` + `layout/mobile-header/mobile-header.component.html:11-15` · Chip AppBar menampilkan
   project aktif, tetapi statistik & alert dashboard **tidak di-scope** (stats tidak punya param project; alert tidak mengirim `idProject`
   walau SDK mendukung, `alert-events-controller-find-all.ts` `idProject`). Juga `alerts/mobile-alerts/mobile-alerts.component.ts:51`. ·
   Data jujur + multi-tenancy UX. · IA §2: hapus dashboard; alert selalu kirim `idProject` dari route.
4. **[P0]** `nodes/node-info/mobile-node-info.component.ts:136-141` · "Uptime 100.0%" dan "Baterai unknown" ditampilkan sebagai metrik.
   Backend `iot-backend-go/app/services/node/node_service.go:1034-1049` menghitung uptime **heuristik 100/50/0 dari lastSeenAt**
   (bahkan `telemetryIntervalSec*2` dikali `time.Minute` — detik dibaca menit), `battery` selalu `"unknown"` (`:1070`). · Larangan
   "estimated uptime" di `ui-coding-style`. · Hapus baris Uptime & Baterai; tampilkan "Status data" dari `getFreshness` + `freshnessThresholds`
   ("Aktif · kirim tiap 2 mnt · terlambat bila > 10 mnt"). Tandai endpoint untuk diperbaiki di backend.
5. **[P0]** `projects/mobile-projects-list/mobile-projects-list.component.ts:63` · "x perangkat · 0 online" padahal online — field salah
   (`activeNodes` vs `stats.online`) [OP-1]. · Data jujur. · Baca field yang benar; lebih baik hitung dari getFreshness di backend `stats`.
6. **[P0]** `nodes/node-info/mobile-node-info.component.ts:168-173` vs `projects/tabs/project-channels/project-channels.component.ts:131-136` ·
   Status channel dipetakan berbeda: `out_of_range` = merah di Info node, kuning di tab Channel; `active` (dikirim `/dashboard`) jatuh ke
   default **kuning** [OP-2]; `stale` digabung abu-abu dengan offline. Satu channel, dua warna di dua layar. · Satu sumber status.
   · Satu fungsi `channelVerdict(lastAt, intervalSec, value, min, max)` di `shared/utils/` (lihat Pola A) dipakai kedua layar.

### P1 — standar inti dilanggar, operator salah baca

7. **[P1]** Label kode-first (aturan: judul = `address || code`, baris 2 = `code` bila alamat tampil):
   | Lokasi | Sekarang | Ganti ke |
   |---|---|---|
   | `nodes/mobile-nodes-list/mobile-nodes-list.component.html:33` (+ `.ts:85,88`) | judul `n.code`; alamat hanya jika city/province kosong | judul `address \|\| code`, baris 2 `code`, meta `city, province` |
   | `projects/tabs/project-info/project-info.component.html:72` (+ `.ts:110,112`) | `n.code` | idem |
   | `nodes/node-info/mobile-node-info.component.html:15` (+ `.ts:75`) | kepala `head.code` | judul alamat, subjudul kode; AppBar judul alamat |
   | `dashboard/…/mobile-dashboard.component.ts:69` | `a.node?.code` | `a.node?.address \|\| a.node?.code` |
   | `alerts/mobile-alerts/mobile-alerts.component.ts:72-73` | `node.code`, `metricCode` | alamat + kode; nama channel manusiawi |
   | `projects/tabs/project-map/project-map.component.html:29,41` (+ `.ts:78,108`) | popup `popup.code`; alamat jadi baris abu "Alamat belum diisi" | judul alamat, baris 2 kode; marker label = alamat singkat, bukan hanya umur |
   | `shared/channel-list/mobile-channel-list.component.html:6` + `project-channels.component.ts:102-108` | judul `metricCode`, sub "kodeNode · sensor" | judul `sensor.label` (· nama channel bila >1 channel/sensor), sub `alamat node · kode`, cari juga by alamat (`.ts:86`) |
   | `nodes/node-info/mobile-node-info.component.ts:91,108` | sub `sensorCode` | `s.label \|\| s.sensorCode` |
   | `nodes/mobile-channel-detail/mobile-channel-detail.component.ts:62` (+ `.html:2`) | judul `metricCode`; AppBar "Channel" | judul label sensor·channel, sub alamat node; AppBar = label |
   | `nodes/node-logs/mobile-node-logs.component.ts:41` | konteks hanya kode | sheet head tampilkan alamat |
   | `mobile-routing.module.ts:38,40,50` | judul AppBar generik "Detail Perangkat"/"Detail Project"/"Channel" | judul dinamis dari entitas (TitleService kecil: komponen set judul+subjudul) |
8. **[P1]** `nodes/mobile-nodes-list/mobile-nodes-list.component.ts:86,103`, `project-info.component.ts:106`, `project-map.component.ts:81,339`,
   `mobile-dashboard.component.ts:51-52` · Status perangkat dari `connectivityStatus` mentah ("Degraded", offline = total−online),
   bukan `getFreshness(lastSeenAt, telemetryIntervalSec)` seperti desktop. Node yang belum pernah kirim tampil "Offline · terakhir kirim
   belum pernah". · `telemetry-freshness.ts` wajib. · Pakai getFreshness; 4 label ID tetap: **Aktif / Terlambat / Offline / Belum ada data**
   (lihat Pola A untuk map label ID).
9. **[P1]** Warna status tidak konsisten: offline = pill abu (`mobile-nodes-list.component.html:47`), angka abu di dashboard (`.html:27`),
   merah di project-info (`project-info.component.html:48`) dan peta (`project-map.component.ts:339`). · Desktop: fresh=success, stale=warning,
   offline=danger, nodata=secondary. · Satu map `FRESHNESS_PILL = { fresh:'m-pill--ok', stale:'m-pill--warn', offline:'m-pill--danger', nodata:'m-pill--off' }`
   + warna marker dari token (baca `--m-success` dll. lewat `getComputedStyle`, bukan hex).
10. **[P1]** Angka tidak id-ID & mengabaikan presisi: `project-channels.component.ts:110`, `mobile-node-info.component.ts:110`
    (`String(Math.round(v*100)/100)` → "3.83"), `mobile-channel-detail.component.ts:80` (`fmt` → number diinterpolasi), `mobile-node-info.component.ts:137`
    (`toFixed(1)`), `project-map.component.ts:153-160` (`fmtVal`), ambang mentah `project-channels.component.ts:113`, `mobile-channel-detail.component.html:3`. ·
    `ui-coding-style` "Displaying numbers" + `decimalsFromPrecision`. · `formatNumber(v, locale, '1.d-d')` dengan `d = decimalsFromPrecision(ch.precision)`;
    satu pipe mobile `mNum` (Pola B). SVG `toFixed` di `util.ts:28,31` & `mobile-channel-detail.component.ts:96-99` **biarkan**.
11. **[P1]** `project-channels.component.ts:113`, `mobile-channel-detail.component.html:3` · Ambang hanya ditampilkan bila min **dan** max terisi;
    ambang satu sisi hilang; ambang kosong tidak dinyatakan. · `threshold.ts` (null = belum diatur). · Teks dari `thresholdText` desktop
    (pindahkan ke `channel-display.ts`): "Ambang 0,5–3 bar" / "Ambang min 0,5" / "Ambang belum diatur"; nilai di luar ambang beri panah ↑/↓ + teks.
12. **[P1]** `nodes/mobile-channel-detail/mobile-channel-detail.component.html:25-31`, `shared/channel-list/mobile-channel-list.component.html:36-42` ·
    Grafik tanpa sumbu nilai, tanpa label waktu, tanpa min/maks, tanpa garis ambang — hanya garis dekoratif. · `ui-card` (chart harus terbaca). ·
    Tambah: label min/maks/terakhir di kanan, tick waktu awal–akhir, pita ambang (rect), titik putus bila data bolong (`sparkPath` gaya desktop, bukan interpolasi).
13. **[P1]** `mobile-channel-detail.component.ts:102-106` · Baris data rentang 7 hari hanya jam:menit:detik tanpa tanggal; urutan diasumsikan
    ascending (`slice().reverse()`). · Format tanggal id-ID. · `| date:'dd MMM, HH:mm'` untuk 24 j/7 h; urutkan eksplisit by ts desc.
14. **[P1]** Kegagalan auto-refresh diam menghapus data: semua layar memakai `*ngIf="!loading && !error"` pada list
    (mis. `mobile-nodes-list.component.html:19,30`, `mobile-projects-list.component.html:12,23`, `mobile-alerts.component.html:12,22`), dan
    `load(false)` mengisi `error` → daftar yang valid hilang diganti error setiap kali sinyal 4G putus sebentar. `node-info` sudah benar
    (`channels.length` dicek). · State "stale data". · Pola C: error full-page hanya bila belum ada data; bila ada data → banner tipis
    "Gagal memperbarui · data per 14.05 · Coba lagi" di atas list; tampilkan "Diperbarui 14.05" di tiap layar.
15. **[P1]** Pesan error mentah `err?.message` (`mobile-nodes-list.component.ts:96`, `mobile-dashboard.component.ts:56`, `project-info.component.ts:94`,
    `mobile-alerts.component.ts:61`, `mobile-channel-detail.component.ts:76`, dst.) → "Http failure response for https://…: 0 Unknown Error". Tidak ada
    deteksi offline. · Bahasa ID + error jujur. · Helper `mErrorText(err)`: status 0/`!navigator.onLine` → "Tidak ada koneksi internet";
    401/403 → "Sesi berakhir/akses ditolak"; 5xx → "Server sedang bermasalah"; lainnya `err.error.message` (kontrak `{statusCode,message}`).
16. **[P1]** Daftar terpotong diam-diam: `mobile-nodes-list.component.ts:77` (limit 50, filter status client-side di atas 50), `mobile-alerts.component.ts:51` (50),
    `mobile-projects-list.component.ts:54` & `mobile-header.component.ts:58` (100), `project-info.component.ts:100` (100), `project-map.component.ts:58` (200). ·
    "never rely on default page size" + `fetchAll`. · `fetchAll` untuk nodes/projects/peta; alert: paginasi "Muat lagi" + `meta.total` di header ("12 peringatan aktif").
17. **[P1]** Pull-to-refresh tidak jujur: `shared/pull-refresh.directive.ts:80-86` menghentikan spinner setelah **1000 ms tetap**, bukan saat request selesai;
    layar `mobile-channel-detail`, `node-command`, `node-logs`, `project-map`, `project-scada` tidak subscribe `RefreshBusService` → tarik = spinner palsu tanpa reload.
    `load(true)` pada pull juga mengganti konten dengan skeleton (lompat). · State honest. · `RefreshBusService.trigger()` mengembalikan
    `Promise` yang di-resolve layar aktif (`done()`); directive menunggu itu (timeout 10 s → toast gagal). Pull memanggil `load(false)` (pertahankan konten).
    Layar tanpa refresh: matikan `mPull` via `data.pull: false`.
18. **[P1]** `src/index.html:8,16` + `mobile.scss:64-71,428` · `apple-mobile-web-app-status-bar-style=black-translucent` tanpa `viewport-fit=cover` dan AppBar
    tanpa `padding-top: env(safe-area-inset-top)` → di PWA iOS AppBar tertimpa jam/notch (verifikasi di perangkat); indikator pull `top:60px` hard-code. ·
    Safe-area. · Tambah `viewport-fit=cover`; `.m-appbar{ padding-top:env(safe-area-inset-top); height:calc(var(--m-appbar-h) + env(safe-area-inset-top)) }`;
    `.m-ptr{ top:calc(var(--m-appbar-h) + env(safe-area-inset-top) + 4px) }`; sheet & fullscreen SCADA ikut `env()`.
19. **[P1]** Navigasi: `mobile-header.component.ts:37` `location.back()` keluar app bila dibuka dari tautan/refresh [OP-10]; `goDesktop()` (`:38`,
    `profile/mobile-profile/mobile-profile.component.ts:50`) selalu ke `/iot/dashboard` — kehilangan konteks project/node. · `ui-detail` back + tetap di workspace. ·
    Back hierarkis (§2.4); `goDesktop` memetakan route aktif → `/iot/projects/:pid/workspace/...` (node → workspace node page).

### P2 — konsistensi, a11y, sentuhan

20. **[P2]** Target sentuh < 44 px (`--m-tap` sudah 44): `.m-appbar__back` 36 px (`mobile.scss:72`), `.m-iconbtn` 38 px (`:102`), `.m-btn--sm` 34 px (`:226`,
    dipakai untuk "Coba lagi", "Buka node", aksi utama sheet), `.m-chip` ±31 px (`:229`), `.m-radio` 18 px dapat diketuk sendiri (`mobile-header.component.html:48`),
    ikon `fa-xmark` reset filter ±13 px (`project-channels.component.html:6`). · Tap ≥ 44. · Naikkan ke `min-height:var(--m-tap)` / area sentuh via
    `::before` inset negatif; xmark jadi `<button class="m-iconbtn" aria-label="Hapus filter">`.
21. **[P2]** Kontras: `--m-text-dim #5b6e87` di atas `--m-surface #0f1c30` ≈ **3,3 : 1** dipakai untuk teks 10–11 px: label bottom nav nonaktif (`mobile.scss:123`),
    baris waktu channel `.m-chrow__sub2` (`:302`), `.m-flow__cap` (`:485`). Teks 9 px di `.m-tag` (`:140`) & `.m-cmd__ch` (`:386`). · WCAG AA 4,5 : 1, min 11 px. ·
    Teks kecil pakai `--m-text-muted` (≈5,4 : 1); `--m-text-dim` hanya untuk ikon/garis; lantai ukuran 11 px.
22. **[P2]** Ikon-only tanpa label: salin (`nodes/node-command/mobile-node-command.component.html:53`), tutup sheet (`nodes/node-info/sensor-context-sheet/mobile-sensor-context.component.html:11`),
    hapus release (`:48`), xmark filter (`project-channels.component.html:6`). Elemen klik berupa `div` tanpa `role`/keyboard: semua `.m-list__item`, chip
    (`mobile-alerts.component.html:2-3`, `mobile-channel-detail.component.html:7-9`, `mobile-nodes-list.component.html:7`), `.m-stat` (`mobile-dashboard.component.html:14-45`). ·
    a11y. · `aria-label` + `title`; list baris jadi `<a [routerLink]>` atau `<button>`; chip filter `<button role="tab" aria-selected>`.
23. **[P2]** `src/index.html:8` `maximum-scale=1.0, user-scalable=no` memblokir zoom (WCAG 1.4.4) — untuk operator lapangan yang membaca angka 11 px. · Hapus keduanya;
    cegah zoom-input iOS dengan font input ≥ 16 px (`.m-search input` 13 px, `mobile.scss:219`).
24. **[P2]** Campur bahasa / istilah: tab "Command", "Logs" (`nodes/mobile-node-detail/mobile-node-detail.component.html:3-4`), "Installation Context"
    (`mobile-node-info.component.html:53`, `mobile-sensor-context.component.html:8`), "Degraded" (`mobile-nodes-list.component.html:50`, `mobile-node-info.component.html:20`),
    chip "Warning" (`project-channels.component.ts:128`), "VIEW" (`project-scada.component.html:31`), "update …" (`mobile-channel-list.component.html:21`),
    "now/m/h/d" (`project-map.component.ts:167-171`), "Dev EUI", "Power" (`mobile-node-info.component.ts:127,129`), nilai mentah `node.status`/`h.overall`
    ("active", "healthy", `:131,138-140`), severity mentah "Critical/High" (`mobile-alerts.component.ts:87`), "context" (`flow-diagram/mobile-flow-diagram.component.ts:50`),
    "Owner" (`project-info.component.html:84`), "Auto-reload" (`mobile-profile.component.html:16`); dan Node vs Perangkat, Alert vs Peringatan,
    kartu "Sensor" → tab "Channel" (`project-info.component.html:51-53`). · Bahasa ID konsisten. · Glosarium mobile (Pola D): Perangkat, Channel,
    Peringatan, Perintah, Log, Konteks Pemasangan, Aktif/Terlambat/Offline/Belum ada data, Kritis/Tinggi/Sedang/Info.
25. **[P2]** Tab Channel: chip status menyembunyikan `stale` tetapi menghitungnya di "Semua" (`project-channels.component.ts:23-24,95`) → jumlah chip tidak
    menjumlah ke total; error tanpa "Coba lagi" (`.html:34-36`). Peta: error tanpa "Coba lagi" (`project-map.component.html:3`), tanpa auto-refresh/pull
    sehingga nilai sensor bisa basi tanpa penanda waktu. · `ui-list` tab filter + count. · Chip Semua/Normal/Di luar ambang/Terlambat/Offline yang menjumlah;
    retry di kedua layar; peta ikut `everyDefault()` + "Nilai per 14.05".
26. **[P2]** Hierarki Info perangkat (`mobile-node-info.component.html:13-74`): nilai channel (yang dicari operator) berada di bawah kartu Lokasi & Kontak
    dan diagram hidrolika; "Info perangkat" & "Kesehatan" sejajar dengan data operasional. · `ui-detail` (terpenting di atas). · Urutan: kepala
    (alamat, kode, freshness, data terakhir, tombol telepon PIC & buka peta) → Channel nilai terbaru → Hidrolika → Konteks pemasangan → "Info teknis" dilipat.
27. **[P2]** `project-info.component.html:58-63` · "Aksi cepat" menduplikasi tab yang persis ada di atasnya; tabel Informasi (`.html:95-98`, `.ts:81-89`) mengulang
    Owner/Area/Status; "Dibuat" ditampilkan relatif ("312 hr lalu"). · Hierarki. · Hapus quick grid (bottom nav baru menggantikan); info sisakan yang tak tampil di atas;
    tanggal dibuat absolut `| date:'d MMM yyyy'`.
28. **[P2]** Dua pola back dalam SCADA (`project-scada.component.html:29` + AppBar) dan viewer `72vh` di dalam scroll container berarti gesture pan bentrok
    dengan scroll halaman. · Navigasi. · Viewer jadi route sendiri, full-height (`.m-content` tanpa padding, `mPull` off), satu back.
29. **[P2]** Dialog native `window.alert` (`mobile-node-command.component.ts:114`) dan `confirm` (`mobile-sensor-context.component.ts:162`) di tengah UI sheet. ·
    Konsistensi. · Tombol Kirim `disabled` sampai centang konfirmasi; hapus release lewat sheet konfirmasi `m-sheet` dengan tombol merah.
30. **[P2]** Modul disebut "read-only fase 1" (`mobile.module.ts:34`) tetapi memuat aksi tulis (kirim perintah, ubah profil instalasi, edit/hapus release)
    tanpa cek peran di UI. · Multi-tenancy (role checks). · Gate dengan role/izin yang sama dengan desktop; minimal sembunyikan Edit/Hapus untuk role non-admin
    dan pastikan backend menolak.
31. **[P2]** Profil: "Satuan · Metrik" dan "Bahasa · Indonesia" (`mobile-profile.component.html:13-14`) tampil sebagai baris list yang bisa diketuk (`cursor:pointer`)
    tetapi tidak melakukan apa-apa [OP-12]. · Tidak ada elemen "asal jadi". · Hapus, atau jadikan baris info non-interaktif (`.m-meta`).
32. **[P2]** Inline style ±142 atribut `style=""` di 16 template (terbanyak: `node-command` 18, `project-map` 14, `project-info` 14, `dashboard` 12) termasuk
    `font-size:9px/11px/13px` (`mobile-dashboard.component.html:17,25,33,41`, `mobile-header.component.html:55-56`), fallback warna terang `var(--m-surface-2,#eef1f5)`
    (`project-map.component.html:11`), monospace inline (`mobile-node-logs.component.html:18`). · Larangan inline font-size / token tema. · Kelas utilitas mobile
    kecil di `mobile.scss`: `.m-mt-2/.m-mt-3`, `.m-stack`, `.m-row-between`, `.m-mono`, `.m-seg` (segmented), `.m-retry`, `.m-spacer`; hapus semua `style=` statis.

### P3 — polish

33. **[P3]** `mobile.scss:7` tema dikunci gelap. Untuk dipakai di lapangan siang hari, siapkan set token terang `[data-m-theme="light"]` (cukup override `--m-bg…--m-border`)
    + ikuti `prefers-color-scheme`; peta ikut (`basemap.carto('light_all')`). `src/index.html:13` `theme-color #00acac` tidak cocok dengan `--m-bg #070e1a`.
34. **[P3]** Loading tidak seragam: "Memuat…" teks (`mobile-channel-detail.component.html:12`, `mobile-sensor-context.component.html:34`) vs skeleton di tempat lain. → skeleton di semua layar.
35. **[P3]** `.m-tabs` tidak sticky (`mobile.scss:372`) — tab project/node hilang saat scroll. Terselesaikan oleh bottom nav baru; tab node (3 segmen) dibuat `position:sticky; top:0`.
36. **[P3]** Sheet "Pilih Project" butuh paragraf penjelasan cara pakai (`mobile-header.component.html:30`) — tanda pola salah. Terselesaikan dengan menghapus sheet (IA §2).
37. **[P3]** `mobile-channel-list.component.ts:36` subscription grafik tanpa `takeUntil`/unsubscribe saat komponen hancur; `mobile-node-logs.component.ts:42` auto-refresh
    hanya dipasang di cabang sukses (cabang error memuat sekali tanpa refresh).

---

## 4. Duplikasi vs logika desktop (Pola lintas halaman)

| Mobile (reimplementasi) | Pakai yang sudah ada |
|---|---|
| `shared/util.ts:2-14` `relTime` ("hr lalu" ambigu, "belum pernah" huruf kecil) | `timeAgoId` — `shared/utils/channel-display.ts:40` (identik, label lebih jelas) |
| `project-map.component.ts:162-186` `fmtAgo` (Inggris) + `fmtLastSeen` | `timeAgoId` / `deadSinceText` / `formatDuration` |
| `mobile-channel-detail.component.ts:86-100` `buildChart` | `buildChartPaths` di `shared/util.ts:19` (duplikat di dalam mobile sendiri); idealnya geser ke `channel-display.ts` |
| Status node dari `connectivityStatus` (5 tempat) | `getFreshness` + `freshnessThresholds` (`telemetry-freshness.ts`) |
| `mapCh` ×2 berbeda | satu `channelVerdict` (baru) di `shared/utils/` yang memakai `thresholdState` + freshness — aturan desktop `isChannelOut` (`sensors-page.component.ts:437-440`: lewat ambang hanya dihitung bila fresh) |
| `String(Math.round(v*100)/100)`, `toFixed`, `fmtVal` | `decimalsFromPrecision` + `formatNumber(…, LOCALE_ID)` |
| teks ambang lokal | pindahkan `thresholdText` / `outOfRangeText` dari `sensors-page.component.ts:445-457` ke `channel-display.ts`, pakai di keduanya |
| `mapStatus`/`statusLabel` project ×2 (`project-info.component.ts:119-133`, `mobile-projects-list.component.ts:87-101`), `mapSev` ×2 (`mobile-dashboard.component.ts:85`, `mobile-alerts.component.ts:80`) | `mobile/shared/labels.ts` (satu map status project & severity, berbahasa ID) |
| `let b = res.body; if (typeof b === 'string') JSON.parse…` di ±20 tempat | `parseBody` / `listOf` / `totalOf` (`shared/utils/fetch-all.ts`) |
| tel link mentah `'tel:' + phone` | `telHref` (`channel-display.ts:125`, membersihkan karakter) |

Catatan label: `FRESHNESS_LABEL` desktop berbahasa Inggris (`Fresh/Stale/Offline/No Data`). Tambah `FRESHNESS_LABEL_ID` di
`telemetry-freshness.ts` (**Aktif / Terlambat / Offline / Belum ada data**) dan `FRESHNESS_PILL` mobile; jangan buat map lokal di komponen.

**Pola A — status.** `shared/utils/channel-verdict.ts` (murni): `nodeFreshness(node)`, `channelVerdict(ch, node)` → `{ freshness, threshold, isOut, pillClass, label }`.
Dipakai channel-list, node-info, node-list, map, ringkasan, desktop sensors-page (opsional).
**Pola B — angka.** Pipe `mNum` (`standalone:false`, di `MobileModule`): `{{ v | mNum:precision }}` → `formatNumber` + `decimalsFromPrecision`, `null` → "—".
**Pola C — state layar.** Komponen kecil `<m-state [loading] [error] [empty] [hasData] [updatedAt] (retry)>`: skeleton → error penuh (tanpa data) / banner (dengan data) →
empty jujur → "Diperbarui 14.05". Menggantikan ±12 blok `m-card m-skel` + `m-empty` + "Coba lagi" yang ditulis ulang di tiap template.
**Pola D — teks.** `mobile/shared/labels.ts` glosarium + `mErrorText(err)`.
**Pola E — kepala entitas.** `<m-entity-head [title]="address||code" [sub]="code" [freshness] [lastAt] [phone]>` untuk project, node, channel; AppBar judul diset dari sini.
**Pola F — baris list.** `<m-row-node>` / `<m-row-channel>` (alamat-first, pill freshness kanan, meta 1 baris) dipakai node list, ringkasan, alert, peta popup.

---

## 5. Urutan perbaikan

**Gelombang 0 — quick wins kejujuran (½–1 hari, tanpa ubah IA)**
1. #1 "Semua aman" hanya bila sukses; #2 `totalOf` untuk alert; #5 field online daftar project.
2. #4 hapus baris Uptime & Baterai dari Info perangkat.
3. #6 satukan `mapCh` (sementara: `active`/`ok` → ok, `stale` → warn, `out_of_range` → danger di kedua layar).
4. #15 `mErrorText`; #31 hapus baris profil palsu; #22 `aria-label` empat tombol ikon.
5. #23 buka zoom (`index.html:8`) + `viewport-fit=cover`, #18 safe-area AppBar.

**Gelombang 1 — standar bersama (2–3 hari)**
6. Pola A + `FRESHNESS_LABEL_ID` → #8, #9 (status & warna seragam).
7. Pola B → #10, #11 (angka id-ID, presisi, teks ambang).
8. #7 label alamat-first di semua baris (Pola E/F) + judul AppBar dinamis.
9. Pola C → #14, #17 (data basi dipertahankan, pull jujur, "Diperbarui …"); #16 `fetchAll`/paginasi.
10. Ganti duplikasi (§4): `relTime`→`timeAgoId`, `parseBody`, `telHref`, label map tunggal.

**Gelombang 2 — IA baru (3–4 hari)**
11. `MobileHomeGuard` (0/1/>1 project) + route `/mobile/p/:pid/**` + redirect lama (§2.3); hapus Dashboard, chip & `ProjectContextService` dari mobile.
12. Shell project dengan bottom nav 5 item (replaceUrl) + Ringkasan (KPI, Perlu perhatian gabungan, badge peringatan per project).
13. Back hierarkis (`data.parent`), `goDesktop` kontekstual (#19), SCADA jadi route full-screen (#28).
14. Urutan Info perangkat (#26), bersihkan project-info (#27), tab Channel chip yang menjumlah + retry (#25).

**Gelombang 3 — polish**
15. Grafik terbaca (#12, #13), target sentuh & kontras (#20, #21), glosarium ID (#24), inline style → utilitas (#32),
    dialog native → sheet (#29), gate peran aksi tulis (#30), tema terang (#33), sisa P3.

Setiap gelombang: perbarui Panduan mobile (skill `page-guide`) — istilah Aktif/Terlambat/Offline/Belum ada data dan arti "—"/"Ambang belum diatur".
