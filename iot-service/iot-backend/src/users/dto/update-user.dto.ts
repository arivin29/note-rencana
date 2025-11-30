import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../auth/entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'newemail@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe Updated',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: UserRole,
    example: UserRole.TENANT,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Owner ID',
    example: '789b4bc0-a118-4e49-95b1-cb2feec548bb',
  })
  @IsUUID()
  @IsOptional()
  idOwner?: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '081234567890',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/new-avatar.jpg',
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'User active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
