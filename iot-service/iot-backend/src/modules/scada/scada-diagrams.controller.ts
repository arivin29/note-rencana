import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { ScadaDiagramsService } from './scada-diagrams.service';
import {
  CreateScadaDiagramDto,
  DuplicateScadaDiagramDto,
  ListScadaDiagramsQueryDto,
  ScadaDiagramDetailResponseDto,
  ScadaDiagramListItemResponseDto,
  UpdateScadaDiagramDto,
} from './dto';

@ApiTags('SCADA Diagrams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scada/diagrams')
export class ScadaDiagramsController {
  constructor(private readonly scadaDiagramsService: ScadaDiagramsService) {}

  @Get()
  @ApiOperation({ summary: 'List SCADA diagrams' })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, type: [ScadaDiagramListItemResponseDto] })
  findAll(
    @Query() query: ListScadaDiagramsQueryDto,
    @Request() req: any,
  ): Promise<ScadaDiagramListItemResponseDto[]> {
    return this.scadaDiagramsService.findAll(query, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a SCADA diagram' })
  @ApiResponse({ status: 201, type: ScadaDiagramDetailResponseDto })
  create(
    @Body() dto: CreateScadaDiagramDto,
    @Request() req: any,
  ): Promise<ScadaDiagramDetailResponseDto> {
    return this.scadaDiagramsService.create(dto, req.user);
  }

  @Get(':diagramId')
  @ApiOperation({ summary: 'Get SCADA diagram detail' })
  @ApiResponse({ status: 200, type: ScadaDiagramDetailResponseDto })
  findOne(
    @Param('diagramId', ParseUUIDPipe) diagramId: string,
    @Request() req: any,
  ): Promise<ScadaDiagramDetailResponseDto> {
    return this.scadaDiagramsService.findOne(diagramId, req.user);
  }

  @Put(':diagramId')
  @ApiOperation({ summary: 'Update SCADA diagram with full payload save' })
  @ApiResponse({ status: 200, type: ScadaDiagramDetailResponseDto })
  update(
    @Param('diagramId', ParseUUIDPipe) diagramId: string,
    @Body() dto: UpdateScadaDiagramDto,
    @Request() req: any,
  ): Promise<ScadaDiagramDetailResponseDto> {
    return this.scadaDiagramsService.update(diagramId, dto, req.user);
  }

  @Post(':diagramId/duplicate')
  @ApiOperation({ summary: 'Duplicate a SCADA diagram' })
  @ApiResponse({ status: 201, type: ScadaDiagramDetailResponseDto })
  duplicate(
    @Param('diagramId', ParseUUIDPipe) diagramId: string,
    @Body() dto: DuplicateScadaDiagramDto,
    @Request() req: any,
  ): Promise<ScadaDiagramDetailResponseDto> {
    return this.scadaDiagramsService.duplicate(diagramId, dto, req.user);
  }

  @Delete(':diagramId')
  @ApiOperation({ summary: 'Archive a SCADA diagram' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  archive(
    @Param('diagramId', ParseUUIDPipe) diagramId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    return this.scadaDiagramsService.archive(diagramId, req.user);
  }
}
