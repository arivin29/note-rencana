# Retest Mobile Helios (rework) - sudut pandang operator PDAM di HP (14 Nov 2026)

## Metode dan batasan (baca dulu)
- Browser Playwright sedang dipakai sesi lain ("Browser is already in use"), jadi saya tidak memaksa. Tidak ada screenshot (`screens-after/` tidak dibuat) dan konsol browser tidak bisa ditangkap per layar.
- Yang saya lakukan: baca seluruh `src/app/mobile/**` (routing, guard, layout, shell project, semua tab, util bersama) dan memanggil API lokal `localhost:3000` dengan token tenant uji (token tidak ditulis ke file) untuk melihat data nyata.
- Aspek visual (tata letak, ukuran sentuh, pemotongan teks) hanya inferensi dari kode. Tab Peta tidak dinilai; route-nya terdaftar (`p/:pid/peta`), tetapi saya tidak bisa memastikan layarnya terbuka tanpa error.

## Status NG0100
Tidak teramati di runtime (browser tidak tersedia). Dari kode, sumber NG0100 yang saya curigai sudah ditutup:
- `MobileLayoutComponent` mengubah `AppSettings` di constructor (bukan `ngOnInit`), dengan komentar "agar tidak memicu NG0100 di AppComponent". `ngOnDestroy` memulihkan nilai lama.
- Judul AppBar dari `MobileChromeService.title$` dan penghitung `scope.count$` memakai `observeOn(asapScheduler)`. Tab `pullEnabled` juga lewat `refreshBus.handlers$` + asap. Komentar di `RefreshBusService`: "jangan bind getter langsung: NG0100".
- `showBack`/`nav`/`title` diubah di subscriber `NavigationEnd`, yaitu di luar siklus pengecekan view.
Sisa risiko (belum terbukti): `showBack` mulai `false`, lalu menjadi `true` setelah `count$` terisi, jadi tombol kembali bisa berkedip pada user multi-project. Itu kedipan visual, bukan NG0100. Verdict: kemungkinan teratasi, perlu konfirmasi dengan membuka Console di HP/DevTools. Tidak ada error konsol lain yang bisa saya laporkan per layar.

## Kesan pertama
Perubahan paling terasa: buka `/mobile` langsung jatuh ke Ringkasan project (tenant uji hanya punya 1 project), judul AppBar adalah nama project, dan daftar perangkat/channel memakai alamat ("MAN Tekanan", "MAN Debit & Tekanan") dengan kode di baris kedua. Status memakai Aktif/Terlambat/Offline/Belum ada data dan aturannya ditulis di kepala perangkat. Tapi Ringkasan masih tidak menunjukkan satu pun angka tekanan atau debit; itu baru muncul di tab Channel.

## Verdict dua hipotesis owner
- **H1 landing by jumlah project: DIPENUHI.** `mobileLandingGuard`: 0 project tampil layar kosong dengan "Muat ulang / Tampilan Desktop / Keluar"; 1 project redirect (replaceUrl) ke `/mobile/p/:pid/ringkasan`; lebih dari 1 ke `/mobile/projects`. Chip "Pilih Project" sudah dihapus. Catatan: untuk 1 project operator sampai ke nilai tekanan/debit dalam 1 ketukan (tab Channel) dibanding 4 ketukan sebelumnya. Tapi yang ia lihat dulu adalah status dan KPI, bukan nilai (lihat temuan baru B1).
- **H2 alamat dulu: DIPENUHI di hampir semua layar.** Judul = `nodeLabel()` (alamat, fallback kode, fallback nama), baris 2 = kode hanya bila judul memakai alamat. Berlaku di Perangkat, Ringkasan "Perlu perhatian", Peringatan, kepala perangkat, AppBar detail channel ("MAN Tekanan · Tekanan" + kode di subjudul). Channel di tab Channel: "Alamat · Metrik". Sisa: kode muncul sebagai judul hanya bila alamat memang kosong (benar sesuai aturan proyek). Catatan data: "MAN Tekanan" sebenarnya deskripsi perangkat, bukan alamat jalan. Itu urusan pengisian data, bukan UI.

## Tugas harian di HP (retest)
| Tugas | Dulu | Sekarang | Alasan |
|---|---|---|---|
| Mana yang mati dan sejak kapan | ⚠️ | ✅ (⚠️ untuk waktu absolut) | Bar status Aktif/Terlambat/Offline/Belum ada data, "Perlu perhatian" mengurutkan yang mati di atas, teks "Data terakhir 3 jam lalu". Belum ada jam absolut ("mati sejak 14.05"). |
| Tekanan/debit sekarang vs normal | ⚠️ | ⚠️ | Nilai id-ID + status ada di tab Channel dan tab Nilai. Pembanding hanya "Ambang belum diatur" (tenant uji tanpa ambang); tidak ada normal historis. |
| Tren 24 jam / 7 hari | ⚠️ | ⚠️ | Sparkline 24 jam di daftar + chip 1 jam/24 jam/7 hari. Grafik tanpa sumbu/waktu/garis ambang (B2). |
| Tindak lanjut peringatan | ⚠️ | ⚠️ | Kini ada alamat, nilai vs ambang, keparahan berbahasa Indonesia, waktu absolut, tombol telepon PIC. Belum ada ack/catatan. |
| Laporan/ekspor | ❌ | ❌ | Tidak ada tombol bagikan/ekspor. |
| Cari berdasarkan alamat | ⚠️ | ✅ (per project) | "Cari alamat / kode perangkat…" dan "Cari alamat / channel / sensor…". Tidak ada pencarian lintas project. |
| Telepon PIC | ⚠️ | ⚠️ | Tombol telepon di daftar/alarm/kepala perangkat. Node uji F9YUN tanpa PIC, tidak ada fallback ke kontak project/owner. |

## 12 temuan lama
| # | Temuan lama | Verdict | Bukti |
|---|---|---|---|
| 1 | Daftar Project "0 online" (activeNodes vs stats.online) | **Fixed** | `mobile-scope.service.ts`: `online: st.online ?? st.activeNodes`; daftar menampilkan "2 perangkat · N online". Catatan: ini masih flag konektivitas backend, bukan freshness (B5). Hanya terlihat untuk user >1 project. |
| 2 | Titik status channel kuning untuk channel sehat | **Fixed** | `mapCh` hilang; baris channel memakai `verdictTone` (freshness x ambang). Data nyata: semua 6 channel `lastValueAt` ~1 menit lalu, jadi "Aktif" hijau. |
| 3 | Landing salah | **Fixed** | `mobileLandingGuard` (lihat H1). Syarat: Ringkasan belum menampilkan nilai (B1). |
| 4 | Kode sebagai label utama | **Fixed** | `nodeLabel/nodeSubLabel` dipakai di semua daftar; channel project "Alamat · Metrik". Sisa: sheet Perintah "Tujuan (nomor PIC)" tidak menyebut perangkat; tidak penting. |
| 5 | Tidak pakai aturan Fresh/Stale/Offline | **Fixed** | `getFreshness`/`channelVerdict`, label Aktif/Terlambat/Offline/Belum ada data; kepala perangkat menulis "Aturan status: terlambat bila > X mnt, offline bila > Y mnt". Offline di KPI tidak lagi total-online. Tidak ada kata "Degraded". Istilah masih perlu Panduan. |
| 6 | Angka bukan format Indonesia | **Partly** | `mFormatNumber` id-ID + `precision` ("3,84", "2.751,00"). Tapi data nyata: `precision` null di 5 dari 6 channel, jatuh ke fallback 2 desimal, jadi diameter tampil "188,00 mm", volume "2.751,00 m3". Satuan juga masih mentah dari API: "l/s", "m3" (B3). |
| 7 | Tanpa konteks normal/ambang, grafik tanpa sumbu | **Partly** | Ambang tertulis jelas ("Ambang belum diatur" / "Ambang 0,5-3 bar") dan KPI "Di luar ambang" punya hint "Ambang belum diatur". Grafik detail: masih tanpa label sumbu waktu/nilai, tanpa garis ambang; hanya garis grid dan baris Min/Rata-rata/Maks/titik (B2). |
| 8 | Alert tak bisa ditindaklanjuti | **Partly** | Kini: alamat (judul), kode (baris 2), keparahan "Kritis/Tinggi/Sedang/Rendah/Info", "Tekanan 0,3 bar · Ambang 0,5-3 bar", "x jam lalu · 14 Nov, 09:10", telepon PIC. Belum: acknowledge, catatan penanganan, jarak/arah. Tenant uji punya 0 alert, jadi tampilan nyata tidak teruji. |
| 9 | Istilah tak konsisten / Inggris | **Partly** | Terjemah: Perangkat, Peringatan, Perintah, Log, Nilai. Tidak ada lagi "Baterai: unknown" atau "Uptime". Sisa: "Channel", "Project", "PIC", "Dev EUI", "Firmware", "Konteks pemasangan - atur release", "Hidrolika pipa", satuan "l/s". |
| 10 | Navigasi 4 tingkat; back keluar app | **Partly** | Chip/sheet project hilang; tab project dan segmen Nilai/Perintah/Log memakai `replaceUrl`; back hierarkis (`parent`), memakai `location.back()` hanya bila halaman sebelumnya ada di app (`canGoBackInApp`), jika tidak ke induk. Sisa: perangkat -> channel tetap 3 tingkat dalam project; user 1 project tidak punya tombol kembali di tab-tab (hanya logo), Android back dari tab mana pun keluar dari app (B6). |
| 11 | Detail penuh data teknis | **Fixed** | Node: Nilai terbaru -> Hidrolika -> Konteks pemasangan -> "Info teknis" dilipat; Uptime/Baterai dibuang; Ringkasan tidak lagi punya 4 aksi cepat duplikat. |
| 12 | Profil "Satuan/Bahasa" palsu; window.alert; tak ada peta | **Partly** | Satuan/Bahasa sudah tidak ada; profil kini Muat ulang otomatis (Tiap 60 detik/Mati), Tampilan Desktop, Keluar. Tapi `window.alert('Centang konfirmasi dulu…')` masih ada di Perintah, `confirm('Hapus release ini?')` di sheet konteks, dan tidak ada "buka di peta/arahkan" untuk node yang punya koordinat. |

Ringkas: 6 Fixed (1, 2, 3, 4, 5, 11), 6 Partly (6, 7, 8, 9, 10, 12), 0 Not fixed.

## Temuan baru (urut prioritas)
**B1 [Tinggi] Ringkasan (landing) tidak menampilkan nilai tekanan/debit satu pun.** Isinya bar status, 4 KPI (Perangkat, Offline, Di luar ambang, Peringatan aktif), "Perlu perhatian", Bagan SCADA. Untuk tenant sehat layar mengatakan "Semua perangkat aktif, tidak ada peringatan aktif" tanpa satu angka bar atau L/s. Operator di lapangan hampir selalu bertanya "tekanan berapa sekarang?". Usulan: kartu "Nilai sekarang" per perangkat (alamat + 2-3 nilai utama + titik status) di bawah bar status, atau jadikan Channel sebagai tab pertama.

**B2 [Tinggi] Grafik channel tidak bisa dibaca sebagai tren.** `MobileChannelDetailComponent`: SVG 340x150 `preserveAspectRatio="none"` tanpa label jam di sumbu X, tanpa angka di sumbu Y, tanpa garis ambang/normal. Sumbu Y = min-maks data, jadi tekanan yang cuma bergeser 0,02 bar tampak seperti lonjakan; dan bila datar, dipaksa +-1. Rentang awal adalah "1 jam", padahal untuk memantau kebocoran yang perlu 24 jam/7 hari. Usulan: label 3 jam di bawah, label min/maks di kiri, garis ambang bila ada, default 24 jam.

**B3 [Sedang] Presisi palsu dan satuan mentah.** Data nyata: `precision` null di 5/6 channel, jadi semua tampil 2 desimal: "188,00 mm", "2.751,00 m3", "0,99 m/s". Satuan "l/s" dan "m3" tidak diperbaiki (standar "L/s", "m³"). Operator merasa angka dibuat-buat. Usulan: presisi default 0 untuk satuan mm/m3 dan 1-2 untuk lainnya, atau perbaiki master channel; normalkan satuan di tampilan.

**B4 [Sedang] Tab Perintah: aman-tapi-membingungkan.** Perintah berisiko hanya dijaga satu centang plus `window.alert`. Teks sukses "SMS disiapkan & dicatat" ditulis ke log walau operator belum menekan Kirim di aplikasi SMS; bila "Tujuan" kosong, teks hanya disalin ke clipboard tanpa pemberitahuan tetapi hasilnya tetap "disiapkan". Log perintah bisa menyesatkan atasan. Usulan: catat "dibuka di aplikasi SMS" bukan "dikirim", dan beri toast "Teks disalin".

**B5 [Sedang] Dua definisi "online".** Daftar Project memakai flag konektivitas backend ("2 tidak online", pil Semua online), sedangkan Ringkasan/Perangkat memakai freshness (Aktif/Terlambat/Offline). Untuk user multi-project angkanya bisa beda antara daftar dan dalam project. Usulan: pakai freshness juga di daftar project, atau sembunyikan sampai tersedia.

**B6 [Sedang] Back Android dari tab project keluar dari aplikasi.** Berpindah tab memakai `replaceUrl`, jadi dari Channel/Peringatan back langsung ke luar (user 1 project: ke halaman sebelum `/mobile`, atau tutup app). Operator mengira back kembali ke Ringkasan. Tidak ada tombol kembali di AppBar untuk tab user 1 project. Usulan: back dari tab selain Ringkasan kembali ke Ringkasan; di Ringkasan konfirmasi "Tekan sekali lagi untuk keluar".

**B7 [Sedang] Rentang 24 jam/7 hari memuat data mentah dan tidak diperbarui.** Komentar kode: backend belum mengagregasi. 7 hari x tiap 2 menit = sekitar 5.000 titik di jaringan seluler; daftar "Data terakhir" di bawah grafik hanya 60 baris (sekitar 2 jam), jadi di rentang 7 hari ia tampak tidak cocok dengan grafiknya.

**B8 [Rendah] Peringatan multi-project menaut ke rute lama** `['/mobile/nodes', nid]`, yang bergantung redirect guard (satu request tambahan, bisa gagal diam-diam ke `/mobile`). Ganti ke `/mobile/p/:pid/nodes/:nid`.

**B9 [Rendah] "Mati sejak" hanya relatif** ("Data terakhir 3 jam lalu"); laporan ke atasan butuh jam absolut. Juga tidak ada fallback telepon ke kontak project bila node tanpa PIC (F9YUN).

**B10 [Rendah] Ikon AppBar tanpa teks.** Ikon desktop dan profil sebelah-menyebelah; "Tampilan Desktop" hanya `title` (tidak terlihat di layar sentuh), risiko salah ketuk memindahkan operator ke layar desktop. Untuk user 1 project, nav global "Project" membawa ke daftar berisi 1 project saja.

**B11 [Rendah] Log perangkat = JSON mentah** (preview monospace, sheet "Detail Log" `pre`). Tidak bermakna bagi operator; setidaknya beri label jenis log dan status.

**B12 [Rendah] Profil menampilkan `user.role` mentah ("tenant")** dan "Pengguna" bila nama kosong.

## Fitur yang masih dibutuhkan
Nilai sekarang di landing; grafik dengan sumbu/ambang/MNF dan banding dengan kemarin/minggu lalu; ack dan catatan penanganan peringatan; "mati sejak" absolut dan kontak fallback; buka lokasi di peta/arahkan; bagikan ringkasan (WhatsApp/PDF); cari lintas project; notifikasi push.

## Hal yang perlu dijelaskan di Panduan (mobile)
- Aktif / Terlambat / Offline / Belum ada data: kapan dan dasar hitungnya (data terakhir vs interval kirim; kepala perangkat sudah menulis angka menit tapi tidak ada penjelasan umum).
- Arti warna titik/pil dan beda "Di luar ambang" vs "Terlambat" (di luar ambang hanya dinilai bila data segar).
- "Ambang belum diatur": tidak ada alarm tekanan/debit otomatis untuk channel itu.
- Cara membaca grafik (rentang 1 jam / 24 jam / 7 hari; min/rata-rata/maks; tarik ke bawah untuk memuat ulang; hanya rentang 1 jam yang auto-update).
- Muat ulang otomatis 60 detik vs interval kirim perangkat tiap 2 menit; kapan data dianggap basi.
- Tombol tab: Ringkasan, Perangkat, Channel, Peta, Peringatan; arti "Aktif" vs "Riwayat" di Peringatan.
- Perintah: SMS membuka aplikasi pesan (anda yang menekan kirim) vs MQTT langsung; arti perintah berisiko; di mana jejaknya (Log).
- Istilah: Channel, PIC, Interval kirim, Hidrolika pipa, Konteks pemasangan, Dev EUI, Firmware.
- Arti "—" (tidak ada data) dan "Belum pernah kirim".
- Tampilan Desktop vs Mobile, dan cara kembali.
