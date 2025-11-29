import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  ADMIN = 'admin',
  TENANT = 'tenant',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'id_user' })
  idUser: string;

  @Column({ name: 'id_owner', type: 'uuid', nullable: true })
  idOwner: string | null;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude() // Don't include password in JSON responses
  password: string;

  @Column()
  name: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: UserRole.TENANT,
  })
  role: UserRole;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp with time zone', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  // Relations can be added here if needed
  // @ManyToOne(() => Owner)
  // @JoinColumn({ name: 'id_owner' })
  // owner: Owner;
}
