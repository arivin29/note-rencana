import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForwardingWebhookResponseDto {
  @ApiProperty({ description: 'Webhook unique identifier' })
  idOwnerForwardingWebhook: string;

  @ApiProperty({ description: 'Owner ID' })
  idOwner: string;

  @ApiProperty({ description: 'Webhook label' })
  label: string;

  @ApiProperty({ description: 'Webhook endpoint URL' })
  endpointUrl: string;

  @ApiProperty({ description: 'HTTP method', example: 'POST' })
  httpMethod: string;

  @ApiPropertyOptional({ description: 'Headers as JSON object' })
  headersJson?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Secret token for authentication' })
  secretToken?: string;

  @ApiPropertyOptional({ description: 'Payload template as JSON' })
  payloadTemplate?: Record<string, any>;

  @ApiProperty({ description: 'Max retry count', example: 3 })
  maxRetry: number;

  @ApiProperty({ description: 'Retry backoff in milliseconds', example: 2000 })
  retryBackoffMs: number;

  @ApiProperty({ description: 'Is webhook enabled', example: true })
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Last delivery status' })
  lastStatus?: string;

  @ApiPropertyOptional({ description: 'Last delivery timestamp' })
  lastDeliveryAt?: string;

  @ApiPropertyOptional({ description: 'Last error message' })
  lastError?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: string;
}
