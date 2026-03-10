import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ForecastService } from '../services/forecast.service';

@Injectable()
export class ForecastJob {
  private readonly logger = new Logger(ForecastJob.name);
  private isRunning = false;
  private readonly forecastEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly forecastService: ForecastService,
  ) {
    this.forecastEnabled = this.configService.get<boolean>('opensearch.forecastEnabled', true);
  }

  /**
   * Generate forecasts twice daily at 00:00 and 12:00 UTC
   * 7-day horizon with 12-hour update cycle
   */
  @Cron('0 0 0,12 * * *')
  async handleForecastGeneration() {
    if (!this.forecastEnabled) {
      return;
    }

    if (this.isRunning) {
      this.logger.warn('Previous forecast generation still running, skipping');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled forecast generation');

    try {
      const result = await this.forecastService.runForecastGeneration();
      this.logger.log(
        `Forecast generation completed: ${result.forecastsGenerated} points for ${result.processed} sensors in ${result.duration}ms`,
      );
    } catch (error) {
      this.logger.error(`Forecast generation failed: ${error.message}`);
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
      enabled: this.forecastEnabled,
    };
  }
}
