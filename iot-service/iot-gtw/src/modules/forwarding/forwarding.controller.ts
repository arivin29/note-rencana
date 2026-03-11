import { Controller, Get, Post, Param, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OwnerForwardingDatabase, OwnerForwardingLog } from '../../entities/existing';
import { ForwardingSchedulerService } from './forwarding-scheduler.service';
import { TargetDbConnectorService } from './target-db-connector.service';

@Controller('forwarding')
export class ForwardingController {
  private readonly logger = new Logger(ForwardingController.name);

  constructor(
    @InjectRepository(OwnerForwardingDatabase)
    private readonly forwardingDbRepository: Repository<OwnerForwardingDatabase>,
    @InjectRepository(OwnerForwardingLog)
    private readonly forwardingLogRepository: Repository<OwnerForwardingLog>,
    private readonly schedulerService: ForwardingSchedulerService,
    private readonly targetDbConnector: TargetDbConnectorService,
  ) {}

  /**
   * Get all forwarding configs with status
   */
  @Get('configs')
  async getConfigs() {
    return this.schedulerService.getConfigsStatus();
  }

  /**
   * Get single config details
   */
  @Get('configs/:id')
  async getConfig(@Param('id') id: string) {
    const config = await this.forwardingDbRepository.findOne({
      where: { idOwnerForwardingDb: id },
    });

    if (!config) {
      throw new HttpException('Config not found', HttpStatus.NOT_FOUND);
    }

    // Get recent logs
    const logs = await this.forwardingLogRepository.find({
      where: { configId: id },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      config: {
        id: config.idOwnerForwardingDb,
        label: config.label,
        sourceType: config.sourceType,
        targetHost: config.host,
        targetDatabase: config.databaseName,
        targetTable: config.targetTable,
        syncMode: config.syncMode,
        syncIntervalSeconds: config.syncIntervalSeconds,
        batchSize: config.batchSize,
        enabled: config.enabled,
        isRunning: config.isRunning,
        autoCreateTable: config.autoCreateTable,
        conflictStrategy: config.conflictStrategy,
        conflictColumns: config.conflictColumns,
      },
      status: {
        lastStatus: config.lastStatus,
        lastSyncedAt: config.lastSyncedAt,
        lastSyncedId: config.lastSyncedId,
        lastError: config.lastError,
        totalRecordsSynced: config.totalRecordsSynced,
        totalSyncCount: config.totalSyncCount,
        totalErrorCount: config.totalErrorCount,
      },
      recentLogs: logs.map((log) => ({
        id: log.idOwnerForwardingLog,
        status: log.status,
        recordsRead: log.recordsRead,
        recordsInserted: log.recordsInserted,
        recordsSkipped: log.recordsSkipped,
        durationMs: log.durationMs,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
      })),
    };
  }

  /**
   * Test connection to target database
   */
  @Post('configs/:id/test-connection')
  async testConnection(@Param('id') id: string) {
    const config = await this.forwardingDbRepository.findOne({
      where: { idOwnerForwardingDb: id },
    });

    if (!config) {
      throw new HttpException('Config not found', HttpStatus.NOT_FOUND);
    }

    this.logger.log(`Testing connection for: ${config.label}`);
    return this.targetDbConnector.testConnection(config);
  }

  /**
   * Manually trigger sync for a config
   */
  @Post('configs/:id/sync')
  async triggerSync(@Param('id') id: string) {
    try {
      this.logger.log(`Manual sync triggered for config: ${id}`);
      const result = await this.schedulerService.triggerManualSync(id);
      return {
        message: 'Sync completed',
        result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Enable/disable a config
   */
  @Post('configs/:id/toggle')
  async toggleConfig(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    const config = await this.forwardingDbRepository.findOne({
      where: { idOwnerForwardingDb: id },
    });

    if (!config) {
      throw new HttpException('Config not found', HttpStatus.NOT_FOUND);
    }

    await this.forwardingDbRepository.update(
      { idOwnerForwardingDb: id },
      { enabled, updatedAt: new Date() },
    );

    return {
      message: `Config ${enabled ? 'enabled' : 'disabled'}`,
      configId: id,
      enabled,
    };
  }

  /**
   * Reset sync position (re-sync from beginning)
   */
  @Post('configs/:id/reset')
  async resetConfig(@Param('id') id: string, @Body('fromId') fromId?: number) {
    const config = await this.forwardingDbRepository.findOne({
      where: { idOwnerForwardingDb: id },
    });

    if (!config) {
      throw new HttpException('Config not found', HttpStatus.NOT_FOUND);
    }

    const newId = fromId ?? 0;

    await this.forwardingDbRepository.update(
      { idOwnerForwardingDb: id },
      {
        lastSyncedId: newId.toString(),
        lastSyncedAt: null,
        lastStatus: 'reset',
        lastError: null,
        updatedAt: new Date(),
      },
    );

    return {
      message: `Config reset to start from ID: ${newId}`,
      configId: id,
      fromId: newId,
    };
  }

  /**
   * Get logs for a specific config
   */
  @Get('configs/:id/logs')
  async getConfigLogs(@Param('id') id: string) {
    const logs = await this.forwardingLogRepository.find({
      where: { configId: id },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return logs;
  }

  /**
   * Get summary stats across all configs
   */
  @Get('stats')
  async getStats() {
    const configs = await this.forwardingDbRepository.find();

    const stats = {
      total: configs.length,
      enabled: configs.filter((c) => c.enabled).length,
      running: configs.filter((c) => c.isRunning).length,
      healthy: configs.filter((c) => c.lastStatus === 'success').length,
      failed: configs.filter((c) => c.lastStatus === 'failed').length,
      totalRecordsSynced: configs.reduce(
        (sum, c) => sum + BigInt(c.totalRecordsSynced || '0'),
        BigInt(0),
      ).toString(),
      totalSyncCount: configs.reduce((sum, c) => sum + (c.totalSyncCount || 0), 0),
      totalErrorCount: configs.reduce((sum, c) => sum + (c.totalErrorCount || 0), 0),
      bySourceType: {
        sensor_logs: configs.filter((c) => c.sourceType === 'sensor_logs').length,
        sensor_telemetry: configs.filter((c) => c.sourceType === 'sensor_telemetry').length,
        sensor_channel_latest: configs.filter((c) => c.sourceType === 'sensor_channel_latest').length,
      },
    };

    return stats;
  }
}
