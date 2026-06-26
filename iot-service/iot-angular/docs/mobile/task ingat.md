di module http://localhost:4200/mobile/projects/1414bdba-000b-4e17-b877-557136f8ef2a/channels butuh filter http://localhost:4200/iot/telemetry-channels sama persis dan belum ada reload pull reload 

di module detail node mobile 
- kita perlu tambahin fitur untuk Installation Context profile (new relase) karena di lapangan pasti setting ini

di list node juga belum ada pull down untuk reload data

di dashboard 
 semua card belum bisa di klik


di list http://localhost:4200/mobile/projects/1414bdba-000b-4e17-b877-557136f8ef2a/channels akan lebih baik value sensor di atas dan satuan di bawahnya biar rapi

---
## STATUS CLAIM — [SESI-A] (klaim, jangan diambil sesi lain)
Legend: 🔨 in-progress · ✅ done · ⬜ available

- 🔨 **Pull-to-reload** (list node [baris 6] + channels [baris 1]) — SESI-A
- 🔨 **Dashboard: semua card bisa diklik** [baris 8-9] — SESI-A
- 🔨 **Channels: value di atas, satuan di bawah** [baris 12] — SESI-A
- ✅ Filter channels seperti /iot/telemetry-channels [baris 1] — SESI-B (opus) SELESAI (build hijau)
- ✅ Installation Context profile (new release) [baris 4] — SESI-B (opus) SELESAI (build hijau)

### UPDATE [SESI-B] — SELESAI ✅ (build hijau)
- ✅ **Filter channels** — di `project-channels`: search + chips Status (count) + select Tipe Node & Tipe Channel (client-side, mirror /iot/telemetry-channels). Reset filter via ✕. Tidak menyentuh layout valstack (punya SESI-A).
- ✅ **Installation Context (new release)** — sheet `mobile-sensor-context` di tab Info node detail: per-sensor pilih Profil → isi parameter (grouped) → simpan Release Baru (efektif sejak tgl) + riwayat release (edit/hapus). Reuse `SensorContextService`. Style `.m-ctx-*` di mobile.scss.

### UPDATE [SESI-A] — SELESAI ✅ (build hijau)
- ✅ **Pull-to-reload** — `RefreshBus` + directive `mPull` di `.m-content`. Subscribe di: nodes-list, project-channels, alerts, dashboard, node-info. Tarik-bawah di atas → reload. (skip area peta/embed/json)
- ✅ **Dashboard semua card clickable** — Online/Offline → nodes, Alert → alerts, Total → nodes (+ affordance "Lihat ›").
- ✅ **Channels value di atas, satuan di bawah** — `.m-chrow__valstack` (berlaku channels + node detail).
- ⬜ Filter channels = dikerjakan SESI lain. ⬜ Installation Context = masih AVAILABLE.
