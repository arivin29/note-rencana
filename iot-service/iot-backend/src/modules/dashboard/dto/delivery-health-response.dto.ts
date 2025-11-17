import { ApiProperty } from '@nestjs/swagger';

class WebhookHealthItem {
  @ApiProperty({ description: 'Webhook UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  idWebhook: string;

  @ApiProperty({ description: 'Owner name', example: 'PT Adhi Tirta Utama' })
  ownerName: string;

  @ApiProperty({ description: 'Webhook label', example: 'Command Center Webhook' })
  label: string;

  @ApiProperty({ description: 'Webhook name (alias for HTML)', example: 'Command Center Webhook' })
  name: string;

  @ApiProperty({ description: 'Target URL', example: 'https://api.example.com/webhook' })
  url: string;

  @ApiProperty({ description: 'Endpoint (alias for HTML)', example: 'https://api.example.com/webhook' })
  endpoint: string;

  @ApiProperty({ description: 'Health status', enum: ['healthy', 'degraded', 'failed'], example: 'healthy' })
  status: 'healthy' | 'degraded' | 'failed';

  @ApiProperty({ description: 'Success rate percentage (last 24h)', example: 99.2 })
  successRate: number;

  @ApiProperty({ description: 'Total attempts', example: 1250 })
  totalAttempts: number;

  @ApiProperty({ description: 'Successful attempts', example: 1240 })
  successfulAttempts: number;

  @ApiProperty({ description: 'Failed attempts', example: 10 })
  failedAttempts: number;

  @ApiProperty({ description: 'Last sync timestamp', example: '2025-11-15T09:12:00Z' })
  lastSync: Date;

  @ApiProperty({ description: 'Last success (alias for HTML)', example: '2025-11-15T09:12:00Z' })
  lastSuccess: Date;

  @ApiProperty({ description: 'Last sync formatted', example: '09:12 UTC' })
  lastSyncFormatted: string;

  @ApiProperty({ description: 'Webhook enabled status', example: true })
  enabled: boolean;

  @ApiProperty({ description: 'Average response time (ms)', example: 320 })
  avgResponseTime: number;
}

class DatabaseHealthItem {
  @ApiProperty({ description: 'Database UUID', example: '550e8400-e29b-41d4-a716-446655440001' })
  idDatabase: string;

  @ApiProperty({ description: 'Owner name', example: 'PT Garuda Energi' })
  ownerName: string;

  @ApiProperty({ description: 'Database label', example: 'MySQL - Utility Data Lake' })
  label: string;

  @ApiProperty({ description: 'Database name (alias for HTML)', example: 'MySQL - Utility Data Lake' })
  name: string;

  @ApiProperty({ description: 'Database type', enum: ['mysql', 'postgresql'], example: 'mysql' })
  dbType: 'mysql' | 'postgresql';

  @ApiProperty({ description: 'Connection string (alias for HTML)', example: 'mysql://db.example.com:3306' })
  connectionString: string;

  @ApiProperty({ description: 'Database host', example: 'db.example.com' })
  host: string;

  @ApiProperty({ description: 'Health status', enum: ['healthy', 'degraded', 'failed'], example: 'degraded' })
  status: 'healthy' | 'degraded' | 'failed';

  @ApiProperty({ description: 'Success rate percentage (last 24h)', example: 92.7 })
  successRate: number;

  @ApiProperty({ description: 'Total attempts', example: 850 })
  totalAttempts: number;

  @ApiProperty({ description: 'Successful attempts', example: 788 })
  successfulAttempts: number;

  @ApiProperty({ description: 'Failed attempts', example: 62 })
  failedAttempts: number;

  @ApiProperty({ description: 'Last sync timestamp', example: '2025-11-15T09:05:00Z' })
  lastSync: Date;

  @ApiProperty({ description: 'Last success (alias for HTML)', example: '2025-11-15T09:05:00Z' })
  lastSuccess: Date;

  @ApiProperty({ description: 'Last sync formatted', example: '09:05 UTC' })
  lastSyncFormatted: string;

  @ApiProperty({ description: 'Database enabled status', example: true })
  enabled: boolean;
}

export class DeliveryHealthResponseDto {
  @ApiProperty({ description: 'Webhook forwarding health', type: [WebhookHealthItem] })
  webhooks: WebhookHealthItem[];

  @ApiProperty({ description: 'Database forwarding health', type: [DatabaseHealthItem] })
  databases: DatabaseHealthItem[];
}
