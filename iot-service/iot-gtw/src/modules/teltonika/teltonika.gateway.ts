import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import { TeltonikaService } from './teltonika.service';
import { MqttService } from '../mqtt/mqtt.service';

@Injectable()
export class TeltonikaGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TeltonikaGateway.name);
  private tcpServer: net.Server;
  private isEnabled: boolean;
  private tcpPort: number;
  private activeConnections = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly teltonikaService: TeltonikaService,
    private readonly mqttService: MqttService,
  ) {
    this.isEnabled = this.configService.get<boolean>('teltonika.enabled');
    this.tcpPort = this.configService.get<number>('teltonika.tcpPort');
  }

  async onModuleInit() {
    if (!this.isEnabled) {
      this.logger.warn('Teltonika Gateway is disabled in configuration');
      return;
    }

    await this.startTCPServer();
  }

  async onModuleDestroy() {
    await this.stopTCPServer();
  }

  private async startTCPServer(): Promise<void> {
    this.tcpServer = net.createServer((socket) => {
      this.activeConnections++;
      const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
      
      this.logger.log(`Teltonika device connected [${clientId}] (Total: ${this.activeConnections})`);

      let bufferData = Buffer.alloc(0);
      socket['imei'] = null;

      socket.on('data', async (chunk) => {
        bufferData = Buffer.concat([bufferData, chunk]);
        // Removed verbose debug log for every received chunk

        if (!socket['imei'] && bufferData.length >= 17) {
          const { imei, remainingBuffer } = this.teltonikaService.extractIMEI(bufferData);
          if (imei) {
            socket['imei'] = imei;
            bufferData = Buffer.from(remainingBuffer);
            this.logger.log(`IMEI received: ${imei} from [${clientId}]`);
            socket.write(Buffer.from([0x01]));
          }
        }

        if (this.teltonikaService.isCompleteJSON(bufferData)) {
          try {
            const rawPayload = this.teltonikaService.parseJSON(bufferData);
            
            if (!rawPayload) {
              this.logger.warn(`Invalid JSON from [${clientId}]`);
              socket.write(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
              bufferData = Buffer.alloc(0);
              return;
            }

            const validation = this.teltonikaService.validatePayload(rawPayload);
            if (!validation.valid) {
              this.logger.warn(`Invalid payload from [${clientId}]: ${validation.error}`);
              socket.write(JSON.stringify({ status: 'error', message: validation.error }));
              bufferData = Buffer.alloc(0);
              return;
            }

            if (!rawPayload.imei && socket['imei']) {
              rawPayload.imei = socket['imei'];
            }

            const imei = rawPayload.imei || socket['imei'] || 'unknown';

            const conversionResult = this.teltonikaService.convertToStandardPayload(rawPayload, imei);

            if (!conversionResult.success) {
              this.logger.error(`Conversion failed for [${clientId}]: ${conversionResult.error}`);
              socket.write(JSON.stringify({ status: 'error', message: conversionResult.error }));
              bufferData = Buffer.alloc(0);
              return;
            }

            const deviceId = `HELIO-${imei}`;
            conversionResult.payload.device_id = deviceId;

            await this.publishToMQTT(deviceId, conversionResult.payload);

            socket.write(JSON.stringify({ status: 'ok' }));
            
            this.logger.log(`Published [teltonika] ${deviceId} -> GPS: ${conversionResult.payload.gps.latitude.toFixed(6)}, ${conversionResult.payload.gps.longitude.toFixed(6)}`);

            bufferData = Buffer.alloc(0);

          } catch (error) {
            this.logger.error(`Processing error for [${clientId}]: ${error.message}`, error.stack);
            socket.write(JSON.stringify({ status: 'error', message: 'Processing failed' }));
            bufferData = Buffer.alloc(0);
          }
        }
      });

      socket.on('close', () => {
        this.activeConnections--;
        this.logger.log(`Teltonika device disconnected [${clientId}] IMEI: ${socket['imei'] || 'unknown'} (Total: ${this.activeConnections})`);
      });

      socket.on('error', (err) => {
        this.logger.error(`Socket error [${clientId}]: ${err.message}`);
      });

      socket.on('end', () => {
        this.logger.debug(`Connection ended [${clientId}]`);
        socket.destroy();
      });
    });

    this.tcpServer.listen(this.tcpPort, () => {
      this.logger.log(`Teltonika TCP Gateway listening on port ${this.tcpPort}`);
    });

    this.tcpServer.on('error', (error) => {
      this.logger.error(`TCP server error: ${error.message}`, error.stack);
    });
  }

  private async stopTCPServer(): Promise<void> {
    if (this.tcpServer) {
      this.tcpServer.close(() => {
        this.logger.log('TCP server stopped');
      });
    }
  }

  private async publishToMQTT(deviceId: string, payload: any): Promise<void> {
    try {
      const topic = `sensor/${deviceId}`;
      await this.mqttService.publish(topic, payload);
      // Success logged in main handler with GPS coords
    } catch (error) {
      this.logger.error(`Failed to publish to MQTT: ${error.message}`, error.stack);
      throw error;
    }
  }

  getStats() {
    return {
      enabled: this.isEnabled,
      tcpPort: this.tcpPort,
      activeConnections: this.activeConnections,
    };
  }
}
