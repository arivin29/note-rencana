import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { OwnerForwardingMqtt } from '../../entities/existing';

/**
 * Kelola koneksi MQTT keluar ke broker PDAM — SATU client per config (bulkhead).
 * Semua kelemahan yang bikin promes crash sudah dijaga:
 *  - .on('error') WAJIB tiap client (MQTT emit error tanpa listener → Node crash).
 *  - timeout connect & publish (socket hang tak nyandera worker).
 *  - reconnect (mqtt.js reconnectPeriod di-cap 30s, tidak berhenti — PDAM bisa pulih).
 *  - circuit breaker: N gagal beruntun → buka circuit, skip sementara, probe berkala.
 * Broker satu PDAM bermasalah TIDAK menular ke PDAM lain (state per-config).
 * Ref spec §8.
 */

const CONNECT_TIMEOUT_MS = 8000;
const PUBLISH_TIMEOUT_MS = 5000;
const RECONNECT_PERIOD_MS = 30000; // cap; mqtt.js reconnect terus tiap 30s
const CIRCUIT_FAIL_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 60000;

interface ConnState {
  client: mqtt.MqttClient | null;
  connecting: Promise<boolean> | null;
  consecutiveFailures: number;
  circuitOpenUntil: number; // epoch ms; 0 = tertutup
}

export interface BrokerCreds {
  brokerUrl: string;
  username?: string;
  password?: string; // sudah didekripsi oleh worker
  tlsInsecure?: boolean;
}

@Injectable()
export class MqttPublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(MqttPublisherService.name);
  private readonly states = new Map<string, ConnState>();

  private stateOf(configId: string): ConnState {
    let s = this.states.get(configId);
    if (!s) {
      s = { client: null, connecting: null, consecutiveFailures: 0, circuitOpenUntil: 0 };
      this.states.set(configId, s);
    }
    return s;
  }

  isCircuitOpen(configId: string): boolean {
    const s = this.states.get(configId);
    if (!s || !s.circuitOpenUntil) return false;
    if (Date.now() >= s.circuitOpenUntil) {
      // cooldown lewat → izinkan probe ulang
      s.circuitOpenUntil = 0;
      s.consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  /**
   * Pastikan koneksi siap. Return true kalau connected & siap publish.
   * Dipanggil saat config aktif (bukan nunggu data) supaya error koneksi cepat tercatat.
   */
  async ensureConnected(config: OwnerForwardingMqtt, creds: BrokerCreds): Promise<boolean> {
    if (this.isCircuitOpen(config.idOwnerForwardingMqtt)) return false;

    const s = this.stateOf(config.idOwnerForwardingMqtt);
    if (s.client && s.client.connected) return true;
    if (s.connecting) return s.connecting;

    s.connecting = this.doConnect(config, creds).finally(() => {
      s.connecting = null;
    });
    return s.connecting;
  }

  private doConnect(config: OwnerForwardingMqtt, creds: BrokerCreds): Promise<boolean> {
    const configId = config.idOwnerForwardingMqtt;
    const s = this.stateOf(configId);

    // tutup client lama bila ada
    if (s.client) {
      try { s.client.end(true); } catch { /* ignore */ }
      s.client = null;
    }

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

      let client: mqtt.MqttClient;
      try {
        client = mqtt.connect(creds.brokerUrl, {
          username: creds.username || undefined,
          password: creds.password || undefined,
          reconnectPeriod: RECONNECT_PERIOD_MS,
          connectTimeout: CONNECT_TIMEOUT_MS,
          clientId: `iot-broadcast-${configId.slice(0, 8)}-${process.pid}`,
          rejectUnauthorized: !creds.tlsInsecure,
          clean: true,
        });
      } catch (err: any) {
        this.recordFailure(config, `connect throw: ${err?.message}`);
        finish(false);
        return;
      }

      s.client = client;

      // WAJIB: tanpa handler ini, error MQTT bikin Node crash.
      client.on('error', (err) => {
        this.logger.warn(`[${config.label}] MQTT error: ${err?.message}`);
        this.recordFailure(config, err?.message);
      });
      client.on('offline', () => this.logger.debug(`[${config.label}] offline`));
      client.on('close', () => this.logger.debug(`[${config.label}] close`));
      client.on('connect', () => {
        this.logger.log(`✅ [${config.label}] connected ke broker PDAM`);
        s.consecutiveFailures = 0;
        s.circuitOpenUntil = 0;
        finish(true);
      });

      // timeout guard connect
      setTimeout(() => {
        if (!settled) {
          this.recordFailure(config, 'connect timeout');
          finish(false);
        }
      }, CONNECT_TIMEOUT_MS + 500);
    });
  }

  /** Publish satu pesan; return true kalau sukses. */
  async publish(
    config: OwnerForwardingMqtt,
    topic: string,
    payload: object,
  ): Promise<boolean> {
    const s = this.states.get(config.idOwnerForwardingMqtt);
    if (!s?.client || !s.client.connected) return false;

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (ok: boolean, err?: string) => {
        if (settled) return;
        settled = true;
        if (ok) {
          s.consecutiveFailures = 0;
        } else {
          this.recordFailure(config, err);
        }
        resolve(ok);
      };

      const timer = setTimeout(() => done(false, 'publish timeout'), PUBLISH_TIMEOUT_MS);

      try {
        s.client!.publish(
          topic,
          JSON.stringify(payload),
          { qos: (config.qos ?? 1) as 0 | 1 | 2, retain: config.retained ?? true },
          (err) => {
            clearTimeout(timer);
            done(!err, err?.message);
          },
        );
      } catch (err: any) {
        clearTimeout(timer);
        done(false, err?.message);
      }
    });
  }

  private recordFailure(config: OwnerForwardingMqtt, _msg?: string): void {
    const s = this.stateOf(config.idOwnerForwardingMqtt);
    s.consecutiveFailures += 1;
    if (s.consecutiveFailures >= CIRCUIT_FAIL_THRESHOLD && !s.circuitOpenUntil) {
      s.circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
      this.logger.warn(
        `⚡ [${config.label}] circuit OPEN (${s.consecutiveFailures} gagal beruntun) — cooldown ${CIRCUIT_COOLDOWN_MS / 1000}s`,
      );
      // lepas koneksi biar tak boros socket
      if (s.client) {
        try { s.client.end(true); } catch { /* ignore */ }
        s.client = null;
      }
    }
  }

  /** Tutup & lupakan koneksi (config dinonaktifkan / dihapus). */
  disconnect(configId: string): void {
    const s = this.states.get(configId);
    if (s?.client) {
      try { s.client.end(true); } catch { /* ignore */ }
    }
    this.states.delete(configId);
  }

  /** Tutup koneksi yang tidak lagi ada di daftar aktif. */
  reconcile(activeConfigIds: Set<string>): void {
    for (const id of Array.from(this.states.keys())) {
      if (!activeConfigIds.has(id)) this.disconnect(id);
    }
  }

  onModuleDestroy(): void {
    for (const id of Array.from(this.states.keys())) this.disconnect(id);
  }
}
