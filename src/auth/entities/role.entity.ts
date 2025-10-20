import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Имя роли (super_admin, site_admin, org_admin, org_user, customer)
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  // Область применения (global, organization, client)
  @Column({
    type: 'enum',
    enum: ['global', 'organization', 'client'],
    default: 'client',
  })
  scope: 'global' | 'organization' | 'client';

  // JSON с разрешениями (пример: ["orders:view", "catalog:edit"])
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  permissions: string[];

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
