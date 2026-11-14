# Audit operator PDAM — Tab Peta mobile (14 Nov 2026)

Sumber: agen `pdam-operator`, audit dari kode `mobile/projects/tabs/project-map/` (tanpa browser). Disalin oleh orkestrator.

## Tugas harian
| Tugas | Status | Alasan |
|---|---|---|
| Jalan ke node | ❌ | Tak ada Rute/Google Maps, "lokasi saya", salin koordinat |
| Cek tekanan DMA | ⚠️ | Hanya mode Sensor; kartu maks 3 kanal; mode Node tanpa angka |
| Cari node offline | ⚠️ | Merah = semua non-online/degraded; tak ada filter/hitungan |
| Lapor kebocoran | ❌ | Tak ada bagikan titik / salin alamat |
| Cari titik dari alamat | ❌ | Tak ada kotak cari |
| Lihat jaringan pipa | ⚠️ | Layer tanpa nama/legenda/saklar; isVisibleDefault=false tak bisa dinyalakan |
| Tahu data segar | ⚠️ | Chip "now/5m" dihitung sekali; tak ada "Diperbarui HH:mm"/refresh |

## P0
1. Popup minim — butuh Rute (Google Maps), Salin alamat/koordinat, Bagikan (WhatsApp), Lihat tren.
2. Popup melanggar aturan nama — judul = kode; harus alamat (fallback kode), kode baris kedua.
3. Tak ada kontrol peta — zoom +/−, Lokasi saya, Pusatkan semua titik.
4. Tak ada filter status — chip Semua · Online · Terganggu · Offline dengan jumlah.
5. Istilah Inggris — online/degraded/offline, now/5m/2h, N/A; dua format waktu bercampur; perlu legenda warna.
6. Data tak ditandai usang — tak ada polling/auto-refresh ~60 dtk, jam "Diperbarui", tombol segarkan.

## P1
7. Toggle Node/Sensor membingungkan — satukan: marker status + nilai utama di popup.
8. Mode Sensor ramai — kartu bertumpuk, "+N sensor" tak bisa diklik, node tanpa kanal hilang, "N/A".
9. Layer pipa tanpa kendali — panel Lapisan, nama di legenda, tap garis = nama; error layer ditelan.
10. Basemap gelap sulit di bawah matahari — pilihan Terang / Satelit.
11. Pencarian alamat → terbang ke node + buka popup.
12. Batas diam-diam — limit 200 node; node tanpa koordinat tak dikabarkan.

## P2
13. Merangin hampir kosong — catatan "Belum ada jaringan pipa"; ikon IPA beda dari titik pantau.
14. Popup node tanpa nilai tekanan/debit terakhir.
15. Tak ada lencana alarm di marker.
16. Target sentuh kecil (radius 6–8 px); popup tanpa tombol tutup.
17. State kosong/error tanpa jalan keluar; `e.message` mentah tanpa Coba lagi.

## Untuk Panduan
Arti warna marker & batas menit; arti waktu terakhir kirim; beda Node/Sensor; warna nilai kartu; garis biru = layer unggahan; tekanan negatif di titik tinggi = data asli; kenapa node tak muncul (tanpa koordinat / batas); cara membuka node.
