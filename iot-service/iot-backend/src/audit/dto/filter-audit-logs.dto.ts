import { IsOptional, IsEnum, IsUUID, IsDateString, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction, AuditStatus } from '../entities/audit-log.entity';

export class FilterAuditLogsDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '5e207832-1923-4e0d-8bea-20159c2a5805',
  })
  @IsOptional()
  @IsUUID()
  idUser?: string;

  @ApiPropertyOptional({
    description: 'Filter by action type',
    enum: AuditAction,
    example: AuditAction.CREATE,
  })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({
    description: 'Filter by entity type (e.g., User, Owner, Node)',
    example: 'User',
  })
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity ID',
    example: '5e207832-1923-4e0d-8bea-20159c2a5805',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: AuditStatus,
    example: AuditStatus.SUCCESS,
  })
  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @ApiPropertyOptional({
    description: 'Filter by start date (ISO 8601 format)',
    example: '2025-11-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO 8601 format)',
    example: '2025-11-30T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Search in description, IP, user agent',
    example: 'login',
  })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
