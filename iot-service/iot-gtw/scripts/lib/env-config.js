/**
 * Satu-satunya sumber konfigurasi untuk skrip bantu / debug di repo ini.
 *
 * JANGAN menulis host, port, atau kata sandi langsung di dalam skrip.
 * Alasannya dua:
 *   1. Akses DB/MQTT/ClickHouse Helios WAJIB lewat tailnet (10-0-15-66-via-4,
 *      10-0-15-67-via-4). Host publik lama 109.105.194.174 sudah pensiun, dan
 *      skrip yang menyimpan host itu diam-diam menembak jalur yang salah.
 *   2. Kata sandi yang ditulis di berkas .js/.sh ikut ter-commit ke git dan
 *      tidak bisa dicabut lagi dari riwayat. `.env` sudah di-gitignore.
 *
 * Semua nilai dibaca dari `.env` di akar repo — berkas yang sama yang dipakai
 * aplikasi NestJS-nya, jadi skrip dan aplikasi tidak pernah berbeda tujuan.
 */

const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

/** Ambil variabel wajib; berhenti dengan pesan jelas kalau belum diisi. */
function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(
      `\n❌ ${name} belum diisi di .env (${path.resolve(__dirname, '..', '..', '.env')}).\n` +
        `   Skrip ini sengaja tidak punya nilai cadangan supaya tidak ada kredensial\n` +
        `   yang tertinggal di dalam kode.\n`
    );
    process.exit(1);
  }
  return value;
}

const dbHost = () => required('DB_HOST');
const dbPort = () => Number(process.env.DB_PORT || 5432);
const dbName = () => process.env.DB_NAME || 'iot';
const dbUser = () => required('DB_USERNAME');
const dbPassword = () => required('DB_PASSWORD');

/** Konfigurasi untuk `new Client()` dari paket `pg`. */
function pgConfig(overrides = {}) {
  return {
    host: dbHost(),
    port: dbPort(),
    database: dbName(),
    user: dbUser(),
    password: dbPassword(),
    ...overrides,
  };
}

/** Konfigurasi untuk `new DataSource()` dari TypeORM. */
function typeormConfig(overrides = {}) {
  return {
    type: 'postgres',
    host: dbHost(),
    port: dbPort(),
    username: dbUser(),
    password: dbPassword(),
    database: dbName(),
    ...overrides,
  };
}

/** URL broker MQTT, mis. mqtt://10-0-15-66-via-4:1883 */
function mqttBrokerUrl() {
  return required('MQTT_BROKER_URL');
}

/** Topik default yang didengarkan aplikasi. */
function mqttTopic(fallback = 'sensor') {
  return process.env.MQTT_TOPIC || fallback;
}

/** Endpoint HTTP ClickHouse + kredensialnya. */
function clickhouseHttp() {
  const host = required('CLICKHOUSE_HOST');
  const port = process.env.CLICKHOUSE_PORT || '8123';
  const database = process.env.CLICKHOUSE_DATABASE || 'iot';
  return {
    url: `http://${host}:${port}/?database=${database}`,
    user: process.env.CLICKHOUSE_USERNAME || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
  };
}

/** Ringkasan tujuan koneksi untuk dicetak — tanpa kata sandi. */
function describeTarget() {
  return `${dbUser()}@${dbHost()}:${dbPort()}/${dbName()}`;
}

module.exports = {
  pgConfig,
  typeormConfig,
  mqttBrokerUrl,
  mqttTopic,
  clickhouseHttp,
  describeTarget,
};
