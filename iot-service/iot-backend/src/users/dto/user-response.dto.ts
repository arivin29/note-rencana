import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { UserRole } from '../../auth/entities/user.entity';

/**
 * User Response DTO
 * Used for returning user data without sensitive information (like password)
 */
@Exclude()
export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  idUser: string;

  @ApiPropertyOptional({
    description: 'Owner ID (for tenant users)',
    example: '789b4bc0-a118-4e49-95b1-cb2feec548bb',
    type: String,
    nullable: true,
  })
  @Expose()
  idOwner?: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.TENANT,
  })
  @Expose()
  role: UserRole;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '081234567890',
    type: String,
    nullable: true,
  })
  @Expose()
  phone?: string;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
    type: String,
    nullable: true,
  })
  @Expose()
  avatarUrl?: string;

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
  })
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-15T10:30:00Z',
    type: String,
    nullable: true,
  })
  @Expose()
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T12:00:00Z',
  })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'User ID who created this user',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: String,
    nullable: true,
  })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'User ID who last updated this user',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: String,
    nullable: true,
  })
  @Expose()
  updatedBy?: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Paginated User Response DTO
 * Used for returning paginated list of users
 */
export class PaginatedUserResponseDto {
  @ApiProperty({
    description: 'Array of users',
    type: [UserResponseDto],
  })
  data: UserResponseDto[];

  @ApiProperty({
    description: 'Total number of users',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  get hasNextPage(): boolean {
    return this.page < this.totalPages;
  }

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  get hasPreviousPage(): boolean {
    return this.page > 1;
  }
}
