import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('owners')
export class Owner {
  @PrimaryColumn('uuid', { name: 'id_owner', default: () => 'gen_random_uuid()' })
  idOwner: string;

  @Column('varchar', { length: 5, unique: true, name: 'owner_code' })
  ownerCode: string; // 5-digit unique code (from backend)

  @Column('text')
  name: string;

  @Column('text', { nullable: true })
  industry: string;

  @Column('text', { name: 'contact_person', nullable: true })
  contactPerson: string;

  @Column('text', { nullable: true })
  email: string;

  @Column('text', { nullable: true })
  phone: string;

  @Column('text', { nullable: true })
  address: string;

  @Column('text', { name: 'sla_level', nullable: true })
  slaLevel: string;

  @Column('jsonb', { name: 'forwarding_settings', nullable: true })
  forwardingSettings: Record<string, any>;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column('timestamp with time zone', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
