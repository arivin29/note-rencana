import { Injectable, Logger } from '@nestjs/common';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { OwnerForwardingDatabase } from '../../entities/existing';

export interface TargetDbConnection {
  type: string;
  pool: Pool;
  client: PoolClient;
  query: (sql: string, params?: any[]) => Promise<any>;
  release: () => void;
}

@Injectable()
export class TargetDbConnectorService {
  private readonly logger = new Logger(TargetDbConnectorService.name);

  // Connection pool cache (reuse pools for same host)
  private poolCache: Map<string, Pool> = new Map();

  /**
   * Connect to target database
   */
  async connect(config: OwnerForwardingDatabase): Promise<TargetDbConnection> {
    switch (config.dbType) {
      case 'postgresql':
      case 'postgres':
        return this.connectPostgres(config);
      
      // TODO: Add support for other databases
      // case 'mysql':
      //   return this.connectMysql(config);
      // case 'clickhouse':
      //   return this.connectClickhouse(config);

      default:
        throw new Error(`Unsupported database type: ${config.dbType}`);
    }
  }

  /**
   * Disconnect from target database
   */
  async disconnect(conn: TargetDbConnection): Promise<void> {
    try {
      conn.release();
      this.logger.debug('Connection released back to pool');
    } catch (error) {
      this.logger.error(`Error releasing connection: ${error.message}`);
    }
  }

  /**
   * Connect to PostgreSQL
   */
  private async connectPostgres(config: OwnerForwardingDatabase): Promise<TargetDbConnection> {
    const poolKey = `${config.host}:${config.port}:${config.databaseName}:${config.username}`;
    
    let pool = this.poolCache.get(poolKey);

    if (!pool) {
      this.logger.log(`Creating new pool for: ${config.host}:${config.port}/${config.databaseName}`);

      const poolConfig: PoolConfig = {
        host: config.host,
        port: config.port,
        database: config.databaseName,
        user: config.username,
        password: config.passwordCipher, // TODO: Decrypt in production
        
        // Connection settings
        connectionTimeoutMillis: config.connectionTimeoutMs || 10000,
        statement_timeout: config.queryTimeoutMs || 30000,
        query_timeout: config.queryTimeoutMs || 30000,
        
        // Pool settings
        max: 5, // Max connections per pool
        min: 1,
        idleTimeoutMillis: 30000,
        
        // SSL for Neon and other cloud providers
        ssl: {
          rejectUnauthorized: false, // Allow self-signed certs
        },
      };

      pool = new Pool(poolConfig);

      // Handle pool errors
      pool.on('error', (err) => {
        this.logger.error(`Pool error for ${poolKey}: ${err.message}`);
      });

      this.poolCache.set(poolKey, pool);
    }

    // Get client from pool
    const client = await pool.connect();

    // Test connection
    await client.query('SELECT 1');
    this.logger.debug(`Connected to: ${config.host}:${config.port}/${config.databaseName}`);

    return {
      type: 'postgresql',
      pool,
      client,
      query: async (sql: string, params?: any[]) => {
        return client.query(sql, params);
      },
      release: () => {
        client.release();
      },
    };
  }

  /**
   * Close all pools (for graceful shutdown)
   */
  async closeAllPools(): Promise<void> {
    for (const [key, pool] of this.poolCache.entries()) {
      try {
        await pool.end();
        this.logger.log(`Closed pool: ${key}`);
      } catch (error) {
        this.logger.error(`Error closing pool ${key}: ${error.message}`);
      }
    }
    this.poolCache.clear();
  }

  /**
   * Test connection to target database
   */
  async testConnection(config: OwnerForwardingDatabase): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    const startTime = Date.now();
    let conn: TargetDbConnection | null = null;

    try {
      conn = await this.connect(config);
      
      // Test query
      const result = await conn.query('SELECT NOW() as server_time');
      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        message: `Connected successfully. Server time: ${result.rows[0].server_time}`,
        latencyMs,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        latencyMs: Date.now() - startTime,
      };
    } finally {
      if (conn) {
        await this.disconnect(conn);
      }
    }
  }
}
