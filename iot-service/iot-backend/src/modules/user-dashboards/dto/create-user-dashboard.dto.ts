import { IsUUID, IsString, IsOptional, IsBoolean, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDashboardDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  @IsNotEmpty()
  idUser: string;

  @ApiProperty({ description: 'Project ID', required: false })
  @IsUUID()
  @IsOptional()
  idProject?: string;

  @ApiProperty({ description: 'Dashboard name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Dashboard description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Layout type', example: 'grid', required: false })
  @IsString()
  @IsOptional()
  layoutType?: string;

  @ApiProperty({ description: 'Grid columns', default: 4, required: false })
  @IsNumber()
  @IsOptional()
  gridCols?: number;

  @ApiProperty({ description: 'Is default dashboard', default: false, required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({ description: 'Is public dashboard', default: false, required: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
