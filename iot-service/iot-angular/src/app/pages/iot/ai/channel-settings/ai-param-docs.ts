/**
 * Kamus penjelasan detektor & parameter AI-NRW — mengubah "kode mentah"
 * (delta, eps_flat, k…) jadi bahasa yang dimengerti operator PDAM: apa gunanya,
 * efeknya ke mana bila diubah, dan berapa nilai yang disarankan.
 *
 * Dipakai channel-settings untuk merender label ramah + teks bantuan + saran nilai.
 * Lookup param: coba spesifik `"<detektor>.<key>"` dulu, lalu fallback ke `"<key>"`.
 */

export interface DetectorDoc {
  /** Nama manusiawi, mis. "Tekanan terlalu rendah". */
  title: string;
  /** Satu kalimat: apa yang dideteksi. */
  what: string;
}

export interface ParamDoc {
  /** Label ramah pengganti nama teknis. */
  label: string;
  /** Penjelasan: fungsi + arah efek bila dinaikkan/diturunkan. */
  help: string;
  /** Nilai yang disarankan (teks bebas). */
  recommended?: string;
  /** Satuan tampil di kanan input (mis. "menit", "%", "jam"). */
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}

export const DETECTOR_DOCS: Record<string, DetectorDoc> = {
  A1_invalid: { title: 'Nilai tidak wajar', what: 'Menandai pembacaan mustahil, mis. tekanan negatif atau di luar batas fisik sensor.' },
  A2_low: { title: 'Terlalu rendah', what: 'Memperingatkan bila nilai di bawah batas minimum layanan cukup lama.' },
  A3_high: { title: 'Terlalu tinggi', what: 'Memperingatkan bila nilai di atas batas maksimum layanan cukup lama.' },
  A4_spike: { title: 'Lonjakan mendadak', what: 'Nilai melompat atau terjun dalam satu langkah — water hammer, hentakan valve, atau pipa pecah.' },
  A5_flatline: { title: 'Sinyal mati (datar)', what: 'Nilai tak berubah sama sekali — sensor macet / beku / kabel putus.' },
  A6_noise: { title: 'Sinyal bergetar', what: 'Pembacaan jadi jauh lebih goyang dari biasanya — kabel/transmitter bermasalah atau aliran tak stabil.' },
  A7_nodata: { title: 'Tidak ada data', what: 'Tak ada kiriman data dalam rentang waktu — node offline / jaringan putus.' },
  A8_persistent: { title: 'Masalah berkepanjangan', what: 'Kondisi buruk yang bertahan lama tanpa pulih — dieskalasi jadi prioritas.' },
  A9_deviation: { title: 'Menyimpang dari kebiasaan', what: 'Nilai keluar dari rentang normal channel ini (dipelajari dari pola historis).' },
  A10_drift: { title: 'Pergeseran perlahan', what: 'Nilai menggeser sedikit demi sedikit — indikasi bocor kecil atau sensor melenceng.' },
  forecast: { title: 'Prakiraan (forecast)', what: 'Memproyeksikan nilai beberapa hari ke depan beserta pita perkiraan atas/bawah, dan memberi peringatan dini bila garisnya diprakirakan melewati batas layanan.' },
  forecast_breach: { title: 'Peringatan dini lewat-ambang', what: 'Prakiraan menunjukkan nilai akan melewati batas layanan dalam beberapa jam ke depan — kesempatan bertindak sebelum terjadi.' },
  night_pressure: { title: 'Tekanan malam (MNF)', what: 'Memantau tekanan saat pemakaian minimum (dini hari) — indikator kuat kebocoran jaringan.' },
  active_schedule: { title: 'Jam operasi & hari libur', what: 'Di luar jam aktif (mis. pompa mati dini hari), alarm nilai nol/datar dibungkam. Saat hari libur, detektor pembanding-kebiasaan dikendurkan karena pola pemakaian memang berbeda.' },
};

export const PARAM_DOCS: Record<string, ParamDoc> = {
  // A1
  allow_negative: {
    label: 'Izinkan nilai negatif',
    help: 'Jika NONAKTIF, nilai di bawah 0 dianggap tidak wajar dan memicu peringatan. Untuk tekanan/aliran air biarkan nonaktif.',
    recommended: 'Nonaktif',
  },
  // A2 / A3
  sustain_T: {
    label: 'Durasi bertahan sebelum alarm',
    help: 'Kondisi harus terus terjadi selama ini dulu, baru jadi event. Makin besar = alarm palsu makin sedikit, tapi respons lebih telat.',
    recommended: '10–15 menit',
    unit: 'mnt',
  },
  // A4
  'A4_spike.k': {
    label: 'Sensitivitas lonjakan',
    help: 'Berapa kali lipat dari lompatan biasanya sebelum dianggap mendadak. Ambangnya dihitung otomatis dari kebiasaan channel ini, jadi tak perlu tahu satuan sensornya. Makin kecil (4) = makin sensitif; makin besar (8) = hanya lonjakan besar.',
    recommended: '6 (debit: 4)',
    min: 2,
    max: 12,
    step: 0.5,
  },
  spike_limit: {
    label: 'Batas lonjakan tetap',
    help: 'Isi hanya bila ingin memaksa ambang absolut (mis. 1.5 bar per pembacaan). Kosongkan agar ambang dihitung otomatis dari kebiasaan channel — pilihan yang disarankan.',
    recommended: 'kosongkan (otomatis)',
  },
  direction: {
    label: 'Arah yang dipantau',
    help: 'both = naik & turun (disarankan). up = hanya lonjakan naik. down = hanya terjunan, mis. bila hanya peduli pipa pecah.',
    recommended: 'both',
  },
  max_gap: {
    label: 'Jeda data maksimum',
    help: 'Dua pembacaan yang terpisah lebih lama dari ini tidak dibandingkan. Mencegah data yang hilang saat node offline terbaca sebagai lonjakan palsu saat node kembali online.',
    recommended: '15 menit',
    unit: 'mnt',
  },
  'A4_spike.min_points': {
    label: 'Minimum riwayat untuk menilai',
    help: 'Perlu sekian langkah sebelumnya untuk mengukur "lompatan biasanya" channel ini. Di bawah itu detektor diam daripada menebak.',
    recommended: '10',
  },
  // A5
  eps_flat: {
    label: 'Ambang "dianggap datar"',
    help: 'Selisih maksimum antar-pembacaan agar masih dihitung "tidak berubah". Makin kecil = makin ketat menuduh sinyal mati.',
    recommended: '0.01',
  },
  n: {
    label: 'Jumlah pembacaan datar beruntun',
    help: 'Berapa pembacaan datar berturut-turut sebelum dianggap sinyal mati. Makin besar = lebih yakin, tapi lebih lambat.',
    recommended: '10',
  },
  // A6
  factor: {
    label: 'Kelipatan getaran vs biasanya',
    help: 'Berapa kali lipat lebih goyang dari periode sebelumnya sebelum diperingatkan. 3 = tiga kali lipat. Makin kecil = makin sensitif terhadap sensor yang mulai rusak, tapi lebih berisik.',
    recommended: '3',
    min: 1.5,
    max: 10,
    step: 0.5,
  },
  short_window: {
    label: 'Jendela "belakangan ini"',
    help: 'Periode terakhir yang dinilai getarannya, dibandingkan dengan data sebelum itu. Makin pendek = makin cepat menangkap gangguan baru, tapi lebih mudah terkecoh data tipis.',
    recommended: '30 menit',
    unit: 'mnt',
  },
  'A6_noise.min_points': {
    label: 'Minimum data tiap sisi',
    help: 'Jumlah pembacaan minimum di jendela terakhir DAN di periode pembanding. Mencegah rasio ekstrem dari segelintir titik.',
    recommended: '8',
  },
  // A7
  no_data_timeout: {
    label: 'Batas waktu tanpa data',
    help: 'Jika tak ada data selama ini, node dianggap offline. Sesuaikan interval kirim node — mis. node kirim tiap 5 mnt → set 10–15 mnt.',
    recommended: '2–3× interval kirim node',
    unit: 'mnt',
  },
  // A8
  persist_window: {
    label: 'Jendela "berkepanjangan"',
    help: 'Kondisi buruk yang bertahan melebihi durasi ini dinaikkan jadi masalah persisten (prioritas tinggi).',
    recommended: '4 jam',
    unit: 'jam',
  },
  // A9
  k: {
    label: 'Sensitivitas simpangan (k)',
    help: 'Berapa "lebar normal" toleransi sebelum dianggap menyimpang. Makin kecil (2) = makin sensitif / banyak alarm; makin besar (4) = makin longgar. 3 = seimbang.',
    recommended: '3',
    min: 1,
    max: 6,
    step: 0.5,
  },
  min_points: {
    label: 'Minimum data untuk menilai',
    help: 'Perlu minimal sekian titik pada slot waktu itu sebelum berani menilai menyimpang — mencegah alarm dari data tipis.',
    recommended: '3',
  },
  // A10
  delta: {
    label: 'Besar pergeseran terkecil',
    help: 'Pergeseran per-langkah yang mulai dihitung sebagai "menggeser". Makin kecil = menangkap geseran lebih halus (tapi bisa berisik).',
    recommended: '0.5',
  },
  lambda: {
    label: 'Ambang akumulasi geseran',
    help: 'Total geseran yang harus menumpuk sebelum alarm. Makin besar = perlu geseran lebih lama/besar dulu baru bunyi.',
    recommended: '5',
  },
  min_instances: {
    label: 'Minimum data sebelum menilai',
    help: 'Perlu sekian pembacaan dulu supaya perhitungan geseran stabil dan tidak salah alarm di awal.',
    recommended: '30',
  },
  // forecast
  horizon_days: {
    label: 'Prakiraan berapa hari ke depan',
    help: 'Panjang proyeksi. 7 = seminggu. Makin jauh makin tidak pasti.',
    recommended: '7 hari',
    unit: 'hari',
    min: 1,
    max: 30,
  },
  step_min: {
    label: 'Kerapatan titik prakiraan',
    help: 'Jarak antar-titik pada garis prakiraan. 10 menit menampilkan bentuk harian (puncak pagi, lembah dini hari). Makin besar makin halus/rata dan makin ringan grafiknya. Tak bisa lebih rapat dari slot baseline (10 menit) — nilai lebih kecil otomatis dinaikkan ke 10.',
    recommended: '10 menit',
    unit: 'menit',
    min: 10,
    max: 1440,
    step: 10,
  },
  early_warning: {
    label: 'Peringatan dini lewat-ambang',
    help: 'Jika AKTIF, prakiraan yang memotong batas layanan channel memunculkan event "peringatan dini" di inbox — sebelum pelanggaran benar-benar terjadi.',
    recommended: 'Aktif',
  },
  lead_max: {
    label: 'Jangkauan peringatan',
    help: 'Hanya pelanggaran yang diprakirakan terjadi dalam rentang ini yang diperingatkan. Terlalu jauh ke depan = prakiraan makin tidak pasti, peringatannya jadi berisik.',
    recommended: '48 jam',
    unit: 'jam',
  },
  lead_critical: {
    label: 'Ambang "mendesak"',
    help: 'Bila pelanggaran diprakirakan terjadi lebih cepat dari ini, event naik ke tingkat critical.',
    recommended: '6 jam',
    unit: 'jam',
  },
  min_breach_points: {
    label: 'Titik pelanggaran beruntun',
    help: 'Butuh sekian titik prakiraan berturut-turut melewati ambang sebelum diperingatkan. Mencegah satu titik nyelonong di ekor prakiraan membangunkan orang.',
    recommended: '2 (= 20 menit)',
    min: 1,
    max: 12,
  },
  band_pct: {
    label: 'Lebar pita perkiraan minimum',
    help: 'Toleransi ± di sekitar garis prakiraan. Bila tekanan aktual keluar pita ini, itu tanda "di luar dugaan". Makin kecil = makin ketat (banyak peringatan); makin besar = makin longgar. Untuk data stabil, 20% mencegah pita mengempis jadi satu garis.',
    recommended: '20% (± 10%)',
    unit: '%',
    min: 0,
    max: 100,
    step: 5,
  },
  // active_schedule
  windows: {
    label: 'Jam aktif channel',
    help: 'Rentang jam saat jaringan beroperasi normal, format "HH:MM-HH:MM" (pisahkan koma bila lebih dari satu). Contoh jaringan nyala 20 jam: 04:00-24:00. Boleh lintas tengah malam (22:00-06:00). Kosongkan atau 00:00-24:00 = channel 24 jam.',
    recommended: '00:00-24:00 (24 jam)',
  },
  tz: {
    label: 'Zona waktu',
    help: 'Zona waktu untuk membaca jam aktif dan tanggal libur. Asia/Jakarta = WIB, Asia/Makassar = WITA, Asia/Jayapura = WIT.',
    recommended: 'Asia/Jakarta',
  },
  holidays: {
    label: 'Kalender libur',
    help: 'Daftar tanggal (pisahkan koma). "2026-03-31" = tanggal persis; "12-25" = berulang tiap tahun. Pada hari ini pola pemakaian dianggap wajar berbeda — detektor pembanding-kebiasaan dikendurkan supaya Idul Fitri/tahun baru tidak jadi banjir alarm palsu.',
    recommended: 'isi hari besar setempat',
  },
  suppress_off: {
    label: 'Alarm yang dibungkam saat jam mati',
    help: 'Daftar kode detektor yang dibungkam di luar jam aktif. Bawaan: A1_invalid, A2_low, A5_flatline (nilai nol/datar normal saat pompa mati). Tambahkan A7_nodata bila node ikut dimatikan malam hari.',
    recommended: 'biarkan bawaan',
  },
  relax_holiday: {
    label: 'Detektor yang dikendurkan saat libur',
    help: 'Daftar kode yang dibungkam pada hari libur. Bawaan: A6_noise, A9_deviation, A10_drift, night_pressure — semua yang membandingkan ke kebiasaan. Batas layanan (A2/A3/A8) tetap berjalan.',
    recommended: 'biarkan bawaan',
  },
  // night_pressure
  agg: {
    label: 'Cara hitung nilai malam',
    help: 'median = tahan pencilan/outlier (disarankan). mean = rata-rata biasa, lebih mudah terganggu lonjakan.',
    recommended: 'median',
  },
  drop_frac: {
    label: 'Ambang penurunan malam',
    help: 'Seberapa jauh tekanan malam turun dibanding kebiasaan sebelum diperingatkan. 0.15 = turun 15%.',
    recommended: '0.10–0.15',
  },
  night_start: {
    label: 'Mulai jendela malam',
    help: 'Awal jam pemakaian minimum (dini hari) untuk mengukur MNF. Umumnya tengah malam.',
    recommended: '00:00',
  },
  night_end: {
    label: 'Akhir jendela malam',
    help: 'Akhir jam pemakaian minimum. Umumnya menjelang subuh.',
    recommended: '04:00',
  },
};

/** Ambil doc detektor; fallback judul = kode mentah. */
export function detectorDoc(analysisType: string): DetectorDoc {
  return DETECTOR_DOCS[analysisType] || { title: analysisType, what: '' };
}

/** Ambil doc param: coba "<detektor>.<key>" dulu, lalu "<key>". */
export function paramDoc(analysisType: string, key: string): ParamDoc | null {
  return PARAM_DOCS[`${analysisType}.${key}`] || PARAM_DOCS[key] || null;
}
