import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, Unique, BeforeUpdate } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Entity()
// @Unique(['email']) // уникальный индекс
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  avatar: string; // URL к аватарке

  @Column({ nullable: true })
  provider?: string; // 'google', 'local'

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true }) 
  phone: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  @BeforeUpdate()
  async hashPasswordOnUpdate() {
    // Хешируем пароль только если он был изменен
    if (this.password && this.password.length < 60) { 
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async comparePassword(attempt: string): Promise<boolean> {
    return await bcrypt.compare(attempt, this.password);
  }
}