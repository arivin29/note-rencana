import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryColumn('uuid', { name: 'id_project' })
  idProject: string;

  @Column('uuid', { name: 'id_owner' })
  idOwner: string;

  @Column('text')
  name: string;

  @Column('text', { name: 'area_type', nullable: true })
  areaType: string;

  @Column('jsonb', { nullable: true })
  geofence: Record<string, any>;

  @Column('text', { nullable: true })
  status: string;

  @Column('timestamp with time zone', { name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column('timestamp with time zone', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
