import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../auth/entities/user.entity';
import { Owner } from '../entities/owner.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FilterUsersDto } from './dto/filter-users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Owner)
    private readonly ownerRepository: Repository<Owner>,
  ) {}

  /**
   * Find all users with filters and pagination
   * Role-based access: admin sees all, tenant sees only self
   */
  async findAll(
    filterDto: FilterUsersDto,
    currentUser: User,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const { role, idOwner, isActive, search, page = 1, limit = 10 } = filterDto;

    const where: any = {};

    // Role-based filtering
    if (currentUser.role === UserRole.TENANT) {
      // Tenant can only see themselves
      where.idUser = currentUser.idUser;
    } else {
      // Admin can filter by role, owner, status
      if (role) {
        where.role = role;
      }
      if (idOwner) {
        where.idOwner = idOwner;
      }
      if (isActive !== undefined) {
        where.isActive = isActive;
      }
    }

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Apply where conditions
    Object.keys(where).forEach((key) => {
      queryBuilder.andWhere(`user.${key} = :${key}`, { [key]: where[key] });
    });

    // Search by name or email
    if (search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Order by created date
    queryBuilder.orderBy('user.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find user by ID
   * Role-based access: admin can view any user, tenant can only view self
   */
  async findOne(id: string, currentUser: User): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { idUser: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check access permission
    if (currentUser.role === UserRole.TENANT && user.idUser !== currentUser.idUser) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return user;
  }

  /**
   * Create new user (admin only)
   */
  async create(createUserDto: CreateUserDto, currentUser: User): Promise<User> {
    // Only admin can create users
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create users');
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // If tenant role, validate idOwner
    if (createUserDto.role === UserRole.TENANT) {
      if (!createUserDto.idOwner) {
        throw new BadRequestException('Tenant users must have an owner');
      }

      const owner = await this.ownerRepository.findOne({
        where: { idOwner: createUserDto.idOwner },
      });

      if (!owner) {
        throw new BadRequestException('Owner not found');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      isActive: true,
      createdBy: currentUser.idUser,
    });

    return await this.userRepository.save(user);
  }

  /**
   * Update user
   * Role-based access: admin can update any user, tenant can only update self (limited fields)
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: User,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { idUser: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check access permission
    if (currentUser.role === UserRole.TENANT) {
      // Tenant can only update self
      if (user.idUser !== currentUser.idUser) {
        throw new ForbiddenException('You can only update your own profile');
      }

      // Tenant cannot change role, idOwner, or isActive
      if (updateUserDto.role || updateUserDto.idOwner !== undefined || updateUserDto.isActive !== undefined) {
        throw new ForbiddenException('You cannot modify role, owner, or active status');
      }
    }

    // Check email uniqueness if changing email
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Validate owner if changing idOwner
    if (updateUserDto.idOwner) {
      const owner = await this.ownerRepository.findOne({
        where: { idOwner: updateUserDto.idOwner },
      });

      if (!owner) {
        throw new BadRequestException('Owner not found');
      }
    }

    // Update user
    Object.assign(user, updateUserDto);
    user.updatedBy = currentUser.idUser;

    return await this.userRepository.save(user);
  }

  /**
   * Delete user (admin only)
   */
  async delete(id: string, currentUser: User): Promise<{ message: string }> {
    // Only admin can delete users
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete users');
    }

    const user = await this.userRepository.findOne({
      where: { idUser: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting self
    if (user.idUser === currentUser.idUser) {
      throw new BadRequestException('You cannot delete your own account');
    }

    await this.userRepository.remove(user);

    return { message: 'User deleted successfully' };
  }

  /**
   * Change password
   * Users can only change their own password
   */
  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
    currentUser: User,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { idUser: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Users can only change their own password
    if (user.idUser !== currentUser.idUser && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only change your own password');
    }

    // For non-admin users, verify current password
    if (currentUser.role !== UserRole.ADMIN) {
      const isPasswordValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.password,
      );

      if (!isPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password
    user.password = hashedPassword;
    user.updatedBy = currentUser.idUser;

    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  /**
   * Toggle user active status (admin only)
   */
  async toggleActive(id: string, currentUser: User): Promise<User> {
    // Only admin can toggle active status
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can toggle user status');
    }

    const user = await this.userRepository.findOne({
      where: { idUser: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deactivating self
    if (user.idUser === currentUser.idUser) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    // Toggle active status
    user.isActive = !user.isActive;
    user.updatedBy = currentUser.idUser;

    return await this.userRepository.save(user);
  }
}
