import { ApiProperty } from '@nestjs/swagger';

class TelemetryChartSeries {
  @ApiProperty({ description: 'Series name', example: 'Flow Channels' })
  name: string;

  @ApiProperty({ description: 'Data points per hour', type: [Number], example: [90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145] })
  data: number[];
}

class TelemetryChart {
  @ApiProperty({ description: 'Time labels (hourly)', type: [String], example: ['00:00', '01:00', '02:00', '03:00'] })
  labels: string[];

  @ApiProperty({ description: 'Data series', type: [TelemetryChartSeries] })
  series: TelemetryChartSeries[];
}

class IngestionStats {
  @ApiProperty({ description: 'Success rate percentage', example: 99.4 })
  successRate: number;

  @ApiProperty({ description: 'Total packets per minute', example: 12400 })
  totalPackets: number;

  @ApiProperty({ description: 'Dropped packets count', example: 72 })
  droppedPackets: number;

  @ApiProperty({ description: 'Average latency in milliseconds', example: 420 })
  avgLatency: number;
}

class ForwardingStats {
  @ApiProperty({ description: 'Total forwarded count', example: 4200 })
  totalForwarded: number;

  @ApiProperty({ description: 'Webhook forwarded count', example: 2800 })
  webhookCount: number;

  @ApiProperty({ description: 'Database batch count', example: 1400 })
  dbBatchCount: number;

  @ApiProperty({ description: 'Webhook success rate', example: 99.2 })
  webhookSuccessRate: number;

  @ApiProperty({ description: 'Database success rate', example: 92.7 })
  dbSuccessRate: number;
}

class TelemetryStats {
  @ApiProperty({ description: 'Ingestion statistics', type: IngestionStats })
  ingestion: IngestionStats;

  @ApiProperty({ description: 'Forwarding statistics', type: ForwardingStats })
  forwarding: ForwardingStats;

  // Convenience properties for HTML templates
  @ApiProperty({ description: 'Total ingested (convenience)', example: 12400 })
  totalIngested: number;

  @ApiProperty({ description: 'Total forwarded (convenience)', example: 4200 })
  totalForwarded: number;

  @ApiProperty({ description: 'Success rate (convenience)', example: 99.4 })
  successRate: number;
}

export class TelemetryStreamsResponseDto {
  @ApiProperty({ description: 'Chart data with hourly series', type: TelemetryChart })
  chart: TelemetryChart;

  @ApiProperty({ description: 'Ingestion and forwarding statistics', type: TelemetryStats })
  stats: TelemetryStats;
}
