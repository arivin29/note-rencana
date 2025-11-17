import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { NodeModel } from '../../entities/node-model.entity';
import { CreateNodeModelDto } from './dto/create-node-model.dto';
import { UpdateNodeModelDto } from './dto/update-node-model.dto';
import { NodeModelResponseDto, NodeModelDetailedResponseDto } from './dto/node-model-response.dto';

@Injectable()
export class NodeModelsService {
  constructor(
    @InjectRepository(NodeModel)
    private readonly nodeModelRepository: Repository<NodeModel>,
  ) {}

  async create(createDto: CreateNodeModelDto): Promise<NodeModelResponseDto> {
    // Check if modelCode already exists
    if (createDto.modelCode) {
      const existing = await this.nodeModelRepository.findOne({
        where: { modelCode: createDto.modelCode },
      });
      if (existing) {
        throw new ConflictException(`Model code '${createDto.modelCode}' already exists`);
      }
    }

    const model = this.nodeModelRepository.create({
      modelCode: createDto.modelCode,
      vendor: createDto.vendor,
      modelName: createDto.modelName,
      protocol: createDto.protocol,
      communicationBand: createDto.communicationBand,
      powerType: createDto.powerType,
      hardwareClass: createDto.hardwareClass,
      hardwareRevision: createDto.hardwareRevision,
      toolchain: createDto.toolchain,
      buildAgent: createDto.buildAgent,
      firmwareRepo: createDto.firmwareRepo,
      flashProtocol: createDto.flashProtocol,
      supportsCodegen: createDto.supportsCodegen ?? false,
      defaultFirmware: createDto.defaultFirmware,
    });

    const saved = await this.nodeModelRepository.save(model);
    return this.toResponseDto(saved);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    vendor?: string;
    protocol?: string;
    hardwareClass?: string;
  }): Promise<{ data: NodeModelResponseDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<NodeModel> = {};

    if (params.vendor) {
      where.vendor = ILike(`%${params.vendor}%`);
    }

    if (params.protocol) {
      where.protocol = ILike(`%${params.protocol}%`);
    }

    if (params.hardwareClass) {
      where.hardwareClass = params.hardwareClass as any;
    }

    if (params.search) {
      // Search in modelName or modelCode
      where.modelName = ILike(`%${params.search}%`);
    }

    const [items, total] = await this.nodeModelRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: items.map((item) => this.toResponseDto(item)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<NodeModelResponseDto> {
    const model = await this.nodeModelRepository.findOne({
      where: { idNodeModel: id },
    });

    if (!model) {
      throw new NotFoundException(`Node model with ID ${id} not found`);
    }

    return this.toResponseDto(model);
  }

  async findOneDetailed(id: string): Promise<NodeModelDetailedResponseDto> {
    const model = await this.nodeModelRepository.findOne({
      where: { idNodeModel: id },
      relations: ['nodes'],
    });

    if (!model) {
      throw new NotFoundException(`Node model with ID ${id} not found`);
    }

    return this.toDetailedResponseDto(model);
  }

  async update(id: string, updateDto: UpdateNodeModelDto): Promise<NodeModelResponseDto> {
    const model = await this.nodeModelRepository.findOne({
      where: { idNodeModel: id },
    });

    if (!model) {
      throw new NotFoundException(`Node model with ID ${id} not found`);
    }

    // Check if updating modelCode conflicts
    if (updateDto.modelCode && updateDto.modelCode !== model.modelCode) {
      const existing = await this.nodeModelRepository.findOne({
        where: { modelCode: updateDto.modelCode },
      });
      if (existing) {
        throw new ConflictException(`Model code '${updateDto.modelCode}' already exists`);
      }
    }

    Object.assign(model, updateDto);
    const updated = await this.nodeModelRepository.save(model);

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const model = await this.nodeModelRepository.findOne({
      where: { idNodeModel: id },
    });

    if (!model) {
      throw new NotFoundException(`Node model with ID ${id} not found`);
    }

    await this.nodeModelRepository.remove(model);
  }

  private toResponseDto(model: NodeModel): NodeModelResponseDto {
    return {
      idNodeModel: model.idNodeModel,
      modelCode: model.modelCode,
      vendor: model.vendor,
      modelName: model.modelName,
      protocol: model.protocol,
      communicationBand: model.communicationBand,
      powerType: model.powerType,
      hardwareClass: model.hardwareClass as any,
      hardwareRevision: model.hardwareRevision,
      toolchain: model.toolchain,
      buildAgent: model.buildAgent,
      firmwareRepo: model.firmwareRepo,
      flashProtocol: model.flashProtocol,
      supportsCodegen: model.supportsCodegen,
      defaultFirmware: model.defaultFirmware,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }

  private toDetailedResponseDto(model: NodeModel): NodeModelDetailedResponseDto {
    const base = this.toResponseDto(model);

    return {
      ...base,
      nodes: model.nodes || [],
      stats: {
        totalNodes: model.nodes?.length || 0,
        activeNodes: model.nodes?.filter((n: any) => n.connectivityStatus === 'online').length || 0,
        offlineNodes: model.nodes?.filter((n: any) => n.connectivityStatus === 'offline').length || 0,
      },
    };
  }
}
