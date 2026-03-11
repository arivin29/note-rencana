import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import {
  ReportColumnDto,
  ReportRowDto,
  SensorSummaryDto,
  ReportMetadataDto,
} from './dto/report-response.dto';

@Injectable()
export class ReportExportService {
  private readonly logger = new Logger(ReportExportService.name);

  /**
   * Generate XLSX file and stream to response
   */
  async generateXlsx(
    res: Response,
    metadata: ReportMetadataDto,
    columns: ReportColumnDto[],
    rows: ReportRowDto[],
    summary: SensorSummaryDto[],
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IoT Report System';
    workbook.created = new Date();

    // Sheet 1: Data
    this.addDataSheet(workbook, columns, rows);

    // Sheet 2: Summary
    this.addSummarySheet(workbook, summary);

    // Sheet 3: Info
    this.addInfoSheet(workbook, metadata, columns.length - 1); // -1 for timestamp column

    // Set response headers
    const filename = `report-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response stream
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Add Data sheet with all telemetry data
   */
  private addDataSheet(
    workbook: ExcelJS.Workbook,
    columns: ReportColumnDto[],
    rows: ReportRowDto[],
  ): void {
    const sheet = workbook.addWorksheet('Data', {
      views: [{ state: 'frozen', ySplit: 1 }], // Freeze header row
    });

    // Define columns with width
    sheet.columns = columns.map((col) => ({
      header: col.unit ? `${col.label} (${col.unit})` : col.label,
      key: col.key,
      width: col.key === 'timestamp' ? 22 : 18,
    }));

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }, // Blue background
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 24;

    // Add data rows
    for (const row of rows) {
      const rowData: Record<string, any> = {
        timestamp: this.formatTimestamp(row.timestamp),
      };

      for (const col of columns) {
        if (col.key !== 'timestamp') {
          rowData[col.key] = row.values[col.key] ?? '';
        }
      }

      const excelRow = sheet.addRow(rowData);

      // Format number cells
      for (let i = 2; i <= columns.length; i++) {
        const cell = excelRow.getCell(i);
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.000';
        }
      }
    }

    // Add borders to all cells
    this.addBorders(sheet, 1, rows.length + 1, columns.length);

    // Auto-filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rows.length + 1, column: columns.length },
    };
  }

  /**
   * Add Summary sheet with statistics
   */
  private addSummarySheet(
    workbook: ExcelJS.Workbook,
    summary: SensorSummaryDto[],
  ): void {
    const sheet = workbook.addWorksheet('Summary');

    // Define columns
    sheet.columns = [
      { header: 'Sensor', key: 'sensor', width: 35 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Min', key: 'min', width: 15 },
      { header: 'Avg', key: 'avg', width: 15 },
      { header: 'Max', key: 'max', width: 15 },
      { header: 'Data Points', key: 'count', width: 15 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' }, // Green background
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 24;

    // Add data rows
    for (const item of summary) {
      const row = sheet.addRow({
        sensor: item.label,
        unit: item.unit || '-',
        min: item.min,
        avg: item.avg,
        max: item.max,
        count: item.count,
      });

      // Format number cells
      for (let i = 3; i <= 5; i++) {
        row.getCell(i).numFmt = '#,##0.000';
      }
      row.getCell(6).numFmt = '#,##0';
    }

    // Add borders
    this.addBorders(sheet, 1, summary.length + 1, 6);
  }

  /**
   * Add Info sheet with report metadata
   */
  private addInfoSheet(
    workbook: ExcelJS.Workbook,
    metadata: ReportMetadataDto,
    sensorCount: number,
  ): void {
    const sheet = workbook.addWorksheet('Report Info');

    // Set column widths
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 45;

    // Title
    sheet.mergeCells('A1:B1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Report Information';
    titleCell.font = { bold: true, size: 14 };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' },
    };
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Info rows
    const infoData = [
      ['Generated At', this.formatTimestamp(metadata.generatedAt)],
      ['Date Range Start', this.formatTimestamp(metadata.startDate)],
      ['Date Range End', this.formatTimestamp(metadata.endDate)],
      ['Aggregation Mode', this.formatAggregation(metadata.aggregation)],
      ['Total Data Points', metadata.totalPoints.toLocaleString()],
      ['Number of Sensors', sensorCount.toString()],
      ['Project', metadata.projectName || '-'],
      ['Nodes', metadata.nodeNames?.join(', ') || '-'],
    ];

    let rowNum = 3;
    for (const [label, value] of infoData) {
      const row = sheet.getRow(rowNum);
      row.getCell(1).value = label;
      row.getCell(1).font = { bold: true };
      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };
      row.getCell(2).value = value;
      rowNum++;
    }

    // Add borders
    this.addBorders(sheet, 3, rowNum - 1, 2);
  }

  /**
   * Add borders to a range of cells
   */
  private addBorders(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    endRow: number,
    colCount: number,
  ): void {
    const border: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };

    for (let row = startRow; row <= endRow; row++) {
      for (let col = 1; col <= colCount; col++) {
        sheet.getRow(row).getCell(col).border = border;
      }
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(ts: string): string {
    try {
      const date = new Date(ts);
      return date.toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return ts;
    }
  }

  /**
   * Format aggregation mode for display
   */
  private formatAggregation(agg: string): string {
    const map: Record<string, string> = {
      raw: 'Raw Data',
      '1m': 'Per 1 Minute',
      '10m': 'Per 10 Minutes',
      '1h': 'Per 1 Hour',
      '1d': 'Per 1 Day',
    };
    return map[agg] || agg;
  }
}
