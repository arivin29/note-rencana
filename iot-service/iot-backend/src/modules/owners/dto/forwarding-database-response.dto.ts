import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForwardingDatabaseResponseDto {
  @ApiProperty({ description: 'Database config unique identifier' })
  idOwnerForwardingDb: string;

  @ApiProperty({ description: 'Owner ID' })
  idOwner: string;

  @ApiProperty({ description: 'Database config label' })
  label: string;

  @ApiProperty({ description: 'Database type', example: 'mysql' })
  dbType: string;

  @ApiProperty({ description: 'Database host' })
  host: string;

  @ApiProperty({ description: 'Database port', example: 3306 })
  port: number;

  @ApiProperty({ description: 'Database name' })
  databaseName: string;

  @ApiProperty({ description: 'Database username' })
  username: string;

  @ApiProperty({ description: 'Password (masked)', example: '********' })
  passwordCipher: string;

  @ApiPropertyOptional({ description: 'Target schema' })
  targetSchema?: string;

  @ApiProperty({ description: 'Target table name' })
  targetTable: string;

  @ApiProperty({ description: 'Write mode', example: 'append' })
  writeMode: string;

  @ApiProperty({ description: 'Batch size', example: 100 })
  batchSize: number;

  @ApiProperty({ description: 'Is database config enabled', example: true })
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
