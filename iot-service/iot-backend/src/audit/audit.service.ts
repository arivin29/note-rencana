import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { FilterAuditLogsDto } from './dto/filter-audit-logs.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Create a new audit log entry
   */
  async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(createAuditLogDto);
    return await this.auditLogRepository.save(auditLog);
  }

  /**
   * Find all audit logs with filters and pagination
   */
  async findAll(filterDto: FilterAuditLogsDto) {
    const {
      idUser,
      action,
      entityType,
      entityId,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10,
    } = filterDto;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit_log')
      .leftJoinAndSelect('audit_log.user', 'user');

    // Filter by user ID
    if (idUser) {
      queryBuilder.andWhere('audit_log.idUser = :idUser', { idUser });
    }

    // Filter by action
    if (action) {
      queryBuilder.andWhere('audit_log.action = :action', { action });
    }

    // Filter by entity type
    if (entityType) {
      queryBuilder.andWhere('audit_log.entityType = :entityType', { entityType });
    }

    // Filter by entity ID
    if (entityId) {
      queryBuilder.andWhere('audit_log.entityId = :entityId', { entityId });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('audit_log.status = :status', { status });
    }

    // Filter by date range
    if (startDate && endDate) {
      queryBuilder.andWhere('audit_log.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    } else if (startDate) {
      queryBuilder.andWhere('audit_log.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere('audit_log.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    // Search in description, IP address, user agent
    if (search) {
      queryBuilder.andWhere(
        '(audit_log.description ILIKE :search OR audit_log.ipAddress ILIKE :search OR audit_log.userAgent ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Order by newest first
    queryBuilder.orderBy('audit_log.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find audit logs by entity
   */
  async findByEntity(entityType: string, entityId: string) {
    return await this.auditLogRepository.find({
      where: { entityType, entityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find audit logs by user
   */
  async findByUser(idUser: string, limit: number = 50) {
    return await this.auditLogRepository.find({
      where: { idUser },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get audit statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date) {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit_log');

    if (startDate && endDate) {
      queryBuilder.where('audit_log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [
      totalLogs,
      successCount,
      failureCount,
      actionStats,
      entityStats,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('audit_log.status = :status', { status: 'success' }).getCount(),
      queryBuilder.clone().andWhere('audit_log.status = :status', { status: 'failure' }).getCount(),
      queryBuilder
        .clone()
        .select('audit_log.action', 'action')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit_log.action')
        .getRawMany(),
      queryBuilder
        .clone()
        .select('audit_log.entityType', 'entityType')
        .addSelect('COUNT(*)', 'count')
        .where('audit_log.entityType IS NOT NULL')
        .groupBy('audit_log.entityType')
        .getRawMany(),
    ]);

    return {
      totalLogs,
      successCount,
      failureCount,
      successRate: totalLogs > 0 ? ((successCount / totalLogs) * 100).toFixed(2) : '0',
      actionStats,
      entityStats,
    };
  }
}

