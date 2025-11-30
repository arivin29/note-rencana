import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { UserResponseDto, PaginatedUserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../auth/entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users with filters (admin sees all, tenant sees self)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully', type: PaginatedUserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query() filterDto: FilterUsersDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedUserResponseDto> {
    return this.usersService.findAll(filterDto, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Tenant can only view self' })
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: User): Promise<UserResponseDto> {
    return this.usersService.findOne(id, currentUser);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Email exists or validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can create users' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (admin updates any, tenant updates self with limited fields)' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user (admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete own account' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can delete users' })
  async delete(@Param('id') id: string, @CurrentUser() currentUser: User): Promise<{ message: string }> {
    return this.usersService.delete(id, currentUser);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Change password (users change own, admin can change any)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Current password incorrect' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    return this.usersService.changePassword(id, changePasswordDto, currentUser);
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Toggle user active status (admin only)' })
  @ApiResponse({ status: 200, description: 'User status toggled successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot deactivate own account' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can toggle status' })
  async toggleActive(@Param('id') id: string, @CurrentUser() currentUser: User): Promise<UserResponseDto> {
    return this.usersService.toggleActive(id, currentUser);
  }
}
