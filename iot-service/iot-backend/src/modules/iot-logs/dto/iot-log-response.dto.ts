import { ApiProperty } from '@nestjs/swagger';

export class IotLogResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'NODE-001', description: 'Device ID (node code)' })
  deviceId: string;

  @ApiProperty({ example: 'telemetry', enum: ['telemetry', 'event', 'pairing', 'error', 'warning', 'command', 'response', 'debug', 'info', 'log'] })
  label: string;

  @ApiProperty({ example: 'device/NODE-001/telemetry', required: false })
  topic?: string;

  @ApiProperty({ example: { temperature: 25.5, humidity: 60 } })
  payload: Record<string, any>;

  @ApiProperty({ example: false })
  processed: boolean;

  @ApiProperty({ example: 'Some notes', required: false })
  notes?: string;

  @ApiProperty({ example: '2025-11-23T10:00:00.000Z' })
  timestamp: Date;

  @ApiProperty({ example: '2025-11-23T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-11-23T10:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Associated node information',
    required: false,
    example: {
      idNode: '123e4567-e89b-12d3-a456-426614174002',
      code: 'NODE-001',
      idProject: '123e4567-e89b-12d3-a456-426614174001',
    },
  })
  node?: {
    idNode: string;
    code: string;
    idProject: string;
    project?: {
      idProject: string;
      name: string;
      idOwner: string;
      owner?: {
        idOwner: string;
        name: string;
      };
    };
  };
}
