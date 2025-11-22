import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MqttService } from '../mqtt/mqtt.service';
import { SendRelayCommandDto, RelayAction } from './dto/send-relay-command.dto';
import { CommandResponseDto } from './dto/command-response.dto';

@Injectable()
export class DeviceCommandsService {
  private readonly logger = new Logger(DeviceCommandsService.name);

  constructor(private readonly mqttService: MqttService) {}

  /**
   * Send relay control command to device
   */
  async sendRelayCommand(dto: SendRelayCommandDto): Promise<CommandResponseDto> {
    // Validate pulse action has duration
    if (dto.action === RelayAction.PULSE && !dto.duration) {
      throw new BadRequestException('Duration is required for PULSE action');
    }

    // Build command payload matching firmware spec
    const payload: any = {
      action: 'relay',
      target: dto.target,
      state: dto.action,
    };

    // Add duration for pulse action
    if (dto.action === RelayAction.PULSE && dto.duration) {
      payload.duration = dto.duration;
    }

    // Publish to MQTT
    const topic = `sensor/${dto.deviceId}/command`;
    
    try {
      await this.mqttService.publish(topic, payload, 1);

      this.logger.log(
        `✅ Sent ${dto.action.toUpperCase()} command to ${dto.deviceId} (${dto.target})`
      );

      return {
        success: true,
        message: 'Command sent successfully',
        topic,
        payload,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send command to ${dto.deviceId}:`,
        error.message
      );
      
      throw new BadRequestException(
        `Failed to send command: ${error.message}`
      );
    }
  }

  /**
   * Get MQTT connection status
   */
  getMqttStatus(): { connected: boolean } {
    return {
      connected: this.mqttService.isClientConnected(),
    };
  }
}
