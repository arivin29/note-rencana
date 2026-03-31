import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { NodeModelCommand } from '../../entities/node-model-command.entity';
import { CreateNodeModelCommandDto } from './dto/create-node-model-command.dto';
import { UpdateNodeModelCommandDto } from './dto/update-node-model-command.dto';
import { NodeModelCommandResponseDto, NodeModelCommandWithModelResponseDto } from './dto/node-model-command-response.dto';

@Injectable()
export class NodeModelCommandsService {
  constructor(
    @InjectRepository(NodeModelCommand)
    private readonly commandRepository: Repository<NodeModelCommand>,
  ) {}

  async create(createDto: CreateNodeModelCommandDto): Promise<NodeModelCommandResponseDto> {
    // Check if code already exists for this node model
    const existing = await this.commandRepository.findOne({
      where: {
        idNodeModel: createDto.idNodeModel,
        code: createDto.code,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Command code '${createDto.code}' already exists for this node model`,
      );
    }

    const command = this.commandRepository.create({
      idNodeModel: createDto.idNodeModel,
      code: createDto.code,
      label: createDto.label,
      channel: createDto.channel,
      template: createDto.template,
      config: createDto.config,
      icon: createDto.icon ?? 'fa-terminal',
      color: createDto.color ?? 'primary',
      sortOrder: createDto.sortOrder ?? 0,
      isActive: createDto.isActive ?? true,
    });

    const saved = await this.commandRepository.save(command);
    return this.toResponseDto(saved);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    idNodeModel?: string;
    channel?: string;
    isActive?: boolean;
  }): Promise<{ data: NodeModelCommandResponseDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<NodeModelCommand> = {};

    if (params.idNodeModel) {
      where.idNodeModel = params.idNodeModel;
    }

    if (params.channel) {
      where.channel = params.channel;
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params.search) {
      where.label = ILike(`%${params.search}%`);
    }

    const [items, total] = await this.commandRepository.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
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

  async findByNodeModel(idNodeModel: string): Promise<NodeModelCommandResponseDto[]> {
    const items = await this.commandRepository.find({
      where: { idNodeModel, isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return items.map((item) => this.toResponseDto(item));
  }

  async findOne(id: string): Promise<NodeModelCommandResponseDto> {
    const command = await this.commandRepository.findOne({
      where: { idCommand: id },
    });

    if (!command) {
      throw new NotFoundException(`Command with ID ${id} not found`);
    }

    return this.toResponseDto(command);
  }

  async findOneWithModel(id: string): Promise<NodeModelCommandWithModelResponseDto> {
    const command = await this.commandRepository.findOne({
      where: { idCommand: id },
      relations: ['nodeModel'],
    });

    if (!command) {
      throw new NotFoundException(`Command with ID ${id} not found`);
    }

    return this.toResponseWithModelDto(command);
  }

  async update(id: string, updateDto: UpdateNodeModelCommandDto): Promise<NodeModelCommandResponseDto> {
    const command = await this.commandRepository.findOne({
      where: { idCommand: id },
    });

    if (!command) {
      throw new NotFoundException(`Command with ID ${id} not found`);
    }

    // Check if updating code conflicts with another command in same node model
    if (updateDto.code && updateDto.code !== command.code) {
      const existing = await this.commandRepository.findOne({
        where: {
          idNodeModel: command.idNodeModel,
          code: updateDto.code,
        },
      });
      if (existing) {
        throw new ConflictException(
          `Command code '${updateDto.code}' already exists for this node model`,
        );
      }
    }

    Object.assign(command, updateDto);
    const updated = await this.commandRepository.save(command);

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const command = await this.commandRepository.findOne({
      where: { idCommand: id },
    });

    if (!command) {
      throw new NotFoundException(`Command with ID ${id} not found`);
    }

    await this.commandRepository.remove(command);
  }

  private toResponseDto(command: NodeModelCommand): NodeModelCommandResponseDto {
    return {
      idCommand: command.idCommand,
      idNodeModel: command.idNodeModel,
      code: command.code,
      label: command.label,
      channel: command.channel,
      template: command.template,
      config: command.config,
      icon: command.icon,
      color: command.color,
      sortOrder: command.sortOrder,
      isActive: command.isActive,
      createdAt: command.createdAt,
      updatedAt: command.updatedAt,
    };
  }

  private toResponseWithModelDto(command: NodeModelCommand): NodeModelCommandWithModelResponseDto {
    const base = this.toResponseDto(command);
    return {
      ...base,
      nodeModel: command.nodeModel
        ? {
            idNodeModel: command.nodeModel.idNodeModel,
            modelCode: command.nodeModel.modelCode,
            modelName: command.nodeModel.modelName,
            vendor: command.nodeModel.vendor,
          }
        : undefined,
    };
  }
}
