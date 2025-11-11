import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { SensorType } from '../../entities/sensor-type.entity';
import { CreateSensorTypeDto } from './dto/create-sensor-type.dto';
import { UpdateSensorTypeDto } from './dto/update-sensor-type.dto';
import { SensorTypeResponseDto } from './dto/sensor-type-response.dto';

@Injectable()
export class SensorTypesService {
  constructor(
    @InjectRepository(SensorType)
    private readonly sensorTypeRepository: Repository<SensorType>,
  ) {}

  async create(createDto: CreateSensorTypeDto): Promise<SensorTypeResponseDto> {
    const sensorType = this.sensorTypeRepository.create(createDto);
    const saved = await this.sensorTypeRepository.save(sensorType);
    return this.toResponseDto(saved);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: SensorTypeResponseDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const where = params.search
      ? { category: ILike(`%${params.search}%`) }
      : {};

    const [items, total] = await this.sensorTypeRepository.findAndCount({
      where,
      order: { category: 'ASC' },
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

  async findOne(id: string): Promise<SensorTypeResponseDto> {
    const sensorType = await this.sensorTypeRepository.findOne({
      where: { idSensorType: id },
    });

    if (!sensorType) {
      throw new NotFoundException(`Sensor type with ID ${id} not found`);
    }

    return this.toResponseDto(sensorType);
  }

  async update(id: string, updateDto: UpdateSensorTypeDto): Promise<SensorTypeResponseDto> {
    const sensorType = await this.sensorTypeRepository.findOne({
      where: { idSensorType: id },
    });

    if (!sensorType) {
      throw new NotFoundException(`Sensor type with ID ${id} not found`);
    }

    Object.assign(sensorType, updateDto);
    const updated = await this.sensorTypeRepository.save(sensorType);

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const sensorType = await this.sensorTypeRepository.findOne({
      where: { idSensorType: id },
    });

    if (!sensorType) {
      throw new NotFoundException(`Sensor type with ID ${id} not found`);
    }

    await this.sensorTypeRepository.remove(sensorType);
  }

  private toResponseDto(sensorType: SensorType): SensorTypeResponseDto {
    return {
      idSensorType: sensorType.idSensorType,
      category: sensorType.category,
      defaultUnit: sensorType.defaultUnit,
      precision: sensorType.precision,
      createdAt: sensorType.createdAt,
      updatedAt: sensorType.updatedAt,
    };
  }
}
