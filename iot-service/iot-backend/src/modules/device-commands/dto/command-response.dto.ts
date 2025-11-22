import { ApiProperty } from '@nestjs/swagger';

export class CommandResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Command sent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'MQTT topic used',
    example: 'sensor/A1B2C3D4E5F6/command',
  })
  topic: string;

  @ApiProperty({
    description: 'Command payload sent',
    example: { action: 'relay', target: 'out1', state: 'on' },
  })
  payload: any;

  @ApiProperty({
    description: 'Timestamp when command was sent',
    example: '2025-11-22T10:30:00.000Z',
  })
  timestamp: string;
}
