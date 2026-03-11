import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Owner } from './owner.entity';

export interface TemplateField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  aliases?: string[];
  unit?: string;
  options?: string[];
}

export interface CategoryDefaultStyle {
  icon?: string;
  iconUrl?: string;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  radius?: number;
}

@Entity('map_layer_category')
@Index(['idOwner', 'categoryCode'], { unique: true })
@Index(['industryCode'])
@Index(['isActive'])
export class MapLayerCategory {
  @PrimaryGeneratedColumn('uuid', { name: 'id_category' })
  idCategory: string;

  @Column({ type: 'uuid', name: 'id_owner', nullable: true })
  idOwner: string;

  @Column({ type: 'varchar', length: 50, name: 'category_code' })
  categoryCode: string;

  @Column({ type: 'varchar', length: 255, name: 'category_name' })
  categoryName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, name: 'industry_code', nullable: true })
  industryCode: string;

  @Column({ type: 'uuid', name: 'parent_category_id', nullable: true })
  parentCategoryId: string;

  @Column({ 
    type: 'varchar', 
    array: true, 
    name: 'allowed_geometry_types', 
    default: ['Point', 'LineString', 'Polygon'] 
  })
  allowedGeometryTypes: string[];

  @Column({ type: 'jsonb', name: 'template_fields', default: [] })
  templateFields: TemplateField[];

  @Column({ type: 'jsonb', name: 'default_style', default: {} })
  defaultStyle: CategoryDefaultStyle;

  @Column({ type: 'varchar', length: 100, name: 'icon_default', nullable: true })
  iconDefault: string;

  @Column({ type: 'varchar', length: 20, name: 'color_default', nullable: true })
  colorDefault: string;

  @Column({ type: 'boolean', name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ type: 'boolean', name: 'is_operational', default: false })
  isOperational: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'integer', name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  @ManyToOne(() => MapLayerCategory, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_category_id' })
  parentCategory: MapLayerCategory;
}
