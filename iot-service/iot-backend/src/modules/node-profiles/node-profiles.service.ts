import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NodeProfile } from '../../entities/node-profile.entity';
import { CreateNodeProfileDto } from './dto/create-node-profile.dto';
import { UpdateNodeProfileDto } from './dto/update-node-profile.dto';
import { NodeProfileResponseDto } from './dto/node-profile-response.dto';

@Injectable()
export class NodeProfilesService {
  constructor(
    @InjectRepository(NodeProfile)
    private nodeProfileRepository: Repository<NodeProfile>,
  ) {}

  async create(createDto: CreateNodeProfileDto): Promise<NodeProfileResponseDto> {
    // Check if code already exists
    const existingProfile = await this.nodeProfileRepository.findOne({
      where: { code: createDto.code },
    });

    if (existingProfile) {
      throw new ConflictException(`Profile with code '${createDto.code}' already exists`);
    }

    const profile = this.nodeProfileRepository.create(createDto);
    const saved = await this.nodeProfileRepository.save(profile);
    return this.toResponseDto(saved);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    idNodeModel?: string;
    idProject?: string;
    enabled?: boolean;
    search?: string;
  }): Promise<{ data: NodeProfileResponseDto[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.nodeProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.nodeModel', 'nodeModel')
      .leftJoinAndSelect('profile.project', 'project')
      .loadRelationCountAndMap('profile.nodeCount', 'profile.nodes');

    if (options?.idNodeModel) {
      queryBuilder.andWhere('profile.idNodeModel = :idNodeModel', { idNodeModel: options.idNodeModel });
    }

    if (options?.idProject) {
      queryBuilder.andWhere('profile.idProject = :idProject', { idProject: options.idProject });
    }

    if (options?.enabled !== undefined) {
      queryBuilder.andWhere('profile.enabled = :enabled', { enabled: options.enabled });
    }

    if (options?.search) {
      queryBuilder.andWhere(
        '(profile.code ILIKE :search OR profile.name ILIKE :search OR profile.description ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    const [profiles, total] = await queryBuilder
      .orderBy('profile.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: profiles.map((profile) => this.toResponseDto(profile)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<NodeProfileResponseDto> {
    const profile = await this.nodeProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.nodeModel', 'nodeModel')
      .leftJoinAndSelect('profile.project', 'project')
      .loadRelationCountAndMap('profile.nodeCount', 'profile.nodes')
      .where('profile.idNodeProfile = :id', { id })
      .getOne();

    if (!profile) {
      throw new NotFoundException(`Node profile with ID ${id} not found`);
    }

    return this.toResponseDto(profile);
  }

  async findByCode(code: string): Promise<NodeProfileResponseDto> {
    const profile = await this.nodeProfileRepository.findOne({
      where: { code },
      relations: ['nodeModel', 'project'],
    });

    if (!profile) {
      throw new NotFoundException(`Node profile with code '${code}' not found`);
    }

    return this.toResponseDto(profile);
  }

  async update(id: string, updateDto: UpdateNodeProfileDto): Promise<NodeProfileResponseDto> {
    const profile = await this.nodeProfileRepository.findOne({
      where: { idNodeProfile: id },
    });

    if (!profile) {
      throw new NotFoundException(`Node profile with ID ${id} not found`);
    }

    // Check if code is being updated and already exists
    if (updateDto.code && updateDto.code !== profile.code) {
      const existingProfile = await this.nodeProfileRepository.findOne({
        where: { code: updateDto.code },
      });

      if (existingProfile) {
        throw new ConflictException(`Profile with code '${updateDto.code}' already exists`);
      }
    }

    Object.assign(profile, updateDto);
    const updated = await this.nodeProfileRepository.save(profile);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const profile = await this.nodeProfileRepository
      .createQueryBuilder('profile')
      .loadRelationCountAndMap('profile.nodeCount', 'profile.nodes')
      .where('profile.idNodeProfile = :id', { id })
      .getOne();

    if (!profile) {
      throw new NotFoundException(`Node profile with ID ${id} not found`);
    }

    // Check if profile is being used by any nodes
    const nodeCount = (profile as any).nodeCount || 0;
    if (nodeCount > 0) {
      throw new ConflictException(
        `Cannot delete profile. It is currently assigned to ${nodeCount} node(s)`
      );
    }

    await this.nodeProfileRepository.remove(profile);
  }

  private toResponseDto(profile: NodeProfile): NodeProfileResponseDto {
    const dto: NodeProfileResponseDto = {
      idNodeProfile: profile.idNodeProfile,
      idNodeModel: profile.idNodeModel,
      idProject: profile.idProject,
      code: profile.code,
      name: profile.name,
      description: profile.description,
      parserType: profile.parserType,
      mappingJson: profile.mappingJson,
      transformScript: profile.transformScript,
      enabled: profile.enabled,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };

    if (profile.nodeModel) {
      dto.nodeModel = {
        idNodeModel: profile.nodeModel.idNodeModel,
        name: profile.nodeModel.modelName,
        manufacturer: profile.nodeModel.vendor,
      };
    }

    if (profile.project) {
      dto.project = {
        idProject: profile.project.idProject,
        name: profile.project.name,
      };
    }

    // Add node count if available
    if ((profile as any).nodeCount !== undefined) {
      dto.nodeCount = (profile as any).nodeCount;
    }

    return dto;
  }
}
