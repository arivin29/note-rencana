import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../../auth/entities/user.entity';
import { Owner } from '../../../entities/owner.entity';

export enum RateLimitPlan {
  BASIC = 'basic',       // 60 req/min, 10k/day
  STANDARD = 'standard', // 120 req/min, 50k/day
  PREMIUM = 'premium',   // 300 req/min, 100k/day
}

@Entity('tenant_api_keys')
@Index(['apiKeyPrefix'])
@Index(['idUser'])
@Index(['idOwner'])
export class TenantApiKey {
  @PrimaryGeneratedColumn('uuid', { name: 'id_api_key' })
  idApiKey: string;

  @Column({ type: 'uuid', name: 'id_user' })
  idUser: string;

  @Column({ type: 'uuid', name: 'id_owner' })
  idOwner: string;

  /**
   * Bcrypt hash of the API key
   * The actual API key is NEVER stored in plain text
   */
  @Column({ type: 'varchar', length: 255, name: 'api_key_hash' })
  apiKeyHash: string;

  /**
   * Prefix for display purposes: "tnt_abc1****"
   * Used for identifying keys in UI without exposing full key
   */
  @Column({ type: 'varchar', length: 20, name: 'api_key_prefix' })
  apiKeyPrefix: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'rate_limit_plan',
    default: RateLimitPlan.BASIC,
  })
  rateLimitPlan: RateLimitPlan;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamptz', name: 'last_used_at', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'integer', name: 'requests_today', default: 0 })
  requestsToday: number;

  @Column({ type: 'bigint', name: 'requests_total', default: 0 })
  requestsTotal: number;

  @Column({ type: 'date', name: 'last_request_date', nullable: true })
  lastRequestDate: Date | null;

  @Column({ type: 'text', array: true, name: 'ip_whitelist', nullable: true })
  ipWhitelist: string[] | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_user' })
  user: User;

  @ManyToOne(() => Owner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_owner' })
  owner: Owner;

  // Helper method to check if key is expired
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  // Helper method to check if key is valid
  isValid(): boolean {
    return this.isActive && !this.isExpired();
  }

  // Get rate limit config based on plan
  getRateLimitConfig(): { requestsPerMinute: number; requestsPerDay: number } {
    switch (this.rateLimitPlan) {
      case RateLimitPlan.PREMIUM:
        return { requestsPerMinute: 300, requestsPerDay: 100000 };
      case RateLimitPlan.STANDARD:
        return { requestsPerMinute: 120, requestsPerDay: 50000 };
      case RateLimitPlan.BASIC:
      default:
        return { requestsPerMinute: 60, requestsPerDay: 10000 };
    }
  }
}
