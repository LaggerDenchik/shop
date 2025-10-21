import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, ManyToOne, JoinColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from './role.entity';
import { Organization } from './organization.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email', type: 'varchar', unique: true, nullable: false })
  email: string;

  @Column({ name: 'password', type: 'varchar', nullable: false })
  password: string;

  @Column({ name: 'full_name', type: 'varchar', nullable: true })
  fullName?: string;

  @Column({ name: 'role_id', type: 'uuid', nullable: true })
  roleId?: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ name: 'avatar', type: 'varchar', nullable: true })
  avatar?: string;

  @Column({ name: 'provider', type: 'varchar', nullable: true })
  provider?: string;

  @Column({ name: 'isverified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'phone', type: 'varchar', nullable: true })
  phone?: string;

  @Column({ name: 'type', type: 'varchar', default: 'customer' })
  type: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

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
    return await bcrypt.compare(attempt, this.password);
  }
}
