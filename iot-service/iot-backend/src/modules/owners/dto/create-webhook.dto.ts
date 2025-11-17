import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateWebhookDto {
  @ApiProperty({ description: 'Webhook label', example: 'Command Center Webhook' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Webhook endpoint URL', example: 'https://hooks.example.com/iot/ingest' })
  @IsString()
  @IsNotEmpty()
  endpointUrl: string;

  @ApiProperty({ description: 'HTTP method', enum: ['POST', 'PUT'], example: 'POST' })
  @IsEnum(['POST', 'PUT'])
  httpMethod: string;

  @ApiPropertyOptional({ description: 'Headers as JSON object', example: { 'X-Tenant-Code': 'DEMO' } })
  @IsOptional()
  headersJson?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Secret token for authentication' })
  @IsOptional()
  @IsString()
  secretToken?: string;

  @ApiPropertyOptional({ description: 'Payload template as JSON' })
  @IsOptional()
  payloadTemplate?: Record<string, any>;

  @ApiProperty({ description: 'Max retry count', example: 3 })
  @IsNumber()
  @IsOptional()
  maxRetry?: number;

  @ApiProperty({ description: 'Retry backoff in milliseconds', example: 2000 })
  @IsNumber()
  @IsOptional()
  retryBackoffMs?: number;

  @ApiProperty({ description: 'Is webhook enabled', example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
