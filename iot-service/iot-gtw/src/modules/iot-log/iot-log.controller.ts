import { Controller, Get, Query, Param, Patch, Body } from '@nestjs/common';
import { IotLogService } from './iot-log.service';
import { LogLabel } from '../../common/enums';

@Controller('iot-logs')
export class IotLogController {
  constructor(private readonly iotLogService: IotLogService) {}

  @Get('unprocessed')
  async getUnprocessed(@Query('limit') limit?: number) {
    return this.iotLogService.findUnprocessed(limit || 100);
  }

  @Get('stats')
  async getStats() {
    return this.iotLogService.getStats();
  }

  @Get('by-label/:label')
  async getByLabel(
    @Param('label') label: LogLabel,
    @Query('limit') limit?: number,
  ) {
    return this.iotLogService.findByLabel(label, limit || 100);
  }

  @Get('by-device/:deviceId')
  async getByDeviceId(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: number,
  ) {
    return this.iotLogService.findByDeviceId(deviceId, limit || 100);
  }

  @Patch(':id/process')
  async markAsProcessed(
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.iotLogService.markAsProcessed(id, notes);
  }
}
