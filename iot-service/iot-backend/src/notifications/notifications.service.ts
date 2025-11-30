import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Notification, NotificationStatus } from './entities/notification.entity';
import { NotificationChannel } from './entities/notification-channel.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationChannel)
    private readonly channelRepository: Repository<NotificationChannel>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create and send a notification
   */
  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const { idUser, idChannel } = createNotificationDto;

    // Validate user exists
    const user = await this.userRepository.findOne({ where: { idUser } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate channel exists and is active
    const channel = await this.channelRepository.findOne({ where: { idChannel } });
    if (!channel) {
      throw new NotFoundException('Notification channel not found');
    }
    if (!channel.isActive) {
      throw new BadRequestException('Notification channel is not active');
    }

    // Create notification
    const notification = this.notificationRepository.create(createNotificationDto);
    const savedNotification = await this.notificationRepository.save(notification);

    // Send notification (async, don't wait)
    this.sendNotification(savedNotification.idNotification, channel).catch(error => {
      console.error('Failed to send notification:', error);
    });

    return savedNotification;
  }

  /**
   * Send notification via channel
   */
  private async sendNotification(idNotification: string, channel: NotificationChannel): Promise<void> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { idNotification },
        relations: ['user'],
      });

      if (!notification) return;

      // Simulate sending based on channel type
      switch (channel.type) {
        case 'email':
          await this.sendEmail(notification, channel);
          break;
        case 'webhook':
          await this.sendWebhook(notification, channel);
          break;
        case 'sms':
          await this.sendSMS(notification, channel);
          break;
        case 'push':
          await this.sendPush(notification, channel);
          break;
        case 'in_app':
          // In-app notifications are just stored, no sending needed
          break;
      }

      // Mark as sent
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await this.notificationRepository.save(notification);
    } catch (error) {
      // Mark as failed
      await this.notificationRepository.update(idNotification, {
        status: NotificationStatus.FAILED,
        errorMessage: error.message,
      });
    }
  }

  private async sendEmail(notification: Notification, channel: NotificationChannel): Promise<void> {
    // TODO: Implement actual email sending (e.g., using nodemailer)
    console.log(`[EMAIL] Sending to ${notification.user.email}:`, notification.title);
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendWebhook(notification: Notification, channel: NotificationChannel): Promise<void> {
    // TODO: Implement actual webhook POST
    console.log(`[WEBHOOK] Sending to ${channel.config?.url}:`, notification.title);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendSMS(notification: Notification, channel: NotificationChannel): Promise<void> {
    // TODO: Implement actual SMS sending (e.g., using Twilio)
    console.log(`[SMS] Sending to ${notification.user.phone}:`, notification.title);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendPush(notification: Notification, channel: NotificationChannel): Promise<void> {
    // TODO: Implement actual push notification (e.g., using FCM)
    console.log(`[PUSH] Sending to user ${notification.idUser}:`, notification.title);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Find all notifications with filters
   */
  async findAll(filterDto: FilterNotificationsDto, currentUser: User) {
    const { idUser, type, status, isRead, search, page = 1, limit = 10 } = filterDto;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user');

    // Tenant users can only see their own notifications
    if (currentUser.role === 'tenant') {
      queryBuilder.andWhere('notification.idUser = :currentUserId', {
        currentUserId: currentUser.idUser,
      });
    }

    // Filter by user ID (admin can filter by any user)
    if (idUser && currentUser.role === 'admin') {
      queryBuilder.andWhere('notification.idUser = :idUser', { idUser });
    }

    // Filter by type
    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('notification.status = :status', { status });
    }

    // Filter by read status
    if (isRead !== undefined) {
      if (isRead) {
        queryBuilder.andWhere('notification.readAt IS NOT NULL');
      } else {
        queryBuilder.andWhere('notification.readAt IS NULL');
      }
    }

    // Search in title and message
    if (search) {
      queryBuilder.andWhere(
        '(notification.title ILIKE :search OR notification.message ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Order by newest first
    queryBuilder.orderBy('notification.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get notification by ID
   */
  async findOne(idNotification: string, currentUser: User): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { idNotification },
      relations: ['user'],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Tenant can only view their own notifications
    if (currentUser.role === 'tenant' && notification.idUser !== currentUser.idUser) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(idNotification: string, currentUser: User): Promise<Notification> {
    const notification = await this.findOne(idNotification, currentUser);

    if (notification.readAt) {
      return notification; // Already read
    }

    notification.readAt = new Date();
    return await this.notificationRepository.save(notification);
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(currentUser: User): Promise<{ affected: number }> {
    const result = await this.notificationRepository.update(
      {
        idUser: currentUser.idUser,
        readAt: IsNull(),
      },
      {
        readAt: new Date(),
      },
    );

    return { affected: result.affected || 0 };
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(currentUser: User): Promise<{ count: number }> {
    const count = await this.notificationRepository.count({
      where: {
        idUser: currentUser.idUser,
        readAt: IsNull(),
      },
    });

    return { count };
  }

  /**
   * Delete notification
   */
  async remove(idNotification: string, currentUser: User): Promise<{ message: string }> {
    const notification = await this.findOne(idNotification, currentUser);
    await this.notificationRepository.remove(notification);
    return { message: 'Notification deleted successfully' };
  }

  // ==================== CHANNEL MANAGEMENT ====================

  /**
   * Create notification channel
   */
  async createChannel(createChannelDto: CreateChannelDto): Promise<NotificationChannel> {
    const channel = this.channelRepository.create(createChannelDto);
    return await this.channelRepository.save(channel);
  }

  /**
   * Find all channels
   */
  async findAllChannels(): Promise<NotificationChannel[]> {
    return await this.channelRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find channel by ID
   */
  async findOneChannel(idChannel: string): Promise<NotificationChannel> {
    const channel = await this.channelRepository.findOne({ where: { idChannel } });
    if (!channel) {
      throw new NotFoundException('Notification channel not found');
    }
    return channel;
  }

  /**
   * Update channel
   */
  async updateChannel(
    idChannel: string,
    updateChannelDto: UpdateChannelDto,
  ): Promise<NotificationChannel> {
    const channel = await this.findOneChannel(idChannel);
    Object.assign(channel, updateChannelDto);
    return await this.channelRepository.save(channel);
  }

  /**
   * Delete channel
   */
  async removeChannel(idChannel: string): Promise<{ message: string }> {
    const channel = await this.findOneChannel(idChannel);
    await this.channelRepository.remove(channel);
    return { message: 'Notification channel deleted successfully' };
  }
}

