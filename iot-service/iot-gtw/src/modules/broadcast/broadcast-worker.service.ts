import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OwnerForwardingMqtt, OwnerForwardingMqttLog } from '../../entities/existing';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { decrypt } from '../../common/crypto/aes-gcm.util';
import { MqttPublisherService } from './mqtt-publisher.service';
import {
  ChannelLatestRow,
  activeCategories,
  buildPayload,
  buildTopic,
} from './topic.util';

/**
 * Eksekutor: untuk satu config PDAM → connect → baca sensor_channel_latest →
 * filter watermark (anti re-publish) → publish retained → update watermark + log.
 * Ref spec §9.2, §8-i.
 */
@Injectable()
export class BroadcastWorkerService {
  private readonly logger = new Logger(BroadcastWorkerService.name);

  constructor(
    @InjectRepository(OwnerForwardingMqtt)
    private readonly configRepo: Repository<OwnerForwardingMqtt>,
    @InjectRepository(OwnerForwardingMqttLog)
    private readonly logRepo: Repository<OwnerForwardingMqttLog>,
    private readonly clickhouse: ClickhouseService,
    private readonly publisher: MqttPublisherService,
  ) {}

  async processConfig(config: OwnerForwardingMqtt): Promise<void> {
    const startedAt = Date.now();

    if (!config.ownerCode) {
      await this.markStatus(config, 'skipped', 'owner_code kosong');
      return;
    }

    // 1. Dekripsi kredensial
    let password: string | undefined;
    try {
      password = config.passwordCipher ? decrypt(config.passwordCipher) : undefined;
    } catch (err: any) {
      await this.finishWithError(config, startedAt, 'decrypt_error', `Dekripsi password gagal: ${err?.message}`);
      return;
    }

    // 2. Pastikan koneksi (connect saat aktif, bukan nunggu data → error cepat tercatat)
    const connected = await this.publisher.ensureConnected(config, {
      brokerUrl: config.brokerUrl,
      username: config.username,
      password,
      tlsInsecure: config.tlsInsecure,
    });
    if (!connected) {
      await this.finishWithError(config, startedAt, 'connect_error', config.lastError || 'Tidak bisa connect ke broker');
      return;
    }

    // 3. Ambil channel-latest owner ini
    let rows: ChannelLatestRow[];
    try {
      rows = await this.fetchChannelLatest(config.ownerCode);
    } catch (err: any) {
      await this.finishWithError(config, startedAt, 'query_error', `Query ClickHouse gagal: ${err?.message}`);
      return;
    }

    // 4. Watermark — hanya baris last_update > last_watermark (anti re-publish)
    const wm = config.lastWatermark ? new Date(config.lastWatermark).getTime() : 0;
    const fresh = rows.filter((r) => r.last_update && new Date(r.last_update).getTime() > wm);

    if (fresh.length === 0) {
      // konek OK tapi tak ada data baru — update status ringan, jangan spam log
      await this.markStatus(config, 'connected', null);
      return;
    }

    // 5. Publish per baris per kategori aktif (Fase 1: hanya 'telemetry')
    const cats = activeCategories(config).filter((c) => c === 'telemetry');
    let published = 0;
    let maxTs = wm;
    const sentTopics: string[] = [];

    for (const row of fresh) {
      let rowOk = false;
      for (const cat of cats) {
        const topic = buildTopic(config.topicTemplate, row, cat);
        const payload = buildPayload(row, cat);
        const ok = await this.publisher.publish(config, topic, payload);
        if (ok) {
          published += 1;
          rowOk = true;
          sentTopics.push(topic);
          // Log tiap topik (level debug) — nyalakan LOG_LEVEL=debug untuk lihat detail.
          this.logger.debug(`  → ${topic}  = ${(payload as any).value} ${(payload as any).unit}`);
        }
      }
      if (rowOk) {
        const ts = new Date(row.last_update).getTime();
        if (ts > maxTs) maxTs = ts;
      }
    }

    const duration = Date.now() - startedAt;

    if (published === 0) {
      await this.finishWithError(config, startedAt, 'publish_error', config.lastError || 'Semua publish gagal');
      return;
    }

    // 6. Majukan watermark (hanya baris tersukses) + status + log
    await this.configRepo.update(config.idOwnerForwardingMqtt, {
      lastWatermark: new Date(maxTs),
      lastStatus: 'sent',
      lastSuccessAt: new Date(),
      lastError: null,
      totalPublished: (BigInt(config.totalPublished || '0') + BigInt(published)).toString(),
    });

    await this.writeLog(config, 'success', published, null, duration);
    const preview = sentTopics.slice(0, 5).join(', ');
    const more = sentTopics.length > 5 ? ` … +${sentTopics.length - 5}` : '';
    this.logger.log(`📡 [${config.label}] publish ${published} pesan (${duration}ms) → ${preview}${more}`);
  }

  private async fetchChannelLatest(ownerCode: string): Promise<ChannelLatestRow[]> {
    const query = `
      SELECT
        channel_id, last_update, device_id, owner_code, owner_id,
        project_code, project_id, node_id, node_code, node_model,
        sensor_id, sensor_label, sensor_catalog, metric_code, metric_unit,
        raw_value, eng_value, signal_quality, last_iot_log_id,
        min_threshold, max_threshold
      FROM iot.sensor_channel_latest FINAL
      WHERE owner_code = {owner_code:String}
    `;
    return this.clickhouse.query<ChannelLatestRow>(query, { owner_code: ownerCode });
  }

  private async markStatus(config: OwnerForwardingMqtt, status: string, error: string | null): Promise<void> {
    await this.configRepo.update(config.idOwnerForwardingMqtt, {
      lastStatus: status,
      ...(error ? { lastError: error } : {}),
      ...(status === 'connected' ? { lastSuccessAt: new Date() } : {}),
    });
  }

  private async finishWithError(
    config: OwnerForwardingMqtt,
    startedAt: number,
    status: string,
    message: string,
  ): Promise<void> {
    const duration = Date.now() - startedAt;
    await this.configRepo.update(config.idOwnerForwardingMqtt, {
      lastStatus: status,
      lastError: message,
      totalErrorCount: (config.totalErrorCount || 0) + 1,
    });
    await this.writeLog(config, 'failed', 0, message, duration);
    this.logger.warn(`⚠️ [${config.label}] ${status}: ${message}`);
  }

  private async writeLog(
    config: OwnerForwardingMqtt,
    status: string,
    messages: number,
    error: string | null,
    durationMs: number,
  ): Promise<void> {
    try {
      await this.logRepo.insert({
        idOwner: config.idOwner,
        configId: config.idOwnerForwardingMqtt,
        status,
        messagesPublished: messages,
        errorMessage: error,
        durationMs,
      });
    } catch (err: any) {
      this.logger.error(`Gagal tulis log: ${err?.message}`);
    }
  }
}
