import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NodeLocation } from '../../entities/node-location.entity';
import { CreateNodeLocationDto } from './dto/create-node-location.dto';
import { UpdateNodeLocationDto } from './dto/update-node-location.dto';
import { NodeLocationResponseDto } from './dto/node-location-response.dto';

@Injectable()
export class NodeLocationsService {
  constructor(
    @InjectRepository(NodeLocation)
    private readonly nodeLocationRepository: Repository<NodeLocation>,
  ) {}

  async create(createDto: CreateNodeLocationDto): Promise<NodeLocationResponseDto> {
    // Convert lat/lng to PostGIS POINT format
    const coordinates = `POINT(${createDto.longitude} ${createDto.latitude})`;

    const location = this.nodeLocationRepository.create({
      idProject: createDto.idProject,
      type: createDto.type || 'manual',
      coordinates,
      elevation: createDto.elevation,
      address: createDto.address,
      precisionM: createDto.precisionM,
      source: createDto.source,
    });

    const saved = await this.nodeLocationRepository.save(location);
    return this.toResponseDto(saved);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    idProject?: string;
    type?: string;
  }): Promise<{ data: NodeLocationResponseDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.idProject) {
      where.idProject = params.idProject;
    }

    if (params.type) {
      where.type = params.type;
    }

    const [items, total] = await this.nodeLocationRepository.findAndCount({
      where,
      relations: ['project'],
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

  async findOne(id: string): Promise<NodeLocationResponseDto> {
    const location = await this.nodeLocationRepository.findOne({
      where: { idNodeLocation: id },
      relations: ['project'],
    });

    if (!location) {
      throw new NotFoundException(`Node location with ID ${id} not found`);
    }

    return this.toResponseDto(location);
  }

  async update(id: string, updateDto: UpdateNodeLocationDto): Promise<NodeLocationResponseDto> {
    const location = await this.nodeLocationRepository.findOne({
      where: { idNodeLocation: id },
    });

    if (!location) {
      throw new NotFoundException(`Node location with ID ${id} not found`);
    }

    // Update coordinates if lat/lng changed
    if (updateDto.latitude !== undefined && updateDto.longitude !== undefined) {
      location.coordinates = `POINT(${updateDto.longitude} ${updateDto.latitude})`;
    }

    Object.assign(location, {
      idProject: updateDto.idProject ?? location.idProject,
      type: updateDto.type ?? location.type,
      elevation: updateDto.elevation ?? location.elevation,
      address: updateDto.address ?? location.address,
      precisionM: updateDto.precisionM ?? location.precisionM,
      source: updateDto.source ?? location.source,
    });

    const updated = await this.nodeLocationRepository.save(location);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const location = await this.nodeLocationRepository.findOne({
      where: { idNodeLocation: id },
    });

    if (!location) {
      throw new NotFoundException(`Node location with ID ${id} not found`);
    }

    await this.nodeLocationRepository.remove(location);
  }

  private toResponseDto(location: NodeLocation): NodeLocationResponseDto {
    // Parse POINT string to lat/lng
    let latitude = 0;
    let longitude = 0;
    
    if (location.coordinates) {
      // Handle both "POINT(lng lat)" and raw point formats
      const coordStr = location.coordinates.toString().replace(/[POINT()]/g, '').trim();
      const [lng, lat] = coordStr.split(' ').map(parseFloat);
      longitude = lng || 0;
      latitude = lat || 0;
    }

    return {
      idNodeLocation: location.idNodeLocation,
      idProject: location.idProject,
      type: location.type as any,
      latitude,
      longitude,
      elevation: location.elevation,
      address: location.address,
      precisionM: location.precisionM,
      source: location.source,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      project: location.project ? {
        idProject: location.project.idProject,
        name: location.project.name,
      } : undefined,
    };
  }
}
