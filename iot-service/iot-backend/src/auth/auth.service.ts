import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Owner } from '../entities/owner.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Owner)
    private readonly ownerRepository: Repository<Owner>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register new user
   */
  async register(registerDto: RegisterDto): Promise<{ user: User; access_token: string }> {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // If idOwner provided, validate it exists
    if (registerDto.idOwner) {
      const owner = await this.ownerRepository.findOne({
        where: { idOwner: registerDto.idOwner },
      });

      if (!owner) {
        throw new BadRequestException('Owner not found');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = this.userRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      phone: registerDto.phone,
      idOwner: registerDto.idOwner || null, // Can be null for admin users
      role: registerDto.idOwner ? UserRole.TENANT : UserRole.ADMIN, // If idOwner provided, user is tenant
      isActive: true,
    });

    await this.userRepository.save(user);

    // Generate JWT token
    const payload = {
      sub: user.idUser,
      email: user.email,
      role: user.role,
      idOwner: user.idOwner,
    };
    const access_token = this.jwtService.sign(payload);

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword as User, access_token };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto): Promise<{ user: User; access_token: string }> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = {
      sub: user.idUser,
      email: user.email,
      role: user.role,
      idOwner: user.idOwner,
    };
    const access_token = this.jwtService.sign(payload);

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword as User, access_token };
  }

  /**
   * Validate user (used by JWT strategy)
   */
  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { idUser: userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { idUser: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword as User;
  }

  /**
   * Forgot password - Generate reset token
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string; token?: string }> {
    const user = await this.userRepository.findOne({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return {
        message: 'If the email exists, a reset link has been sent',
      };
    }

    // Generate reset token (in production, save this to password_reset_tokens table)
    const resetToken = this.jwtService.sign(
      { sub: user.idUser, email: user.email, type: 'reset' },
      { expiresIn: '1h' }, // Token expires in 1 hour
    );

    // TODO: Send email with reset link
    // For now, just return the token (in production, this should be sent via email)
    return {
      message: 'Reset token generated',
      token: resetToken, // Remove this in production, token should be sent via email
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    try {
      // Verify token
      const payload = this.jwtService.verify(resetPasswordDto.token);

      if (payload.type !== 'reset') {
        throw new BadRequestException('Invalid reset token');
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { idUser: payload.sub },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

      // Update password
      user.password = hashedPassword;
      await this.userRepository.save(user);

      return { message: 'Password reset successfully' };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Reset token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid reset token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId: string): Promise<{ access_token: string }> {
    const user = await this.validateUser(userId);

    const payload = {
      sub: user.idUser,
      email: user.email,
      role: user.role,
      idOwner: user.idOwner,
    };

    const access_token = this.jwtService.sign(payload);

    return { access_token };
  }
}
