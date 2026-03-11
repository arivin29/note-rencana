import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapLayerCategory } from '../../../entities/map-layer-category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto';

export interface CategoryQueryOptions {
  ownerId?: string;
  industryCode?: string;
  isOperational?: boolean;
  includeSystem?: boolean;
  isActive?: boolean;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(MapLayerCategory)
    private readonly categoryRepository: Repository<MapLayerCategory>,
  ) {}

  /**
   * Create a new category
   */
  async create(dto: CreateCategoryDto, userId?: string): Promise<MapLayerCategory> {
    // Check for duplicate
    const whereClause: any = { categoryCode: dto.categoryCode };
    if (dto.idOwner) {
      whereClause.idOwner = dto.idOwner;
    }
    const existing = await this.categoryRepository.findOne({
      where: whereClause,
    });
    if (existing) {
      throw new ConflictException(`Category with code "${dto.categoryCode}" already exists`);
    }

    const category = this.categoryRepository.create({
      ...dto,
      isSystem: !dto.idOwner, // System categories have no owner
      createdBy: userId,
    });

    return this.categoryRepository.save(category);
  }

  /**
   * Get all categories with filters
   */
  async findAll(options: CategoryQueryOptions): Promise<MapLayerCategory[]> {
    const { ownerId, industryCode, isOperational, includeSystem = true, isActive = true } = options;

    const qb = this.categoryRepository.createQueryBuilder('category');

    if (ownerId) {
      if (includeSystem) {
        qb.andWhere('(category.id_owner = :ownerId OR category.is_system = true)', { ownerId });
      } else {
        qb.andWhere('category.id_owner = :ownerId', { ownerId });
      }
    }

    if (industryCode) {
      qb.andWhere('(category.industry_code = :industryCode OR category.industry_code IS NULL)', { industryCode });
    }

    if (isOperational !== undefined) {
      qb.andWhere('category.is_operational = :isOperational', { isOperational });
    }

    if (isActive !== undefined) {
      qb.andWhere('category.is_active = :isActive', { isActive });
    }

    qb.orderBy('category.display_order', 'ASC')
      .addOrderBy('category.category_name', 'ASC');

    return qb.getMany();
  }

  /**
   * Get category by ID
   */
  async findOne(id: string): Promise<MapLayerCategory> {
    const category = await this.categoryRepository.findOne({ where: { idCategory: id } });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return category;
  }

  /**
   * Get category by code
   */
  async findByCode(categoryCode: string, ownerId?: string): Promise<MapLayerCategory | null> {
    // First try owner-specific category
    if (ownerId) {
      const ownerCategory = await this.categoryRepository.findOne({
        where: { categoryCode, idOwner: ownerId },
      });
      if (ownerCategory) return ownerCategory;
    }

    // Fallback to system category
    const qb = this.categoryRepository.createQueryBuilder('category')
      .where('category.category_code = :categoryCode', { categoryCode })
      .andWhere('category.is_system = true');
    
    return qb.getOne();
  }

  /**
   * Update category
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<MapLayerCategory> {
    const category = await this.categoryRepository.findOne({ where: { idCategory: id } });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    // Prevent modifying system categories (except by admin - handled in controller)
    if (category.isSystem) {
      // Allow only certain fields to be updated for system categories
      const allowed = ['displayOrder', 'defaultStyle', 'iconDefault', 'colorDefault'];
      Object.keys(dto).forEach(key => {
        if (!allowed.includes(key)) {
          delete (dto as any)[key];
        }
      });
    }

    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  /**
   * Delete category
   */
  async remove(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { idCategory: id } });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    if (category.isSystem) {
      throw new ConflictException('Cannot delete system category');
    }

    await this.categoryRepository.remove(category);
  }

  /**
   * Get template fields for a category (for auto-mapping)
   */
  async getTemplateFields(categoryCode: string, ownerId?: string): Promise<{ name: string; type: string; required: boolean; aliases: string[] }[]> {
    const category = await this.findByCode(categoryCode, ownerId);
    if (!category) {
      return [];
    }
    return category.templateFields.map(f => ({
      name: f.name,
      type: f.type,
      required: f.required,
      aliases: f.aliases || [],
    }));
  }

  /**
   * Seed default system categories
   */
  async seedSystemCategories(): Promise<void> {
    type FieldType = 'string' | 'number' | 'boolean' | 'date';
    const systemCategories = [
      // Water Utility
      {
        categoryCode: 'pipe_network',
        categoryName: 'Jaringan Pipa',
        industryCode: 'water_utility',
        isOperational: true,
        allowedGeometryTypes: ['LineString', 'MultiLineString'],
        templateFields: [
          { name: 'diameter', type: 'number' as FieldType, required: false, aliases: ['pipe_diameter', 'size', 'ukuran'], unit: 'mm' },
          { name: 'material', type: 'string' as FieldType, required: false, aliases: ['pipe_material', 'bahan'] },
          { name: 'installed_year', type: 'number' as FieldType, required: false, aliases: ['year', 'tahun_pasang'] },
        ],
        defaultStyle: { stroke: '#2196F3', strokeWidth: 3 },
        iconDefault: 'pipe',
        colorDefault: '#2196F3',
      },
      {
        categoryCode: 'valve',
        categoryName: 'Valve',
        industryCode: 'water_utility',
        isOperational: true,
        allowedGeometryTypes: ['Point'],
        templateFields: [
          { name: 'valve_type', type: 'string', required: false, aliases: ['type', 'tipe'] },
          { name: 'status', type: 'string', required: false, aliases: ['condition'], options: ['open', 'closed', 'maintenance'] },
        ],
        defaultStyle: { icon: 'valve', radius: 8 },
        iconDefault: 'valve',
        colorDefault: '#FF9800',
      },
      {
        categoryCode: 'hydrant',
        categoryName: 'Hydrant',
        industryCode: 'water_utility',
        isOperational: true,
        allowedGeometryTypes: ['Point'],
        templateFields: [
          { name: 'hydrant_id', type: 'string', required: true, aliases: ['id', 'kode'] },
          { name: 'status', type: 'string', required: false, options: ['active', 'inactive', 'damaged'] },
        ],
        defaultStyle: { icon: 'hydrant', radius: 8 },
        iconDefault: 'hydrant',
        colorDefault: '#F44336',
      },
      {
        categoryCode: 'dma_boundary',
        categoryName: 'DMA Boundary',
        industryCode: 'water_utility',
        isOperational: true,
        allowedGeometryTypes: ['Polygon', 'MultiPolygon'],
        templateFields: [
          { name: 'dma_code', type: 'string', required: true, aliases: ['code', 'kode_dma'] },
          { name: 'dma_name', type: 'string', required: false, aliases: ['name', 'nama'] },
          { name: 'population', type: 'number', required: false, aliases: ['jumlah_penduduk'] },
        ],
        defaultStyle: { fill: 'rgba(33, 150, 243, 0.2)', stroke: '#2196F3', strokeWidth: 2 },
        colorDefault: '#2196F3',
      },
      // Energy
      {
        categoryCode: 'transmission_line',
        categoryName: 'Transmission Line',
        industryCode: 'energy',
        isOperational: true,
        allowedGeometryTypes: ['LineString'],
        templateFields: [
          { name: 'voltage', type: 'number', required: false, aliases: ['tegangan'], unit: 'kV' },
          { name: 'capacity', type: 'number', required: false, unit: 'MW' },
        ],
        defaultStyle: { stroke: '#FFC107', strokeWidth: 3, lineDash: [10, 5] },
        colorDefault: '#FFC107',
      },
      {
        categoryCode: 'substation',
        categoryName: 'Substation',
        industryCode: 'energy',
        isOperational: true,
        allowedGeometryTypes: ['Point', 'Polygon'],
        templateFields: [
          { name: 'station_name', type: 'string', required: true, aliases: ['name', 'nama'] },
          { name: 'capacity', type: 'number', required: false, unit: 'MVA' },
        ],
        defaultStyle: { icon: 'substation', radius: 10 },
        iconDefault: 'substation',
        colorDefault: '#9C27B0',
      },
      // General
      {
        categoryCode: 'custom_point',
        categoryName: 'Custom Point',
        industryCode: null,
        isOperational: false,
        allowedGeometryTypes: ['Point'],
        templateFields: [],
        defaultStyle: { radius: 6, fill: '#4CAF50' },
        colorDefault: '#4CAF50',
      },
      {
        categoryCode: 'custom_line',
        categoryName: 'Custom Line',
        industryCode: null,
        isOperational: false,
        allowedGeometryTypes: ['LineString', 'MultiLineString'],
        templateFields: [],
        defaultStyle: { stroke: '#607D8B', strokeWidth: 2 },
        colorDefault: '#607D8B',
      },
      {
        categoryCode: 'custom_polygon',
        categoryName: 'Custom Polygon',
        industryCode: null,
        isOperational: false,
        allowedGeometryTypes: ['Polygon', 'MultiPolygon'],
        templateFields: [],
        defaultStyle: { fill: 'rgba(96, 125, 139, 0.3)', stroke: '#607D8B', strokeWidth: 1 },
        colorDefault: '#607D8B',
      },
    ];

    for (const cat of systemCategories) {
      const existing = await this.categoryRepository.findOne({
        where: { categoryCode: cat.categoryCode, isSystem: true },
      });
      if (!existing) {
        const newCategory = this.categoryRepository.create();
        Object.assign(newCategory, cat, { isSystem: true, isActive: true });
        await this.categoryRepository.save(newCategory);
      }
    }
  }
}
