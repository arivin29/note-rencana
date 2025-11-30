import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ChannelType {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

@Entity('notification_channels')
export class NotificationChannel {
  @PrimaryGeneratedColumn('uuid', { name: 'id_channel' })
  idChannel: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: ChannelType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  config: any;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
