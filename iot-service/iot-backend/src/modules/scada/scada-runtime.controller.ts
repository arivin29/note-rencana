import { Controller, Get, Param, ParseUUIDPipe, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ScadaRuntimeService } from './scada-runtime.service';
import { ScadaRuntimeResponseDto } from './dto';

@ApiTags('SCADA Runtime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scada/diagrams')
export class ScadaRuntimeController {
  constructor(private readonly scadaRuntimeService: ScadaRuntimeService) {}

  @Get(':diagramId/runtime')
  @ApiOperation({ summary: 'Get SCADA runtime snapshot by diagram ID' })
  @ApiResponse({ status: 200, type: ScadaRuntimeResponseDto })
  getRuntime(
    @Param('diagramId', ParseUUIDPipe) diagramId: string,
    @Request() req: any,
  ): Promise<ScadaRuntimeResponseDto> {
    return this.scadaRuntimeService.getDiagramRuntime(diagramId, req.user);
  }
}
