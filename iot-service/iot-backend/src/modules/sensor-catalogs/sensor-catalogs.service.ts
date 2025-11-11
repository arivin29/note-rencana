import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { SensorCatalog } from '../../entities/sensor-catalog.entity';
import { CreateSensorCatalogDto } from './dto/create-sensor-catalog.dto';
import { UpdateSensorCatalogDto } from './dto/update-sensor-catalog.dto';
import { SensorCatalogResponseDto } from './dto/sensor-catalog-response.dto';

@Injectable()
export class SensorCatalogsService {
  constructor(
    @InjectRepository(SensorCatalog)
    private readonly sensorCatalogRepository: Repository<SensorCatalog>,
  ) {}

  async create(createDto: CreateSensorCatalogDto): Promise<SensorCatalogResponseDto> {
    const catalog = this.sensorCatalogRepository.create(createDto);
    const saved = await this.sensorCatalogRepository.save(catalog);
    return this.toResponseDto(saved);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    vendor?: string;
  }): Promise<{ data: SensorCatalogResponseDto[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.vendor) {
      where.vendor = ILike(`%${params.vendor}%`);
    }

    if (params.search) {
      where.modelName = ILike(`%${params.search}%`);
    }

    const [items, total] = await this.sensorCatalogRepository.findAndCount({
      where,
      order: { vendor: 'ASC', modelName: 'ASC' },
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

  async findOne(id: string): Promise<SensorCatalogResponseDto> {
    const catalog = await this.sensorCatalogRepository.findOne({
      where: { idSensorCatalog: id },
    });

    if (!catalog) {
      throw new NotFoundException(`Sensor catalog with ID ${id} not found`);
    }

    return this.toResponseDto(catalog);
  }

  async update(id: string, updateDto: UpdateSensorCatalogDto): Promise<SensorCatalogResponseDto> {
    const catalog = await this.sensorCatalogRepository.findOne({
      where: { idSensorCatalog: id },
    });

    if (!catalog) {
      throw new NotFoundException(`Sensor catalog with ID ${id} not found`);
    }

    Object.assign(catalog, updateDto);
    const updated = await this.sensorCatalogRepository.save(catalog);

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const catalog = await this.sensorCatalogRepository.findOne({
      where: { idSensorCatalog: id },
    });

    if (!catalog) {
      throw new NotFoundException(`Sensor catalog with ID ${id} not found`);
    }

    await this.sensorCatalogRepository.remove(catalog);
  }

  private toResponseDto(catalog: SensorCatalog): SensorCatalogResponseDto {
    return {
      idSensorCatalog: catalog.idSensorCatalog,
      vendor: catalog.vendor,
      modelName: catalog.modelName,
      iconAsset: catalog.iconAsset,
      iconColor: catalog.iconColor,
      datasheetUrl: catalog.datasheetUrl,
      firmware: catalog.firmware,
      calibrationIntervalDays: catalog.calibrationIntervalDays,
      defaultChannelsJson: catalog.defaultChannelsJson,
      defaultThresholdsJson: catalog.defaultThresholdsJson,
      createdAt: catalog.createdAt,
      updatedAt: catalog.updatedAt,
    };
  }
}
