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
  A5_flatline: { title: 'Sinyal mati (datar)', what: 'Nilai tak berubah sama sekali — sensor macet / beku / kabel putus.' },
  A7_nodata: { title: 'Tidak ada data', what: 'Tak ada kiriman data dalam rentang waktu — node offline / jaringan putus.' },
  A8_persistent: { title: 'Masalah berkepanjangan', what: 'Kondisi buruk yang bertahan lama tanpa pulih — dieskalasi jadi prioritas.' },
  A9_deviation: { title: 'Menyimpang dari kebiasaan', what: 'Nilai keluar dari rentang normal channel ini (dipelajari dari pola historis).' },
  A10_drift: { title: 'Pergeseran perlahan', what: 'Nilai menggeser sedikit demi sedikit — indikasi bocor kecil atau sensor melenceng.' },
  forecast: { title: 'Prakiraan (forecast)', what: 'Memproyeksikan nilai beberapa hari ke depan beserta pita perkiraan atas/bawah.' },
  night_pressure: { title: 'Tekanan malam (MNF)', what: 'Memantau tekanan saat pemakaian minimum (dini hari) — indikator kuat kebocoran jaringan.' },
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
  band_pct: {
    label: 'Lebar pita perkiraan minimum',
    help: 'Toleransi ± di sekitar garis prakiraan. Bila tekanan aktual keluar pita ini, itu tanda "di luar dugaan". Makin kecil = makin ketat (banyak peringatan); makin besar = makin longgar. Untuk data stabil, 20% mencegah pita mengempis jadi satu garis.',
    recommended: '20% (± 10%)',
    unit: '%',
    min: 0,
    max: 100,
    step: 5,
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
