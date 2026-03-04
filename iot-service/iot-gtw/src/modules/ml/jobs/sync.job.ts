import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SyncService } from '../services/sync.service';

@Injectable()
export class SyncJob {
  private readonly logger = new Logger(SyncJob.name);
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly syncService: SyncService,
  ) {}

  /**
   * Sync ClickHouse aggregated data to OpenSearch every 10 minutes
   * Runs at :00, :10, :20, :30, :40, :50 of every hour
   */
  @Cron('0 */10 * * * *')
  async handleSync() {
    if (this.isRunning) {
      this.logger.warn('Previous sync still running, skipping');
      return;
    }

    this.isRunning = true;
    this.logger.debug('Starting scheduled telemetry sync');

    try {
      const result = await this.syncService.syncTelemetry();
      this.logger.log(
        `Sync job completed: ${result.lastSyncedCount} records in ${result.lastSyncDuration}ms`,
      );
    } catch (error) {
      this.logger.error(`Sync job failed: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get job status
   */
  getStatus(): { isRunning: boolean; syncStatus: any } {
    return {
      isRunning: this.isRunning,
      syncStatus: this.syncService.getSyncStatus(),
    };
  }
}
