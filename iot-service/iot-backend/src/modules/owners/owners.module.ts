import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnersController } from './owners.controller';
import { OwnersService } from './owners.service';
import { Owner } from '../../entities/owner.entity';
import { OwnerForwardingWebhook } from '../../entities/owner-forwarding-webhook.entity';
import { OwnerForwardingDatabase } from '../../entities/owner-forwarding-database.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Owner, OwnerForwardingWebhook, OwnerForwardingDatabase])],
  controllers: [OwnersController],
  providers: [OwnersService],
  exports: [OwnersService],
})
export class OwnersModule {}
