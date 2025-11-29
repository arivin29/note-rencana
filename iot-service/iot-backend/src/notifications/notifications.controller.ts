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
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../auth/entities/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ==================== NOTIFICATIONS ====================

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create and send notification (admin only)' })
  @ApiResponse({ status: 201, description: 'Notification created and sent' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User or channel not found' })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications (admin sees all, tenant sees own)' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async findAll(
    @Query() filterDto: FilterNotificationsDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.notificationsService.findAll(filterDto, currentUser);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(@CurrentUser() currentUser: User) {
    return this.notificationsService.getUnreadCount(currentUser);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() currentUser: User) {
    return this.notificationsService.markAllAsRead(currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification found' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.notificationsService.findOne(id, currentUser);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.notificationsService.markAsRead(id, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.notificationsService.remove(id, currentUser);
  }

  // ==================== CHANNELS ====================

  @Post('channels')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create notification channel (admin only)' })
  @ApiResponse({ status: 201, description: 'Channel created successfully' })
  async createChannel(@Body() createChannelDto: CreateChannelDto) {
    return this.notificationsService.createChannel(createChannelDto);
  }

  @Get('channels/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all notification channels (admin only)' })
  @ApiResponse({ status: 200, description: 'Channels retrieved successfully' })
  async findAllChannels() {
    return this.notificationsService.findAllChannels();
  }

  @Get('channels/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get notification channel by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'Channel found' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async findOneChannel(@Param('id') id: string) {
    return this.notificationsService.findOneChannel(id);
  }

  @Patch('channels/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update notification channel (admin only)' })
  @ApiResponse({ status: 200, description: 'Channel updated successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async updateChannel(
    @Param('id') id: string,
    @Body() updateChannelDto: UpdateChannelDto,
  ) {
    return this.notificationsService.updateChannel(id, updateChannelDto);
  }

  @Delete('channels/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete notification channel (admin only)' })
  @ApiResponse({ status: 200, description: 'Channel deleted successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async removeChannel(@Param('id') id: string) {
    return this.notificationsService.removeChannel(id);
  }
}

