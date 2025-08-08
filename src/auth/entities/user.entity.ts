import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, Unique } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Entity()
@Unique(['email']) // уникальный индекс
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
  provider?: string; // 'google', 'local'

  @Column({ default: false })
  isVerified: boolean;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  async comparePassword(attempt: string): Promise<boolean> {
    return await bcrypt.compare(attempt, this.password);
  }
}