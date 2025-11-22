import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TelemetryProcessorService } from '../telemetry-processor/telemetry-processor.service';

@Injectable()
export class TelemetrySchedulerService {
  private readonly logger = new Logger(TelemetrySchedulerService.name);
  private isProcessing = false;

  constructor(
    private readonly telemetryProcessorService: TelemetryProcessorService,
  ) {}

  /**
   * Process telemetry every 30 seconds
   * Cron runs every 30 seconds
   */
  @Cron('*/30 * * * * *')
  async handleTelemetryProcessing() {
    // Prevent concurrent processing
    if (this.isProcessing) {
      this.logger.debug('Telemetry processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      this.logger.log('Starting scheduled telemetry processing...');

      const result = await this.telemetryProcessorService.processUnprocessedLogs(100);

      if (result.totalProcessed > 0) {
        this.logger.log(
          `Scheduled processing completed: ${result.successCount} success, ${result.failureCount} failed, ` +
          `${result.totalProcessingTimeMs}ms`,
        );
      } else {
        this.logger.debug('No unprocessed telemetry logs found');
      }
    } catch (error) {
      this.logger.error(`Error in scheduled telemetry processing: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Health check every 5 minutes - log stats
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleStatsLogging() {
    try {
      const stats = await this.telemetryProcessorService.getStats();

      this.logger.log(
        `Telemetry Stats: Unprocessed: ${stats.totalUnprocessed}, ` +
        `Processed: ${stats.totalProcessed}, ` +
        `Today: ${stats.processedToday} (${stats.failedToday} failed)`,
      );
    } catch (error) {
      this.logger.error(`Error logging stats: ${error.message}`);
    }
  }
}
