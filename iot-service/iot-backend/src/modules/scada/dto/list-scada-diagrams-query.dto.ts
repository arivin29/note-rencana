import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

const VALID_DIAGRAM_STATUSES = ['draft', 'active', 'archived'] as const;

export class ListScadaDiagramsQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsIn(VALID_DIAGRAM_STATUSES)
  @IsOptional()
  @MaxLength(20)
  status?: string;
}
