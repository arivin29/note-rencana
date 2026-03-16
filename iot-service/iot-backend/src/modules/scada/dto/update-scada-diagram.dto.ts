import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScadaDiagramMetaUpdateDto } from './update-scada-diagram-meta.dto';
import { ScadaEdgePayloadDto, ScadaNodePayloadDto } from './scada-diagram.dto';

export class UpdateScadaDiagramDto {
  @ApiProperty({ type: () => ScadaDiagramMetaUpdateDto })
  @ValidateNested()
  @Type(() => ScadaDiagramMetaUpdateDto)
  @IsNotEmpty()
  diagram: ScadaDiagramMetaUpdateDto;

  @ApiProperty({ type: () => [ScadaNodePayloadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScadaNodePayloadDto)
  nodes: ScadaNodePayloadDto[];

  @ApiProperty({ type: () => [ScadaEdgePayloadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScadaEdgePayloadDto)
  @IsOptional()
  edges?: ScadaEdgePayloadDto[];
}
