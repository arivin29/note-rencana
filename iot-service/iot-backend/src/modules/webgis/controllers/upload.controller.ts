import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UploadService } from '../services/upload.service';
import {
  SubmitMappingDto,
  UploadStatusResponseDto,
  ParsedResultResponseDto,
} from '../dto';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIMETYPES = [
  'application/json',
  'application/geo+json',
  'text/csv',
  'application/vnd.google-earth.kml+xml',
  'application/zip',
  'application/octet-stream',
];

@ApiTags('WebGIS - Upload')
@ApiBearerAuth()
@Controller('webgis/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      // Check file extension
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      const allowedExts = ['geojson', 'json', 'csv', 'kml', 'zip', 'gpkg'];
      if (!ext || !allowedExts.includes(ext)) {
        return cb(new BadRequestException(`Unsupported file type: ${ext}`), false);
      }
      cb(null, true);
    },
  }))
  @ApiOperation({ summary: 'Upload spatial data file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Spatial file (GeoJSON, CSV, KML, Shapefile ZIP)',
        },
        projectId: {
          type: 'string',
          description: 'Optional project ID',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, type: UploadStatusResponseDto })
  async upload(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId?: string,
  ): Promise<UploadStatusResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const ownerId = req.user?.idOwner;
    if (!ownerId) {
      throw new BadRequestException('Owner ID is required');
    }

    return this.uploadService.createUpload(file, ownerId, projectId, req.user?.id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get upload status' })
  @ApiResponse({ status: 200, type: UploadStatusResponseDto })
  async getStatus(@Param('id', ParseUUIDPipe) id: string): Promise<UploadStatusResponseDto> {
    return this.uploadService.getStatus(id);
  }

  @Get(':id/parsed')
  @ApiOperation({ summary: 'Get parsed result with field suggestions' })
  @ApiQuery({ name: 'categoryCode', required: false, description: 'Category code for field mapping suggestions' })
  @ApiResponse({ status: 200, type: ParsedResultResponseDto })
  async getParsedResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('categoryCode') categoryCode?: string,
  ): Promise<ParsedResultResponseDto> {
    return this.uploadService.getParsedResult(id, categoryCode);
  }

  @Post(':id/mapping')
  @ApiOperation({ summary: 'Submit field mapping and create layer' })
  @ApiResponse({ status: 201, description: 'Layer created from upload' })
  async submitMapping(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitMappingDto,
  ): Promise<{ idLayer: string; featureCount: number }> {
    return this.uploadService.submitMapping(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel upload and delete file' })
  @ApiResponse({ status: 200, description: 'Upload cancelled' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    await this.uploadService.remove(id);
    return { success: true };
  }
}
