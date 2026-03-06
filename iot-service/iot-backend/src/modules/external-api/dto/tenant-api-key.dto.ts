import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsIP,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { RateLimitPlan } from '../entities/tenant-api-key.entity';

// ============================================
// CREATE API KEY
// ============================================

export class CreateTenantApiKeyDto {
  @ApiProperty({
    description: 'Label for the API key (e.g., "Production", "Development")',
    example: 'Production API Key',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  label: string;

  @ApiPropertyOptional({
    description: 'Description of what this API key is used for',
    example: 'Used for syncing sensor data to our internal dashboard',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Number of days until the API key expires (default: 365)',
    example: 365,
    minimum: 1,
    maximum: 730,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(730) // Max 2 years
  expiresInDays?: number;

  @ApiPropertyOptional({
    description: 'Rate limit plan',
    enum: RateLimitPlan,
    default: RateLimitPlan.BASIC,
  })
  @IsOptional()
  @IsEnum(RateLimitPlan)
  rateLimitPlan?: RateLimitPlan;

  @ApiPropertyOptional({
    description: 'List of IP addresses allowed to use this API key (optional)',
    example: ['103.123.45.67', '192.168.1.0/24'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipWhitelist?: string[];
}

// ============================================
// UPDATE API KEY
// ============================================

export class UpdateTenantApiKeyDto {
  @ApiPropertyOptional({
    description: 'Label for the API key',
    example: 'Production API Key - Updated',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ApiPropertyOptional({
    description: 'Description of what this API key is used for',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the API key is active',
    example: true,
  })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'List of IP addresses allowed to use this API key',
    example: ['103.123.45.67'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipWhitelist?: string[];
}

// ============================================
// RESPONSE DTOs
// ============================================

export class TenantApiKeyResponseDto {
  @ApiProperty({ description: 'API Key ID' })
  idApiKey: string;

  @ApiProperty({ description: 'Label of the API key' })
  label: string;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @ApiProperty({
    description: 'Masked API key prefix for display',
    example: 'tnt_abc1****',
  })
  apiKeyPrefix: string;

  @ApiProperty({ description: 'Rate limit plan', enum: RateLimitPlan })
  rateLimitPlan: RateLimitPlan;

  @ApiProperty({ description: 'Whether the API key is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Expiration date', nullable: true })
  expiresAt: Date | null;

  @ApiPropertyOptional({ description: 'Last time the API key was used', nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty({ description: 'Number of requests made today' })
  requestsToday: number;

  @ApiProperty({ description: 'Total number of requests made' })
  requestsTotal: number;

  @ApiPropertyOptional({ description: 'IP whitelist', type: [String], nullable: true })
  ipWhitelist: string[] | null;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class TenantApiKeyCreatedResponseDto extends TenantApiKeyResponseDto {
  @ApiProperty({
    description: 'The actual API key - ONLY SHOWN ONCE!',
    example: 'tnt_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  })
  apiKey: string;
}

export class CreateApiKeyResultDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Result message' })
  message: string;

  @ApiProperty({ description: 'API Key data', type: TenantApiKeyCreatedResponseDto })
  data: TenantApiKeyCreatedResponseDto;

  @ApiProperty({
    description: 'Warning to save the API key',
    example: 'Simpan API Key ini! Tidak akan ditampilkan lagi.',
  })
  warning: string;
}

export class TenantApiKeyListResponseDto {
  @ApiProperty({ description: 'List of API keys', type: [TenantApiKeyResponseDto] })
  data: TenantApiKeyResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;
}

// ============================================
// ADMIN DTOs
// ============================================

export class AdminCreateTenantApiKeyDto extends CreateTenantApiKeyDto {
  @ApiProperty({
    description: 'User ID to create the API key for',
    example: 'uuid-of-user',
  })
  @IsString()
  userId: string;
}
