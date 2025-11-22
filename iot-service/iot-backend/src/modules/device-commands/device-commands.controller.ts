import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DeviceCommandsService } from './device-commands.service';
import { SendRelayCommandDto } from './dto/send-relay-command.dto';
import { CommandResponseDto } from './dto/command-response.dto';

@ApiTags('Device Commands')
@Controller('device-commands')
export class DeviceCommandsController {
  constructor(private readonly deviceCommandsService: DeviceCommandsService) {}

  @Post('relay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send relay control command to device',
    description: 'Sends a relay control command (ON/OFF/PULSE) to a specific device via MQTT',
  })
  @ApiResponse({
    status: 200,
    description: 'Command sent successfully',
    type: CommandResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters or MQTT connection failed',
  })
  async sendRelayCommand(
    @Body() dto: SendRelayCommandDto
  ): Promise<CommandResponseDto> {
    return this.deviceCommandsService.sendRelayCommand(dto);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get MQTT connection status',
    description: 'Check if the backend is connected to MQTT broker',
  })
  @ApiResponse({
    status: 200,
    description: 'MQTT connection status',
    schema: {
      type: 'object',
      properties: {
        connected: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  getMqttStatus() {
    return this.deviceCommandsService.getMqttStatus();
  }
}
