import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ScadaBindingOptionsService } from './scada-binding-options.service';
import { ScadaBindingOptionItemDto, ScadaBindingOptionsQueryDto } from './dto';

@ApiTags('SCADA Binding Options')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scada/binding-options')
export class ScadaBindingOptionsController {
  constructor(private readonly scadaBindingOptionsService: ScadaBindingOptionsService) {}

  @Get()
  @ApiOperation({ summary: 'List bindable sensor channels for SCADA editor' })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'sensorTypeId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, type: [ScadaBindingOptionItemDto] })
  findAll(
    @Query() query: ScadaBindingOptionsQueryDto,
    @Request() req: any,
  ): Promise<ScadaBindingOptionItemDto[]> {
    return this.scadaBindingOptionsService.findAll(query, req.user);
  }
}
