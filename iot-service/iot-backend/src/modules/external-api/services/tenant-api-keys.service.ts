import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { TenantApiKey, RateLimitPlan } from '../entities/tenant-api-key.entity';
import { TenantApiLog } from '../entities/tenant-api-log.entity';
import {
  CreateTenantApiKeyDto,
  UpdateTenantApiKeyDto,
  TenantApiKeyResponseDto,
  TenantApiKeyCreatedResponseDto,
  AdminCreateTenantApiKeyDto,
} from '../dto/tenant-api-key.dto';
import { User } from '../../../auth/entities/user.entity';

const API_KEY_PREFIX = 'tnt_';
const BCRYPT_ROUNDS = 12;

@Injectable()
export class TenantApiKeysService {
  private readonly logger = new Logger(TenantApiKeysService.name);

  constructor(
    @InjectRepository(TenantApiKey)
    private readonly apiKeyRepository: Repository<TenantApiKey>,
    @InjectRepository(TenantApiLog)
    private readonly apiLogRepository: Repository<TenantApiLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Generate a new API key for a user
   */
  async create(
    userId: string,
    dto: CreateTenantApiKeyDto,
  ): Promise<{ data: TenantApiKeyCreatedResponseDto; plainKey: string }> {
    // Get user to find owner
    const user = await this.userRepository.findOne({
      where: { idUser: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.idOwner) {
      throw new ForbiddenException('User is not associated with any tenant/owner');
    }

    // Generate random API key
    const plainKey = this.generateApiKey();
    const keyHash = await this.hashApiKey(plainKey);
    const keyPrefix = this.generatePrefix(plainKey);

    // Calculate expiration
    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default 1 year

    // Create entity
    const apiKey = this.apiKeyRepository.create({
      idUser: userId,
      idOwner: user.idOwner,
      apiKeyHash: keyHash,
      apiKeyPrefix: keyPrefix,
      label: dto.label,
      description: dto.description,
      rateLimitPlan: dto.rateLimitPlan || RateLimitPlan.BASIC,
      expiresAt,
      ipWhitelist: dto.ipWhitelist || null,
    });

    const saved = await this.apiKeyRepository.save(apiKey);

    this.logger.log(`API key created for user ${userId}, prefix: ${keyPrefix}`);

    return {
      data: {
        idApiKey: saved.idApiKey,
        label: saved.label,
        description: saved.description,
        apiKeyPrefix: saved.apiKeyPrefix,
        apiKey: plainKey, // Only returned once!
        rateLimitPlan: saved.rateLimitPlan,
        isActive: saved.isActive,
        expiresAt: saved.expiresAt,
        lastUsedAt: saved.lastUsedAt,
        requestsToday: saved.requestsToday,
        requestsTotal: Number(saved.requestsTotal),
        ipWhitelist: saved.ipWhitelist,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      },
      plainKey,
    };
  }

  /**
   * Admin: Create API key for specific user
   */
  async adminCreate(
    dto: AdminCreateTenantApiKeyDto,
  ): Promise<{ data: TenantApiKeyCreatedResponseDto; plainKey: string }> {
    return this.create(dto.userId, dto);
  }

  /**
   * List API keys for a user
   */
  async findAllByUser(userId: string): Promise<TenantApiKeyResponseDto[]> {
    const keys = await this.apiKeyRepository.find({
      where: { idUser: userId },
      order: { createdAt: 'DESC' },
    });

    return keys.map((key) => this.toResponseDto(key));
  }

  /**
   * List all API keys (admin)
   */
  async findAll(filters?: {
    ownerId?: string;
    userId?: string;
    isActive?: boolean;
  }): Promise<TenantApiKeyResponseDto[]> {
    const query = this.apiKeyRepository.createQueryBuilder('key');

    if (filters?.ownerId) {
      query.andWhere('key.idOwner = :ownerId', { ownerId: filters.ownerId });
    }
    if (filters?.userId) {
      query.andWhere('key.idUser = :userId', { userId: filters.userId });
    }
    if (filters?.isActive !== undefined) {
      query.andWhere('key.isActive = :isActive', { isActive: filters.isActive });
    }

    query.orderBy('key.createdAt', 'DESC');

    const keys = await query.getMany();
    return keys.map((key) => this.toResponseDto(key));
  }

  /**
   * Get single API key by ID
   */
  async findOne(idApiKey: string, userId?: string): Promise<TenantApiKeyResponseDto> {
    const query: any = { idApiKey };
    if (userId) {
      query.idUser = userId;
    }

    const key = await this.apiKeyRepository.findOne({ where: query });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    return this.toResponseDto(key);
  }

  /**
   * Update API key
   */
  async update(
    idApiKey: string,
    userId: string,
    dto: UpdateTenantApiKeyDto,
  ): Promise<TenantApiKeyResponseDto> {
    const key = await this.apiKeyRepository.findOne({
      where: { idApiKey, idUser: userId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    // Update fields
    if (dto.label !== undefined) key.label = dto.label;
    if (dto.description !== undefined) key.description = dto.description;
    if (dto.isActive !== undefined) key.isActive = dto.isActive;
    if (dto.ipWhitelist !== undefined) key.ipWhitelist = dto.ipWhitelist;

    const saved = await this.apiKeyRepository.save(key);

    this.logger.log(`API key updated: ${idApiKey}`);

    return this.toResponseDto(saved);
  }

  /**
   * Revoke/Delete API key
   */
  async revoke(idApiKey: string, userId?: string): Promise<void> {
    const query: any = { idApiKey };
    if (userId) {
      query.idUser = userId;
    }

    const key = await this.apiKeyRepository.findOne({ where: query });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    await this.apiKeyRepository.remove(key);

    this.logger.log(`API key revoked: ${idApiKey}`);
  }

  /**
   * Regenerate API key (creates new key, invalidates old one)
   */
  async regenerate(
    idApiKey: string,
    userId: string,
  ): Promise<{ data: TenantApiKeyCreatedResponseDto; plainKey: string }> {
    const existingKey = await this.apiKeyRepository.findOne({
      where: { idApiKey, idUser: userId },
    });

    if (!existingKey) {
      throw new NotFoundException('API key not found');
    }

    // Generate new key
    const plainKey = this.generateApiKey();
    const keyHash = await this.hashApiKey(plainKey);
    const keyPrefix = this.generatePrefix(plainKey);

    // Update existing record with new key
    existingKey.apiKeyHash = keyHash;
    existingKey.apiKeyPrefix = keyPrefix;
    existingKey.updatedAt = new Date();

    const saved = await this.apiKeyRepository.save(existingKey);

    this.logger.log(`API key regenerated: ${idApiKey}, new prefix: ${keyPrefix}`);

    return {
      data: {
        idApiKey: saved.idApiKey,
        label: saved.label,
        description: saved.description,
        apiKeyPrefix: saved.apiKeyPrefix,
        apiKey: plainKey, // Only returned once!
        rateLimitPlan: saved.rateLimitPlan,
        isActive: saved.isActive,
        expiresAt: saved.expiresAt,
        lastUsedAt: saved.lastUsedAt,
        requestsToday: saved.requestsToday,
        requestsTotal: Number(saved.requestsTotal),
        ipWhitelist: saved.ipWhitelist,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      },
      plainKey,
    };
  }

  /**
   * Validate API key and return the key entity if valid
   */
  async validateApiKey(plainKey: string): Promise<TenantApiKey | null> {
    this.logger.debug(`Validating API key: ${plainKey?.substring(0, 12)}...`);
    
    if (!plainKey || !plainKey.startsWith(API_KEY_PREFIX)) {
      this.logger.warn(`API key validation failed: invalid prefix or empty key`);
      return null;
    }

    // Extract prefix for lookup (first 12 chars including prefix)
    const searchPrefix = plainKey.substring(0, 12);
    this.logger.debug(`Search prefix: ${searchPrefix}`);

    // Find potential matches by prefix
    const candidates = await this.apiKeyRepository.find({
      where: { isActive: true },
      relations: ['owner'],
    });
    
    this.logger.debug(`Found ${candidates.length} active API keys in database`);

    // Filter by prefix match first (optimization)
    const prefixMatches = candidates.filter(
      (key) => key.apiKeyPrefix.substring(0, 8) === searchPrefix.substring(0, 8),
    );
    
    this.logger.debug(`Prefix matches: ${prefixMatches.length}`);

    // Verify hash for each candidate
    for (const candidate of prefixMatches) {
      this.logger.debug(`Checking candidate: ${candidate.apiKeyPrefix}`);
      const isMatch = await bcrypt.compare(plainKey, candidate.apiKeyHash);
      this.logger.debug(`Hash match result: ${isMatch}`);
      if (isMatch) {
        // Check if expired
        if (candidate.isExpired()) {
          this.logger.warn(`API key expired: ${candidate.apiKeyPrefix}`);
          return null;
        }

        this.logger.log(`API key validated successfully: ${candidate.apiKeyPrefix}`);
        // Update last used
        await this.updateLastUsed(candidate);

        return candidate;
      }
    }

    // If no prefix match found, check all (fallback - slower)
    this.logger.debug(`No prefix match, checking all ${candidates.length} candidates...`);
    for (const candidate of candidates) {
      if (prefixMatches.includes(candidate)) continue;

      const isMatch = await bcrypt.compare(plainKey, candidate.apiKeyHash);
      if (isMatch) {
        if (candidate.isExpired()) {
          return null;
        }
        this.logger.log(`API key validated (fallback): ${candidate.apiKeyPrefix}`);
        await this.updateLastUsed(candidate);
        return candidate;
      }
    }
    
    this.logger.warn(`No matching API key found for: ${plainKey.substring(0, 12)}...`);

    return null;
  }

  /**
   * Update last used timestamp and request counters
   */
  private async updateLastUsed(key: TenantApiKey): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Reset daily counter if new day
    if (!key.lastRequestDate || key.lastRequestDate.toString() !== today) {
      key.requestsToday = 0;
      key.lastRequestDate = new Date(today);
    }

    key.lastUsedAt = new Date();
    key.requestsToday += 1;
    key.requestsTotal = Number(key.requestsTotal) + 1;

    await this.apiKeyRepository.save(key);
  }

  /**
   * Check rate limit for API key
   */
  async checkRateLimit(key: TenantApiKey): Promise<{ allowed: boolean; remaining: number }> {
    const config = key.getRateLimitConfig();
    const remaining = config.requestsPerDay - key.requestsToday;

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
    };
  }

  /**
   * Log API request
   */
  async logRequest(params: {
    idApiKey: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    ipAddress?: string;
    userAgent?: string;
    requestParams?: Record<string, any>;
    errorMessage?: string;
  }): Promise<void> {
    const log = this.apiLogRepository.create({
      idApiKey: params.idApiKey,
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      responseTimeMs: params.responseTimeMs,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestParams: params.requestParams,
      errorMessage: params.errorMessage,
    });

    await this.apiLogRepository.save(log);
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Generate random API key
   * Format: tnt_<32 random hex chars>
   */
  private generateApiKey(): string {
    const randomBytes = crypto.randomBytes(24);
    const randomHex = randomBytes.toString('base64url');
    return `${API_KEY_PREFIX}${randomHex}`;
  }

  /**
   * Hash API key with bcrypt
   */
  private async hashApiKey(plainKey: string): Promise<string> {
    return bcrypt.hash(plainKey, BCRYPT_ROUNDS);
  }

  /**
   * Generate prefix for display
   * Example: "tnt_a1b2****"
   */
  private generatePrefix(plainKey: string): string {
    const visiblePart = plainKey.substring(0, 8); // "tnt_a1b2"
    return `${visiblePart}****`;
  }

  /**
   * Convert entity to response DTO (without exposing hash)
   */
  private toResponseDto(key: TenantApiKey): TenantApiKeyResponseDto {
    return {
      idApiKey: key.idApiKey,
      label: key.label,
      description: key.description,
      apiKeyPrefix: key.apiKeyPrefix,
      rateLimitPlan: key.rateLimitPlan,
      isActive: key.isActive,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      requestsToday: key.requestsToday,
      requestsTotal: Number(key.requestsTotal),
      ipWhitelist: key.ipWhitelist,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    };
  }
}
