import { Controller, Post, Get, Logger } from '@nestjs/common';
import { DataCleanupService } from './data-cleanup.service';

@Controller('maintenance')
export class MaintenanceController {
  private readonly logger = new Logger(MaintenanceController.name);

  constructor(private readonly dataCleanupService: DataCleanupService) {}

  /**
   * Get statistics about old data that will be cleaned up
   */
  @Get('cleanup/stats')
  async getCleanupStats() {
    const stats = await this.dataCleanupService.getCleanupStats();
    return {
      message: 'Data cleanup statistics',
      retentionMonths: 3,
      cutoffDate: stats.cutoffDate.toISOString(),
      pendingDeletion: {
        iotLog: stats.iotLogOldCount,
        sensorLogs: stats.sensorLogOldCount,
      },
    };
  }

  /**
   * Manually trigger data cleanup (delete data older than 3 months)
   */
  @Post('cleanup/trigger')
  async triggerCleanup() {
    this.logger.log('Manual cleanup requested via API');
    const result = await this.dataCleanupService.triggerManualCleanup();
    return {
      message: 'Data cleanup completed',
      result,
    };
  }
}
