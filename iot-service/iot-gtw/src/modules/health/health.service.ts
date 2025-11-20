import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MqttService } from '../mqtt/mqtt.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly mqttService: MqttService,
  ) {}

  /**
   * Check all services
   */
  async checkAll() {
    const database = await this.checkDatabase();
    const mqtt = await this.checkMqtt();

    const isHealthy = database.status === 'ok' && mqtt.status === 'ok';

    return {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        database,
        mqtt,
      },
    };
  }

  /**
   * Check database connection
   */
  async checkDatabase() {
    try {
      // Execute a simple query to check if database is accessible
      await this.dataSource.query('SELECT 1');

      return {
        status: 'ok',
        message: 'Database connection is healthy',
        details: {
          isConnected: this.dataSource.isInitialized,
          database: this.dataSource.options.database,
        },
      };
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);

      return {
        status: 'error',
        message: 'Database connection failed',
        error: error.message,
      };
    }
  }

  /**
   * Check MQTT connection
   */
  async checkMqtt() {
    try {
      const status = this.mqttService.getConnectionStatus();

      if (status.connected) {
        return {
          status: 'ok',
          message: 'MQTT connection is healthy',
          details: status,
        };
      } else {
        return {
          status: 'error',
          message: 'MQTT is not connected',
          details: status,
        };
      }
    } catch (error) {
      this.logger.error(`MQTT health check failed: ${error.message}`);

      return {
        status: 'error',
        message: 'MQTT health check failed',
        error: error.message,
      };
    }
  }
}
