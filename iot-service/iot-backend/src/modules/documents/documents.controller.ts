import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto, DocumentResponseDto, QueryDocumentsDto } from './documents.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'fromModule', 'fromModuleId'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'File to upload' },
        fromModule: { type: 'string', description: 'Module name (e.g., project, node, map_layer)' },
        fromModuleId: { type: 'string', format: 'uuid', description: 'Module entity ID' },
        documentType: { type: 'string', description: 'Optional document type override' },
        metadata: { type: 'string', description: 'Optional JSON metadata' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully', type: DocumentResponseDto })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: any,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentsService.upload(
      file,
      dto,
      user.idOwner,
      user.sub,
    );

    return {
      idDocument: document.idDocument,
      idOwner: document.idOwner,
      fromModule: document.fromModule,
      fromModuleId: document.fromModuleId,
      originalFilename: document.originalFilename,
      storedFilename: document.storedFilename,
      filePath: document.filePath,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      fileExtension: document.fileExtension,
      documentType: document.documentType,
      status: document.status,
      metadata: document.metadata,
      createdAt: document.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Query documents' })
  @ApiResponse({ status: 200, description: 'List of documents', type: [DocumentResponseDto] })
  async findAll(
    @Query() query: QueryDocumentsDto,
    @CurrentUser() user: any,
  ): Promise<DocumentResponseDto[]> {
    const documents = await this.documentsService.findByQuery(query, user.idOwner);
    return documents.map(doc => ({
      idDocument: doc.idDocument,
      idOwner: doc.idOwner,
      fromModule: doc.fromModule,
      fromModuleId: doc.fromModuleId,
      originalFilename: doc.originalFilename,
      storedFilename: doc.storedFilename,
      filePath: doc.filePath,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      fileExtension: doc.fileExtension,
      documentType: doc.documentType,
      status: doc.status,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
    }));
  }

  @Get(':fromModule/:fromModuleId')
  @ApiOperation({ summary: 'Get documents by module and module ID' })
  @ApiResponse({ status: 200, description: 'List of documents for the module', type: [DocumentResponseDto] })
  async findByModule(
    @Param('fromModule') fromModule: string,
    @Param('fromModuleId', ParseUUIDPipe) fromModuleId: string,
    @CurrentUser() user: any,
  ): Promise<DocumentResponseDto[]> {
    const documents = await this.documentsService.findByModule(fromModule, fromModuleId, user.idOwner);
    return documents.map(doc => ({
      idDocument: doc.idDocument,
      idOwner: doc.idOwner,
      fromModule: doc.fromModule,
      fromModuleId: doc.fromModuleId,
      originalFilename: doc.originalFilename,
      storedFilename: doc.storedFilename,
      filePath: doc.filePath,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      fileExtension: doc.fileExtension,
      documentType: doc.documentType,
      status: doc.status,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
    }));
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document found', type: DocumentResponseDto })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentResponseDto> {
    const doc = await this.documentsService.findById(id);
    return {
      idDocument: doc.idDocument,
      idOwner: doc.idOwner,
      fromModule: doc.fromModule,
      fromModuleId: doc.fromModuleId,
      originalFilename: doc.originalFilename,
      storedFilename: doc.storedFilename,
      filePath: doc.filePath,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      fileExtension: doc.fileExtension,
      documentType: doc.documentType,
      status: doc.status,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
    };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download document file' })
  @ApiResponse({ status: 200, description: 'File stream' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
    @CurrentUser() user: any,
  ): Promise<void> {
    const { buffer, document } = await this.documentsService.getFileContent(id, user.idOwner);

    res.set({
      'Content-Type': document.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${document.originalFilename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    await this.documentsService.delete(id, user.idOwner);
    return { message: 'Document deleted successfully' };
  }
}
