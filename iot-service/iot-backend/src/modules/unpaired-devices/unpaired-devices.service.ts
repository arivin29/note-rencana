import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { NodeUnpairedDevice } from '../../entities/node-unpaired-device.entity';
import { Node } from '../../entities/node.entity';
import {
  CreateUnpairedDeviceDto,
  UpdateUnpairedDeviceDto,
  UnpairedDeviceResponseDto,
  PairDeviceDto,
  UnpairedDeviceStatsDto,
} from './dto';

@Injectable()
export class UnpairedDevicesService {
  constructor(
    @InjectRepository(NodeUnpairedDevice)
    private readonly unpairedDeviceRepository: Repository<NodeUnpairedDevice>,
    @InjectRepository(Node)
    private readonly nodeRepository: Repository<Node>,
  ) {}

  /**
   * Create a new unpaired device record
   */
  async create(createDto: CreateUnpairedDeviceDto): Promise<UnpairedDeviceResponseDto> {
    // Check if hardware_id already exists
    const existing = await this.unpairedDeviceRepository.findOne({
      where: { hardwareId: createDto.hardwareId },
    });

    if (existing) {
      throw new ConflictException(`Device with hardware_id '${createDto.hardwareId}' already exists`);
    }

    const device = this.unpairedDeviceRepository.create({
      ...createDto,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      seenCount: 1,
      status: 'pending',
    });

    const saved = await this.unpairedDeviceRepository.save(device);
    return this.mapToResponseDto(saved);
  }

  /**
   * Register device activity (upsert pattern)
   * If device exists, update last_seen and increment count
   * If not, create new record
   */
  async registerActivity(
    hardwareId: string,
    payload?: any,
    topic?: string,
    nodeModelId?: string,
  ): Promise<UnpairedDeviceResponseDto> {
    let device = await this.unpairedDeviceRepository.findOne({
      where: { hardwareId },
    });

    if (device) {
      // Update existing device
      device.lastSeenAt = new Date();
      device.seenCount += 1;
      if (payload) device.lastPayload = payload;
      if (topic) device.lastTopic = topic;
      if (nodeModelId && !device.idNodeModel) device.idNodeModel = nodeModelId;
    } else {
      // Create new device
      device = this.unpairedDeviceRepository.create({
        hardwareId,
        lastPayload: payload,
        lastTopic: topic,
        idNodeModel: nodeModelId,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        seenCount: 1,
        status: 'pending',
      });
    }

    const saved = await this.unpairedDeviceRepository.save(device);
    return this.mapToResponseDto(saved);
  }

  /**
   * Get all unpaired devices with filters
   */
  async findAll(filters?: {
    status?: 'pending' | 'paired' | 'ignored';
    nodeModelId?: string;
    projectId?: string;
    ownerId?: string;
    ownerCodePrefix?: string;
    seenAfter?: Date;
    seenBefore?: Date;
    limit?: number;
    offset?: number;
  }): Promise<UnpairedDeviceResponseDto[]> {
    const query = this.unpairedDeviceRepository
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.nodeModel', 'nodeModel')
      .leftJoinAndSelect('device.project', 'project')
      .leftJoinAndSelect('device.owner', 'owner')
      .leftJoinAndSelect('device.pairedNode', 'pairedNode');

    // Apply filters
    if (filters?.status) {
      query.andWhere('device.status = :status', { status: filters.status });
    }

    if (filters?.nodeModelId) {
      query.andWhere('device.idNodeModel = :nodeModelId', { nodeModelId: filters.nodeModelId });
    }

    if (filters?.projectId) {
      query.andWhere('device.suggestedProject = :projectId', { projectId: filters.projectId });
    }

    if (filters?.ownerId) {
      query.andWhere('device.suggestedOwner = :ownerId', { ownerId: filters.ownerId });
    }

    // Filter by owner code prefix (e.g., 'DEMO1-')
    if (filters?.ownerCodePrefix) {
      query.andWhere('device.hardwareId LIKE :prefix', { prefix: `${filters.ownerCodePrefix}-%` });
    }

    if (filters?.seenAfter) {
      query.andWhere('device.lastSeenAt >= :seenAfter', { seenAfter: filters.seenAfter });
    }

    if (filters?.seenBefore) {
      query.andWhere('device.lastSeenAt <= :seenBefore', { seenBefore: filters.seenBefore });
    }

    // Sorting - most recently seen first
    query.orderBy('device.lastSeenAt', 'DESC');

    // Pagination
    if (filters?.limit) {
      query.take(filters.limit);
    }
    if (filters?.offset) {
      query.skip(filters.offset);
    }

    const devices = await query.getMany();
    return devices.map(device => this.mapToResponseDto(device));
  }

  /**
   * Get one unpaired device by ID
   */
  async findOne(id: string): Promise<UnpairedDeviceResponseDto> {
    const device = await this.unpairedDeviceRepository.findOne({
      where: { idNodeUnpairedDevice: id },
      relations: ['nodeModel', 'project', 'owner', 'pairedNode'],
    });

    if (!device) {
      throw new NotFoundException(`Unpaired device with ID '${id}' not found`);
    }

    return this.mapToResponseDto(device);
  }

  /**
   * Get device by hardware_id with last 10 payload history
   */
  async findByHardwareId(hardwareId: string): Promise<UnpairedDeviceResponseDto> {
    const device = await this.unpairedDeviceRepository.findOne({
      where: { hardwareId },
      relations: ['nodeModel', 'project', 'owner', 'pairedNode'],
    });

    if (!device) {
      throw new NotFoundException(`Unpaired device with hardware_id '${hardwareId}' not found`);
    }

    const response = this.mapToResponseDto(device);
    
    // Extract payload history from last_payload field (which is now an array)
    // if (device.lastPayload && Array.isArray(device.lastPayload)) {
    //   response.payloadHistory = device.lastPayload;
    //   // Also set lastPayload to the most recent one for backward compatibility
    //   if (device.lastPayload.length > 0) {
    //     response.lastPayload = device.lastPayload[0].payload;
    //   }
    // } else {
    //   // Fallback for old format (single object)
    //   response.payloadHistory = [];
    //   if (device.lastPayload) {
    //     response.payloadHistory.push({
    //       payload: device.lastPayload,
    //       timestamp: device.lastSeenAt,
    //     });
    //   }
    // }

    return response;
  }

  /**
   * Update unpaired device
   */
  async update(id: string, updateDto: UpdateUnpairedDeviceDto): Promise<UnpairedDeviceResponseDto> {
    const device = await this.unpairedDeviceRepository.findOne({
      where: { idNodeUnpairedDevice: id },
    });

    if (!device) {
      throw new NotFoundException(`Unpaired device with ID '${id}' not found`);
    }

    Object.assign(device, updateDto);
    const saved = await this.unpairedDeviceRepository.save(device);

    return this.mapToResponseDto(saved);
  }

  /**
   * Delete unpaired device
   */
  async remove(id: string): Promise<void> {
    const device = await this.unpairedDeviceRepository.findOne({
      where: { idNodeUnpairedDevice: id },
    });

    if (!device) {
      throw new NotFoundException(`Unpaired device with ID '${id}' not found`);
    }

    await this.unpairedDeviceRepository.remove(device);
  }

  /**
   * Pair device to a project (create actual Node)
   */
  async pairDevice(id: string, pairDto: PairDeviceDto): Promise<UnpairedDeviceResponseDto> {
    const unpairedDevice = await this.unpairedDeviceRepository.findOne({
      where: { idNodeUnpairedDevice: id },
      relations: ['nodeModel'],
    });

    if (!unpairedDevice) {
      throw new NotFoundException(`Unpaired device with ID '${id}' not found`);
    }

    if (unpairedDevice.status === 'paired') {
      throw new BadRequestException(`Device is already paired`);
    }

    if (!unpairedDevice.idNodeModel) {
      throw new BadRequestException(`Cannot pair device without node model. Please assign a node model first.`);
    }

    // Create new Node
    const newNode = this.nodeRepository.create({
      idProject: pairDto.projectId,
      idNodeModel: unpairedDevice.idNodeModel,
      code: pairDto.nodeName || `Node-${unpairedDevice.hardwareId.substring(0, 8)}`,
      serialNumber: unpairedDevice.hardwareId,
      devEui: unpairedDevice.hardwareId, // Can be adjusted based on hardware type
      connectivityStatus: 'offline',
      telemetryIntervalSec: 300,
    });

    const savedNode = await this.nodeRepository.save(newNode);

    // Update unpaired device
    unpairedDevice.pairedNodeId = savedNode.idNode;
    unpairedDevice.status = 'paired';
    const updated = await this.unpairedDeviceRepository.save(unpairedDevice);

    return this.mapToResponseDto(updated);
  }

  /**
   * Mark device as ignored
   */
  async ignoreDevice(id: string): Promise<UnpairedDeviceResponseDto> {
    const device = await this.unpairedDeviceRepository.findOne({
      where: { idNodeUnpairedDevice: id },
    });

    if (!device) {
      throw new NotFoundException(`Unpaired device with ID '${id}' not found`);
    }

    device.status = 'ignored';
    const saved = await this.unpairedDeviceRepository.save(device);

    return this.mapToResponseDto(saved);
  }

  /**
   * Get statistics about unpaired devices
   */
  async getStats(ownerCodePrefix?: string): Promise<UnpairedDeviceStatsDto> {
    // Build base query for filtering
    const buildQuery = () => {
      const query = this.unpairedDeviceRepository.createQueryBuilder('device');
      if (ownerCodePrefix) {
        query.where('device.hardwareId LIKE :prefix', { prefix: `${ownerCodePrefix}-%` });
      }
      return query;
    };

    const [total, pending, paired, ignored] = await Promise.all([
      buildQuery().getCount(),
      buildQuery().andWhere('device.status = :status', { status: 'pending' }).getCount(),
      buildQuery().andWhere('device.status = :status', { status: 'paired' }).getCount(),
      buildQuery().andWhere('device.status = :status', { status: 'ignored' }).getCount(),
    ]);

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [seenLast24h, seenLast7d, withSuggestions, avgResult] = await Promise.all([
      buildQuery().andWhere('device.lastSeenAt >= :last24h', { last24h }).getCount(),
      buildQuery().andWhere('device.lastSeenAt >= :last7d', { last7d }).getCount(),
      buildQuery()
        .andWhere('(device.suggestedProject IS NOT NULL OR device.suggestedOwner IS NOT NULL)')
        .getCount(),
      buildQuery()
        .select('COALESCE(AVG(device.seenCount), 0)', 'avg')
        .getRawOne(),
    ]);

    const avgSeenCount = Math.round(parseFloat(avgResult?.avg || '0'));

    return {
      total,
      pending,
      paired,
      ignored,
      seenLast24h,
      seenLast7d,
      withSuggestions,
      avgSeenCount,
    };
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(device: NodeUnpairedDevice): UnpairedDeviceResponseDto {
    console.log('Mapping unpaired device to response DTO:', device);
    return {
      idNodeUnpairedDevice: device.idNodeUnpairedDevice,
      hardwareId: device.hardwareId,
      idNodeModel: device.idNodeModel,
      nodeModelName: device.nodeModel?.modelName || null,
      firstSeenAt: device.firstSeenAt,
      lastSeenAt: device.lastSeenAt,
      lastPayload: device.lastPayload,
      lastTopic: device.lastTopic,
      seenCount: device.seenCount,
      suggestedProject: device.suggestedProject,
      suggestedProjectName: device.project?.name || null,
      suggestedOwner: device.suggestedOwner,
      suggestedOwnerName: device.owner?.name || null,
      pairedNodeId: device.pairedNodeId,
      pairedNodeName: device.pairedNode?.code || null,
      status: device.status,
    };
  }
}
