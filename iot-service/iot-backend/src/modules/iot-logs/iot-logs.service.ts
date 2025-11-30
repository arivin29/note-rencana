import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Between } from 'typeorm';
import { IotLog } from '../../entities/iot-log.entity';
import {
  IotLogStatsDto,
  IotLogFilterDto,
  IotLogResponseDto,
} from './dto';

@Injectable()
export class IotLogsService {
  private readonly logger = new Logger(IotLogsService.name);

  constructor(
    @InjectRepository(IotLog)
    private iotLogRepository: Repository<IotLog>,
  ) {}

  /**
   * Get IoT logs statistics with optional filters
   * Supports filtering by device, owner, project, label, and date range
   */
  async getStats(filters?: IotLogFilterDto): Promise<IotLogStatsDto> {
    try {
      const queryBuilder = this.buildBaseQuery(filters);

      // Count total logs
      const total = await queryBuilder.getCount();

      // Count processed logs
      const processedQuery = this.buildBaseQuery(filters);
      processedQuery.andWhere('log.processed = :processed', {
        processed: true,
      });
      const processed = await processedQuery.getCount();

      // Count unprocessed logs
      const unprocessedQuery = this.buildBaseQuery(filters);
      unprocessedQuery.andWhere('log.processed = :processed', {
        processed: false,
      });
      const unprocessed = await unprocessedQuery.getCount();

      // Count logs by label
      const byLabelQuery = this.buildBaseQuery(filters);
      const byLabelRaw = await byLabelQuery
        .select('log.label', 'label')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.label')
        .getRawMany();

      // Transform to key-value object
      const byLabel = byLabelRaw.reduce((acc, item) => {
        acc[item.label] = parseInt(item.count, 10);
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        processed,
        unprocessed,
        byLabel,
      };
    } catch (error) {
      this.logger.error(`Failed to get IoT logs stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get paginated IoT logs with filters and relations
   */
  async findAll(
    filters?: IotLogFilterDto,
    page = 1,
    limit = 100,
  ): Promise<{ data: IotLogResponseDto[]; total: number; page: number; limit: number }> {
    try {
      const queryBuilder = this.buildBaseQuery(filters);

      // Add relations
      queryBuilder.leftJoinAndSelect('log.node', 'node');
      queryBuilder.leftJoinAndSelect('node.project', 'project');
      queryBuilder.leftJoinAndSelect('project.owner', 'owner');

      // Order by timestamp descending (newest first)
      queryBuilder.orderBy('log.timestamp', 'DESC');

      // Pagination
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      const [logs, total] = await queryBuilder.getManyAndCount();

      // Transform to response DTO
      const data = logs.map((log) => this.transformToResponseDto(log));

      return {
        data,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Failed to find IoT logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build base query with common filters
   */
  private buildBaseQuery(
    filters?: IotLogFilterDto,
  ): SelectQueryBuilder<IotLog> {
    const queryBuilder = this.iotLogRepository.createQueryBuilder('log');

    if (!filters) {
      return queryBuilder;
    }

    // Join tables only if needed for filtering
    const needsNodeJoin = filters.ownerId || filters.projectId;
    const needsProjectJoin = filters.ownerId || filters.projectId;
    const needsOwnerJoin = filters.ownerId;

    if (needsNodeJoin) {
      queryBuilder.leftJoin('log.node', 'node');
    }
    if (needsProjectJoin && needsNodeJoin) {
      queryBuilder.leftJoin('node.project', 'project');
    }
    if (needsOwnerJoin && needsProjectJoin) {
      queryBuilder.leftJoin('project.owner', 'owner');
    }

    // Filter by device ID (node code)
    if (filters.deviceId) {
      queryBuilder.andWhere('log.deviceId = :deviceId', {
        deviceId: filters.deviceId,
      });
    }

    // Filter by owner ID
    if (filters.ownerId) {
      queryBuilder.andWhere('owner.idOwner = :ownerId', {
        ownerId: filters.ownerId,
      });
    }

    // Filter by project ID
    if (filters.projectId) {
      queryBuilder.andWhere('project.idProject = :projectId', {
        projectId: filters.projectId,
      });
    }

    // Filter by label
    if (filters.label) {
      queryBuilder.andWhere('log.label = :label', { label: filters.label });
    }

    // Filter by processed status
    if (filters.processed !== undefined) {
      queryBuilder.andWhere('log.processed = :processed', {
        processed: filters.processed,
      });
    }

    // Filter by date range
    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('log.timestamp BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      queryBuilder.andWhere('log.timestamp >= :startDate', {
        startDate: filters.startDate,
      });
    } else if (filters.endDate) {
      queryBuilder.andWhere('log.timestamp <= :endDate', {
        endDate: filters.endDate,
      });
    }

    return queryBuilder;
  }

  /**
   * Transform entity to response DTO
   */
  private transformToResponseDto(log: IotLog): IotLogResponseDto {
    const response: IotLogResponseDto = {
      id: log.id,
      deviceId: log.deviceId,
      label: log.label,
      topic: log.topic,
      payload: log.payload,
      processed: log.processed,
      notes: log.notes,
      timestamp: log.timestamp,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    };

    // Add node relation if exists
    if (log.node) {
      response.node = {
        idNode: log.node.idNode,
        code: log.node.code,
        idProject: log.node.idProject,
      };

      // Add project relation if exists
      if (log.node.project) {
        response.node.project = {
          idProject: log.node.project.idProject,
          name: log.node.project.name,
          idOwner: log.node.project.idOwner,
        };

        // Add owner relation if exists
        if (log.node.project.owner) {
          response.node.project.owner = {
            idOwner: log.node.project.owner.idOwner,
            name: log.node.project.owner.name,
          };
        }
      }
    }

    return response;
  }
}
