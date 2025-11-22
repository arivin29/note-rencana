import { Injectable, Logger } from '@nestjs/common';
import { NodeProfileMapping } from '../../entities/existing';
import { ParsedTelemetry, ParsedSensorData, ParsedChannelValue } from './interfaces/parsed-telemetry.interface';

@Injectable()
export class TelemetryParserService {
  private readonly logger = new Logger(TelemetryParserService.name);

  /**
   * Parse payload menggunakan node profile mapping
   */
  parse(payload: Record<string, any>, mapping: NodeProfileMapping): ParsedTelemetry {
    const errors: string[] = [];
    const startTime = Date.now();

    try {
      // Extract device ID from metadata mapping
      const deviceId = this.extractDeviceId(payload, mapping, errors);

      // Extract timestamp from metadata mapping
      const timestamp = this.extractTimestamp(payload, mapping, errors);

      // Parse sensors and channels
      const sensors: ParsedSensorData[] = [];

      if (mapping.sensors && Array.isArray(mapping.sensors)) {
        for (const sensorConfig of mapping.sensors) {
          const parsedSensor = this.parseSensor(payload, sensorConfig, errors);
          sensors.push(parsedSensor);
        }
      } else {
        errors.push('No sensors configuration found in mapping');
      }

      // Extract metadata (signal quality, etc)
      const metadata = this.extractMetadata(payload, mapping);

      const result: ParsedTelemetry = {
        deviceId,
        timestamp,
        sensors,
        metadata,
        parseErrors: errors,
      };

      const duration = Date.now() - startTime;
      this.logger.debug(`Parsed telemetry in ${duration}ms. Sensors: ${sensors.length}, Errors: ${errors.length}`);

      return result;
    } catch (error) {
      this.logger.error(`Critical error during parsing: ${error.message}`, error.stack);
      errors.push(`Critical parsing error: ${error.message}`);

      return {
        deviceId: 'unknown',
        timestamp: new Date(),
        sensors: [],
        metadata: {},
        parseErrors: errors,
      };
    }
  }

  /**
   * Extract device ID from payload using metadata mapping
   */
  private extractDeviceId(
    payload: Record<string, any>,
    mapping: NodeProfileMapping,
    errors: string[],
  ): string {
    try {
      if (mapping.metadata?.deviceId?.path) {
        const value = this.getValueByPath(payload, mapping.metadata.deviceId.path);
        if (value !== undefined && value !== null) {
          return String(value);
        }
      }

      // Fallback: try common device ID fields
      const fallbackFields = ['device_id', 'deviceId', 'dev_eui', 'devEui', 'node_id', 'nodeId'];
      for (const field of fallbackFields) {
        const value = this.getValueByPath(payload, field);
        if (value !== undefined && value !== null) {
          this.logger.warn(`Device ID extracted from fallback field: ${field}`);
          return String(value);
        }
      }

      errors.push('Device ID not found in payload');
      return 'unknown';
    } catch (error) {
      errors.push(`Error extracting device ID: ${error.message}`);
      return 'unknown';
    }
  }

  /**
   * Extract timestamp from payload using metadata mapping
   */
  private extractTimestamp(
    payload: Record<string, any>,
    mapping: NodeProfileMapping,
    errors: string[],
  ): Date {
    try {
      if (mapping.metadata?.timestamp?.path) {
        const value = this.getValueByPath(payload, mapping.metadata.timestamp.path);
        if (value !== undefined && value !== null) {
          // Handle different timestamp formats
          if (typeof value === 'number') {
            // Unix timestamp (seconds or milliseconds)
            const timestamp = value > 10000000000 ? value : value * 1000;
            return new Date(timestamp);
          } else if (typeof value === 'string') {
            return new Date(value);
          }
        }
      }

      // Fallback: try common timestamp fields
      const fallbackFields = ['timestamp', 'ts', 'time', 'datetime'];
      for (const field of fallbackFields) {
        const value = this.getValueByPath(payload, field);
        if (value !== undefined && value !== null) {
          if (typeof value === 'number') {
            const timestamp = value > 10000000000 ? value : value * 1000;
            return new Date(timestamp);
          } else if (typeof value === 'string') {
            return new Date(value);
          }
        }
      }

      // Fallback to current time
      errors.push('Timestamp not found in payload, using current time');
      return new Date();
    } catch (error) {
      errors.push(`Error extracting timestamp: ${error.message}`);
      return new Date();
    }
  }

  /**
   * Parse single sensor configuration
   */
  private parseSensor(
    payload: Record<string, any>,
    sensorConfig: any,
    errors: string[],
  ): ParsedSensorData {
    const channels: ParsedChannelValue[] = [];

    if (sensorConfig.channels && Array.isArray(sensorConfig.channels)) {
      for (const channelConfig of sensorConfig.channels) {
        const parsedChannel = this.parseChannel(payload, channelConfig, errors);
        channels.push(parsedChannel);
      }
    } else {
      errors.push(`No channels found for sensor: ${sensorConfig.label}`);
    }

    return {
      sensorLabel: sensorConfig.label || 'Unknown',
      catalogId: sensorConfig.catalogId || null,
      channels,
    };
  }

  /**
   * Parse single channel and extract value from payload
   */
  private parseChannel(
    payload: Record<string, any>,
    channelConfig: any,
    errors: string[],
  ): ParsedChannelValue {
    const channelCode = channelConfig.channelCode;
    const payloadPath = channelConfig.payloadPath;
    const unit = channelConfig.unit || '';

    try {
      const value = this.getValueByPath(payload, payloadPath);

      if (value === undefined || value === null) {
        return {
          channelCode,
          value: null,
          unit,
          payloadPath,
          parseSuccess: false,
          parseError: `Value not found at path: ${payloadPath}`,
        };
      }

      // Convert to number
      const numericValue = this.toNumber(value);

      if (numericValue === null) {
        return {
          channelCode,
          value: null,
          unit,
          payloadPath,
          parseSuccess: false,
          parseError: `Cannot convert value to number: ${value}`,
        };
      }

      return {
        channelCode,
        value: numericValue,
        unit,
        payloadPath,
        parseSuccess: true,
      };
    } catch (error) {
      errors.push(`Error parsing channel ${channelCode}: ${error.message}`);
      return {
        channelCode,
        value: null,
        unit,
        payloadPath,
        parseSuccess: false,
        parseError: error.message,
      };
    }
  }

  /**
   * Extract metadata fields (signal quality, etc)
   */
  private extractMetadata(
    payload: Record<string, any>,
    mapping: NodeProfileMapping,
  ): Record<string, any> {
    const metadata: Record<string, any> = {};

    if (mapping.metadata?.signalQuality?.path) {
      const value = this.getValueByPath(payload, mapping.metadata.signalQuality.path);
      if (value !== undefined && value !== null) {
        metadata.signalQuality = this.toNumber(value);
      }
    }

    return metadata;
  }

  /**
   * Get value from nested object using dot notation path
   * Example: "battery.voltage" -> payload.battery.voltage
   */
  private getValueByPath(obj: Record<string, any>, path: string): any {
    if (!path || !obj) {
      return undefined;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Convert value to number safely
   */
  private toNumber(value: any): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number') {
      return isNaN(value) ? null : value;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    return null;
  }
}
