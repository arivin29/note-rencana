import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { OwnerForwardingMqtt, OwnerForwardingMqttLog } from '../../entities/existing';
import { BroadcastWorkerService } from './broadcast-worker.service';
import { MqttPublisherService } from './mqtt-publisher.service';

/**
 * Penjadwal drain: tiap 5 detik cek config aktif yang jatuh tempo (per poll_interval_seconds),
 * proses lewat worker. Plus reset lock saat start & pembersih log 7 hari.
 * Ref spec §9.2, §4 (retensi).
 */
@Injectable()
export class BroadcastSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BroadcastSchedulerService.name);
  private isProcessing = false;
  private readonly STALE_LOCK_MS = 5 * 60 * 1000;
  private readonly LOG_RETENTION_DAYS = 7;

  constructor(
    @InjectRepository(OwnerForwardingMqtt)
    private readonly configRepo: Repository<OwnerForwardingMqtt>,
    @InjectRepository(OwnerForwardingMqttLog)
    private readonly logRepo: Repository<OwnerForwardingMqttLog>,
    private readonly worker: BroadcastWorkerService,
    private readonly publisher: MqttPublisherService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Service baru start → tak ada job yang benar-benar jalan. Lepas semua lock nyangkut.
    const res = await this.configRepo.update({ isRunning: true }, { isRunning: false });
    if (res.affected) {
      this.logger.warn(`🧹 Startup: lepas ${res.affected} lock nyangkut`);
    }
    this.logger.log('📡 Broadcast scheduler siap');
  }

  @Cron('*/5 * * * * *') // tiap 5 detik
  async tick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      await this.clearStaleLocks();

      const active = await this.configRepo.find({ where: { isActive: true } });
      // Tutup koneksi config yang tak lagi aktif (bulkhead housekeeping)
      this.publisher.reconcile(new Set(active.map((c) => c.idOwnerForwardingMqtt)));

      const due = active.filter((c) => this.isDue(c) && !c.isRunning);
      for (const config of due) {
        await this.runOne(config);
      }
    } catch (err: any) {
      this.logger.error(`tick error: ${err?.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private isDue(config: OwnerForwardingMqtt): boolean {
    if (!config.lastRunStartedAt) return true;
    const interval = (config.pollIntervalSeconds || 10) * 1000;
    return Date.now() - new Date(config.lastRunStartedAt).getTime() >= interval;
  }

  private async runOne(config: OwnerForwardingMqtt): Promise<void> {
    // Ambil lock (optimistik)
    const lock = await this.configRepo.update(
      { idOwnerForwardingMqtt: config.idOwnerForwardingMqtt, isRunning: false },
      { isRunning: true, lastRunStartedAt: new Date() },
    );
    if (!lock.affected) return; // proses lain sudah pegang

    try {
      await this.worker.processConfig(config);
    } catch (err: any) {
      this.logger.error(`[${config.label}] proses gagal: ${err?.message}`, err?.stack);
    } finally {
      await this.configRepo.update(config.idOwnerForwardingMqtt, { isRunning: false });
    }
  }

  private async clearStaleLocks(): Promise<void> {
    const threshold = new Date(Date.now() - this.STALE_LOCK_MS);
    const res = await this.configRepo.update(
      { isRunning: true, lastRunStartedAt: LessThan(threshold) },
      { isRunning: false, lastStatus: 'stale_lock_cleared' },
    );
    if (res.affected) this.logger.warn(`Lepas ${res.affected} stale lock`);
  }

  /** Retensi log 7 hari — tiru pola data-cleanup.service (@Cron harian jam 2 pagi). */
  @Cron('0 2 * * *')
  async cleanupLogs(): Promise<void> {
    const cutoff = new Date(Date.now() - this.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    try {
      const res = await this.logRepo.delete({ createdAt: LessThan(cutoff) });
      this.logger.log(`🧹 Retensi log: hapus ${res.affected ?? 0} baris < ${this.LOG_RETENTION_DAYS} hari`);
    } catch (err: any) {
      this.logger.error(`Cleanup log gagal: ${err?.message}`);
    }
  }
}
