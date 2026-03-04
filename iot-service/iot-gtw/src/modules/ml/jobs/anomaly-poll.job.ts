import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { MlOrchestrationService } from '../services/ml-orchestration.service';

@Injectable()
export class AnomalyPollJob {
  private readonly logger = new Logger(AnomalyPollJob.name);
  private isRunning = false;
  private readonly mlEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly mlOrchestrationService: MlOrchestrationService,
  ) {
    this.mlEnabled = this.configService.get<boolean>('opensearch.mlEnabled', true);
  }

  /**
   * Poll for anomalies every 10 minutes (offset 2 min from sync)
   * Runs at :02, :12, :22, :32, :42, :52 of every hour
   */
  @Cron('0 2,12,22,32,42,52 * * * *')
  async handleAnomalyPoll() {
    if (!this.mlEnabled) {
      return;
    }

    if (this.isRunning) {
      this.logger.warn('Previous anomaly poll still running, skipping');
      return;
    }

    this.isRunning = true;
    this.logger.debug('Starting anomaly detection poll');

    try {
      const result = await this.mlOrchestrationService.runAnomalyDetection();
      this.logger.log(
        `Anomaly poll completed: ${result.anomaliesFound} anomalies from ${result.processed} sensors in ${result.duration}ms`,
      );
    } catch (error) {
      this.logger.error(`Anomaly poll failed: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get job status
   */
  getStatus(): { isRunning: boolean; enabled: boolean } {
    return {
      isRunning: this.isRunning,
      enabled: this.mlEnabled,
    };
  }
}
