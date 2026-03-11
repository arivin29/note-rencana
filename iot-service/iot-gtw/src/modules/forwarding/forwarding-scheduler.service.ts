import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan } from 'typeorm';
import { OwnerForwardingDatabase } from '../../entities/existing';
import { ForwardingWorkerService } from './forwarding-worker.service';

@Injectable()
export class ForwardingSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ForwardingSchedulerService.name);
  private isProcessing = false;

  // Stale lock timeout (5 minutes)
  private readonly STALE_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

  constructor(
    @InjectRepository(OwnerForwardingDatabase)
    private readonly forwardingDbRepository: Repository<OwnerForwardingDatabase>,
    private readonly forwardingWorkerService: ForwardingWorkerService,
  ) {}

  /**
   * Reset all locks on startup - service just started, no jobs can be running
   */
  async onModuleInit(): Promise<void> {
    const result = await this.forwardingDbRepository.update(
      { isRunning: true },
      { isRunning: false },
    );

    if (result.affected > 0) {
      this.logger.warn(`🧹 Startup cleanup: Released ${result.affected} stuck locks from previous session`);
    }
  }

  /**
   * Run forwarding job every minute
   * Checks all enabled configs and processes those due for sync
   */
  @Cron('0 * * * * *') // Every minute at :00 seconds
  async handleForwardingJob(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Previous forwarding job still running, skipping...');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      this.logger.log('🔄 Starting data forwarding job...');

      // 1. Clear stale locks (jobs that crashed without releasing lock)
      await this.clearStaleLocks();

      // 2. Get all enabled configs that are not currently running
      const configs = await this.getConfigsDueForSync();

      if (configs.length === 0) {
        this.logger.debug('No forwarding configs due for sync');
        return;
      }

      this.logger.log(`Found ${configs.length} configs to process`);

      // 3. Process each config sequentially to avoid overloading
      let successCount = 0;
      let errorCount = 0;

      for (const config of configs) {
        try {
          await this.forwardingWorkerService.processConfig(config);
          successCount++;
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Error processing config ${config.idOwnerForwardingDb}: ${error.message}`,
            error.stack,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Forwarding job completed: ${successCount} success, ${errorCount} failed, ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(`Forwarding job failed: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get configs that are due for sync based on their interval
   */
  private async getConfigsDueForSync(): Promise<OwnerForwardingDatabase[]> {
    const now = new Date();

    // Get enabled configs that are not locked
    const configs = await this.forwardingDbRepository.find({
      where: {
        enabled: true,
        isRunning: false,
      },
    });

    // Filter by sync interval
    return configs.filter((config) => {
      // If never synced, always due
      if (!config.lastSyncedAt) {
        return true;
      }

      // Check if enough time has passed
      const lastSync = new Date(config.lastSyncedAt).getTime();
      const intervalMs = (config.syncIntervalSeconds || 60) * 1000;
      const nextSyncAt = lastSync + intervalMs;

      return now.getTime() >= nextSyncAt;
    });
  }

  /**
   * Clear stale locks from crashed jobs
   */
  private async clearStaleLocks(): Promise<void> {
    const staleThreshold = new Date(Date.now() - this.STALE_LOCK_TIMEOUT_MS);

    const result = await this.forwardingDbRepository.update(
      {
        isRunning: true,
        lastRunStartedAt: LessThan(staleThreshold),
      },
      {
        isRunning: false,
        lastStatus: 'stale_lock_cleared',
        lastError: 'Lock cleared due to timeout - previous job may have crashed',
      },
    );

    if (result.affected > 0) {
      this.logger.warn(`Cleared ${result.affected} stale locks`);
    }
  }

  /**
   * Manual trigger for a specific config
   */
  async triggerManualSync(configId: string): Promise<any> {
    const config = await this.forwardingDbRepository.findOne({
      where: { idOwnerForwardingDb: configId },
    });

    if (!config) {
      throw new Error(`Config not found: ${configId}`);
    }

    if (config.isRunning) {
      throw new Error(`Config is already running`);
    }

    return this.forwardingWorkerService.processConfig(config);
  }

  /**
   * Get all forwarding configs with status
   */
  async getConfigsStatus(): Promise<any[]> {
    const configs = await this.forwardingDbRepository.find({
      order: { createdAt: 'DESC' },
    });

    return configs.map((config) => ({
      id: config.idOwnerForwardingDb,
      label: config.label,
      sourceType: config.sourceType,
      targetTable: config.targetTable,
      enabled: config.enabled,
      isRunning: config.isRunning,
      lastStatus: config.lastStatus,
      lastSyncedAt: config.lastSyncedAt,
      lastSyncedId: config.lastSyncedId,
      totalRecordsSynced: config.totalRecordsSynced,
      totalSyncCount: config.totalSyncCount,
      totalErrorCount: config.totalErrorCount,
      lastError: config.lastError,
    }));
  }
}
