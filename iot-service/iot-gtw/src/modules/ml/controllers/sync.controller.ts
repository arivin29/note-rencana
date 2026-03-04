import { Controller, Get, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { SyncService } from '../services/sync.service';

@Controller('ml/sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  getSyncStatus() {
    return this.syncService.getSyncStatus();
  }

  @Post('trigger')
  async triggerSync() {
    this.logger.log('Manual sync triggered via API');
    try {
      const result = await this.syncService.syncTelemetry();
      return {
        success: true,
        message: 'Sync completed',
        result,
      };
    } catch (error) {
      this.logger.error(`Manual sync failed: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: 'Sync failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('resync')
  async forceResync(@Body() body: { fromDate: string }) {
    const fromDate = new Date(body.fromDate);
    if (isNaN(fromDate.getTime())) {
      throw new HttpException('Invalid date format', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Force resync triggered from ${fromDate.toISOString()}`);
    try {
      const result = await this.syncService.forceResync(fromDate);
      return {
        success: true,
        message: 'Resync completed',
        result,
      };
    } catch (error) {
      this.logger.error(`Force resync failed: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: 'Resync failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('active-sensors')
  async getActiveSensors() {
    try {
      const sensors = await this.syncService.getActiveSensors();
      return {
        count: sensors.length,
        sensors,
      };
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to get active sensors',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
