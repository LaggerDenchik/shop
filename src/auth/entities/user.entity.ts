import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from './role.entity';
import { Organization } from './organization.entity';
import { Permission } from './permission.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email', type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ name: 'password', type: 'varchar', length: 255, nullable: false })
  password: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: true })
  fullName?: string;

  @Column({ name: 'phone', type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ name: 'avatar', type: 'varchar', length: 255, nullable: true })
  avatar?: string;

  @Column({ name: 'provider', type: 'varchar', length: 50, nullable: true })
  provider?: string;

  @Column({ name: 'isverified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'type', type: 'varchar', length: 20, default: 'customer' })
  type: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'role_id', type: 'uuid', nullable: true })
  roleId?: string;
  
  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  // @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null;

  @ManyToOne(() => Organization, (org) => org.users, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @ManyToMany(() => Permission, { eager: true })
  // @ManyToMany(() => Permission)
  @JoinTable({
    name: 'user_permissions', 
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  @BeforeUpdate()
  async hashPasswordOnUpdate() {
    if (this.password && this.password.length < 60) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async comparePassword(attempt: string): Promise<boolean> {
    return bcrypt.compare(attempt, this.password);
  }
}
