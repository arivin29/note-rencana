import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantApiKeysService } from '../services/tenant-api-keys.service';
import {
  CreateTenantApiKeyDto,
  UpdateTenantApiKeyDto,
  TenantApiKeyResponseDto,
  TenantApiKeyListResponseDto,
  CreateApiKeyResultDto,
} from '../dto/tenant-api-key.dto';

@ApiTags('Tenant API Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant-api-keys')
export class TenantApiKeysController {
  constructor(private readonly apiKeysService: TenantApiKeysService) {}

  /**
   * Generate new API key for the authenticated user
   */
  @Post()
  @ApiOperation({
    summary: 'Generate new API key',
    description:
      'Generate a new API key for the authenticated user. ' +
      'WARNING: The API key is only shown ONCE in the response. Make sure to save it!',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'API key generated successfully',
    type: CreateApiKeyResultDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Not authenticated' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User not associated with a tenant' })
  async create(
    @Request() req: any,
    @Body() dto: CreateTenantApiKeyDto,
  ): Promise<CreateApiKeyResultDto> {
    const { data, plainKey } = await this.apiKeysService.create(req.user.idUser, dto);

    return {
      success: true,
      message: 'API Key generated successfully',
      data: {
        ...data,
        apiKey: plainKey,
      },
      warning: 'Simpan API Key ini! Tidak akan ditampilkan lagi.',
    };
  }

  /**
   * List all API keys for the authenticated user
   */
  @Get()
  @ApiOperation({
    summary: 'List my API keys',
    description: 'Get all API keys belonging to the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API keys retrieved successfully',
    type: TenantApiKeyListResponseDto,
  })
  async findAll(
    @Request() req: any,
    @Query('ownerId') ownerId?: string,
  ): Promise<TenantApiKeyListResponseDto> {
    let keys;
    if (ownerId) {
      // Admin flow: list by owner ID
      keys = await this.apiKeysService.findAll({ ownerId });
    } else {
      // Self flow: list by logged-in user
      keys = await this.apiKeysService.findAllByUser(req.user.idUser);
    }
    return {
      data: keys,
      total: keys.length,
    };
  }

  /**
   * Get single API key detail
   */
  @Get(':idApiKey')
  @ApiOperation({
    summary: 'Get API key detail',
    description: 'Get details of a specific API key',
  })
  @ApiParam({ name: 'idApiKey', description: 'API Key ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API key retrieved successfully',
    type: TenantApiKeyResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'API key not found' })
  async findOne(
    @Request() req: any,
    @Param('idApiKey', ParseUUIDPipe) idApiKey: string,
  ): Promise<TenantApiKeyResponseDto> {
    return this.apiKeysService.findOne(idApiKey, req.user.idUser);
  }

  /**
   * Update API key
   */
  @Patch(':idApiKey')
  @ApiOperation({
    summary: 'Update API key',
    description: 'Update label, description, active status, or IP whitelist of an API key',
  })
  @ApiParam({ name: 'idApiKey', description: 'API Key ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API key updated successfully',
    type: TenantApiKeyResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'API key not found' })
  async update(
    @Request() req: any,
    @Param('idApiKey', ParseUUIDPipe) idApiKey: string,
    @Body() dto: UpdateTenantApiKeyDto,
  ): Promise<{ success: boolean; message: string; data: TenantApiKeyResponseDto }> {
    const data = await this.apiKeysService.update(idApiKey, req.user.idUser, dto);
    return {
      success: true,
      message: 'API Key updated successfully',
      data,
    };
  }

  /**
   * Revoke/delete API key
   */
  @Delete(':idApiKey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke API key',
    description: 'Permanently revoke and delete an API key. This action cannot be undone.',
  })
  @ApiParam({ name: 'idApiKey', description: 'API Key ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API key revoked successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'API key not found' })
  async revoke(
    @Request() req: any,
    @Param('idApiKey', ParseUUIDPipe) idApiKey: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.apiKeysService.revoke(idApiKey, req.user.idUser);
    return {
      success: true,
      message: 'API Key revoked successfully',
    };
  }

  /**
   * Regenerate API key (creates new key, invalidates old)
   */
  @Post(':idApiKey/regenerate')
  @ApiOperation({
    summary: 'Regenerate API key',
    description:
      'Generate a new API key for an existing key record. ' +
      'The old key will be invalidated immediately. ' +
      'WARNING: The new API key is only shown ONCE!',
  })
  @ApiParam({ name: 'idApiKey', description: 'API Key ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API key regenerated successfully',
    type: CreateApiKeyResultDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'API key not found' })
  async regenerate(
    @Request() req: any,
    @Param('idApiKey', ParseUUIDPipe) idApiKey: string,
  ): Promise<CreateApiKeyResultDto> {
    const { data, plainKey } = await this.apiKeysService.regenerate(idApiKey, req.user.idUser);

    return {
      success: true,
      message: 'API Key regenerated successfully. Old key is now invalid.',
      data: {
        ...data,
        apiKey: plainKey,
      },
      warning: 'API Key lama sudah tidak valid. Simpan key baru ini!',
    };
  }
}
