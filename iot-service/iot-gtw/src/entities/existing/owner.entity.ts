import { Entity, Column, PrimaryColumn, BeforeInsert } from 'typeorm';

@Entity('owners')
export class Owner {
  @PrimaryColumn('uuid', { name: 'id_owner', default: () => 'gen_random_uuid()' })
  idOwner: string;

  @Column('text', { unique: true })
  code: string; // 5-digit unique code (auto-generated)

  @Column('text')
  name: string;

  @Column('text', { nullable: true })
  industry: string;

  @Column('text', { name: 'contact_person', nullable: true })
  contactPerson: string;

  @Column('text', { name: 'sla_level', nullable: true })
  slaLevel: string;

  @Column('jsonb', { name: 'forwarding_settings', nullable: true })
  forwardingSettings: Record<string, any>;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column('timestamp with time zone', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;

  /**
   * Generate unique 5-character alphanumeric code
   * Format: XXXXX (uppercase letters and numbers)
   */
  @BeforeInsert()
  generateCode() {
    if (!this.code) {
      // Generate 5-digit alphanumeric code (0-9, A-Z)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      this.code = code;
    }
  }
}
