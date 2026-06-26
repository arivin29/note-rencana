import { Injectable, Logger } from '@nestjs/common';
import {
  TeltonikaRawPayload,
  TeltonikaStandardPayload,
  TeltonikaParseResult,
} from './dto/teltonika-payload.dto';

@Injectable()
export class TeltonikaService {
  private readonly logger = new Logger(TeltonikaService.name);

  /**
   * Extract IMEI from binary buffer
   * Format: [2 bytes length] + [15 bytes IMEI string]
   */
  extractIMEI(buffer: Buffer): { imei: string | null; remainingBuffer: Buffer } {
    if (buffer.length < 17) {
      return { imei: null, remainingBuffer: buffer };
    }

    const imeiLength = buffer.readUInt16BE(0);
    if (imeiLength !== 15) {
      return { imei: null, remainingBuffer: buffer };
    }

    const imei = buffer.slice(2, 17).toString();
    const remainingBuffer = buffer.slice(17);

    return { imei, remainingBuffer };
  }

  /**
   * Check if buffer contains complete JSON
   */
  isCompleteJSON(buffer: Buffer): boolean {
    const bufferStr = buffer.toString();
    return bufferStr.includes('{') && bufferStr.includes('}');
  }

  /**
   * Parse Teltonika JSON payload
   */
  parseJSON(buffer: Buffer): TeltonikaRawPayload | null {
    try {
      const jsonStr = buffer.toString();
      const jsonData = JSON.parse(jsonStr);
      return jsonData;
    } catch (error) {
      this.logger.warn(`Failed to parse JSON: ${error.message}`);
      return null;
    }
  }

  /**
   * Convert Teltonika raw payload to standard MQTT format
   */
  convertToStandardPayload(
    rawPayload: TeltonikaRawPayload,
    imei: string,
  ): TeltonikaParseResult {
    try {
      // Validate required fields
      if (!rawPayload.state?.reported?.ts || !rawPayload.state?.reported?.latlng) {
        return {
          success: false,
          error: 'Missing required fields: ts or latlng',
        };
      }

      const reported = rawPayload.state.reported;

      // Parse GPS coordinates
      const [latStr, lngStr] = reported.latlng.split(',');
      const latitude = parseFloat(latStr);
      const longitude = parseFloat(lngStr);

      if (isNaN(latitude) || isNaN(longitude)) {
        return {
          success: false,
          error: 'Invalid GPS coordinates',
        };
      }

      // Extract temperature (AVL ID 72 or 67)
      // Temperature is in decidegrees (divide by 10)
      const tempRaw = reported[72] ?? reported[67] ?? null;
      const temperature = tempRaw !== null ? tempRaw / 10 : null;

      // Extract voltage / ADC1 = Analog Input 1 (AVL ID 9, fallback External Voltage 66)
      // Millivolts → divide by 1000
      const voltageRaw = reported[9] ?? reported[66] ?? null;
      const voltage = voltageRaw !== null ? voltageRaw / 1000 : null;

      // Extract ADC2 = Analog Input 2 (AVL ID 6, per FMB130/FMC130 datasheet)
      // Millivolts → divide by 1000
      const adc2Raw = reported[6] ?? null;
      const adc2 = adc2Raw !== null ? adc2Raw / 1000 : null;

      // Convert Unix timestamp (ms) to ISO 8601 UTC string
      const timestampMs = typeof reported.ts === 'number' ? reported.ts : parseInt(reported.ts, 10);
      const timestampUtc = new Date(timestampMs).toISOString();

      // Build standard payload
      const standardPayload: TeltonikaStandardPayload = {
        device_id: imei,
        timestamp: timestampUtc,
        gps: {
          latitude,
          longitude,
          accuracy: 10, // Default accuracy for FM125
        },
        sensors: {},
        metadata: {
          source: 'teltonika',
          model: 'FM125',
          raw_timestamp: reported.ts, // Keep original for debugging
        },
      };

      // Add optional sensor data
      if (temperature !== null) {
        standardPayload.sensors.temperature = temperature;
      }
      if (voltage !== null) {
        standardPayload.sensors.voltage = voltage;
        standardPayload.sensors.adc1 = voltage; // Keep compatibility
      }
      if (adc2 !== null) {
        standardPayload.sensors.adc2 = adc2;
      }

      // Add other AVL IDs if present (extensible)
      Object.keys(reported).forEach((key) => {
        const numKey = parseInt(key, 10);
        if (!isNaN(numKey) && ![6, 9, 66, 67, 72].includes(numKey)) {
          // Store other AVL IDs in metadata
          if (!standardPayload.metadata) {
            standardPayload.metadata = { source: 'teltonika', model: 'FM125' };
          }
          standardPayload.metadata[`avl_${numKey}`] = reported[key];
        }
      });

      // Removed verbose debug log to save storage

      return {
        success: true,
        imei,
        payload: standardPayload,
      };
    } catch (error) {
      this.logger.error(`Conversion error: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate Teltonika payload
   */
  validatePayload(payload: TeltonikaRawPayload): { valid: boolean; error?: string } {
    if (!payload.state?.reported) {
      return { valid: false, error: 'Missing state.reported object' };
    }

    if (!payload.state.reported.ts) {
      return { valid: false, error: 'Missing timestamp (ts)' };
    }

    if (!payload.state.reported.latlng) {
      return { valid: false, error: 'Missing GPS coordinates (latlng)' };
    }

    return { valid: true };
  }
}
