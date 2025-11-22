import { Controller, Post, Get, Query, Body } from '@nestjs/common';
import { TelemetryProcessorService } from './telemetry-processor.service';

@Controller('telemetry-processor')
export class TelemetryProcessorController {
  constructor(
    private readonly telemetryProcessorService: TelemetryProcessorService,
  ) {}

  /**
   * Manually trigger processing of unprocessed logs
   */
  @Post('process')
  async processUnprocessed(@Query('limit') limit?: number) {
    const result = await this.telemetryProcessorService.processUnprocessedLogs(
      limit ? parseInt(String(limit), 10) : 100,
    );

    return {
      message: 'Processing completed',
      ...result,
    };
  }

  /**
   * Get processing statistics
   */
  @Get('stats')
  async getStats() {
    return this.telemetryProcessorService.getStats();
  }
}
