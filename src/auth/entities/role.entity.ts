import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { User } from './user.entity';
import { Permission } from './permission.entity';

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

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @ManyToMany(() => Permission, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];
}
