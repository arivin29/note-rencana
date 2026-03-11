import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Like } from 'typeorm';
import { OwnerForwardingDatabase, OwnerForwardingLog, SensorLog } from '../../entities/existing';
import { IotLog } from '../../entities';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { TargetDbConnectorService, TargetDbConnection } from './target-db-connector.service';

export interface ForwardingResult {
  success: boolean;
  recordsRead: number;
  recordsInserted: number;
  recordsSkipped: number;
  lastSyncedId: number;
  lastSyncedAt?: Date;
  durationMs: number;
  error?: string;
}

@Injectable()
export class ForwardingWorkerService {
  private readonly logger = new Logger(ForwardingWorkerService.name);

  constructor(
    @InjectRepository(OwnerForwardingDatabase)
    private readonly forwardingDbRepository: Repository<OwnerForwardingDatabase>,
    @InjectRepository(OwnerForwardingLog)
    private readonly forwardingLogRepository: Repository<OwnerForwardingLog>,
    @InjectRepository(SensorLog)
    private readonly sensorLogRepository: Repository<SensorLog>,
    @InjectRepository(IotLog)
    private readonly iotLogRepository: Repository<IotLog>,
    private readonly clickhouseService: ClickhouseService,
    private readonly targetDbConnector: TargetDbConnectorService,
  ) {}

  /**
   * Process a single forwarding config
   */
  async processConfig(config: OwnerForwardingDatabase): Promise<ForwardingResult> {
    const startTime = Date.now();
    let targetConn: TargetDbConnection | null = null;
    let result: ForwardingResult = {
      success: false,
      recordsRead: 0,
      recordsInserted: 0,
      recordsSkipped: 0,
      lastSyncedId: parseInt(config.lastSyncedId) || 0,
      durationMs: 0,
    };

    try {
      // 1. Acquire lock
      await this.acquireLock(config.idOwnerForwardingDb);

      this.logger.log(
        `Processing config: ${config.label} (${config.sourceType} -> ${config.targetTable})`,
      );

      // 2. Connect to target database
      targetConn = await this.targetDbConnector.connect(config);

      // 3. Auto-create table if needed
      if (config.autoCreateTable) {
        await this.ensureTargetTable(targetConn, config);
      }

      // 4. Fetch data from source based on sourceType
      const sourceData = await this.fetchSourceData(config);

      if (sourceData.length === 0) {
        this.logger.debug(`No new data for config: ${config.label}`);
        result.success = true;
        result.durationMs = Date.now() - startTime;
        await this.updateConfigStatus(config, result);
        return result;
      }

      result.recordsRead = sourceData.length;

      // 5. Insert data to target
      const insertResult = await this.insertToTarget(targetConn, config, sourceData);
      result.recordsInserted = insertResult.inserted;
      result.recordsSkipped = insertResult.skipped;
      result.lastSyncedId = insertResult.lastId;
      result.lastSyncedAt = insertResult.lastSyncedAt;
      result.success = true;
      result.durationMs = Date.now() - startTime;

      this.logger.log(
        `✅ ${config.label}: ${result.recordsInserted} inserted, ${result.recordsSkipped} skipped, ${result.durationMs}ms`,
      );

      // 5.5 Update sync_metadata in target database
      await this.updateTargetSyncMetadata(targetConn, config, result);

      // 6. Update config status
      await this.updateConfigStatus(config, result);

      // 7. Log success
      await this.createLog(config, result);

      return result;
    } catch (error) {
      result.error = error.message;
      result.durationMs = Date.now() - startTime;

      this.logger.error(`❌ ${config.label} failed: ${error.message}`, error.stack);

      // Update config with error
      await this.updateConfigError(config, error.message);

      // Log error
      await this.createLog(config, result);

      return result;
    } finally {
      // Always release lock and close connection
      await this.releaseLock(config.idOwnerForwardingDb);

      if (targetConn) {
        await this.targetDbConnector.disconnect(targetConn);
      }
    }
  }

  /**
   * Fetch data from source based on sourceType
   */
  private async fetchSourceData(config: OwnerForwardingDatabase): Promise<any[]> {
    const lastId = parseInt(config.lastSyncedId) || 0;
    const batchSize = config.batchSize || 100;
    const ownerCode = config.ownerCode;

    switch (config.sourceType) {
      case 'iot_log':
        return this.fetchIotLogs(ownerCode, config.lastSyncedAt, batchSize);

      case 'sensor_telemetry':
        return this.fetchSensorTelemetry(ownerCode, lastId, batchSize);

      case 'sensor_channel_latest':
        return this.fetchSensorChannelLatest(ownerCode);

      default:
        throw new Error(`Unknown sourceType: ${config.sourceType}`);
    }
  }

  /**
   * Fetch iot_log from PostgreSQL
   * Filter by owner_code (first 5 chars of device_id)
   * Track by created_at since ID is UUID
   */
  private async fetchIotLogs(
    ownerCode: string,
    lastSyncedAt: Date | null,
    batchSize: number,
  ): Promise<any[]> {
    const queryBuilder = this.iotLogRepository.createQueryBuilder('log');

    // Filter by device_id prefix (owner_code)
    if (ownerCode) {
      queryBuilder.andWhere('log.deviceId LIKE :prefix', { prefix: `${ownerCode}%` });
    }

    // Incremental sync by created_at
    if (lastSyncedAt) {
      queryBuilder.andWhere('log.createdAt > :lastSyncedAt', { lastSyncedAt });
    }

    queryBuilder
      .orderBy('log.createdAt', 'ASC')
      .take(batchSize);

    const logs = await queryBuilder.getMany();

    return logs.map((log) => ({
      id: log.id,
      label: log.label,
      topic: log.topic,
      payload: log.payload,
      device_id: log.deviceId,
      timestamp: log.timestamp,
      processed: log.processed,
      notes: log.notes,
      created_at: log.createdAt,
      updated_at: log.updatedAt,
    }));
  }

  /**
   * Fetch sensor_telemetry from ClickHouse
   * Filter by owner_code column
   */
  private async fetchSensorTelemetry(
    ownerCode: string,
    lastId: number,
    batchSize: number,
  ): Promise<any[]> {
    const query = `
      SELECT 
        pg_sensor_log_id,
        event_time,
        event_date,
        device_id,
        owner_code,
        owner_id,
        project_code,
        project_id,
        node_id,
        node_code,
        node_model,
        sensor_id,
        sensor_label,
        sensor_catalog,
        channel_id,
        metric_code,
        metric_unit,
        raw_value,
        eng_value,
        signal_quality,
        firmware_version,
        iot_log_id,
        processed_at,
        min_threshold,
        max_threshold
      FROM iot.sensor_telemetry
      WHERE owner_code = {owner_code:String}
        AND pg_sensor_log_id > {last_id:Int64}
      ORDER BY pg_sensor_log_id ASC
      LIMIT {batch_size:UInt32}
    `;

    return this.clickhouseService.query(query, {
      owner_code: ownerCode,
      last_id: lastId,
      batch_size: batchSize,
    });
  }

  /**
   * Fetch sensor_channel_latest from ClickHouse (full sync)
   * Filter by owner_code column
   */
  private async fetchSensorChannelLatest(ownerCode: string): Promise<any[]> {
    const query = `
      SELECT 
        channel_id,
        last_update,
        device_id,
        owner_code,
        owner_id,
        project_code,
        project_id,
        node_id,
        node_code,
        node_model,
        sensor_id,
        sensor_label,
        sensor_catalog,
        metric_code,
        metric_unit,
        raw_value,
        eng_value,
        signal_quality,
        last_iot_log_id,
        min_threshold,
        max_threshold
      FROM iot.sensor_channel_latest FINAL
      WHERE owner_code = {owner_code:String}
    `;

    return this.clickhouseService.query(query, {
      owner_code: ownerCode,
    });
  }

  /**
   * Insert data to target database
   */
  private async insertToTarget(
    conn: TargetDbConnection,
    config: OwnerForwardingDatabase,
    data: any[],
  ): Promise<{ inserted: number; skipped: number; lastId: number; lastSyncedAt: Date | null }> {
    const tableName = config.targetSchema
      ? `${config.targetSchema}.${config.targetTable}`
      : config.targetTable;

    let inserted = 0;
    let skipped = 0;
    let lastId = parseInt(config.lastSyncedId) || 0;
    let lastSyncedAt: Date | null = null;

    // Build insert query based on conflict strategy
    for (const row of data) {
      try {
        const result = await this.insertRow(conn, config, tableName, row);
        if (result) {
          inserted++;
        } else {
          skipped++;
        }

        // Track last ID (for sensor_telemetry)
        const rowId = this.getRowId(config.sourceType, row);
        if (rowId > lastId) {
          lastId = rowId;
        }

        // Track last created_at (for iot_log)
        if (config.sourceType === 'iot_log' && row.created_at) {
          const rowDate = new Date(row.created_at);
          if (!lastSyncedAt || rowDate > lastSyncedAt) {
            lastSyncedAt = rowDate;
          }
        }
      } catch (error) {
        // For 'ignore' strategy, skip on duplicate
        if (config.conflictStrategy === 'ignore') {
          skipped++;
        } else {
          throw error;
        }
      }
    }

    return { inserted, skipped, lastId, lastSyncedAt };
  }

  /**
   * Insert a single row with conflict handling
   */
  private async insertRow(
    conn: TargetDbConnection,
    config: OwnerForwardingDatabase,
    tableName: string,
    row: any,
  ): Promise<boolean> {
    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    let sql = `INSERT INTO ${tableName} (${columns.join(', ')}, synced_at) VALUES (${placeholders}, NOW())`;

    // Add conflict handling
    if (config.conflictStrategy === 'ignore' && config.conflictColumns?.length) {
      sql += ` ON CONFLICT (${config.conflictColumns.join(', ')}) DO NOTHING`;
    } else if (config.conflictStrategy === 'update' && config.conflictColumns?.length) {
      const updateCols = columns
        .filter((col) => !config.conflictColumns.includes(col))
        .map((col) => `${col} = EXCLUDED.${col}`)
        .join(', ');
      sql += ` ON CONFLICT (${config.conflictColumns.join(', ')}) DO UPDATE SET ${updateCols}, synced_at = NOW()`;
    }

    const result = await conn.query(sql, values);
    return result.rowCount > 0;
  }

  /**
   * Get row ID based on source type
   */
  private getRowId(sourceType: string, row: any): number {
    switch (sourceType) {
      case 'iot_log':
        return 0; // Track by created_at, not numeric ID
      case 'sensor_telemetry':
        return row.pg_sensor_log_id || 0;
      case 'sensor_channel_latest':
        return 0; // No ID tracking for latest
      default:
        return 0;
    }
  }

  /**
   * Get the last created_at timestamp from data (for iot_log)
   */
  private getLastCreatedAt(data: any[]): Date | null {
    if (data.length === 0) return null;
    
    const lastRow = data[data.length - 1];
    return lastRow.created_at ? new Date(lastRow.created_at) : null;
  }

  /**
   * Update sync_metadata table in target database
   */
  private async updateTargetSyncMetadata(
    conn: TargetDbConnection,
    config: OwnerForwardingDatabase,
    result: ForwardingResult,
  ): Promise<void> {
    try {
      const schema = config.targetSchema || 'public';
      const metadataTable = `${schema}.sync_metadata`;

      // Check if sync_metadata table exists
      const checkSql = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 
          AND table_name = 'sync_metadata'
        )
      `;
      const checkResult = await conn.query(checkSql, [schema]);

      if (!checkResult.rows[0].exists) {
        // Create sync_metadata table
        const createSql = `
          CREATE TABLE IF NOT EXISTS ${metadataTable} (
            id SERIAL PRIMARY KEY,
            source_table VARCHAR(100) NOT NULL UNIQUE,
            last_synced_id BIGINT DEFAULT 0,
            last_synced_at TIMESTAMP WITH TIME ZONE,
            records_count BIGINT DEFAULT 0,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `;
        await conn.query(createSql);
        this.logger.debug(`Created sync_metadata table in ${schema}`);
      }

      // Upsert sync metadata
      const upsertSql = `
        INSERT INTO ${metadataTable} (source_table, last_synced_id, last_synced_at, records_count, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (source_table) DO UPDATE SET
          last_synced_id = EXCLUDED.last_synced_id,
          last_synced_at = EXCLUDED.last_synced_at,
          records_count = ${metadataTable}.records_count + EXCLUDED.records_count,
          updated_at = NOW()
      `;

      await conn.query(upsertSql, [
        config.sourceType,
        result.lastSyncedId,
        result.lastSyncedAt || new Date(),
        result.recordsInserted,
      ]);

      this.logger.debug(`Updated sync_metadata for ${config.sourceType}`);
    } catch (error) {
      // Don't fail the sync if metadata update fails
      this.logger.warn(`Failed to update sync_metadata: ${error.message}`);
    }
  }

  /**
   * Ensure target table exists
   */
  private async ensureTargetTable(
    conn: TargetDbConnection,
    config: OwnerForwardingDatabase,
  ): Promise<void> {
    const tableName = config.targetSchema
      ? `${config.targetSchema}.${config.targetTable}`
      : config.targetTable;

    // Check if table exists
    const checkSql = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = $2
      )
    `;

    const result = await conn.query(checkSql, [
      config.targetSchema || 'public',
      config.targetTable,
    ]);

    if (result.rows[0].exists) {
      return; // Table exists
    }

    this.logger.log(`Creating target table: ${tableName}`);

    // Create table based on sourceType
    const createSql = this.getCreateTableSql(config);
    await conn.query(createSql);

    this.logger.log(`✅ Created table: ${tableName}`);
  }

  /**
   * Get CREATE TABLE SQL based on sourceType
   */
  private getCreateTableSql(config: OwnerForwardingDatabase): string {
    const tableName = config.targetSchema
      ? `${config.targetSchema}.${config.targetTable}`
      : config.targetTable;

    switch (config.sourceType) {
      case 'iot_log':
        return `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            id UUID PRIMARY KEY,
            label TEXT NOT NULL,
            topic TEXT,
            payload JSONB NOT NULL,
            device_id TEXT,
            timestamp TIMESTAMPTZ NOT NULL,
            processed BOOLEAN DEFAULT FALSE,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            synced_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_${config.targetTable}_device_id 
          ON ${tableName} (device_id);
          CREATE INDEX IF NOT EXISTS idx_${config.targetTable}_label 
          ON ${tableName} (label);
          CREATE INDEX IF NOT EXISTS idx_${config.targetTable}_timestamp 
          ON ${tableName} (timestamp DESC);
          CREATE INDEX IF NOT EXISTS idx_${config.targetTable}_created_at 
          ON ${tableName} (created_at DESC);
        `;

      case 'sensor_telemetry':
        return `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            pg_sensor_log_id BIGINT PRIMARY KEY,
            event_time TIMESTAMPTZ NOT NULL,
            event_date DATE DEFAULT CURRENT_DATE,
            device_id TEXT,
            owner_code TEXT,
            owner_id UUID,
            project_code TEXT,
            project_id UUID,
            node_id UUID,
            node_code TEXT,
            node_model TEXT,
            sensor_id UUID,
            sensor_label TEXT,
            sensor_catalog TEXT,
            channel_id UUID,
            metric_code TEXT,
            metric_unit TEXT,
            raw_value DOUBLE PRECISION,
            eng_value DOUBLE PRECISION,
            signal_quality SMALLINT DEFAULT 0,
            firmware_version TEXT DEFAULT '',
            iot_log_id UUID,
            processed_at TIMESTAMPTZ,
            min_threshold DOUBLE PRECISION DEFAULT 0,
            max_threshold DOUBLE PRECISION DEFAULT 0,
            synced_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_${config.targetTable}_channel_time 
          ON ${tableName} (channel_id, event_time);
          CREATE INDEX IF NOT EXISTS idx_${config.targetTable}_owner 
          ON ${tableName} (owner_id);
        `;

      case 'sensor_channel_latest':
        return `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            channel_id UUID PRIMARY KEY,
            last_update TIMESTAMPTZ NOT NULL,
            device_id TEXT,
            owner_code TEXT,
            owner_id UUID,
            project_code TEXT,
            project_id UUID,
            node_id UUID,
            node_code TEXT,
            node_model TEXT,
            sensor_id UUID,
            sensor_label TEXT,
            sensor_catalog TEXT,
            metric_code TEXT,
            metric_unit TEXT,
            raw_value DOUBLE PRECISION,
            eng_value DOUBLE PRECISION,
            signal_quality SMALLINT DEFAULT 0,
            last_iot_log_id UUID,
            min_threshold DOUBLE PRECISION DEFAULT 0,
            max_threshold DOUBLE PRECISION DEFAULT 0,
            synced_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_${config.targetTable}_owner 
          ON ${tableName} (owner_id);
          CREATE INDEX IF NOT EXISTS idx_${config.targetTable}_node 
          ON ${tableName} (node_id);
        `;

      default:
        throw new Error(`Unknown sourceType for table creation: ${config.sourceType}`);
    }
  }

  /**
   * Acquire lock for config
   */
  private async acquireLock(configId: string): Promise<void> {
    const result = await this.forwardingDbRepository.update(
      { idOwnerForwardingDb: configId, isRunning: false },
      { isRunning: true, lastRunStartedAt: new Date() },
    );

    if (result.affected === 0) {
      throw new Error('Failed to acquire lock - config may be running');
    }
  }

  /**
   * Release lock for config
   */
  private async releaseLock(configId: string): Promise<void> {
    await this.forwardingDbRepository.update(
      { idOwnerForwardingDb: configId },
      { isRunning: false },
    );
  }

  /**
   * Update config status after successful sync
   */
  private async updateConfigStatus(
    config: OwnerForwardingDatabase,
    result: ForwardingResult,
  ): Promise<void> {
    // Use result.lastSyncedAt if available (for iot_log), otherwise use current time
    const syncedAt = result.lastSyncedAt || new Date();
    
    await this.forwardingDbRepository.update(
      { idOwnerForwardingDb: config.idOwnerForwardingDb },
      {
        lastSyncedId: result.lastSyncedId.toString(),
        lastSyncedAt: syncedAt,
        lastDeliveryAt: new Date(),
        lastStatus: 'success',
        lastError: null,
        totalRecordsSynced: (
          BigInt(config.totalRecordsSynced || '0') + BigInt(result.recordsInserted)
        ).toString(),
        totalSyncCount: (config.totalSyncCount || 0) + 1,
        updatedAt: new Date(),
      },
    );
  }

  /**
   * Update config with error
   */
  private async updateConfigError(
    config: OwnerForwardingDatabase,
    errorMessage: string,
  ): Promise<void> {
    await this.forwardingDbRepository.update(
      { idOwnerForwardingDb: config.idOwnerForwardingDb },
      {
        lastStatus: 'failed',
        lastError: errorMessage.substring(0, 1000), // Limit error message length
        totalErrorCount: (config.totalErrorCount || 0) + 1,
        updatedAt: new Date(),
      },
    );
  }

  /**
   * Create forwarding log entry
   */
  private async createLog(
    config: OwnerForwardingDatabase,
    result: ForwardingResult,
  ): Promise<void> {
    const log = this.forwardingLogRepository.create({
      idOwner: config.idOwner,
      configType: 'database', // Constraint only allows 'webhook' or 'database'
      configId: config.idOwnerForwardingDb,
      status: result.success ? 'success' : 'failed',
      attempts: 1,
      recordsRead: result.recordsRead,
      recordsInserted: result.recordsInserted,
      recordsSkipped: result.recordsSkipped,
      errorMessage: result.error,
      durationMs: result.durationMs,
      fromId: config.lastSyncedId,
      toId: result.lastSyncedId.toString(),
    });

    await this.forwardingLogRepository.save(log);
  }
}
