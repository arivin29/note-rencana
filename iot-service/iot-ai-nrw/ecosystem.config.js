// pm2 config worker AI-NRW — konsisten dengan iot-gtw (satu `pm2 list` untuk semua).
//
// Jalankan dari folder ini: `pm2 start ecosystem.config.js` lalu `pm2 save`.
// script = python VENV (bukan python sistem) supaya dependensi pasti ketemu;
// interpreter 'none' karena script-nya sudah interpreter itu sendiri.
//
// Satu proses = seluruh irama: anomali tiap 5 mnt + forecast cron 02:00 +
// recurrence tiap jam (APScheduler in-proc, cadence dari .env).
module.exports = {
  apps: [
    {
      name: 'ai-nrw-worker',
      cwd: __dirname,
      script: '.venv/bin/python',
      args: '-m ai_nrw.worker',
      interpreter: 'none',
      autorestart: true,
      // target footprint dok 03: ≤ 2 GB; restart sebelum OOM killer yang turun tangan
      max_memory_restart: '1500M',
      kill_timeout: 10000, // beri waktu siklus yang sedang jalan menutup koneksi DB
      out_file: 'logs/worker.out.log',
      error_file: 'logs/worker.err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
