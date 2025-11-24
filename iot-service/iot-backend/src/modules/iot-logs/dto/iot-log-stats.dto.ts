import { ApiProperty } from '@nestjs/swagger';

export class IotLogStatsDto {
  @ApiProperty({
    example: 1234,
    description: 'Total number of IoT logs',
  })
  total: number;

  @ApiProperty({
    example: 900,
    description: 'Number of processed logs',
  })
  processed: number;

  @ApiProperty({
    example: 334,
    description: 'Number of unprocessed logs',
  })
  unprocessed: number;

  @ApiProperty({
    example: {
      telemetry: 800,
      event: 150,
      pairing: 50,
      error: 100,
      warning: 50,
      command: 30,
      response: 20,
      debug: 20,
      info: 10,
      log: 4,
    },
    description: 'Count of logs grouped by label/category',
  })
  byLabel: Record<string, number>;
}
