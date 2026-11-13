# /iot/telemetry-channels — audit operator PDAM (pdam-operator, 13 Nov 2026)

Kesan: tabel teknis untuk developer, bukan alat pantau pagi. Baris per `metricCode`, tanpa alamat, istilah Inggris, tanpa KPI/tren/"mati sejak"/PIC/ekspor; status berbeda dari tab Sensors.

| # | Tingkat | Gap | Pakai ulang / adaptasi |
|---|---|---|---|
| 1 | Kritis | Status backend (`computeChannelStatus`: offline = flag node; stale tanpa batas atas; belum pernah kirim = "Stale") ≠ `getFreshness` | pakai ulang `telemetry-freshness.ts` |
| 2 | Kritis | Alamat tidak tampil (baris utama `metricCode`, node `name\|\|code`) padahal API mengirim `address` | adaptasi: alamat + kode, kelompok per node |
| 3 | Kritis | `limit: 2000` memotong diam-diam → hitungan tab salah | `fetchAll` / banner terpotong |
| 4 | Tinggi | Tidak ada KPI | adaptasi ("Nilai terendah" → "Project bermasalah") |
| 5 | Tinggi | Tidak ada "mati sejak" / "belum pernah kirim" / "node terlihat" | pakai ulang |
| 6 | Tinggi | Ambang tak ditandai di baris, tak ada tab "Di luar ambang" | pakai ulang `thresholdState` |
| 7 | Tinggi | Tak ada tren 24 jam + min/maks | adaptasi (lazy per halaman tampil) |
| 8 | Tinggi | Tak ada ekspor Excel | adaptasi (+ Project, Owner) |
| 9 | Tinggi | Cari tak mencakup alamat/PIC; placeholder "Metric code" | adaptasi |
| 10 | Sedang | Tak ada PIC/telepon di baris bermasalah | adaptasi (endpoint perlu PIC) |
| 11 | Sedang | Filter lintas project kurang (wilayah, hanya bermasalah, owner di label project) | baru |
| 12 | Sedang | Nilai terakhir via LATERAL per channel di Postgres (lambat); filter/urut di browser tiap render; presisi diabaikan; error/kosong Inggris tanpa "Coba lagi"; tanpa "diperbarui" & auto-refresh | pakai ulang pola Sensors |

Lain-lain: tab No Data hilang; label campur ID/EN; ikon `fa-diagram-3` tidak ada di FA; isi baris expand terlalu teknis (Register, Mult/Offset); judul tidak menjelaskan; tidak ada Panduan.
Panduan perlu: Fresh/Stale/Offline/No Data + batasnya; arti "sejak"; cara baca ambang & tren; cakupan halaman (project yang boleh dilihat / semua owner untuk admin).
