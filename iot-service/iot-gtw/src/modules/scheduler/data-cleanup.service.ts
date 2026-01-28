import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { IotLog } from '../../entities/iot-log.entity';
import { SensorLog } from '../../entities/existing/sensor-log.entity';

@Injectable()
export class DataCleanupService {
  private readonly logger = new Logger(DataCleanupService.name);
  
  // Configuration: Maximum data retention in months
  private readonly RETENTION_MONTHS = 3;
  
  // Batch size for deletion to avoid lock issues
  private readonly BATCH_SIZE = 10000;

  constructor(
    @InjectRepository(IotLog)
    private readonly iotLogRepository: Repository<IotLog>,
    @InjectRepository(SensorLog)
    private readonly sensorLogRepository: Repository<SensorLog>,
  ) {}

  /**
   * Calculate the cutoff date (3 months ago)
   */
  private getCutoffDate(): Date {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - this.RETENTION_MONTHS);
    return cutoff;
  }

  /**
   * Run cleanup every day at 2:00 AM
   * This runs during low-traffic hours to minimize impact
   */
  @Cron('0 2 * * *') // At 02:00 every day
  async runDailyCleanup(): Promise<void> {
    this.logger.log('🧹 Starting daily data cleanup...');
    
    const startTime = Date.now();
    const cutoffDate = this.getCutoffDate();
    
    this.logger.log(`📅 Cutoff date: ${cutoffDate.toISOString()} (${this.RETENTION_MONTHS} months ago)`);

    try {
      // Cleanup iot_log
      const iotLogDeleted = await this.cleanupIotLogs(cutoffDate);
      
      // Cleanup sensor_logs
      const sensorLogDeleted = await this.cleanupSensorLogs(cutoffDate);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      this.logger.log(`✅ Data cleanup completed in ${duration}s`);
      this.logger.log(`   - iot_log: ${iotLogDeleted} records deleted`);
      this.logger.log(`   - sensor_logs: ${sensorLogDeleted} records deleted`);
    } catch (error) {
      this.logger.error('❌ Data cleanup failed:', error);
    }
  }

  /**
   * Cleanup old iot_log records
   */
  private async cleanupIotLogs(cutoffDate: Date): Promise<number> {
    let totalDeleted = 0;
    let batchDeleted = 0;

    do {
      // Delete in batches using subquery to avoid long-running transactions
      const result = await this.iotLogRepository
        .createQueryBuilder()
        .delete()
        .from(IotLog)
        .where(`id IN (
          SELECT id FROM iot_log 
          WHERE created_at < :cutoffDate 
          LIMIT :batchSize
        )`, { cutoffDate, batchSize: this.BATCH_SIZE })
        .execute();

      batchDeleted = result.affected || 0;
      totalDeleted += batchDeleted;

      if (batchDeleted > 0) {
        this.logger.debug(`   iot_log: deleted batch of ${batchDeleted} records (total: ${totalDeleted})`);
      }
    } while (batchDeleted === this.BATCH_SIZE);

    return totalDeleted;
  }

  /**
   * Cleanup old sensor_logs records
   */
  private async cleanupSensorLogs(cutoffDate: Date): Promise<number> {
    let totalDeleted = 0;
    let batchDeleted = 0;

    do {
      // Delete in batches using subquery for better performance with large tables
      const result = await this.sensorLogRepository
        .createQueryBuilder()
        .delete()
        .from(SensorLog)
        .where(`id_sensor_log IN (
          SELECT id_sensor_log FROM sensor_logs 
          WHERE ts < :cutoffDate 
          LIMIT :batchSize
        )`, { cutoffDate, batchSize: this.BATCH_SIZE })
        .execute();

      batchDeleted = result.affected || 0;
      totalDeleted += batchDeleted;

      if (batchDeleted > 0) {
        this.logger.debug(`   sensor_logs: deleted batch of ${batchDeleted} records (total: ${totalDeleted})`);
      }
    } while (batchDeleted === this.BATCH_SIZE);

    return totalDeleted;
  }

  /**
   * Get statistics about old data (for monitoring)
   */
  async getCleanupStats(): Promise<{
    cutoffDate: Date;
    iotLogOldCount: number;
    sensorLogOldCount: number;
  }> {
    const cutoffDate = this.getCutoffDate();

    const iotLogOldCount = await this.iotLogRepository.count({
      where: { createdAt: LessThan(cutoffDate) },
    });

    const sensorLogOldCount = await this.sensorLogRepository.count({
      where: { ts: LessThan(cutoffDate) },
    });

    return {
      cutoffDate,
      iotLogOldCount,
      sensorLogOldCount,
    };
  }

  /**
   * Manual trigger for cleanup (can be called from controller/endpoint)
   */
  async triggerManualCleanup(): Promise<{
    iotLogDeleted: number;
    sensorLogDeleted: number;
    duration: string;
  }> {
    this.logger.log('🔧 Manual cleanup triggered...');
    
    const startTime = Date.now();
    const cutoffDate = this.getCutoffDate();

    const iotLogDeleted = await this.cleanupIotLogs(cutoffDate);
    const sensorLogDeleted = await this.cleanupSensorLogs(cutoffDate);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    this.logger.log(`✅ Manual cleanup completed: iot_log=${iotLogDeleted}, sensor_logs=${sensorLogDeleted}`);

    return {
      iotLogDeleted,
      sensorLogDeleted,
      duration: `${duration}s`,
    };
  }
}
