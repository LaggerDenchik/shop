import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  async findUserById(id: number) {
    return this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'phone', 'createdAt']
    });
  }
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
    
    // Получим сохраненного пользователя с полными данными
    const savedUser = await this.usersRepository.findOne({
      where: { id: user.id },
      select: ['id', 'email', 'name', 'phone', 'createdAt']
    });

    if (!savedUser) {
      throw new Error('User not found after registration');
    }

    return this.generateToken(savedUser);
  }


  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersRepository.findOne({ 
      where: { email },
      select: ['id', 'email', 'password', 'name', 'phone', 'createdAt'] // Важно!
    });
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
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
    provider: string,
  }) {
    let user = await this.usersRepository.findOne({ 
      where: { email: profile.email } 
    });

    if (!user) {
      user = this.usersRepository.create({
        email: profile.email,
        name: profile.name,
        isVerified: true,
        provider: profile.provider || 'google',
        password: await bcrypt.hash(Math.random().toString(36), 10), 
      });
      await this.usersRepository.save(user);
    }

    const fullUser = await this.usersRepository.findOne({
      where: { id: user.id },
      select: ['id', 'email', 'name', 'phone', 'createdAt']
    });

    return fullUser;
  }

  private async generateToken(user: User) {
    if (!user || !user.email) {
      throw new Error('Invalid user object');
    }

    const fullUser = await this.usersRepository.findOne({
      where: { id: user.id },
      select: ['id', 'email', 'name', 'phone', 'createdAt']
    });

    if (!fullUser) {
      throw new Error('User not found');
    }

    const payload = { 
      sub: user.id, 
      email: user.email,
      name: user.name 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        phone: fullUser.phone,
        registrationDate: fullUser.createdAt
      }
    };
  }
}