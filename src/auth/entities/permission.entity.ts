import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Role } from './role.entity';
import { User } from './user.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  tag: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  @ManyToMany(() => User, (user) => user.permissions)
  users: User[];
}