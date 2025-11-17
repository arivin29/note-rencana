import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForwardingLogResponseDto {
  @ApiProperty({ description: 'Log unique identifier' })
  idOwnerForwardingLog: string;

  @ApiProperty({ description: 'Owner ID' })
  idOwner: string;

  @ApiProperty({ description: 'Config type (webhook or database)' })
  configType: string;

  @ApiProperty({ description: 'Config ID' })
  configId: string;

  @ApiProperty({ description: 'Delivery status', example: 'success' })
  status: string;

  @ApiProperty({ description: 'Number of attempts', example: 1 })
  attempts: number;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Duration in milliseconds' })
  durationMs?: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}
