# Tab Sensors — gap fitur dari sudut operator PDAM (pdam-operator, 13 Nov 2026)

Kesan: jujur & bisa menjawab "mana yang mati", belum menjawab "mana yang bermasalah" (tanpa ambang, tren, ekspor).

| # | Tingkat | Gap | Data |
|---|---|---|---|
| 1 | Tinggi | Penanda + filter "di luar ambang" per baris (nilai berwarna, tab/KPI) | perlu backend: min/maxThreshold di `channels[]` list sensor (jangan N+1) |
| 2 | Tinggi | Ekspor Excel daftar sesuai filter (alamat, kode, nilai, satuan, status, waktu terakhir, mati sejak, interval) | ada (pola exceljs report/detail; datetime asli, geser TZ) |
| 3 | Tinggi | KPI ringkasan di atas tabel ("11 dari 12 mengirim", "1 mati sejak …", tekanan terendah) | ada |
| 4 | Tinggi | "Mati sejak <tanggal> (±durasi)" eksplisit; bedakan "belum pernah kirim"; urut paling lama mati | ada (`lastValueAt`) |
| 5 | Tinggi | Penanda alarm aktif per baris | kemungkinan ada (verifikasi pemetaan alert → node/sensor) |
| 6 | Sedang | Mini-tren 24 jam per baris | perlu backend: endpoint ringkas per project |
| 7 | Sedang | Min/maks/rata-rata hari ini | perlu backend (gabung dengan #6) |
| 8 | Sedang | Interval lapor terlihat | ada (`node.telemetryIntervalSec`) |
| 9 | Sedang | Telepon PIC cepat di baris mati; catatan tindak lanjut | PIC ada; catatan perlu backend |
| 10 | Rendah | Istilah Inggris; default 10 baris menyembunyikan 2 sensor | ada |
| 11 | Rendah | Kolom "Type" kurang berguna di project sejenis; tabel lebar di ponsel | — |

Panduan perlu: "mati sejak" = waktu data terakhir diterima (bukan saat alat benar-benar mati); arti ambang kosong = "belum diatur", bukan "normal"; perbarui bagian Keterbatasan setelah ekspor & ambang ada.
