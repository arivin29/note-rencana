import { ApiProperty } from '@nestjs/swagger';

export class UnpairedDeviceStatsDto {
  @ApiProperty({
    description: 'Total unpaired devices',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Number of pending devices',
    example: 25,
  })
  pending: number;

  @ApiProperty({
    description: 'Number of paired devices',
    example: 15,
  })
  paired: number;

  @ApiProperty({
    description: 'Number of ignored devices',
    example: 2,
  })
  ignored: number;

  @ApiProperty({
    description: 'Devices seen in last 24 hours',
    example: 8,
  })
  seenLast24h: number;

  @ApiProperty({
    description: 'Devices seen in last 7 days',
    example: 18,
  })
  seenLast7d: number;

  @ApiProperty({
    description: 'Devices with suggested pairing',
    example: 12,
  })
  withSuggestions: number;
}
