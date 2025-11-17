import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsNumber, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';

export class CreateDatabaseDto {
  @ApiProperty({ description: 'Database configuration label', example: 'MySQL Data Warehouse' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Database type', enum: ['mysql', 'postgresql'], example: 'mysql' })
  @IsEnum(['mysql', 'postgresql'])
  dbType: string;

  @ApiProperty({ description: 'Database host', example: 'mysql-fw.adhiwater.local' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiProperty({ description: 'Database port', example: 3306 })
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiProperty({ description: 'Database name', example: 'iot_forwarder' })
  @IsString()
  @IsNotEmpty()
  databaseName: string;

  @ApiProperty({ description: 'Database username', example: 'forwarder' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Database password (will be encrypted)', example: 'securepass123' })
  @IsString()
  @IsNotEmpty()
  passwordCipher: string;

  @ApiPropertyOptional({ description: 'Target schema (for PostgreSQL)', example: 'public' })
  @IsOptional()
  @IsString()
  targetSchema?: string;

  @ApiProperty({ description: 'Target table name', example: 'telemetry_logs' })
  @IsString()
  @IsNotEmpty()
  targetTable: string;

  @ApiProperty({ description: 'Write mode', enum: ['append', 'upsert', 'replace'], example: 'append' })
  @IsEnum(['append', 'upsert', 'replace'])
  @IsOptional()
  writeMode?: string;

  @ApiProperty({ description: 'Batch size for bulk inserts', example: 200 })
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  batchSize?: number;

  @ApiProperty({ description: 'Is database forwarding enabled', example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
