# 07 — Review fitur baru tab Sensors (KPI, ambang, ekspor Excel)

Tanggal: 2026-11-13 · Reviewer: Staff Engineer (review saja, tidak ada edit kode)
Cakupan: `sensors-page.component.ts|html|scss`, `shared/utils/threshold.ts`, backend `app/services/sensor/sensor_service.go` (`/api/sensors`).
Bukti runtime: backend lokal :3000, token admin 5 menit, diambil 2026-11-13 14:05 UTC.

**Verdict: perbaiki dulu (2 × P1), lalu kirim.** Tidak ada P0. Build bersih: `tsc --noEmit` dan `ngc -p tsconfig.app.json` (strictTemplates) exit 0; `go build ./...` sukses.

---

## 1. Peta request halaman

| # | Endpoint | Param | Panggilan | Backend membaca param? | Masalah |
|---|---|---|---|---|---|
| 1 | `GET /api/nodes` | `idProject`, `page`, `limit=100` | `ceil(total/100)` saat load + tiap 60 dtk (tab terlihat) | Ya. Live: project 12 node, semua 78 | Hanya dipakai untuk "N nodes" di header dan cadangan field node. Sensor sudah membawa `node` lengkap (`telemetryIntervalSec`, `lastSeenAt`, `pic*`). Boleh dipertahankan (P3) |
| 2 | `GET /api/sensors` | `idProject`, `page`, `limit=100` | `ceil(total/100)` saat load + tiap 60 dtk | Ya (`idProject` atau `projectId`, controller baris 36). Live: 12 untuk project ini, 140 semua | Tidak ada. `meta.total` dipakai `fetchAll`. Satu kueri ClickHouse per halaman, tanpa N+1 |

Tanpa N+1, tanpa limit default yang memotong (fetchAll + `meta.total`), interval dibersihkan di `ngOnDestroy`, subscription load sebelumnya di-unsubscribe.

## 2. Data live project `1414bdba-000b-4e17-b877-557136f8ef2a` (Cabang Tebo)

- `meta = {total:12, page:1, limit:100, totalPages:1}`, `latestAvailable: true`; flat `total/page/limit` tetap ada.
- 12 sensor, semua 1 channel, satuan `bar`, `precision = 2`, interval node 120 dtk.
- 7/12 channel punya ambang (Bungkal 1–3; enam lainnya 0.5–5). Tidak ada ambang sepihak dan tidak ada min ≥ max.
- Di luar ambang: **Mangun Jayo Ujung −0.72** (< 0.5) dan **Perkantoran 0.043** (< 0.5). Keduanya Fresh. Simulasi logika UI memberi KPI = 2, tab = 2, daftar terfilter = 2. **Cocok.**
- 11 Fresh, 1 No Data (`tekanan`, node terakhir terlihat 2026-07-25). Sudah dicek di `sensor_logs` lewat `/sensor-channels/:id/readings` sejak 2025-01-01: 0 titik, jadi teks "Channel belum pernah kirim · node terakhir terlihat 3 bln lalu" **benar** untuk sensor ini.
- KPI "Nilai terendah": −0.72 bar (Mangun Jayo Ujung). Itu data nyata, tapi tekanan negatif kemungkinan offset atau sensor rusak. Itu urusan data, bukan bug UI.

Data lintas project (140 sensor, admin) yang relevan untuk temuan di bawah:
- **56 sensor punya lebih dari satu channel, 52 di antaranya satuannya campur.** Pada 10 sensor, `sensor.lastValue` ≠ `channels[0].lastValue`. Contoh: *Tuf-2000* (IPA BELANAG MAN) `lastValue = 2187` = channel `volume m3`, padahal `channels[0]` = `debit l/s 0.0639`.
- *POWER METER*: selisih `lastValueAt` antar-channel 96 hari (`frequency_pw` dari Maret, channel lain dari Juni).
- Ambang bernilai 0 ada di banyak channel (`0–100`, `0–1000`).
- Precision: null 130, 0 ada 3, 0.01 ada 31, 0.001 ada 1, 1 ada 17, 2 ada 59.
- Varian satuan: `BAR`/`bar`, `m3/h`/`m³/h`, `l/s`/`lps`.

## 3. Temuan

### [P1-1] KPI "Nilai terendah saat ini" bisa menampilkan nilai channel lain dengan satuan yang salah
- **File**: `sensors-page.component.ts:486-493` (`lowestFresh`), `:430-432` (`getChannelUnit`); sumber data `sensor_service.go:1029,1090`.
- **Bug**: nilai diambil dari `sensor.lastValue`, satuan dari `channels[0].unit`. Backend mengisi `bySensor` dengan baris pertama `ORDER BY last_update DESC`, yaitu channel yang kebetulan paling baru. Kalau beberapa channel punya timestamp sama, channelnya acak.
- **Bukti**: *Tuf-2000* → `lastValue 2187` (volume m³), `channels[0].unit = 'l/s'`. Bayangkan project yang semua sensor Fresh-nya flowmeter TUF (satuan channel pertama semuanya `l/s`). Cek satu-satuan lolos, dan kartu menampilkan **"2187 l/s"**, atau diameter "160 l/s". Belum muncul di project mana pun hari ini (IPA BELANAG MAN tersaring karena campur bar/l/s), tapi ini akan muncul begitu ada project berisi flowmeter saja.
- **Dampak**: angka palsu dengan satuan salah di kartu KPI.
- **Perbaikan**: hitung dari channel, bukan dari sensor. Kumpulkan pasangan `(ch.lastValue, ch.unit)` dari semua channel sensor Fresh (pakai freshness channel, lihat P2-1). Normalkan satuan dengan `unit.trim().toLowerCase()`. Tampilkan hanya kalau satuannya tunggal. Opsi paling aman: batasi ke `metricCode` yang sama juga. `low.sensor` tetap disimpan untuk alamat.

### [P1-2] Saat ClickHouse tidak terbaca, KPI, teks "dead since", dan Excel menyatakan semua sensor mati
- **File**: `sensors-page.component.html:31` (KPI tanpa `latestAvailable`), `.ts:459-468` (`deadSinceText`), `.ts:562` (kolom Keterangan Excel).
- **Bug**: kalau `latestAvailable === false`, backend mengembalikan semua `lastValue/lastValueAt = null` (`fetchLatestValues` keluar lebih awal). Banner kuning memang muncul, tapi KPI tetap tampil "Mengirim data **0** / 12" dan "Mati / belum pernah kirim **12**" berwarna merah. Setiap baris menulis "Channel belum pernah kirim · node terakhir terlihat 2 mnt lalu", dan file Excel menyimpan kalimat yang sama sebagai fakta.
- **Dampak**: kelas bug #4 (error ditelan menjadi "No Data" palsu) muncul lagi lewat KPI dan ekspor. Operator bisa menelepon 12 PIC padahal yang mati server datanya.
- **Perbaikan**:
  1. `html:31` ganti kondisinya menjadi `*ngIf="!loading && !error && totalSensors > 0 && latestAvailable"`, atau render angka KPI sebagai "—" dengan keterangan "sumber nilai tidak tersedia".
  2. Di `deadSinceText()` baris pertama: `if (!this.latestAvailable) return 'Nilai terakhir tidak tersedia';`.
  3. Di `exportExcel()`: tolak ekspor (`exportError`) atau tulis baris pertama "PERINGATAN: nilai terakhir tidak tersedia saat ekspor" bila `!latestAvailable`.
  4. Badge status: tambahkan state `unknown` atau beri label "?" alih-alih `No Data`.

### [P2-1] Ambang dinilai memakai freshness sensor, bukan freshness channel itu sendiri, dan tidak cocok dengan backend
- **File**: `sensors-page.component.ts:377-382` (`channelState`); pembanding `sensor_channel_service.go:764-795` (`computeChannelStatus`).
- **Bug A (channel vs sensor)**: `getSensorStatus(sensor)` memakai `sensor.lastValueAt`, yaitu yang terbaru di antara semua channel. Satu channel yang sudah berhenti (contoh POWER METER: `frequency_pw` tertinggal 96 hari) tetap dinilai ambangnya seolah nilainya terkini, lalu dihitung di KPI dan tab "Di luar ambang" dengan nilai berbulan-bulan lalu. Di data hari ini belum ada channel tertinggal yang punya ambang, jadi belum muncul.
- **Bug B (stale ikut dihitung)**: frontend menghitung out-of-range untuk Fresh **dan Stale** (sampai max(12×interval, 60 mnt)). Backend `computeChannelStatus` mengembalikan `stale` begitu umur > max(3×interval, 10 mnt), dan ambang **tidak dievaluasi**. Halaman *Telemetry Channels* dan mobile *project-channels* memakai status backend itu. Akibatnya channel yang sama bisa tampil "di luar ambang" di tab Sensors tetapi "stale" di Telemetry Channels. Halaman detail sensor (`sensor-chanel-detail.ts:1331-1341`, `evaluateReading`) menandai bacaan historis per periode tanpa gerbang freshness. Itu benar untuk tabel riwayat dan tidak bertentangan, karena detail tidak menampilkan status "saat ini".
- **Keputusan yang disarankan**: hitung "Di luar ambang" (KPI dan tab) **hanya untuk channel Fresh**, sama dengan backend. Nilai Stale yang melewati ambang tetap ditandai di sel, tapi dengan gaya peringatan redup (mis. `text-warning` + "di bawah min 0.5 · nilai lama") dan tidak dihitung. "Di luar ambang" di KPI dibaca sebagai "sekarang", dan nilai berumur 59 menit bukan "sekarang" untuk logger 2 menit.
- **Perbaikan**:
  ```ts
  channelState(sensor, ch): ThresholdState {
    const st = getFreshness(ch.lastValueAt, sensor.node?.telemetryIntervalSec, this.nowMs);
    if (st !== 'fresh') return st === 'stale' ? staleState(...) : 'novalue';
    return thresholdState(ch.lastValue, ch.minThreshold, ch.maxThreshold);
  }
  ```
  Atau tambahkan state `'stale-below' | 'stale-above'`. `isOutOfRange` hanya menghitung `below/above`. Perbarui juga panduan.

### [P2-2] Sort "Last Value" memakai `sensor.lastValue` (channel acak) pada sensor multi-channel
- **File**: `sensors-page.component.ts:254-259`.
- **Bukti**: Tuf-2000 diurutkan sebagai 2187 (volume), padahal sel menampilkan debit 0.06, diameter 188, dan seterusnya. Urutan terlihat acak.
- **Perbaikan**: urutkan berdasarkan `channels[0]?.lastValue` (channel yang ditampilkan pertama). Lebih baik lagi, urutkan dengan channel pertama ber-`metricCode` yang sama dengan mayoritas. Taruh null di bawah seperti sekarang.

### [P2-3] Kartu "Mati / belum pernah kirim" menampilkan jumlah gabungan, tapi klik hanya membuka satu tab
- **File**: `sensors-page.component.html:51,54`.
- **Bug**: angka = `offlineCount + noDataCount`. Klik membuka `offline` saja kalau ada yang offline. Dengan 3 offline + 2 no-data, kartu menulis 5 tapi daftar menampilkan 3. KPI, tab, dan daftar jadi tidak konsisten. Untuk project ini tidak terlihat (0 offline, 1 no-data).
- **Perbaikan**: tambahkan `SensorStatusFilter` `'dead'` (offline ∪ nodata). Di `applyFilters`: `st === 'offline' || st === 'nodata'`. Di `statusCount('dead')`: kembalikan jumlah gabungan. Kartu memanggil `onStatusFilter('dead')`. Tab boleh tetap lima ditambah "Di luar ambang". `'dead'` cukup dipakai dari kartu, sambil menampilkan chip "Mati + belum pernah" di atas tabel.

### [P2-4] Status dan hitungan dihitung pada waktu berbeda (count saat load, badge dan getter saat change detection)
- **File**: `sensors-page.component.ts:191-209` vs `:212-214`, `:476-493`, `:378`.
- **Bug**: `computeStats()` dan `applyFilters()` memakai `Date.now()` saat load. Badge baris, `longestDead`, dan `lowestFresh` memakai `Date.now()` di tiap change detection. Antara refresh (≤ 60 dtk, lebih lama kalau tab sempat tersembunyi), tab "Fresh 11" bisa berisi baris yang badge-nya sudah "Stale". Sort, cari, atau klik tab memanggil ulang `applyFilters` dengan waktu baru sementara angka tab tidak berubah.
- **Performa**: diukur dengan micro-bench Node untuk 300 sensor + 100 baris terlihat ≈ **0.24 ms per siklus CD**. Ini bukan masalah performa. `channelState` dipanggil sekali per channel per CD (hasil `as st` dipakai ulang), `getSensorStatus` sekitar 8 kali per baris, dan dua getter KPI memindai semua sensor. Memoisasi diperlukan untuk konsistensi, bukan kecepatan.
- **Perbaikan**: simpan `private nowMs = Date.now()` di `loadData().next` sebelum `computeStats()`. Teruskan ke `getFreshness(..., this.nowMs)` (fungsinya sudah menerima `now`). Bangun `Map<idSensor, {status, states: ThresholdState[], outOfRange}>` sekali di `computeStats()`. Ubah `longestDead` dan `lowestFresh` dari getter menjadi field yang diisi di `computeStats()`. Template membaca map tersebut, misalnya `vm(sensor).status`.

### [P2-5] Panduan (Panduan / guide) belum diperbarui untuk fitur ambang
- **File**: `src/assets/guides/project-sensors.md:25-45, 87-100`.
- **Bukti**: panduan masih menulis "Empat kartu ringkasan" (sekarang ada 5) dan "Lima tab" (sekarang 6, ada "Di luar ambang"). Tidak ada penjelasan penandaan nilai (panah, "di bawah min …"), tidak ada kolom Excel `Ambang Min/Maks/Status Ambang`, dan tidak ada teks "Channel belum pernah kirim · node terakhir terlihat …". `sources:` belum memuat `shared/utils/threshold.ts`. Skill `page-guide` mewajibkan panduan diperbarui dalam perubahan yang sama.
- **Perbaikan**: tambahkan kartu ke-5, tab ke-6, aturan "ambang hanya dinilai saat data Fresh" (sesudah P2-1), kolom Excel baru, dan `threshold.ts` di `sources`.

### [P2-6] `src/app/shared/utils/` belum di-track git
- **Bukti**: `git status` → `?? src/app/shared/utils/`. Isinya `threshold.ts`, `fetch-all.ts`, `telemetry-freshness.ts`, diimpor oleh 4 file.
- **Dampak**: commit yang hanya membawa file `M` akan merusak build di CI atau di mesin lain.
- **Perbaikan**: `git add src/app/shared/utils/` (dan `src/app/shared/guide/` yang juga untracked) dalam commit yang sama.

### [P3] Kecil
1. `threshold.ts:35` memakai `Math.round(-log10(p))`, sedangkan detail (`sensor-chanel-detail.ts:1381-1393`) memakai `Math.ceil`. Data sekarang hanya 0.01 dan 0.001, jadi hasilnya identik. Tapi langkah 0.05 akan memberi 1 desimal di list dan 2 di detail. Ganti ke `ceil` di util, lalu minta sesi detail memakai util bersama.
2. `lowestFresh`: perbandingan satuan peka huruf besar-kecil (`BAR` vs `bar` di Wonosobo → kartu disembunyikan) dan tidak menyamakan `m3/h`/`m³/h`. Normalkan satuan dulu.
3. Kartu KPI memakai `number:'1.2-2'`. Pakai `decimalsFromPrecision(channel.precision)` agar sama dengan sel.
4. Excel: `Status` memakai label Inggris (`Fresh/Stale`) di tengah header Indonesia. `Keterangan` berisi teks relatif ("… 25 mnt lalu") yang membeku di file, jadi lebih baik tulis absolut ("tidak ada data sejak 13-11-2026 20:40 WIB"). Nama file `sensor-1414bdba-…` tidak terbaca manusia, jadi pakai nama project (`nodes[0]?.project?.name`, sudah disanitasi). Tidak ada baris judul atau keterangan filter dan waktu ekspor, padahal sebutannya "report-page style".
5. `deadSinceText` menulis "Channel belum pernah kirim" untuk level **sensor**. Klaim "belum pernah" hanya berasal dari tabel `sensor_channel_latest` ClickHouse. Untuk `tekanan` sudah terbukti benar lewat PG, tapi secara umum ini **perlu verifikasi**. Kalimat yang lebih aman: "Belum ada data tercatat".
6. `*ngIf="channelState(sensor, ch) as st"` aman karena semua `ThresholdState` adalah string tak-kosong. Tapi ini memakai `ngIf` sebagai `let`. Sesudah P2-4, ganti dengan `vm(sensor).states[i]`.
7. Backend `sensor_service.go:186-192` merakit `meta` sendiri. Rumusnya sama dengan `dto.NewPaginatedResponse` (total 0 → `totalPages 0`). Pertimbangkan memakai helper itu dan menandai flat `total/page/limit` sebagai deprecated. Field `latestAvailable` adalah tambahan di envelope list; dokumentasikan di openapi (sudah diubah) dan di kontrak.
8. `formatInterval(90)` → "tiap 2 mnt" (dibulatkan). Untuk n tidak habis dibagi 60, tampilkan detik.
9. `node` selalu dibangun sebagai objek (`ts:162`), jadi `#noNode` di template tidak pernah tampil. Kosmetik.

## 4. Yang terverifikasi BENAR (jangan diperbaiki ulang)
- **Ambang 0**: `toThresholdNumber` memeriksa `null/undefined/''`, bukan truthiness. `hasThreshold`, `thresholdText`, dan Excel `?? null` mempertahankan 0. Backend mengirim `*float64`, jadi `null` ≠ 0. Ada banyak channel `0–100` di data live.
- **Nilai kosong di Excel** ditulis `null` (sel kosong), bukan 0: `value`, `tmin`, `tmax`, `interval`, `lastAt`. Telepon disimpan sebagai string (nol di depan aman).
- **Geser TZ Excel**: `d.getTime() - d.getTimezoneOffset()*60000` memakai offset **per tanggal**, sama dengan detail page. Benar juga untuk zona ber-DST. Label `WIB/WITA/WIT` diambil dari offset saat ini; Indonesia tanpa DST, jadi tepat. Format `dd-mm-yyyy hh:mm:ss`, nilai `excelNumFmt(decimalsFromPrecision)` (`precision 2` → `0.00`, null/0 → `0.00`).
- **Waktu dari ClickHouse** sudah UTC yang benar: `lastValueAt` 14:03Z vs node `lastSeenAt` 14:03:26Z, diambil 14:05Z.
- **`sensor.channels` null-safe** di semua tempat (`?.`, `|| []`, `*ngFor` menerima null). Backend selalu mengirim `[]`.
- **`*ngIf … as st`** tidak menyembunyikan baris: semua state non-empty.
- **KPI = tab = daftar** untuk Fresh/Stale/Offline/No Data/Di luar ambang (predikat sama, dipanggil berurutan). Live: 2/2/2. Pengecualian: P2-3 dan drift waktu P2-4.
- **`meta.totalPages` int64**: `limit` sudah disanitasi 1..100 sebelum dipakai (tidak mungkin bagi nol). Rumus ceil sama dengan `dto.NewPaginatedResponse`. Tie-breaker `s.id_sensor` membuat paging paralel `fetchAll` deterministik (140 sensor → 140 unik di 2 halaman).
- Scoping tenant: `List` memaksa `filter.OwnerID` untuk role tenant (`sensor_service.go:163`). Filter project berlaku di backend.
- Host dan kredensial ClickHouse sekarang dari config (`clickHouseHTTPConfig`). IP publik lama sudah dihapus dari file ini.
- Tidak ada `Math.random` atau dummy. Semua angka KPI dan teks berasal dari respons API.
- Auto-refresh 60 dtk: dilewati saat tab tersembunyi atau saat `loading`. Saat refresh gagal, data lama tetap ditampilkan. Timer, debounce, dan subscription dibersihkan.

## 5. Rencana perbaikan berurutan
Backend tidak perlu diubah untuk P1/P2. Opsi P3-7 boleh kapan saja.

1. **Frontend, satu PR** (`sensors-page.component.ts/html`):
   - a. P2-4 snapshot `nowMs` + view-model di `computeStats()` (fondasi untuk b, c, d).
   - b. P2-1 `channelState` pakai freshness channel, hitung out-of-range hanya saat Fresh (gaya redup untuk Stale).
   - c. P1-1 `lowestFresh` berbasis channel + normalisasi satuan; P2-2 sort pakai `channels[0]`.
   - d. P1-2 gerbang `latestAvailable` untuk KPI, `deadSinceText`, dan ekspor.
   - e. P2-3 filter `'dead'`.
   - f. P3-1..6 (bisa menyusul).
2. **Paralel dengan 1**: P2-5 panduan `project-sensors.md` (tulis sesudah keputusan P2-1 final). P2-6 `git add src/app/shared/utils/ src/app/shared/guide/`.
3. **Sesudahnya, koordinasi dengan sesi detail**: ganti `decimalsFromPrecision`/`toThreshold` privat di `sensor-chanel-detail.ts` dengan util bersama (setelah util pindah ke `ceil`).
