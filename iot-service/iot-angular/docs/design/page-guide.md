# Desain — Fitur "Panduan" per halaman (in-app guide drawer)

Status: DRAFT (13 Nov 2026) · Pemilik: frontend iot-angular

## 1. Tujuan
- Setiap halaman/fitur/modul punya **Panduan** yang bisa dibuka dari halaman itu sendiri (drawer kanan), supaya user PDAM paham cara kerja & arti angka tanpa bertanya.
- Panduan **ikut berubah bersama kode**: setiap perubahan halaman wajib memperbarui panduannya — ditegakkan oleh aturan proyek + skrip pemeriksa, bukan sekadar niat.
- Panduan ditulis **setelah audit** halaman (agen `pdam-operator`, `enterprise-ux-auditor`, `senior-dev-auditor`) dan menjelaskan perilaku **sesudah perbaikan**.

## 2. Keputusan desain
| Topik | Keputusan | Alasan |
|---|---|---|
| Lokasi konten | File Markdown di repo: `src/assets/guides/<guideKey>.md` | Versi ikut git & PR → bisa ditegakkan "ubah halaman = ubah panduan"; tanpa backend/DB baru |
| Format | Markdown + frontmatter (`title`, `version`, `updatedAt`, `audience`, `sources[]`, `related[]`) | Mudah ditulis agen `guide-writer`; `sources` dipakai skrip deteksi panduan basi |
| Render | `marked` (sudah ada di package.json) → HTML disanitasi Angular `[innerHTML]` | Tanpa dependensi baru |
| Penautan halaman ↔ panduan | `data: { guide: '<guideKey>' }` di definisi route | Satu sumber kebenaran; komponen tidak perlu tahu |
| UI | Tombol **"Panduan"** (ikon `fa-circle-question`) konsisten di header halaman / header workspace → `offcanvas-end` (lebar 480px, mobile full) | Pola offcanvas sudah dipakai (`nodes-detail` log drawer) |
| Komponen | `GuideService` (state buka/tutup + cache konten) · `<page-guide-drawer>` dipasang **sekali** di layout · `<page-guide-button>` dipakai di header | Drawer tunggal, tidak diduplikasi per halaman |
| Hubungan dg `/iot/document` (tutorial lama) | Panduan = ringkas & kontekstual; field `related` bisa menautkan ke tutorial lama | Tidak membuang yang sudah ada, tidak menduplikasi |
| Bahasa | Bahasa Indonesia | Pengguna PDAM |

## 3. Struktur konten (wajib, dari agen `guide-writer`)
1. Untuk apa halaman ini · 2. Bagian-bagian layar · 3. Cara melakukan tugas umum · 4. Arti status/warna/angka · 5. Tips · 6. FAQ.
Footer drawer otomatis: "Versi {version} · diperbarui {updatedAt}".

## 4. Penegakan "setiap perubahan update panduan"
1. **Aturan di `CLAUDE.md`** (non-negotiable) + skill `page-guide` berisi alur: audit → perbaiki → `guide-writer` update panduan → naikkan `version`/`updatedAt`.
2. **Skrip `scripts/check-guides.mjs`** (dijalankan manual / pre-commit / CI):
   - route yang punya komponen halaman tapi **tanpa** `data.guide` → peringatan;
   - `guideKey` yang file `.md`-nya tidak ada → error;
   - file di `sources[]` yang **commit terakhirnya lebih baru** dari `updatedAt` panduan → "panduan basi".
3. Agen auditor & reviewer menagih panduan pada setiap perubahan halaman.

## 5. Rencana kerja
1. Infrastruktur: `GuideService`, `page-guide-drawer`, `page-guide-button`, pemasangan di layout + header workspace project. (Tanpa konten.)
2. Perbaikan halaman berdasarkan laporan audit `docs/audit/project-workspace-2026-11-13/`.
3. `guide-writer` menulis panduan pertama untuk tab workspace project (overview, nodes, sensors, node detail, sensor detail, …).
4. `scripts/check-guides.mjs` + aturan CLAUDE.md + skill `page-guide`.
5. Bertahap: halaman lain di luar workspace project.

## 6. Risiko
- Panduan basi → dimitigasi skrip `sources`/`updatedAt`.
- XSS dari markdown → konten hanya dari repo (bukan input user) + sanitasi Angular.
- Halaman embedded (nodes-list di dalam workspace) → guideKey diambil dari route aktif terdalam yang punya `data.guide`.
