#!/usr/bin/env node
/**
 * clickhouse-backfill.js — susulkan baris sensor_logs (Postgres) yang belum sampai
 * ke iot.sensor_telemetry (ClickHouse).
 *
 * Kenapa perlu: gtw menahan baris ClickHouse HANYA di buffer memori. Kalau ClickHouse
 * mati lama, buffer dipangkas (trimBuffer) dan sisanya hilang saat restart. Postgres
 * tetap menyimpan semuanya, jadi lubangnya bisa ditambal dari sana.
 *
 * Aman diulang: baris yang sudah ada di ClickHouse dilewati berdasarkan pg_sensor_log_id.
 *
 * Pemakaian:
 *   node scripts/clickhouse-backfill.js --dry-run
 *   node scripts/clickhouse-backfill.js                       # auto: dari max(event_time) CH sampai sekarang
 *   node scripts/clickhouse-backfill.js --from '2026-09-08 13:34:21' --to '2026-09-10 04:00:00'
 *   node scripts/clickhouse-backfill.js --loop 300            # jaga terus, cek tiap 5 menit
 *
 * Semua waktu dalam UTC (sama seperti yang ditulis gtw ke ClickHouse).
 */

const path = require('path');
const http = require('http');
const https = require('https');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { Client } = require('pg');

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

// ---------- argumen ----------

function parseArgs(argv) {
  const args = {
    from: null,
    to: null,
    chunkMinutes: 30,
    lagSeconds: 300,
    batchSize: 5000,
    dryRun: false,
    loop: 0,
    skipLatest: false,
    quiet: false
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--from': args.from = next(); break;
      case '--to': args.to = next(); break;
      case '--chunk-minutes': args.chunkMinutes = Number(next()); break;
      case '--lag-seconds': args.lagSeconds = Number(next()); break;
      case '--batch-size': args.batchSize = Number(next()); break;
      case '--loop': args.loop = Number(next()); break;
      case '--dry-run': args.dryRun = true; break;
      case '--skip-latest': args.skipLatest = true; break;
      case '--quiet': args.quiet = true; break;
      case '--help':
      case '-h': printHelp(); process.exit(0); break;
      default:
        console.error(`Argumen tidak dikenal: ${a}`);
        printHelp();
        process.exit(2);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
clickhouse-backfill — tambal lubang sensor_telemetry di ClickHouse dari Postgres

  --from <'YYYY-MM-DD HH:MM:SS'>  awal jendela (UTC). Default: max(event_time) di ClickHouse
  --to <'YYYY-MM-DD HH:MM:SS'>    akhir jendela (UTC). Default: sekarang - lag
  --chunk-minutes <n>             besar potongan per iterasi (default 30)
  --lag-seconds <n>               jarak aman dari "sekarang" agar tak balapan dengan
                                  buffer gtw yang belum flush (default 300)
  --batch-size <n>                baris per INSERT (default 5000)
  --loop <detik>                  jalan terus, ulangi tiap N detik (0 = sekali jalan)
  --skip-latest                   jangan segarkan sensor_channel_latest
  --dry-run                       hitung saja, tidak menulis apa pun
  --quiet                         kurangi keluaran per potongan
`);
}

// ---------- util waktu (UTC, tanpa zona — persis yang ditulis gtw) ----------

function toChDateTime(date) {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

function parseUtc(text) {
  const normalized = text.trim().replace(' ', 'T');
  const iso = /(Z|[+-]\d\d:?\d\d)$/.test(normalized) ? normalized : `${normalized}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`Waktu tidak valid: ${text}`);
  return d;
}

// ---------- klien ClickHouse (HTTP, tanpa dependensi) ----------

const CH = {
  host: process.env.CLICKHOUSE_HOST || 'localhost',
  port: Number(process.env.CLICKHOUSE_PORT || 8123),
  database: process.env.CLICKHOUSE_DATABASE || 'iot',
  username: process.env.CLICKHOUSE_USERNAME || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  protocol: (process.env.CLICKHOUSE_PROTOCOL || 'http').toLowerCase()
};

function chRequest(body) {
  const transport = CH.protocol === 'https' ? https : http;
  const auth = Buffer.from(`${CH.username}:${CH.password}`).toString('base64');
  const options = {
    hostname: CH.host,
    port: CH.port,
    path: `/?database=${encodeURIComponent(CH.database)}`,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Length': Buffer.byteLength(body)
    }
  };
  return new Promise((resolve, reject) => {
    const req = transport.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`ClickHouse HTTP ${res.statusCode}: ${data.slice(0, 400)}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------- kueri ----------

const SELECT_ROWS = `
SELECT sl.id_sensor_log,
       to_char(sl.ts AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS.MS') AS event_time,
       n.code                                        AS device_id,
       COALESCE(o.owner_code, '')                    AS owner_code,
       COALESCE(sl.id_owner, p.id_owner)             AS owner_id,
       COALESCE(p.name, '')                          AS project_code,
       COALESCE(sl.id_project, n.id_project)         AS project_id,
       n.id_node                                     AS node_id,
       n.code                                        AS node_code,
       COALESCE(nm.model_name, '')                   AS node_model,
       s.id_sensor                                   AS sensor_id,
       COALESCE(s.label, '')                         AS sensor_label,
       COALESCE(s.id_sensor_catalog::text, '')       AS sensor_catalog,
       sc.id_sensor_channel                          AS channel_id,
       COALESCE(sc.metric_code, '')                  AS metric_code,
       COALESCE(sc.unit, '')                         AS metric_unit,
       COALESCE(sl.value_raw, 0)                     AS raw_value,
       COALESCE(sl.value_engineered, 0)              AS eng_value,
       COALESCE(sl.min_threshold, sc.min_threshold, 0) AS min_threshold,
       COALESCE(sl.max_threshold, sc.max_threshold, 0) AS max_threshold,
       COALESCE(n.firmware_version, '')              AS firmware_version
FROM sensor_logs sl
JOIN sensor_channels sc ON sc.id_sensor_channel = sl.id_sensor_channel
JOIN sensors s          ON s.id_sensor = sc.id_sensor
JOIN nodes n            ON n.id_node = s.id_node
LEFT JOIN node_models nm ON nm.id_node_model = n.id_node_model
LEFT JOIN projects p     ON p.id_project = n.id_project
LEFT JOIN owners o       ON o.id_owner = p.id_owner
WHERE sl.ts >= $1::timestamptz AND sl.ts < $2::timestamptz
ORDER BY sl.ts
`;

/** Baris terbaru per channel dalam jendela — untuk menyegarkan sensor_channel_latest. */
const SELECT_LATEST = `
SELECT DISTINCT ON (sl.id_sensor_channel)
       to_char(sl.ts AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS.MS') AS last_update,
       n.code                                        AS device_id,
       COALESCE(o.owner_code, '')                    AS owner_code,
       COALESCE(sl.id_owner, p.id_owner)             AS owner_id,
       COALESCE(p.name, '')                          AS project_code,
       COALESCE(sl.id_project, n.id_project)         AS project_id,
       n.id_node                                     AS node_id,
       n.code                                        AS node_code,
       COALESCE(nm.model_name, '')                   AS node_model,
       s.id_sensor                                   AS sensor_id,
       COALESCE(s.label, '')                         AS sensor_label,
       COALESCE(s.id_sensor_catalog::text, '')       AS sensor_catalog,
       sc.id_sensor_channel                          AS channel_id,
       COALESCE(sc.metric_code, '')                  AS metric_code,
       COALESCE(sc.unit, '')                         AS metric_unit,
       COALESCE(sl.value_raw, 0)                     AS raw_value,
       COALESCE(sl.value_engineered, 0)              AS eng_value,
       COALESCE(sl.min_threshold, sc.min_threshold, 0) AS min_threshold,
       COALESCE(sl.max_threshold, sc.max_threshold, 0) AS max_threshold
FROM sensor_logs sl
JOIN sensor_channels sc ON sc.id_sensor_channel = sl.id_sensor_channel
JOIN sensors s          ON s.id_sensor = sc.id_sensor
JOIN nodes n            ON n.id_node = s.id_node
LEFT JOIN node_models nm ON nm.id_node_model = n.id_node_model
LEFT JOIN projects p     ON p.id_project = n.id_project
LEFT JOIN owners o       ON o.id_owner = p.id_owner
WHERE sl.ts >= $1::timestamptz AND sl.ts < $2::timestamptz
ORDER BY sl.id_sensor_channel, sl.ts DESC
`;

// ---------- inti ----------

function toTelemetryRow(r) {
  return {
    event_time: r.event_time,
    device_id: r.device_id || '',
    owner_code: r.owner_code || '',
    owner_id: r.owner_id || ZERO_UUID,
    project_code: r.project_code || '',
    project_id: r.project_id || ZERO_UUID,
    node_id: r.node_id,
    node_code: r.node_code || '',
    node_model: r.node_model || '',
    sensor_id: r.sensor_id,
    sensor_label: r.sensor_label || '',
    sensor_catalog: r.sensor_catalog || '',
    channel_id: r.channel_id,
    metric_code: r.metric_code || '',
    metric_unit: r.metric_unit || '',
    raw_value: Number(r.raw_value) || 0,
    eng_value: Number(r.eng_value) || 0,
    signal_quality: 0,               // tak tersimpan di sensor_logs
    firmware_version: r.firmware_version || '',
    iot_log_id: ZERO_UUID,           // penanda: baris hasil backfill
    pg_sensor_log_id: Number(r.id_sensor_log),
    min_threshold: Number(r.min_threshold) || 0,
    max_threshold: Number(r.max_threshold) || 0
  };
}

async function existingIdsInWindow(fromCh, toCh) {
  const sql = `SELECT DISTINCT pg_sensor_log_id FROM iot.sensor_telemetry
               WHERE event_time >= '${fromCh}' AND event_time < '${toCh}'
               FORMAT TSV`;
  const out = await chRequest(sql);
  const ids = new Set();
  for (const line of out.split('\n')) {
    const t = line.trim();
    if (t) ids.add(Number(t));
  }
  return ids;
}

async function insertRows(table, rows, batchSize) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    const body = `INSERT INTO ${table} FORMAT JSONEachRow\n` +
      slice.map((r) => JSON.stringify(r)).join('\n');
    await chRequest(body);
  }
}

async function runOnce(pg, args) {
  const started = Date.now();

  // 1. tentukan jendela
  let from;
  if (args.from) {
    from = parseUtc(args.from);
  } else {
    const maxRaw = (await chRequest('SELECT max(event_time) FROM iot.sensor_telemetry FORMAT TSV')).trim();
    if (!maxRaw || maxRaw.startsWith('1970-01-01') || maxRaw === '\\N') {
      throw new Error('ClickHouse kosong — tentukan --from secara eksplisit.');
    }
    from = parseUtc(maxRaw);
  }
  const to = args.to ? parseUtc(args.to) : new Date(Date.now() - args.lagSeconds * 1000);

  if (to <= from) {
    log(args, `Tidak ada yang perlu disusulkan (from ${toChDateTime(from)} >= to ${toChDateTime(to)}).`);
    return { inserted: 0, skipped: 0, chunks: 0 };
  }

  console.log(`Jendela : ${toChDateTime(from)} → ${toChDateTime(to)} (UTC)` +
              `${args.dryRun ? '  [DRY-RUN]' : ''}`);

  // 2. proses per potongan
  const chunkMs = args.chunkMinutes * 60 * 1000;
  let inserted = 0;
  let skipped = 0;
  let chunks = 0;
  const touched = [];

  for (let start = from.getTime(); start < to.getTime(); start += chunkMs) {
    const chunkFrom = new Date(start);
    const chunkTo = new Date(Math.min(start + chunkMs, to.getTime()));
    const fromCh = toChDateTime(chunkFrom);
    const toCh = toChDateTime(chunkTo);
    chunks++;

    const { rows } = await pg.query(SELECT_ROWS, [chunkFrom.toISOString(), chunkTo.toISOString()]);
    if (rows.length === 0) {
      log(args, `  ${fromCh} .. ${toCh}  Postgres kosong`);
      continue;
    }

    const existing = await existingIdsInWindow(fromCh, toCh);
    const missing = rows.filter((r) => !existing.has(Number(r.id_sensor_log)));
    skipped += rows.length - missing.length;

    if (missing.length === 0) {
      log(args, `  ${fromCh} .. ${toCh}  ${rows.length} baris, semua sudah ada`);
      continue;
    }

    if (!args.dryRun) {
      await insertRows('iot.sensor_telemetry', missing.map(toTelemetryRow), args.batchSize);
      touched.push([chunkFrom, chunkTo]);
    }
    inserted += missing.length;
    console.log(`  ${fromCh} .. ${toCh}  +${missing.length} baris` +
                `${rows.length - missing.length ? ` (lewati ${rows.length - missing.length} yang sudah ada)` : ''}` +
                `${args.dryRun ? ' [dry-run]' : ''}`);
  }

  // 3. segarkan sensor_channel_latest (ReplacingMergeTree — versi terbaru menang)
  if (!args.dryRun && !args.skipLatest && touched.length) {
    const latestFrom = touched[0][0];
    const latestTo = touched[touched.length - 1][1];
    const { rows } = await pg.query(SELECT_LATEST, [latestFrom.toISOString(), latestTo.toISOString()]);
    if (rows.length) {
      await insertRows('iot.sensor_channel_latest', rows.map((r) => ({
        channel_id: r.channel_id,
        last_update: r.last_update,
        device_id: r.device_id || '',
        owner_code: r.owner_code || '',
        owner_id: r.owner_id || ZERO_UUID,
        project_code: r.project_code || '',
        project_id: r.project_id || ZERO_UUID,
        node_id: r.node_id,
        node_code: r.node_code || '',
        node_model: r.node_model || '',
        sensor_id: r.sensor_id,
        sensor_label: r.sensor_label || '',
        sensor_catalog: r.sensor_catalog || '',
        metric_code: r.metric_code || '',
        metric_unit: r.metric_unit || '',
        raw_value: Number(r.raw_value) || 0,
        eng_value: Number(r.eng_value) || 0,
        signal_quality: 0,
        last_iot_log_id: ZERO_UUID,
        min_threshold: Number(r.min_threshold) || 0,
        max_threshold: Number(r.max_threshold) || 0
      })), args.batchSize);
      console.log(`  sensor_channel_latest disegarkan: ${rows.length} channel`);
    }
  }

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Selesai : +${inserted} baris, ${skipped} dilewati, ${chunks} potongan, ${secs}s`);
  return { inserted, skipped, chunks };
}

function log(args, msg) {
  if (!args.quiet) console.log(msg);
}

async function main() {
  const args = parseArgs(process.argv);

  // nama variabel mengikuti .env gtw (DB_NAME); DB_DATABASE dipakai iot-backend-go
  const database = process.env.DB_NAME || process.env.DB_DATABASE;
  const pg = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
  await pg.connect();
  console.log(`Postgres  : ${process.env.DB_USERNAME}@${process.env.DB_HOST}:${process.env.DB_PORT}/${database}`);
  console.log(`ClickHouse: ${CH.username}@${CH.host}:${CH.port}/${CH.database}`);

  let stop = false;
  const shutdown = () => { stop = true; };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    if (args.loop > 0) {
      console.log(`Mode jaga : ulang tiap ${args.loop} detik (Ctrl-C untuk berhenti)\n`);
      while (!stop) {
        try {
          await runOnce(pg, args);
        } catch (err) {
          console.error(`Gagal pada siklus ini: ${err.message}`);
        }
        if (stop) break;
        await new Promise((r) => setTimeout(r, args.loop * 1000));
      }
    } else {
      await runOnce(pg, args);
    }
  } finally {
    await pg.end();
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  if (/TOO_MANY_PARTS/i.test(err.message)) {
    console.error(`
ClickHouse menolak INSERT karena part terlalu banyak — merge tertinggal jauh di
belakang insert. Backfill (dan gtw) tak bisa menulis sampai ini beres. Jalankan
sebagai user admin ClickHouse di server:

  SELECT count() FROM system.parts WHERE table='sensor_telemetry' AND active;
  SELECT * FROM system.merges;
  SELECT * FROM system.errors ORDER BY last_error_time DESC LIMIT 10;
  SYSTEM START MERGES iot.sensor_telemetry;          -- kalau merge pernah di-stop
  OPTIMIZE TABLE iot.sensor_telemetry PARTITION ID '<YYYYMM>';

Cek juga sisa disk server (df -h) — merge berhenti kalau disk penuh.`);
  }
  process.exit(1);
});
