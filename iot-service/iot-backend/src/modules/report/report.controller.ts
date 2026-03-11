import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReportService } from './report.service';
import { ReportExportService } from './report-export.service';
import {
  ReportRequestDto,
  ReportPreviewRequestDto,
} from './dto/report-request.dto';
import {
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
  GenerateFromTemplateDto,
} from './dto/report-template.dto';
import { ReportPreviewResponseDto } from './dto/report-response.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly reportExportService: ReportExportService,
  ) {}

  /**
   * Generate preview with chart data
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate report preview with chart data' })
  @ApiResponse({ status: 200, type: ReportPreviewResponseDto })
  async generatePreview(
    @Body() dto: ReportPreviewRequestDto,
    @Request() req: any,
  ): Promise<ReportPreviewResponseDto> {
    const ownerId = req.user?.owner?.id || req.user?.ownerId;
    return this.reportService.generatePreview(dto, ownerId);
  }

  /**
   * Export to XLSX file
   */
  @Post('export/xlsx')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export report data to XLSX file' })
  @ApiResponse({
    status: 200,
    description: 'Returns XLSX file stream',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async exportXlsx(
    @Body() dto: ReportRequestDto,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const ownerId = req.user?.owner?.id || req.user?.ownerId;
    const { metadata, columns, rows, summary } =
      await this.reportService.generateReportData(dto, ownerId);

    await this.reportExportService.generateXlsx(
      res,
      metadata,
      columns,
      rows,
      summary,
    );
  }

  /**
   * Get all templates for current user
   */
  @Get('templates')
  @ApiOperation({ summary: 'Get all report templates for current user' })
  async getTemplates(@Request() req: any) {
    const ownerId = req.user?.owner?.id || req.user?.ownerId;
    return this.reportService.getTemplates(ownerId);
  }

  /**
   * Get single template by ID
   */
  @Get('templates/:id')
  @ApiOperation({ summary: 'Get report template by ID' })
  async getTemplate(@Param('id') id: string, @Request() req: any) {
    const ownerId = req.user?.owner?.id || req.user?.ownerId;
    return this.reportService.getTemplateById(id, ownerId);
  }

  /**
   * Create new template
   */
  @Post('templates')
  @ApiOperation({ summary: 'Create new report template' })
  async createTemplate(
    @Body() dto: CreateReportTemplateDto,
    @Request() req: any,
  ) {
    const ownerId = req.user?.owner?.id || req.user?.ownerId;
    const userId = req.user?.id;
    return this.reportService.createTemplate(dto, ownerId, userId);
  }

  /**
   * Update template
   */
  @Put('templates/:id')
  @ApiOperation({ summary: 'Update report template' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateReportTemplateDto,
    @Request() req: any,
  ) {
    const ownerId = req.user?.owner?.id || req.user?.ownerId;
    return this.reportService.updateTemplate(id, dto, ownerId);
  }

  /**
   * Delete template
   */
  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete report template' })
  async deleteTemplate(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    const ownerId = req.user?.owner?.id || req.user?.ownerId;
    await this.reportService.deleteTemplate(id, ownerId);
  }

  /**
   * Generate preview from template
   */
  @Post('templates/:id/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate report preview from saved template' })
  async previewFromTemplate(
    @Param('id') id: string,
    @Body() dto: GenerateFromTemplateDto,
    @Request() req: any,
  ): Promise<ReportPreviewResponseDto> {
    const ownerId = req.user?.owner?.id || req.user?.ownerId;
    return this.reportService.generateFromTemplate(id, dto, ownerId);
  }

  /**
   * Export XLSX from template
   */
  @Post('templates/:id/export/xlsx')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export XLSX from saved template' })
  async exportFromTemplate(
    @Param('id') id: string,
    @Body() dto: GenerateFromTemplateDto,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const ownerId = req.user?.owner?.id || req.user?.ownerId;

    const { metadata, columns, rows, summary } =
      await this.reportService.generateReportDataFromTemplate(id, dto, ownerId);

    await this.reportExportService.generateXlsx(
      res,
      metadata,
      columns,
      rows,
      summary,
    );
  }
}
