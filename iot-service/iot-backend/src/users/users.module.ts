import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../auth/entities/user.entity';
import { Owner } from '../entities/owner.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Owner]),
    AuthModule, // Import AuthModule for guards and decorators
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService], // Export service for use in other modules
})
export class UsersModule {}
