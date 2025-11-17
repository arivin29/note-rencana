import { ApiProperty } from '@nestjs/swagger';

export class UnpairedDeviceResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the unpaired device',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  idNodeUnpairedDevice: string;

  @ApiProperty({
    description: 'Hardware identifier (IMEI, dev_eui, MAC, serial number)',
    example: '867584050123456',
  })
  hardwareId: string;

  @ApiProperty({
    description: 'Node model ID (auto-detected or manually assigned)',
    example: '123e4567-e89b-12d3-a456-426614174001',
    nullable: true,
  })
  idNodeModel: string | null;

  @ApiProperty({
    description: 'Node model name',
    example: 'LoRaWAN GPS Tracker v2',
    nullable: true,
  })
  nodeModelName?: string | null;

  @ApiProperty({
    description: 'First time this device was seen',
    example: '2025-01-15T10:30:00Z',
  })
  firstSeenAt: Date;

  @ApiProperty({
    description: 'Last time this device sent data',
    example: '2025-01-17T14:45:00Z',
  })
  lastSeenAt: Date;

  @ApiProperty({
    description: 'Last received raw payload from device',
    example: { temperature: 25.5, humidity: 60, battery: 85 },
    nullable: true,
  })
  lastPayload: any;

  @ApiProperty({
    description: 'Last MQTT topic where data was received',
    example: 'devices/lora/867584050123456/up',
    nullable: true,
  })
  lastTopic: string | null;

  @ApiProperty({
    description: 'Number of times this device has sent data',
    example: 42,
  })
  seenCount: number;

  @ApiProperty({
    description: 'Suggested project ID for pairing',
    example: '123e4567-e89b-12d3-a456-426614174002',
    nullable: true,
  })
  suggestedProject: string | null;

  @ApiProperty({
    description: 'Suggested project name',
    example: 'Smart Agriculture - Field A',
    nullable: true,
  })
  suggestedProjectName?: string | null;

  @ApiProperty({
    description: 'Suggested owner ID for pairing',
    example: '123e4567-e89b-12d3-a456-426614174003',
    nullable: true,
  })
  suggestedOwner: string | null;

  @ApiProperty({
    description: 'Suggested owner name',
    example: 'PT. Agritech Indonesia',
    nullable: true,
  })
  suggestedOwnerName?: string | null;

  @ApiProperty({
    description: 'Paired node ID (after device is paired)',
    example: '123e4567-e89b-12d3-a456-426614174004',
    nullable: true,
  })
  pairedNodeId: string | null;

  @ApiProperty({
    description: 'Paired node name',
    example: 'GPS-Tracker-01',
    nullable: true,
  })
  pairedNodeName?: string | null;

  @ApiProperty({
    description: 'Device status',
    enum: ['pending', 'paired', 'ignored'],
    example: 'pending',
  })
  status: 'pending' | 'paired' | 'ignored';
}
