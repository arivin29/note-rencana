# iot-scada — tim tampilan SCADA & widget

Editor/viewer diagram SCADA PDAM (React 18 + React Flow 12 + zustand v5 + Tailwind), di-embed
ke Helios Angular (tab Analytics desktop & tab SCADA mobile). Lingkup: **lihat data +
visualisasi**, bukan kontrol perangkat/HMI ruang kontrol.

## Skill — baca sebelum coding
- `scada-view` — arsitektur, gotcha wajib, sistem yang sudah ada, resep, backlog (`references/backlog.md`).
- `widget-builder` — widget dinamis Angular (Widget Builder / Monitor proyek), backlog-nya.
- `ui-coding-style`, `ui-card`, `backend-module` — standar Angular & Go (untuk sisi lain).

Skill & agen disimpan di `../iot-angular/.claude/` (sumber kebenaran); `.claude/` di sini hanya symlink.

## Tim agen
| Agen | Model | Peran |
|---|---|---|
| `scada-visual-auditor` | opus | Audit visual HMI sebelum kerja + QA visual sesudahnya (read-only, screenshot) |
| `pdam-operator` | sonnet | Persona operator PDAM — apakah layar menjawab tugas hariannya |
| `scada-engineer` | opus | Implementasi kode iot-scada |
| `widget-engineer` | opus | Implementasi widget/dashboard Angular (+ Go bila perlu) |
| `scada-diagram-author` | opus | Menyusun bagan dari inventori nyata via API (minta JWT, backup sebelum PUT) |
| `senior-dev-auditor` | opus | Review diff end-to-end (bug, perf, keamanan, data palsu) |
| `feature-designer` | fable | Desain di atas kertas untuk fitur besar sebelum coding |

## Alur kerja baku
1. **Pahami** — orkestrator baca skill; untuk fitur besar → `feature-designer`.
2. **Audit (paralel)** — `scada-visual-auditor` + `pdam-operator` → `docs/audit/<scope>-<tgl>/`.
3. **Rencana** — gabungkan temuan + backlog jadi daftar berprioritas; minta persetujuan user bila menyentuh produksi/diagram nyata.
4. **Implementasi** — `scada-engineer` / `widget-engineer` (paralel hanya bila file tidak beririsan); bagan → `scada-diagram-author`.
5. **Verifikasi** — `npx tsc --noEmit` bersih; `senior-dev-auditor` review diff; `scada-visual-auditor` mode QA.
6. **Tutup** — perbarui backlog/skill bila ada jebakan baru; commit hanya bila diminta.

## Non-negotiable
- Tidak ada data palsu/acak. Label node = alamat (fallback kode node). UI Bahasa Indonesia.
- Jangan edit `src/sdk/` manual. Jangan commit `.firebase/*.cache` / `tsconfig.tsbuildinfo` bersama fitur.
- Commit: ikuti aturan atribusi global user (CLAUDE.md global).
