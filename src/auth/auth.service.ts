import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersRepository.findOne({ 
      where: { email: registerDto.email } 
    });
    
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const user = this.usersRepository.create(registerDto);
    await this.usersRepository.save(user);
    return this.generateToken(user);
  }


  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersRepository.findOne({ 
      where: { email },
      select: ['id', 'email', 'password', 'name'] // Важно!
    });
    
    if (!user) return null;

    // console.log('Input password:', password);
    // console.log('Stored hash:', user.password);
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    const { password: _, ...result } = user;
    return result;
  }

  async validateUserById(userId: number) {
    return this.usersRepository.findOne({ where: { id: userId } });
  }

  async login(user: User) {
    return this.generateToken(user);
  }

  async validateOrCreateUser(profile: {
      email: string;
      name: string;
      provider: string;
    }) {
    let user = await this.usersRepository.findOne({ 
      where: { email: profile.email } 
    });

    if (!user) {
      user = this.usersRepository.create({
        email: profile.email,
        name: profile.name,
        isVerified: true,
        provider: profile.provider,
      });
      await this.usersRepository.save(user);
    }

    return this.generateToken(user);
  }

  private generateToken(user: User) {
    if (!user || !user.email) {
      throw new Error('Invalid user object');
    }
    const payload = { 
      sub: user.id, 
      email: user.email,
      name: user.name 
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}